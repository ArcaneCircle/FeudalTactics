// Feudal Tactics — webxdc port: map renderer.
// Port of de.sesu8642.feudaltactics.renderer (MapRenderer, GameStateConverter,
// TextureAtlasHelper) from https://github.com/Sesu8642/FeudalTactics
// GPL-3.0-or-later.

import {
  HEX_OUTER_RADIUS,
  HEXTILE_WIDTH,
  HEXTILE_HEIGHT,
  HexMapHelper,
  GameStateHelper,
  InputValidationHelper,
} from "./core.js";
import texturesUrl from "@assets/textures.png";

const PLAYER_COLOR_PALETTE = [
  [51, 115, 204], // blue
  [191, 128, 0], // brown
  [255, 171, 171], // pink
  [255, 255, 0], // yellow
  [255, 255, 255], // white
  [0, 255, 0], // green
];
const PLAYER_COLOR_CSS = PLAYER_COLOR_PALETTE.map(
  (c) => `rgb(${c[0]},${c[1]},${c[2]})`,
);

const WATER_TILE_SIZE = 12;
const SHIELD_SIZE = 2;
const LINE_EXTENSION = 0.14;
const TILE_CONTENT_OFFSET_Y = HEXTILE_HEIGHT * -0.075;

const TextureAtlasHelper = {
  atlas: null,
  regions: {
    baron: [
      [2, 2, 64, 55],
      [200, 11, 64, 55],
    ],
    beach_sand: [
      [262, 189, 64, 64],
      [328, 189, 64, 64],
    ],
    beach_water: [
      [2, 125, 128, 128],
      [132, 125, 128, 128],
    ],
    capital: [200, 68, 64, 55],
    castle: [332, 18, 64, 55],
    gravestone: [394, 198, 64, 55],
    knight: [
      [68, 2, 64, 55],
      [266, 18, 64, 55],
    ],
    palm_tree: [262, 132, 64, 55],
    peasant: [
      [266, 75, 64, 55],
      [134, 2, 64, 55],
    ],
    shield: [460, 237, 16, 16],
    spearman: [
      [328, 132, 64, 55],
      [332, 75, 64, 55],
    ],
    tile_bw: [2, 59, 64, 64],
    tree: [394, 141, 64, 55],
    water: [
      [68, 59, 64, 64],
      [134, 59, 64, 64],
    ],
  },

  load() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        TextureAtlasHelper.atlas = img;
        resolve();
      };
      img.onerror = reject;
      img.src = texturesUrl;
    });
  },

  regionNameForContent(content) {
    switch (content.k) {
      case "unit":
        return {
          PEASANT: "peasant",
          SPEARMAN: "spearman",
          KNIGHT: "knight",
          BARON: "baron",
        }[content.t];
      case "capital":
        return "capital";
      case "tree":
        return "tree";
      case "palm":
        return "palm_tree";
      case "castle":
        return "castle";
      case "gravestone":
        return "gravestone";
      default:
        throw new Error("unknown content " + content.k);
    }
  },

  region(name, frame = 0) {
    const r = TextureAtlasHelper.regions[name];
    if (Array.isArray(r[0])) return r[frame % r.length];
    return r;
  },

  frameCount(name) {
    const r = TextureAtlasHelper.regions[name];
    return Array.isArray(r[0]) ? r.length : 1;
  },
};

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------
class MapCamera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.zoom = 1; // world units per CSS pixel factor: screenPx = world / zoom
    this.vw = 800; // viewport width in css px
    this.vh = 600;
  }
  setViewport(w, h) {
    this.vw = w;
    this.vh = h;
  }
  // world -> screen
  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) / this.zoom + this.vw / 2,
      y: this.vh / 2 - (wy - this.y) / this.zoom,
    };
  }
  screenToWorld(sx, sy) {
    return {
      x: (sx - this.vw / 2) * this.zoom + this.x,
      y: (this.vh / 2 - sy) * this.zoom + this.y,
    };
  }
  placeForFullMap(
    coords,
    marginLeftPx,
    marginBottomPx,
    marginRightPx,
    marginTopPx,
  ) {
    const dims = HexMapHelper.getMapDimensionsInWorldCoords(coords);
    const useW = Math.max(1, this.vw - marginLeftPx - marginRightPx);
    const useH = Math.max(1, this.vh - marginBottomPx - marginTopPx);
    const xFactor = dims.width / this.zoom / useW;
    const yFactor = dims.height / this.zoom / useH;
    const scaleFactor = Math.max(xFactor, yFactor);
    this.zoom *= scaleFactor;
    // the original has no clamp; only guard against degenerate values
    this.zoom = Math.max(this.zoom, 1e-4);
    this.x = dims.center.x;
    this.y = dims.center.y;
    // offset to apply the margin (see original placeCameraForFullMapView)
    this.x += ((marginRightPx - marginLeftPx) * this.zoom) / 2;
    this.y += ((marginTopPx - marginBottomPx) * this.zoom) / 2;
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
class MapRenderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.camera = camera;
    this.items = null;
    this.stateTime = 0;
    this.imageCache = new Map(); // tinted variant cache
    this.patternCanvas = null;
    this.dpr = 1;
    this._setNearest();
  }

  _setNearest() {
    this.ctx.imageSmoothingEnabled = false;
  }

  syncCanvasSize(w, h) {
    const bw = Math.round(w);
    const bh = Math.round(h);
    if (this.canvas.width !== bw || this.canvas.height !== bh) {
      this.canvas.width = bw;
      this.canvas.height = bh;
      // Assigning canvas.width/height clears the canvas and resets the whole
      // 2D context state, including imageSmoothingEnabled, so set it again.
      this._setNearest();
    }
  }

  updateGameState(gs) {
    this.items = GameStateConverter.convertGameState(gs);
  }

  resize(w, h, dpr) {
    this.dpr = dpr;
    this.syncCanvasSize(w * dpr, h * dpr);
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.camera.setViewport(w, h);
  }

  // ---- image helpers ----
  _tintedRegion(name, frame, colorKey, darken, alpha, tintAlpha) {
    // Returns an offscreen canvas with the region pre-tinted, so the hot draw
    // loop stays cheap. colorKey multiplies with a player color like the
    // original SpriteBatch.setColor() tinting of the black & white tile.
    const key =
      name +
      "|" +
      frame +
      "|" +
      colorKey +
      "|" +
      darken +
      "|" +
      alpha +
      "|" +
      tintAlpha;
    let c = this.imageCache.get(key);
    if (c) return c;
    const r = TextureAtlasHelper.region(name, frame);
    c = document.createElement("canvas");
    c.width = r[2];
    c.height = r[3];
    const cx = c.getContext("2d");
    cx.drawImage(
      TextureAtlasHelper.atlas,
      r[0],
      r[1],
      r[2],
      r[3],
      0,
      0,
      r[2],
      r[3],
    );
    if (colorKey != null) {
      // The original tints the black & white tile with SpriteBatch.setColor(),
      // which MULTIPLIES the sprite by the player colour. Overlaying a flat
      // colour instead would wash the tile out to a pastel, so multiply the
      // pixels here and keep the sprite's speckle and black border intact.
      const col = PLAYER_COLOR_PALETTE[colorKey];
      let img;
      try {
        img = cx.getImageData(0, 0, c.width, c.height);
      } catch (e) {
        img = null;
      }
      if (img) {
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          d[i] = (d[i] * col[0]) / 255;
          d[i + 1] = (d[i + 1] * col[1]) / 255;
          d[i + 2] = (d[i + 2] * col[2]) / 255;
        }
        cx.putImageData(img, 0, 0);
      } else {
        const tint = document.createElement("canvas");
        tint.width = c.width;
        tint.height = c.height;
        const tx = tint.getContext("2d");
        tx.drawImage(
          TextureAtlasHelper.atlas,
          r[0],
          r[1],
          r[2],
          r[3],
          0,
          0,
          r[2],
          r[3],
        );
        tx.globalCompositeOperation = "multiply";
        tx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`;
        tx.fillRect(0, 0, tint.width, tint.height);
        tx.globalCompositeOperation = "destination-in";
        tx.drawImage(
          TextureAtlasHelper.atlas,
          r[0],
          r[1],
          r[2],
          r[3],
          0,
          0,
          r[2],
          r[3],
        );
        cx.drawImage(tint, 0, 0);
      }
    }
    if (darken) {
      cx.globalCompositeOperation = "source-atop";
      cx.fillStyle = "rgba(0,0,0,0.45)";
      cx.fillRect(0, 0, c.width, c.height);
    }
    if (alpha != null) {
      cx.globalCompositeOperation = "destination-in";
      cx.globalAlpha = alpha;
      cx.fillRect(0, 0, c.width, c.height);
    }
    this.imageCache.set(key, c);
    return c;
  }

  _flipped(image, flipH, flipV) {
    if (!flipH && !flipV) return image;
    const key = "_flip" + (flipH ? "h" : "") + (flipV ? "v" : "");
    if (image[key]) return image[key];
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const cx = c.getContext("2d");
    cx.translate(flipH ? c.width : 0, flipV ? c.height : 0);
    cx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    cx.drawImage(image, 0, 0);
    image[key] = c;
    return c;
  }

  // draw a sprite frame in world coords: bottom-left (wx, wy), world size (w, h)
  _drawWorld(img, wx, wy, w, h) {
    const topLeft = this.camera.worldToScreen(wx, wy + h);
    const scale = 1 / this.camera.zoom;
    this.ctx.drawImage(img, topLeft.x, topLeft.y, w * scale, h * scale);
  }

  render(dt) {
    this.stateTime += dt;
    const ctx = this.ctx;
    const cam = this.camera;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, cam.vw, cam.vh);
    if (!this.items || !TextureAtlasHelper.atlas) {
      ctx.restore();
      return;
    }
    const items = this.items;
    const frameIdx = Math.floor(this.stateTime) % 2; // 1s animation frames like the original

    this._drawDeepWater(frameIdx);
    this._drawBeaches(items, frameIdx);

    // The white/red kingdom outlines are drawn *under* the tiles, like the
    // original: SpriteBatch draws the tiles, then ShapeRenderer's rectLines go on
    // top only where no tile covers them. Drawing them first means each line is
    // clipped by the tiles either side of it, which gives the correct-looking
    // joins at hexagon vertices (no mitre spikes, no gaps).

    // tiles
    for (const tile of items.tiles.values()) {
      const img = tile.darken
        ? this._tintedRegion("tile_bw", 0, tile.color, true, null)
        : this._tintedRegion("tile_bw", 0, tile.color, null, null);
      // Grow the sprite by one texel on every side (1/64 of its size). The atlas
      // tile's black border sits exactly on the hexagon edge, so two neighbours
      // otherwise draw that border twice and leave a visible double line; with
      // the overlap the two borders land on the same pixels as a single line and
      // any sub-pixel gap between tiles is covered as well.
      const grow = 2 / 64;
      const tw = HEXTILE_WIDTH * (1 + grow);
      const th = HEXTILE_HEIGHT * (1 + grow);
      this._drawWorld(
        img,
        tile.mapCoords.x - tw / 2,
        tile.mapCoords.y - th / 2,
        tw,
        th,
      );
    }

    // protection shields
    for (const shield of items.shields.values()) {
      const img = shield.darken
        ? this._tintedRegion("shield", 0, null, true, 0.85)
        : this._tintedRegion("shield", 0, null, null, 0.85);
      this._drawWorld(img, shield.x, shield.y, SHIELD_SIZE, SHIELD_SIZE);
    }

    // tile contents
    const drawAnimated = (map, darken) => {
      for (const a of map.values()) {
        const frames = TextureAtlasHelper.frameCount(a.name);
        this._drawContentSprite(a.name, frameIdx % frames, a.pos, darken);
      }
    };
    drawAnimated(items.animatedContents, false);
    drawAnimated(items.darkenedAnimatedContents, true);
    for (const c of items.nonAnimatedContents.values())
      this._drawContentSprite(c.name, 0, c.pos, false);
    for (const c of items.darkenedNonAnimatedContents.values())
      this._drawContentSprite(c.name, 0, c.pos, true);

    // semitransparent indicators (blinking, first animation frame)
    if (frameIdx === 0) {
      for (const [pos, darken] of items.semitransparentGraveStones) {
        this._semiContent("gravestone", pos, darken ? 0.35 : 0.6);
      }
      for (const pos of items.semitransparentOakTrees)
        this._semiContent("tree", pos, 0.35);
      for (const pos of items.semitransparentPalmTrees)
        this._semiContent("palm_tree", pos, 0.35);
    }

    this._drawLines(items);
    ctx.restore();
  }

  _drawContentSprite(name, frame, pos, darken) {
    const img = darken
      ? this._tintedRegion(name, frame, null, true, null)
      : this._tintedRegion(name, frame, null, null, null);
    // pos is the bottom-left of the tile; the original offsets content up by
    // -TILE_CONTENT_OFFSET_Y (content sprites are drawn bottom aligned)
    const p = this.camera.worldToScreen(
      pos.x,
      pos.y + HEXTILE_HEIGHT - TILE_CONTENT_OFFSET_Y,
    );
    const scale = 1 / this.camera.zoom;
    this.ctx.drawImage(
      img,
      p.x,
      p.y,
      HEXTILE_WIDTH * scale,
      HEXTILE_HEIGHT * scale,
    );
  }

  _semiContent(name, pos, alpha) {
    const img = this._tintedRegion(name, 0, null, true, alpha);
    const p = this.camera.worldToScreen(pos.x, pos.y + HEXTILE_HEIGHT);
    const scale = 1 / this.camera.zoom;
    this.ctx.drawImage(
      img,
      p.x,
      p.y,
      HEXTILE_WIDTH * scale,
      HEXTILE_HEIGHT * scale,
    );
  }

  _drawDeepWater(frameIdx) {
    const ctx = this.ctx;
    const cam = this.camera;
    const img = this._tintedRegion(
      "water",
      frameIdx % TextureAtlasHelper.frameCount("water"),
      null,
      false,
      null,
    );
    const scale = 1 / cam.zoom;
    const tilePx = WATER_TILE_SIZE * scale;
    // world coords of the visible rect
    const topLeftWorld = cam.screenToWorld(0, 0);
    const bottomRightWorld = cam.screenToWorld(cam.vw, cam.vh);
    const startX =
      Math.floor(topLeftWorld.x / WATER_TILE_SIZE) * WATER_TILE_SIZE;
    const startY =
      Math.floor(bottomRightWorld.y / WATER_TILE_SIZE) * WATER_TILE_SIZE;
    // water tiles can become huge in screen space when zoomed out; cap count
    const cols = Math.ceil((bottomRightWorld.x - startX) / WATER_TILE_SIZE) + 1;
    const rows = Math.ceil((topLeftWorld.y - startY) / WATER_TILE_SIZE) + 1;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const wx = startX + i * WATER_TILE_SIZE;
        const wy = startY + j * WATER_TILE_SIZE;
        const p = cam.worldToScreen(wx, wy + WATER_TILE_SIZE);
        if (tilePx < 6) {
          // too small: just draw as color patches every other tile to save draw calls
          if ((i + j) % 2 === 0) {
            ctx.fillStyle = "#1a3ec8";
            ctx.fillRect(p.x, p.y, tilePx + 1, tilePx + 1);
          }
        } else {
          ctx.drawImage(img, p.x, p.y, tilePx + 0.6, tilePx + 0.6);
        }
      }
    }
  }

  // Multiplies the region's RGB by a tint, exactly like SpriteBatch.setColor():
  // the sprite's own brightness survives and the alpha channel is left untouched.
  _rgbTintedRegion(name, frame, rgb) {
    const key = "rgbtint|" + name + "|" + frame + "|" + rgb;
    let c = this.imageCache.get(key);
    if (c) return c;
    const r = TextureAtlasHelper.region(name, frame);
    c = document.createElement("canvas");
    c.width = r[2];
    c.height = r[3];
    const cx = c.getContext("2d", { willReadFrequently: true });
    cx.drawImage(
      TextureAtlasHelper.atlas,
      r[0],
      r[1],
      r[2],
      r[3],
      0,
      0,
      r[2],
      r[3],
    );
    const img = cx.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = (d[i] * rgb[0]) / 255;
      d[i + 1] = (d[i + 1] * rgb[1]) / 255;
      d[i + 2] = (d[i + 2] * rgb[2]) / 255;
    }
    cx.putImageData(img, 0, 0);
    this.imageCache.set(key, c);
    return c;
  }

  _drawBeaches(items, frameIdx) {
    const ctx = this.ctx;
    const cam = this.camera;
    const scale = 1 / cam.zoom;
    const waterImg = this._rgbTintedRegion(
      "beach_water",
      frameIdx % 2,
      items.darkenBeaches ? [0, 191, 191] : [0, 255, 255],
    );
    const sandImg = items.darkenBeaches
      ? this._rgbTintedRegion("beach_sand", frameIdx % 2, [128, 128, 128])
      : this._tintedRegion("beach_sand", frameIdx % 2, null, null, null);

    const drawRegion = (img, wx, wy, w, h, flipH, flipV) => {
      const f = this._flipped(img, flipH, flipV);
      const p = cam.worldToScreen(wx, wy + h);
      const dpr = this.dpr;
      const snap = (v) => Math.round(v * dpr) / dpr;
      const x0 = snap(p.x);
      const y0 = snap(p.y);
      const x1 = snap(p.x + w * scale);
      const y1 = snap(p.y + h * scale);
      ctx.drawImage(
        f,
        x0,
        y0,
        Math.max(1 / dpr, x1 - x0),
        Math.max(1 / dpr, y1 - y0),
      );
    };

    // Cyan glow in the water, then the sand strips on top of it.
    const drawCoast = (img, sizeFactor) => {
      const w = HEXTILE_WIDTH * sizeFactor;
      const h = HEXTILE_HEIGHT * sizeFactor;
      for (const tile of items.tiles.values()) {
        const mc = tile.mapCoords;
        if (tile.bottomBeach || tile.bottomRightBeach)
          drawRegion(img, mc.x, mc.y - h, w, h, false, false);
        if (tile.bottomBeach || tile.bottomLeftBeach)
          drawRegion(img, mc.x - w, mc.y - h, w, h, true, false);
        if (tile.topBeach || tile.topLeftBeach)
          drawRegion(img, mc.x - w, mc.y, w, h, true, true);
        if (tile.topBeach || tile.topRightBeach)
          drawRegion(img, mc.x, mc.y, w, h, false, true);
      }
    };
    drawCoast(waterImg, 2);
    drawCoast(sandImg, 1);
  }

  // The original draws these with ShapeRenderer.rectLine(): a filled quad of
  // constant width with square ends. Stroking a path instead gives bulging round
  // caps and mitre spikes where two edges of a hexagon meet, so draw quads.
  _rectLine(ctx, a, b, halfWidth) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return;
    const nx = (-dy / len) * halfWidth;
    const ny = (dx / len) * halfWidth;
    ctx.beginPath();
    ctx.moveTo(a.x + nx, a.y + ny);
    ctx.lineTo(b.x + nx, b.y + ny);
    ctx.lineTo(b.x - nx, b.y - ny);
    ctx.lineTo(a.x - nx, a.y - ny);
    ctx.closePath();
    ctx.fill();
  }

  _drawLines(items) {
    const ctx = this.ctx;
    const scale = 1 / this.camera.zoom;
    // Upstream draws each border side with ShapeRenderer.rectLine(width = 0.6F):
    // a band 0.6 world units thick, centred on the hexagon edge. `halfW` is half
    // of that in screen pixels, for both the kingdom outline and the red dashes.
    const halfW = (0.6 * scale) / 2;

    ctx.fillStyle = "rgb(255,255,255)";
    for (const loop of items.whiteLineLoops) {
      const screen = loop.map((p) => this.camera.worldToScreen(p.x, p.y));
      this._strokeLoop(ctx, screen, halfW);
    }

    ctx.fillStyle = "rgb(255,0,0)";
    for (let i = 0; i < items.redLineStartPoints.length; i++) {
      const a = this.camera.worldToScreen(
        items.redLineStartPoints[i].x,
        items.redLineStartPoints[i].y,
      );
      const b = this.camera.worldToScreen(
        items.redLineEndPoints[i].x,
        items.redLineEndPoints[i].y,
      );
      this._rectLine(ctx, a, b, halfW);
    }
  }

  _strokeLoop(ctx, loop, halfWidth) {
    const n = loop.length;
    if (n < 3) return;
    const prevJoin = ctx.lineJoin;
    const prevLimit = ctx.miterLimit;
    const prevWidth = ctx.lineWidth;
    const prevStroke = ctx.strokeStyle;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const p = loop[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.lineJoin = "miter";
    ctx.miterLimit = 4;
    ctx.lineWidth = halfWidth * 2;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
    ctx.lineJoin = prevJoin;
    ctx.miterLimit = prevLimit;
    ctx.lineWidth = prevWidth;
    ctx.strokeStyle = prevStroke;
  }

  _edgeNormal(a, b, sgn) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    // right-hand normal multiplied by the winding sign -> always points inward
    return { x: (-dy / len) * sgn, y: (dx / len) * sgn };
  }
}

// ---------------------------------------------------------------------------
// GameStateConverter port
// ---------------------------------------------------------------------------
const GameStateConverter = {
  mapCoords(hexCoords) {
    return {
      x: 0.75 * HEXTILE_WIDTH * hexCoords.x,
      y:
        HEX_OUTER_RADIUS *
        ((Math.sqrt(3) / 2) * hexCoords.x +
          Math.sqrt(3) * (-hexCoords.y - hexCoords.x)),
    };
  },

  convertGameState(gs) {
    const result = {
      tiles: new Map(),
      nonAnimatedContents: new Map(),
      darkenedNonAnimatedContents: new Map(),
      animatedContents: new Map(),
      darkenedAnimatedContents: new Map(),
      shields: new Map(),
      semitransparentGraveStones: new Map(),
      semitransparentOakTrees: [],
      semitransparentPalmTrees: [],
      whiteLineLoops: [],
      redLineStartPoints: [],
      redLineEndPoints: [],
      darkenBeaches: gs.heldObject != null,
    };

    const oakSpread = new Set(
      GameStateHelper.getTilesOakTreesWillSpreadTo(gs).map((t) => t.idx),
    );
    const palmSpread = new Set(
      GameStateHelper.getTilesPalmTreesWillSpreadTo(gs).map((t) => t.idx),
    );
    const activePlayer = gs.players[gs.playerTurn];
    const activePlayerIndex = activePlayer.index;

    for (const tile of gs.tiles) {
      const mapCoords = GameStateConverter.mapCoords(tile.pos);
      const color = tile.player;
      const drawTile = { mapCoords, color, darken: false };
      // beaches
      const neighbors = HexMapHelper.getNeighborTiles(gs, tile);
      const names = [
        "topLeft",
        "top",
        "topRight",
        "bottomRight",
        "bottom",
        "bottomLeft",
      ];
      for (let i = 0; i < 6; i++)
        if (neighbors[i] == null) drawTile[names[i] + "Beach"] = true;

      const isActiveKingdom =
        gs.activeKingdom != null &&
        tile.kingdom != null &&
        tile.kingdom === gs.activeKingdom;
      if (isActiveKingdom) {
        // outlines are built once per frame from the kingdom boundary, below
        drawTile.darken =
          gs.heldObject != null &&
          !InputValidationHelper.checkPlaceOwn(gs, activePlayerIndex, tile) &&
          !InputValidationHelper.checkCombineUnits(gs, activePlayerIndex, tile);
      } else if (gs.heldObject != null) {
        if (InputValidationHelper.checkConquer(gs, activePlayerIndex, tile)) {
          GameStateConverter.createRedLines(
            gs,
            tile,
            mapCoords,
            result.redLineStartPoints,
            result.redLineEndPoints,
          );
        } else {
          drawTile.darken = true;
        }
      } else if (activePlayer.type === "BOT" && gs.activeKingdom != null) {
        drawTile.darken = true;
      } else if (activePlayer.type === "HUMAN" && gs.activeKingdom == null) {
        // like the original: while nothing is selected, all tiles are shown
        // normally; once a kingdom is active, everything else is dimmed
      } else if (gs.activeKingdom != null) {
        // not part of the active kingdom -> dim so the kingdom stands out
        drawTile.darken = true;
      }
      result.tiles.set(HexMapHelper.key(tile.pos), drawTile);

      // contents
      const content = tile.content;
      if (content != null) {
        const animate = GameStateConverter.shouldAnimate(gs, tile, content);
        const darken = GameStateConverter.shouldDarkenContent(
          gs,
          tile,
          drawTile,
          content,
        );
        const isCapital = content.k === "capital";
        const name = TextureAtlasHelper.regionNameForContent(content);
        const pos = {
          x: mapCoords.x - HEX_OUTER_RADIUS,
          y: mapCoords.y - HEX_OUTER_RADIUS,
        };
        const key = HexMapHelper.key(pos);
        if (animate) {
          (darken
            ? result.darkenedAnimatedContents
            : result.animatedContents
          ).set(key, { name, pos });
        } else {
          (darken
            ? result.darkenedNonAnimatedContents
            : result.nonAnimatedContents
          ).set(key, { name, pos });
        }
        if (GameStateConverter.isUnitAboutToDie(gs, tile, content)) {
          result.semitransparentGraveStones.set(HexMapHelper.key(pos), darken);
        }
      }
      // tree spread indicators
      if (gs.activeKingdom != null && tile.kingdom === gs.activeKingdom) {
        if (oakSpread.has(tile.idx))
          result.semitransparentOakTrees.push({
            x: mapCoords.x - HEX_OUTER_RADIUS,
            y: mapCoords.y - HEX_OUTER_RADIUS,
          });
        if (palmSpread.has(tile.idx))
          result.semitransparentPalmTrees.push({
            x: mapCoords.x - HEX_OUTER_RADIUS,
            y: mapCoords.y - HEX_OUTER_RADIUS,
          });
      }
      // protection shields
      GameStateConverter.createProtectionIndicators(
        gs,
        tile,
        result,
        mapCoords,
        drawTile,
      );
    }
    if (gs.activeKingdom != null)
      result.whiteLineLoops = GameStateConverter.createWhiteLoops(gs);
    return result;
  },

  shouldAnimate(gs, tile, content) {
    if (tile.kingdom == null) return false;
    const kingdom = gs.kingdomById.get(tile.kingdom);
    if (kingdom == null || kingdom.player !== gs.players[gs.playerTurn].index)
      return false;
    if (content.k === "unit" && content.canAct) return true;
    if (content.k === "capital" && kingdom.savings > 10) return true;
    return false;
  },

  shouldDarkenContent(gs, tile, drawTile, content) {
    return (
      drawTile.darken ||
      (tile.player === gs.players[gs.playerTurn].index &&
        gs.heldObject == null &&
        content != null &&
        content.k === "unit" &&
        !content.canAct)
    );
  },

  isUnitAboutToDie(gs, tile, content) {
    const player = gs.players[tile.player];
    if (player.type !== "HUMAN" || tile.kingdom == null) return false;
    const kingdom = gs.kingdomById.get(tile.kingdom);
    if (!kingdom) return false;
    const income = GameStateHelper.getKingdomIncome(gs, kingdom);
    const salaries = GameStateHelper.getKingdomSalaries(gs, kingdom);
    const sustained = kingdom.savings + (income - salaries) >= 0;
    return !sustained && content.k === "unit";
  },

  createProtectionIndicators(gs, tile, result, mapCoords, drawTile) {
    const should =
      gs.heldObject != null ||
      (gs.activeKingdom != null && tile.kingdom === gs.activeKingdom);
    if (!should) return;
    const level = GameStateHelper.getProtectionLevel(gs, tile);
    const put = (x, y) =>
      result.shields.set(HexMapHelper.key({ x, y }), {
        x,
        y,
        darken: drawTile.darken,
      });
    switch (level) {
      case 4:
        put(mapCoords.x - 2 * SHIELD_SIZE, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x - SHIELD_SIZE, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x + SHIELD_SIZE, mapCoords.y - SHIELD_SIZE / 2);
        break;
      case 3:
        put(mapCoords.x - SHIELD_SIZE * 1.5, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x - SHIELD_SIZE / 2, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x + SHIELD_SIZE / 2, mapCoords.y - SHIELD_SIZE / 2);
        break;
      case 2:
        put(mapCoords.x - SHIELD_SIZE, mapCoords.y - SHIELD_SIZE / 2);
        put(mapCoords.x, mapCoords.y - SHIELD_SIZE / 2);
        break;
      case 1:
        put(mapCoords.x - SHIELD_SIZE / 2, mapCoords.y - SHIELD_SIZE / 2);
        break;
      default:
        break;
    }
  },

  hexCornerRing(mc) {
    const R = HEX_OUTER_RADIUS;
    const out = [];
    for (let k = 0; k < 6; k++) {
      const ang = (k * Math.PI) / 3;
      out.push({ x: mc.x + R * Math.cos(ang), y: mc.y + R * Math.sin(ang) });
    }
    return out;
  },

  createWhiteLoops(gs) {
    const kingdomTiles = gs.tiles.filter(
      (t) => t.kingdom != null && t.kingdom === gs.activeKingdom,
    );
    // Quantise so a corner shared by two tiles (computed from each tile's own
    // centre, so it can differ in the last ulp) maps to the same key.
    const QUANT = 1e-3;
    const keyOf = (p) =>
      `${Math.round(p.x / QUANT)}:${Math.round(p.y / QUANT)}`;
    const points = new Map();
    const outgoing = new Map();
    for (const tile of kingdomTiles) {
      const mc = GameStateConverter.mapCoords(tile.pos);
      const ring = GameStateConverter.hexCornerRing(mc);
      const ringKeys = ring.map(keyOf);
      const neighbors = HexMapHelper.getNeighborTiles(gs, tile);
      for (let c = 0; c < 6; c++) {
        // Which neighbour is across the side from corner c to corner c+1?
        const a = ring[c];
        const b = ring[(c + 1) % 6];
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        // the neighbour centre is the map coords of the tile one step outward
        let across = null;
        for (let i = 0; i < 6; i++) {
          const nc = HexMapHelper.getNeighborCoords(tile.pos)[i];
          const nw = GameStateConverter.mapCoords(nc);
          const nx = nw.x - mc.x,
            ny = nw.y - mc.y;
          const mx = mid.x - mc.x,
            my = mid.y - mc.y;
          const nlen = Math.hypot(nx, ny),
            mlen = Math.hypot(mx, my);
          if (
            Math.abs(nx / nlen - mx / mlen) < 1e-6 &&
            Math.abs(ny / nlen - my / mlen) < 1e-6
          ) {
            across = i;
            break;
          }
        }
        const nt = across == null ? null : neighbors[across];
        if (nt != null && nt.kingdom != null && nt.kingdom === tile.kingdom)
          continue;
        // inward normal: perpendicular to the side, pointing back to the centre
        const dx = b.x - a.x,
          dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        let nx = -dy / len,
          ny = dx / len;
        if ((mc.x - mid.x) * nx + (mc.y - mid.y) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        const ka = ringKeys[c];
        const kb = ringKeys[(c + 1) % 6];
        points.set(ka, a);
        points.set(kb, b);
        if (!outgoing.has(ka)) outgoing.set(ka, []);
        outgoing.get(ka).push({ to: kb, nx, ny });
      }
    }
    const loops = [];
    const remaining = new Map();
    for (const [k, list] of outgoing) remaining.set(k, list.slice());
    let totalEdges = 0;
    for (const list of outgoing.values()) totalEdges += list.length;
    let guard = 0;
    let consumed = 0;
    while (consumed < totalEdges && guard++ < totalEdges + 5) {
      let startKey = null;
      for (const [k, list] of remaining) {
        if (list.length > 0) {
          startKey = k;
          break;
        }
      }
      if (startKey == null) break;
      const pts = [];
      const normals = [];
      let k = startKey;
      while (k != null) {
        const list = remaining.get(k);
        if (!list || list.length === 0) break;
        const edge = list.shift();
        consumed++;
        pts.push(points.get(k));
        normals.push({ x: edge.nx, y: edge.ny });
        k = edge.to;
        if (k === startKey) break;
      }
      if (pts.length >= 3) {
        pts.inward = normals;
        loops.push(pts);
      }
    }
    return loops;
  },

  createRedLines(gs, tile, mapCoords, starts, ends) {
    const neighbors = HexMapHelper.getNeighborTiles(gs, tile);
    const activePlayerIndex = gs.players[gs.playerTurn].index;
    for (let i = 0; i < 6; i++) {
      const nt = neighbors[i];
      if (
        nt == null ||
        (nt.kingdom !== gs.activeKingdom &&
          !InputValidationHelper.checkConquer(gs, activePlayerIndex, nt))
      ) {
        const line = GameStateConverter.neighborLine(mapCoords, i);
        // dotted: 2 parts of 3
        const diffX = line.end.x - line.start.x;
        const diffY = line.end.y - line.start.y;
        for (let p = 1; p <= 3; p += 2) {
          starts.push({
            x: line.start.x + (diffX / 3) * (p - 1),
            y: line.start.y + (diffY / 3) * (p - 1),
          });
          ends.push({
            x: line.start.x + (diffX / 3) * p,
            y: line.start.y + (diffY / 3) * p,
          });
        }
      }
    }
  },

  neighborLine(mc, index) {
    const W = HEXTILE_WIDTH;
    const H = HEXTILE_HEIGHT;
    const E = LINE_EXTENSION;
    switch (index) {
      case 0:
        return {
          start: { x: mc.x - W / 4 + E, y: mc.y + H / 2 + E },
          end: { x: mc.x - W / 2 - E, y: mc.y - E },
        };
      case 1:
        return {
          start: { x: mc.x - W / 4 - E, y: mc.y + H / 2 },
          end: { x: mc.x + W / 4 + E, y: mc.y + H / 2 },
        };
      case 2:
        return {
          start: { x: mc.x + W / 4 - E, y: mc.y + H / 2 + E },
          end: { x: mc.x + W / 2 + E, y: mc.y - E },
        };
      case 3:
        return {
          start: { x: mc.x + W / 4 - E, y: mc.y - H / 2 - E },
          end: { x: mc.x + W / 2 + E, y: mc.y + E },
        };
      case 4:
        return {
          start: { x: mc.x - W / 4 - E, y: mc.y - H / 2 },
          end: { x: mc.x + W / 4 + E, y: mc.y - H / 2 },
        };
      case 5:
        return {
          start: { x: mc.x - W / 4 + E, y: mc.y - H / 2 - E },
          end: { x: mc.x - W / 2 - E, y: mc.y + E },
        };
      default:
        throw new Error("bad neighbor index");
    }
  },
};

export {
  PLAYER_COLOR_PALETTE,
  PLAYER_COLOR_CSS,
  WATER_TILE_SIZE,
  SHIELD_SIZE,
  LINE_EXTENSION,
  TILE_CONTENT_OFFSET_Y,
  TextureAtlasHelper,
  MapCamera,
  MapRenderer,
  GameStateConverter,
};
