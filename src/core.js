// Feudal Tactics — webxdc port, game core.
// A faithful port of the game rules and AI of the original Java/libGDX game
// "Feudal Tactics" by Sesu8642 (GPL-3.0-or-later):
// https://github.com/Sesu8642/FeudalTactics

import { t } from "./i18n.js";

// ---------------------------------------------------------------------------
// Seeded PRNG: a bit-exact port of java.util.Random, so maps are identical to
// the original game for the same seed (same 48-bit LCG, same next(bits) logic
// with the overflow bug Java has).
// ---------------------------------------------------------------------------
function Random(seed) {
  // Java seeds with (seed ^ 0x5DEECE66DL) & ((1L << 48) - 1) via
  // (initialSeed ^ multiplier) & mask; seeds are longs there, we keep the
  // low 32 bits which is all a JS number can carry losslessly.
  this.seed = (BigInt(Math.trunc(seed)) ^ 0x5deece66dn) & 0xffffffffffffn;
}

const RMULT = 0x5deece66dn;
const RADD = 0xbn;
const RMASK = (1n << 48n) - 1n;

Random.prototype.next = function (bits) {
  this.seed = (this.seed * RMULT + RADD) & RMASK;
  // Java: (int)(seed >>> (48 - bits)) — the int cast may make this negative
  let v = Number(this.seed >> BigInt(48 - bits));
  if (v >= 0x80000000) v -= 0x100000000;
  return v | 0;
};

Random.prototype.nextInt = function (bound) {
  if (bound == null) return this.next(32);
  if (bound <= 0) throw new Error("bound must be positive");
  // power of two: (int)((bound * (long)next(31)) >> 31)
  if ((bound & -bound) === bound) {
    return Number((BigInt(bound) * BigInt(this.next(31))) >> 31n) | 0;
  }
  let bits, val;
  do {
    bits = this.next(31);
    val = bits % bound;
  } while (bits - val + (bound - 1) < 0);
  return val;
};

Random.prototype.nextFloat = function () {
  return this.next(24) * (1 / 16777216);
};

Random.prototype.nextDouble = function () {
  return (
    (this.next(26) * 134217728.0 + this.next(27)) * (1 / 9007199254740992.0)
  );
};

Random.prototype.nextBoolean = function () {
  return this.next(1) !== 0;
};

// Java's Collections.shuffle(list, rnd)
Random.prototype.shuffle = function (list) {
  for (let i = list.length; i > 1; i--) {
    const j = this.nextInt(i);
    const tmp = list[i - 1];
    list[i - 1] = list[j];
    list[j] = tmp;
  }
  return list;
};

// Java-style rounding (half up) matching Math.round for our inputs.
function javaRound(v) {
  return Math.floor(v + 0.5);
}

// ---------------------------------------------------------------------------
// Hex helpers (port of HexMapHelper; pointy-top, odd-q offset style coords
// stored as {x, y} where the third cube coord is -x-y)
// ---------------------------------------------------------------------------
const HEX_OUTER_RADIUS = 5;
const HEXTILE_WIDTH = HEX_OUTER_RADIUS * 2;
const HEXTILE_HEIGHT = HEX_OUTER_RADIUS * Math.sqrt(3);

const HexMapHelper = {
  hexCoordsToWorldCoords(q) {
    const cubeZ = -q.x - q.y;
    const worldX = q.x * HEX_OUTER_RADIUS * 1.5;
    const worldY =
      HEX_OUTER_RADIUS * ((Math.sqrt(3) / 2) * q.x + Math.sqrt(3) * cubeZ);
    return { x: worldX, y: worldY };
  },

  worldCoordsToHexCoords(w) {
    const hexX = ((2 / 3) * w.x) / HEX_OUTER_RADIUS;
    const hexY = ((-1 / 3) * w.x + (Math.sqrt(3) / 3) * w.y) / HEX_OUTER_RADIUS;
    return HexMapHelper.roundToHexCoords(hexX, hexY);
  },

  roundToHexCoords(cx, cy) {
    const cubeZ = -cx - cy;
    let x = javaRound(cx);
    const y = javaRound(cy);
    let z = javaRound(cubeZ);
    const diffX = Math.abs(cx - x);
    const diffY = Math.abs(cy - y);
    const diffZ = Math.abs(cubeZ - z);
    if (diffX > diffY && diffX > diffZ) {
      x = -y - z;
    } else if (diffY < diffZ) {
      z = -x - y;
    }
    return { x: x + 0.0, y: z + 0.0 };
  },

  getNeighborCoords(q) {
    return [
      { x: q.x - 1, y: q.y },
      { x: q.x, y: q.y - 1 },
      { x: q.x + 1, y: q.y - 1 },
      { x: q.x + 1, y: q.y },
      { x: q.x, y: q.y + 1 },
      { x: q.x - 1, y: q.y + 1 },
    ];
  },

  getNeighborsNeighborCoords(q) {
    return [
      { x: q.x, y: q.y - 2 },
      { x: q.x + 1, y: q.y - 2 },
      { x: q.x + 2, y: q.y - 2 },
      { x: q.x + 2, y: q.y - 1 },
      { x: q.x + 2, y: q.y },
      { x: q.x + 1, y: q.y + 1 },
      { x: q.x, y: q.y + 2 },
      { x: q.x - 1, y: q.y + 2 },
      { x: q.x - 2, y: q.y + 2 },
      { x: q.x - 2, y: q.y + 1 },
      { x: q.x - 2, y: q.y },
      { x: q.x - 1, y: q.y - 1 },
    ];
  },

  getNeighborTiles(gs, tile) {
    const out = [];
    for (const c of HexMapHelper.getNeighborCoords(tile.pos)) {
      out.push(gs.tileMap.get(HexMapHelper.key(c)) || null);
    }
    return out;
  },

  getNeighborsNeighborTiles(gs, tile) {
    const out = [];
    for (const c of HexMapHelper.getNeighborsNeighborCoords(tile.pos)) {
      out.push(gs.tileMap.get(HexMapHelper.key(c)) || null);
    }
    return out;
  },

  getUnusedNeighborCoords(gs, q) {
    const out = [];
    for (const c of HexMapHelper.getNeighborCoords(q)) {
      if (!gs.tileMap.has(HexMapHelper.key(c))) out.push(c);
    }
    return out;
  },

  getMapDimensionsInWorldCoords(coords) {
    let minX = 0,
      maxX = 0,
      minY = 0,
      maxY = 0;
    let first = true;
    for (const c of coords) {
      const w = HexMapHelper.hexCoordsToWorldCoords(c);
      if (first || w.x < minX) minX = w.x;
      if (first || w.x > maxX) maxX = w.x;
      if (first || w.y < minY) minY = w.y;
      if (first || w.y > maxY) maxY = w.y;
      first = false;
    }
    minX -= HEX_OUTER_RADIUS;
    maxX += HEX_OUTER_RADIUS;
    minY -= HEX_OUTER_RADIUS;
    maxY += HEX_OUTER_RADIUS;
    return {
      width: maxX - minX,
      height: maxY - minY,
      center: { x: minX + (maxX - minX) / 2, y: minY + (maxY - minY) / 2 },
    };
  },

  key(c) {
    return c.x + "," + c.y;
  },

  // deterministic tile comparison like HexTile.compareTo
  compareTiles(a, b) {
    if (a.pos.x < b.pos.x) return -1;
    if (a.pos.x > b.pos.x) return 1;
    if (a.pos.y < b.pos.y) return -1;
    if (a.pos.y > b.pos.y) return 1;
    return 0;
  },
};

// ---------------------------------------------------------------------------
// Game constants
// ---------------------------------------------------------------------------
const UNITS = {
  PEASANT: {
    type: "PEASANT",
    strength: 1,
    salary: 2,
    cost: 10,
    get name() {
      return t("unit.PEASANT");
    },
  },
  SPEARMAN: {
    type: "SPEARMAN",
    strength: 2,
    salary: 6,
    cost: 10,
    get name() {
      return t("unit.SPEARMAN");
    },
  },
  KNIGHT: {
    type: "KNIGHT",
    strength: 3,
    salary: 18,
    cost: 10,
    get name() {
      return t("unit.KNIGHT");
    },
  },
  BARON: {
    type: "BARON",
    strength: 4,
    salary: 54,
    cost: 10,
    get name() {
      return t("unit.BARON");
    },
  },
};
const UNIT_BY_STRENGTH = {
  1: UNITS.PEASANT,
  2: UNITS.SPEARMAN,
  3: UNITS.KNIGHT,
  4: UNITS.BARON,
};
const TOWER_COST = 15;
const TOWER_STRENGTH = 2;
const CAPITAL_STRENGTH = 1;
const DEAFULT_INITIAL_TREE_DENSITY = 0.1;
const WIN_LANDMASS_PERCENTAGE = 0.8;

// Intelligence levels (port of Intelligence.java)
const INTELLIGENCE = {
  LEVEL_1: {
    level: 1,
    get name() {
      return t("diff.LEVEL_1");
    },
    chanceToConquerPerTurn: 0.5,
    blockingObjectRemovalScoreTreshold: 0,
    reconsidersWhichTilesToProtect: false,
    protectWithTowerScoreTreshold: 1e9,
    protectWithUnitScoreTreshold: 1e9,
    attackOtherBotsBias: 5,
    smartDefending: false,
    smartAttacking: false,
  },
  LEVEL_2: {
    level: 2,
    get name() {
      return t("diff.LEVEL_2");
    },
    chanceToConquerPerTurn: 0.8,
    blockingObjectRemovalScoreTreshold: 0,
    reconsidersWhichTilesToProtect: false,
    protectWithTowerScoreTreshold: 1e9,
    protectWithUnitScoreTreshold: 1e9,
    attackOtherBotsBias: 5,
    smartDefending: false,
    smartAttacking: true,
  },
  LEVEL_3: {
    level: 3,
    get name() {
      return t("diff.LEVEL_3");
    },
    chanceToConquerPerTurn: 1,
    blockingObjectRemovalScoreTreshold: 4,
    reconsidersWhichTilesToProtect: false,
    protectWithTowerScoreTreshold: 25,
    protectWithUnitScoreTreshold: 20,
    attackOtherBotsBias: 0,
    smartDefending: true,
    smartAttacking: true,
  },
  LEVEL_4: {
    level: 4,
    get name() {
      return t("diff.LEVEL_4");
    },
    chanceToConquerPerTurn: 1,
    blockingObjectRemovalScoreTreshold: 7,
    reconsidersWhichTilesToProtect: true,
    protectWithTowerScoreTreshold: 25,
    protectWithUnitScoreTreshold: 20,
    attackOtherBotsBias: 0,
    smartDefending: true,
    smartAttacking: true,
  },
};

const MAP_SIZES = {
  SMALL: 50,
  MEDIUM: 150,
  LARGE: 250,
  XLARGE: 500,
  XXLARGE: 1000,
};
const DENSITIES = { LOOSE: 3, MEDIUM: 0, DENSE: -3 };

const Content = {
  unit(type) {
    return { k: "unit", t: type.type, canAct: true };
  },
  tower() {
    return { k: "tower" };
  },
  capital() {
    return { k: "capital" };
  },
  tree() {
    return { k: "tree" };
  },
  palm() {
    return { k: "palm" };
  },
  gravestone() {
    return { k: "gravestone" };
  },
  copy(c) {
    return c == null ? null : Object.assign({}, c);
  },
  strength(c) {
    if (c == null) return 0;
    switch (c.k) {
      case "unit":
        return UNIT_BY_STRENGTH[unitStrength(c)].strength;
      case "tower":
        return TOWER_STRENGTH;
      case "capital":
        return CAPITAL_STRENGTH;
      default:
        return 0;
    }
  },
  isBlocking(c) {
    return (
      c != null && (c.k === "tree" || c.k === "palm" || c.k === "gravestone")
    );
  },
  isTreeish(c) {
    return c != null && (c.k === "tree" || c.k === "palm");
  },
};
function unitStrength(c) {
  return { PEASANT: 1, SPEARMAN: 2, KNIGHT: 3, BARON: 4 }[c.t];
}
function unitStrengthStatic(type) {
  return { PEASANT: 1, SPEARMAN: 2, KNIGHT: 3, BARON: 4 }[type];
}

const GameStateHelper = {
  createEmpty() {
    const gs = {
      players: [],
      winner: null,
      winningRound: null,
      playerTurn: 0,
      round: 1,
      tiles: [],
      kingdoms: [],
      activeKingdom: null,
      heldObject: null,
      botIntelligence: "LEVEL_1",
      seed: null,
      scenario: "NONE",
    };
    GameStateHelper.prepare(gs);
    return gs;
  },

  // Rebuilds derived indexes. `tiles` is the authoritative list; kingdoms
  // store tile indices.
  prepare(gs) {
    gs.tileMap = new Map();
    for (let i = 0; i < gs.tiles.length; i++) {
      const t = gs.tiles[i];
      t.idx = i;
      gs.tileMap.set(HexMapHelper.key(t.pos), t);
    }
    gs.kingdomById = new Map();
    let maxId = 0;
    for (const k of gs.kingdoms) {
      if (typeof k.id !== "number" || !isFinite(k.id)) k.id = ++maxId;
      k.tileSet = new Set(k.tiles);
      gs.kingdomById.set(k.id, k);
      if (k.id > maxId) maxId = k.id;
    }
    if (
      typeof gs.nextKingdomId !== "number" ||
      !isFinite(gs.nextKingdomId) ||
      gs.nextKingdomId <= maxId
    ) {
      gs.nextKingdomId = maxId + 1;
    }
    return gs;
  },

  // ---------- structural helpers ----------
  getActivePlayer(gs) {
    return gs.players[gs.playerTurn];
  },

  kingdomOwnsTile(k, tile) {
    return k.tileSet.has(tile.idx);
  },

  addTileToKingdom(gs, k, tile) {
    if (!k.tileSet.has(tile.idx)) {
      k.tiles.push(tile.idx);
      k.tileSet.add(tile.idx);
    }
    tile.kingdom = k.id;
  },

  removeTileFromKingdomStruct(gs, tile) {
    const k = tile.kingdom != null ? gs.kingdomById.get(tile.kingdom) : null;
    if (k == null) return null;
    const i = k.tiles.indexOf(tile.idx);
    if (i >= 0) k.tiles.splice(i, 1);
    k.tileSet.delete(tile.idx);
    tile.kingdom = null;
    return k;
  },

  tileAt(gs, coords) {
    return gs.tileMap.get(HexMapHelper.key(coords)) || null;
  },

  // deep copy (used for undo history and bot previews)
  copy(gs) {
    return {
      players: gs.players.map((p) => ({
        index: p.index,
        type: p.type,
        roundOfDefeat: p.roundOfDefeat ?? null,
      })),
      winner: gs.winner,
      winningRound: gs.winningRound,
      playerTurn: gs.playerTurn,
      round: gs.round,
      tiles: gs.tiles.map((t) => ({
        pos: { x: t.pos.x, y: t.pos.y },
        player: t.player,
        content: Content.copy(t.content),
        kingdom: t.kingdom,
      })),
      kingdoms: gs.kingdoms.map((k) => ({
        id: k.id,
        player: k.player,
        savings: k.savings,
        tiles: k.tiles.slice(),
        doneMoving: !!k.doneMoving,
        wasActiveInCurrentTurn: !!k.wasActiveInCurrentTurn,
      })),
      activeKingdom: gs.activeKingdom,
      heldObject: Content.copy(gs.heldObject),
      botIntelligence: gs.botIntelligence,
      seed: gs.seed,
      scenario: gs.scenario,
      nextKingdomId: gs.nextKingdomId,
      config: gs.config ? JSON.parse(JSON.stringify(gs.config)) : null,
      challengeId: gs.challengeId || null,
      // UI-only transient flags are kept out of the copy
    };
  },

  // Serialized (compact-ish) form for chat; same as copy but without derived.
  // copy() already returns a clean object, so this is just an alias.
  serialize(gs) {
    return GameStateHelper.copy(gs);
  },

  fromSerialized(obj) {
    const gs = JSON.parse(JSON.stringify(obj));
    for (const p of gs.players)
      if (p.roundOfDefeat == null) p.roundOfDefeat = null;
    return GameStateHelper.prepare(gs);
  },

  // ---------- map generation ----------
  initializeMap(gs, players, landMass, density, vegetationDensity, mapSeed) {
    if (mapSeed == null) mapSeed = Date.now() >>> 0;
    if (vegetationDensity == null)
      vegetationDensity = DEAFULT_INITIAL_TREE_DENSITY;
    // the UI stores the density by name (LOOSE/MEDIUM/DENSE); the generator
    // needs the numeric value like the original Densities enum
    if (typeof density === "string" && DENSITIES[density] != null)
      density = DENSITIES[density];
    gs.density = density;
    gs.seed = mapSeed >>> 0;
    gs.players = players;
    gs.tiles = [];
    gs.kingdoms = [];
    gs.round = 1;
    gs.playerTurn = 0;
    gs.activeKingdom = null;
    gs.heldObject = null;
    gs.winner = null;
    gs.winningRound = null;
    gs.nextKingdomId = 1;
    GameStateHelper.prepare(gs);
    if (landMass === 0) return;
    const random = new Random(gs.seed);
    GameStateHelper.generateMap(
      gs,
      players,
      landMass,
      density,
      vegetationDensity,
      random,
    );
    GameStateHelper.prepare(gs);
  },

  generateMap(gs, players, landMass, density, vegetationDensity, random) {
    // the original retries until every player has at least one kingdom; the
    // RNG keeps advancing, so this terminates in practice
    let attempts = 0;
    do {
      GameStateHelper.generateTiles(gs, players, landMass, density, random);
      GameStateHelper.createInitialKingdoms(gs);
      attempts++;
    } while (
      !GameStateHelper.doesEveryPlayerHaveKingdom(gs) &&
      attempts < 10000
    );
    GameStateHelper.createTrees(gs, vegetationDensity, random);
    GameStateHelper.createCapitals(gs);
    GameStateHelper.sortPlayersByIncome(gs);
    GameStateHelper.createMoney(gs);
    GameStateHelper.prepare(gs);
  },

  doesEveryPlayerHaveKingdom(gs) {
    const playersWithoutKingdoms = new Set(gs.players.map((p) => p.index));
    for (const k of gs.kingdoms) playersWithoutKingdoms.delete(k.player);
    return playersWithoutKingdoms.size === 0;
  },

  sortPlayersByIncome(gs) {
    // Java sorts players by total income, stable. Player identity is by index,
    // so reordering just reorders the turn order; keep indices intact.
    const before = gs.playerTurn;
    gs.players.sort((a, b) => {
      const incomeA = GameStateHelper.getPlayerIncome(gs, a.index);
      const incomeB = GameStateHelper.getPlayerIncome(gs, b.index);
      return incomeA - incomeB;
    });
    gs.playerTurn = before;
  },

  getPlayerIncome(gs, playerIndex) {
    let sum = 0;
    for (const k of gs.kingdoms)
      if (k.player === playerIndex)
        sum += GameStateHelper.getKingdomIncome(gs, k);
    return sum;
  },

  // Exact port of GameStateHelper.generateTiles.
  // Grows the land mass of every player tile by tile from (0,0): a random
  // player that still has tiles left is picked, the tile is placed on the next
  // position, and the next position is chosen among the unused neighbours,
  // weighted by pow(unusedNeighboursOfCandidate, density). If a position has no
  // free neighbours the walk backtracks through the position history.
  generateTiles(gs, players, landMass, density, random) {
    const key = (c) => c.x + "," + c.y;
    // distribute the land mass evenly to all players, leftover tiles to random players
    if (typeof density !== "number" || !isFinite(density)) {
      throw new Error(
        "map density must be a number, got " + JSON.stringify(density),
      );
    }
    const tileAmountsToGenerate = new Map();
    // NOTE: the original shuffles the list it was handed (Collections.shuffle);
    // the caller passes the live player list, so gs.players ends up shuffled and
    // sortPlayersByIncome then orders it by income. We do the same, but on the
    // array that is already stored in gs so both stay identical.
    random.shuffle(gs.players);
    let remainingLandMass = Math.trunc(landMass % players.length);
    for (const player of players) {
      let additionalTiles = 0;
      if (remainingLandMass > 0) {
        additionalTiles = 1;
        remainingLandMass--;
      }
      tileAmountsToGenerate.set(
        player,
        Math.trunc(landMass / players.length) + additionalTiles,
      );
    }
    const remainingPlayers = players.slice();
    gs.tiles = [];
    gs.tileMap = new Map();
    // could be done recursively but the stack size is uncertain in the original,
    // so it uses an explicit history (we do the same)
    let nextTilePos = { x: 0, y: 0 };
    const positionHistory = []; // for backtracking
    let guard = 0;
    while (remainingPlayers.length > 0) {
      let currentTilePos = nextTilePos;
      // place tile
      const player = remainingPlayers[random.nextInt(remainingPlayers.length)];
      const tile = {
        pos: { x: currentTilePos.x, y: currentTilePos.y },
        player: player.index,
        content: null,
        kingdom: null,
        idx: gs.tiles.length,
      };
      gs.tiles.push(tile);
      gs.tileMap.set(key(currentTilePos), tile);
      // remove player if no tiles are left
      if (tileAmountsToGenerate.get(player) === 1) {
        remainingPlayers.splice(remainingPlayers.indexOf(player), 1);
      } else {
        tileAmountsToGenerate.set(
          player,
          tileAmountsToGenerate.get(player) - 1,
        );
      }
      // add to history
      positionHistory.push({ x: currentTilePos.x, y: currentTilePos.y });
      // get next tile position with empty neighbouring tiles
      let usableCoords = GameStateHelper.unusedNeighborCoords(
        gs.tileMap,
        currentTilePos,
      );
      while (usableCoords.length === 0) {
        // backtrack until able to place a tile again
        positionHistory.pop();
        if (positionHistory.length === 0) break;
        currentTilePos = positionHistory[positionHistory.length - 1];
        usableCoords = GameStateHelper.unusedNeighborCoords(
          gs.tileMap,
          currentTilePos,
        );
      }
      if (usableCoords.length === 0) break; // degenerate (only possible for landMass > all reachable tiles)
      // score each neighbouring tile for choosing the next one
      const scores = [];
      let scoreSum = 0;
      for (const candidate of usableCoords) {
        const usableCoordsCountFromCandidate =
          GameStateHelper.unusedNeighborCoords(gs.tileMap, candidate).length;
        const score = Math.pow(usableCoordsCountFromCandidate, density);
        scores.push(score);
        scoreSum += score;
      }
      // select tile based on score and random
      const randomScore = random.nextFloat() * scoreSum;
      let index = 0;
      let countedScore = scores[0];
      while (countedScore < randomScore && index < scores.length - 1) {
        index++;
        countedScore += scores[index];
      }
      nextTilePos = usableCoords[index];
      if (++guard > 1e7) break;
    }
    // Java draws the walk with an identity, we keep the same insertion order
    gs.tiles.forEach((t, i) => (t.idx = i));
  },

  // Port of HexMapHelper.getUnusedNeighborCoords
  unusedNeighborCoords(tileMap, coords) {
    const result = [];
    for (const n of HexMapHelper.getNeighborCoords(coords)) {
      if (!tileMap.has(n.x + "," + n.y)) result.push(n);
    }
    return result;
  },

  createInitialKingdoms(gs) {
    gs.kingdoms = [];
    gs.kingdomById = new Map();
    if (gs.nextKingdomId == null) gs.nextKingdomId = 1;
    for (const tile of gs.tiles) {
      for (const nt of HexMapHelper.getNeighborTiles(gs, tile)) {
        if (nt == null || nt.player !== tile.player) continue;
        if (tile.kingdom == null && nt.kingdom == null) {
          const nk = GameStateHelper.newKingdom(gs, tile.player);
          nk.tiles.push(tile.idx, nt.idx);
          nk.tileSet.add(tile.idx);
          nk.tileSet.add(nt.idx);
          tile.kingdom = nk.id;
          nt.kingdom = nk.id;
        } else if (tile.kingdom != null && nt.kingdom == null) {
          const k = gs.kingdomById.get(tile.kingdom);
          k.tiles.push(nt.idx);
          k.tileSet.add(nt.idx);
          nt.kingdom = tile.kingdom;
        } else if (tile.kingdom == null && nt.kingdom != null) {
          const k = gs.kingdomById.get(nt.kingdom);
          k.tiles.push(tile.idx);
          k.tileSet.add(tile.idx);
          tile.kingdom = nt.kingdom;
        } else if (
          tile.kingdom != null &&
          nt.kingdom != null &&
          tile.kingdom !== nt.kingdom
        ) {
          // merge nt kingdom into tile kingdom
          const master = gs.kingdomById.get(tile.kingdom);
          const slave = gs.kingdomById.get(nt.kingdom);
          if (!slave || master === slave) continue;
          for (const ti of slave.tiles) {
            if (!master.tileSet.has(ti)) {
              master.tiles.push(ti);
              master.tileSet.add(ti);
            }
            gs.tiles[ti].kingdom = master.id;
          }
          GameStateHelper.dropKingdom(gs, slave);
        }
      }
    }
    GameStateHelper.prepare(gs);
  },

  newKingdom(gs, player) {
    const k = {
      id: gs.nextKingdomId++,
      player,
      savings: 0,
      tiles: [],
      tileSet: new Set(),
      doneMoving: false,
      wasActiveInCurrentTurn: false,
    };
    gs.kingdoms.push(k);
    gs.kingdomById.set(k.id, k);
    return k;
  },

  dropKingdom(gs, kingdom) {
    const i = gs.kingdoms.indexOf(kingdom);
    if (i >= 0) gs.kingdoms.splice(i, 1);
    gs.kingdomById.delete(kingdom.id);
    if (gs.activeKingdom === kingdom.id) {
      // the Java code reassigned the active kingdom to a merged kingdom in most
      // paths; as a safety net keep acting kingdom stable (current player's
      // first remaining kingdom, else none)
      gs.activeKingdom = null;
      const activeIndex = gs.players[gs.playerTurn].index;
      for (const k of gs.kingdoms) {
        if (k.player === activeIndex) {
          gs.activeKingdom = k.id;
          break;
        }
      }
    }
  },

  createCapitals(gs) {
    for (const k of gs.kingdoms.slice()) GameStateHelper.createCapital(gs, k);
  },

  createMoney(gs) {
    for (const k of gs.kingdoms) k.savings = Math.min(k.tiles.length * 5, 20);
  },

  createTrees(gs, vegetationDensity, random) {
    for (const tile of gs.tiles) {
      if (random.nextFloat() <= vegetationDensity)
        GameStateHelper.spawnTree(gs, tile);
    }
  },

  spawnTree(gs, tile) {
    if (GameStateHelper.isCoastTile(gs, tile)) tile.content = Content.palm();
    else tile.content = Content.tree();
  },

  isCoastTile(gs, tile) {
    return HexMapHelper.getNeighborTiles(gs, tile).some((n) => n == null);
  },

  createCapital(gs, kingdom) {
    let empty = null;
    for (const ti of kingdom.tiles) {
      const tile = gs.tiles[ti];
      if (tile.content == null) {
        empty = tile;
        break;
      }
    }
    const newCapitalTile = empty != null ? empty : gs.tiles[kingdom.tiles[0]];
    if (newCapitalTile == null) return;
    newCapitalTile.content = Content.capital();
  },

  createCapitalAfterDestruction(gs, oldCapitalTile, oldKingdom) {
    const neighbors = HexMapHelper.getNeighborTiles(gs, oldCapitalTile);
    let candidate = null;
    for (const nt of neighbors) {
      if (nt == null) continue;
      if (nt.kingdom !== oldKingdom.id) continue;
      if (nt.content != null) continue;
      if (
        GameStateHelper.isCapitalCandidateDisconnected(
          gs,
          oldCapitalTile,
          oldKingdom,
          nt,
        )
      )
        continue;
      candidate = nt;
    }
    if (candidate == null) {
      for (const ti of oldKingdom.tiles) {
        const tile = gs.tiles[ti];
        if (
          tile.content == null &&
          !GameStateHelper.isCapitalCandidateDisconnected(
            gs,
            oldCapitalTile,
            oldKingdom,
            tile,
          )
        ) {
          candidate = tile;
          break;
        }
      }
    }
    if (candidate == null) {
      for (const nt of neighbors) {
        if (
          nt != null &&
          nt.kingdom === oldKingdom.id &&
          !GameStateHelper.isCapitalCandidateDisconnected(
            gs,
            oldCapitalTile,
            oldKingdom,
            nt,
          )
        ) {
          candidate = nt;
          break;
        }
      }
    }
    if (candidate == null) return;
    candidate.content = Content.capital();
  },

  isCapitalCandidateDisconnected(gs, oldCapitalTile, oldKingdom, candidate) {
    return !HexMapHelper.getNeighborTiles(gs, candidate).some(
      (nn) =>
        nn != null && nn !== oldCapitalTile && nn.kingdom === oldKingdom.id,
    );
  },

  // ---------- income / salaries ----------
  getKingdomIncome(gs, kingdom) {
    let trees = 0;
    for (const ti of kingdom.tiles) {
      const c = gs.tiles[ti].content;
      if (c != null && Content.isTreeish(c)) trees++;
    }
    return kingdom.tiles.length - trees;
  },

  getKingdomSalaries(gs, kingdom) {
    let result = 0;
    for (const ti of kingdom.tiles) {
      const c = gs.tiles[ti].content;
      if (c != null && c.k === "unit") result += UNITS[c.t].salary;
    }
    if (
      gs.activeKingdom === kingdom.id &&
      gs.heldObject != null &&
      gs.heldObject.k === "unit"
    ) {
      result += UNITS[gs.heldObject.t].salary;
    }
    return result;
  },

  getProtectionLevel(gs, tile) {
    let level = 0;
    if (tile.content != null) level = Content.strength(tile.content);
    for (const neighbor of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (
        neighbor != null &&
        neighbor.kingdom != null &&
        tile.kingdom != null &&
        tile.kingdom === neighbor.kingdom &&
        neighbor.content != null &&
        Content.strength(neighbor.content) > level
      ) {
        level = Content.strength(neighbor.content);
      }
    }
    return level;
  },

  // ---------- basic mutations ----------
  activateKingdom(gs, kingdom) {
    if (kingdom == null) return;
    kingdom.wasActiveInCurrentTurn = true;
    gs.activeKingdom = kingdom.id;
  },

  pickupObject(gs, tile) {
    gs.heldObject = tile.content;
    tile.content = null;
  },

  placeObject(gs, tile) {
    tile.content = gs.heldObject;
    gs.heldObject = null;
  },

  placeOwn(gs, tile) {
    if (tile.content != null && Content.isBlocking(tile.content)) {
      // units can't act after removing blocking stuff
      if (gs.heldObject != null && gs.heldObject.k === "unit")
        gs.heldObject.canAct = false;
    }
    GameStateHelper.placeObject(gs, tile);
  },

  combineUnits(gs, tile) {
    const heldUnit = gs.heldObject;
    const tileUnit = tile.content;
    const newStrength = unitStrength(heldUnit) + unitStrength(tileUnit);
    const newType = UNIT_BY_STRENGTH[newStrength];
    // Combining is only legal up to strength 4; guard so an invalid move can
    // never crash the game state machine (validation normally rejects it).
    if (newType == null) return;
    const newUnit = Content.unit(newType);
    newUnit.canAct = tileUnit.canAct;
    gs.heldObject = newUnit;
    GameStateHelper.placeObject(gs, tile);
  },

  conquer(gs, tile) {
    gs.heldObject.canAct = false;
    GameStateHelper.removeTileFromItsKingdom(gs, tile);
    const activeKingdom = gs.kingdomById.get(gs.activeKingdom);
    GameStateHelper.addTileToKingdom(gs, activeKingdom, tile);
    tile.player = activeKingdom.player;
    GameStateHelper.mergeConnectedKingdoms(gs, tile);
    GameStateHelper.placeObject(gs, tile);
  },

  buyPeasant(gs) {
    const k = gs.kingdomById.get(gs.activeKingdom);
    k.savings -= 10;
    if (gs.heldObject == null) {
      gs.heldObject = Content.unit(UNITS.PEASANT);
    } else {
      gs.heldObject = Content.unit(
        UNIT_BY_STRENGTH[unitStrength(gs.heldObject) + 1],
      );
    }
  },

  buyTower(gs) {
    const k = gs.kingdomById.get(gs.activeKingdom);
    k.savings -= TOWER_COST;
    gs.heldObject = Content.tower();
  },

  removeTileFromItsKingdom(gs, tile) {
    const kingdom = GameStateHelper.removeTileFromKingdomStruct(gs, tile);
    if (kingdom == null) return;

    // place a new capital if the old one is destroyed
    if (
      tile.content != null &&
      tile.content.k === "capital" &&
      kingdom.tiles.length >= 2
    ) {
      kingdom.savings = 0;
      GameStateHelper.createCapitalAfterDestruction(gs, tile, kingdom);
    }

    const oldKingdomNeighborTiles = [];
    for (const neighborTile of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (neighborTile == null) continue;
      if (neighborTile.kingdom == null) {
        if (neighborTile.player === tile.player)
          GameStateHelper.addTileToKingdom(gs, kingdom, neighborTile);
      } else {
        const neighborKingdom = gs.kingdomById.get(neighborTile.kingdom);
        if (
          neighborTile.player === tile.player &&
          neighborKingdom !== kingdom
        ) {
          GameStateHelper.combineKingdoms(gs, kingdom, neighborKingdom);
          // the master kingdom (which absorbed the neighbor) stays the active one
          gs.activeKingdom = kingdom.id;
          kingdom.wasActiveInCurrentTurn = true;
        } else if (neighborKingdom === kingdom) {
          oldKingdomNeighborTiles.push(neighborTile);
        }
      }
    }

    const potentiallySplit = GameStateHelper.wasKingdomPotentiallySplit(
      gs,
      tile,
      oldKingdomNeighborTiles,
    );
    if (potentiallySplit || kingdom.tiles.length < 2) {
      GameStateHelper.updateSplitKingdom(
        gs,
        kingdom.tiles.slice(),
        kingdom.id,
        tile,
      );
    }
  },

  wasKingdomPotentiallySplit(gs, tile, oldKingdomNeighborTiles) {
    const neighborOf = (t) => HexMapHelper.getNeighborTiles(gs, t);
    switch (oldKingdomNeighborTiles.length) {
      case 2:
        return !neighborOf(oldKingdomNeighborTiles[0]).includes(
          oldKingdomNeighborTiles[1],
        );
      case 3: {
        const a = oldKingdomNeighborTiles[0],
          b = oldKingdomNeighborTiles[1],
          c = oldKingdomNeighborTiles[2];
        return !(
          (neighborOf(a).includes(b) && neighborOf(a).includes(c)) ||
          (neighborOf(b).includes(a) && neighborOf(b).includes(c))
        );
      }
      case 4: {
        const notOld = HexMapHelper.getNeighborTiles(gs, tile).filter(
          (t) => t != null && !oldKingdomNeighborTiles.includes(t),
        );
        if (notOld.length >= 2 && neighborOf(notOld[0]).includes(notOld[1]))
          return false;
        return true;
      }
      default:
        return false;
    }
  },

  combineKingdoms(gs, masterKingdom, slaveKingdom) {
    if (
      masterKingdom == null ||
      slaveKingdom == null ||
      masterKingdom === slaveKingdom
    )
      return;
    masterKingdom.savings += slaveKingdom.savings;
    if (!slaveKingdom.doneMoving) masterKingdom.doneMoving = false;
    for (const ti of slaveKingdom.tiles) {
      const tile = gs.tiles[ti];
      if (!masterKingdom.tileSet.has(ti)) {
        masterKingdom.tiles.push(ti);
        masterKingdom.tileSet.add(ti);
      }
      tile.kingdom = masterKingdom.id;
      if (tile.content != null && tile.content.k === "capital")
        tile.content = null;
    }
    GameStateHelper.dropKingdom(gs, slaveKingdom);
    if (gs.activeKingdom == null) gs.activeKingdom = masterKingdom.id;
  },

  // The Java recursive updateSplitKingdom, adapted to work with kingdom ids.
  // `remainingTiles` = tile indices that (still) belong to the old kingdom.
  updateSplitKingdom(gs, remainingTiles, oldKingdomId, depth = 0) {
    if (remainingTiles.length === 0) return;
    if (depth > 1000) throw new Error("updateSplitKingdom recursion too deep");
    const oldKingdom = gs.kingdomById.get(oldKingdomId) || null;

    // try to find a capital among the remaining tiles
    let capitalTile = null;
    for (const ti of remainingTiles) {
      const t = gs.tiles[ti];
      if (t.content != null && t.content.k === "capital") {
        capitalTile = t;
        break;
      }
    }

    const remainingSet = new Set(remainingTiles);
    let startTile;
    let newKingdom;
    if (capitalTile != null) {
      // capital exists --> the capital keeps the old kingdom (its identity)
      startTile = capitalTile;
      newKingdom = oldKingdom;
    } else {
      // no capital exists --> create a new kingdom starting from one tile
      startTile = gs.tiles[remainingTiles[0]];
      newKingdom = GameStateHelper.newKingdom(gs, startTile.player);
    }

    // expand outwards from startTile to find connected tiles
    const claimed = new Set();
    const todo = [startTile];
    const done = new Set([startTile.idx]);
    while (todo.length > 0) {
      const cur = todo.shift();
      claimed.add(cur.idx);
      for (const exp of HexMapHelper.getNeighborTiles(gs, cur)) {
        if (
          exp != null &&
          !done.has(exp.idx) &&
          remainingSet.has(exp.idx) &&
          (exp.kingdom === oldKingdomId || exp.kingdom == null)
        ) {
          done.add(exp.idx);
          todo.push(exp);
        }
      }
    }

    // detach claimed tiles from the old kingdom's list (the Java code operates
    // on the live list; we emulate this explicitly)
    if (oldKingdom != null) {
      oldKingdom.tiles = oldKingdom.tiles.filter((ti) => !claimed.has(ti));
      oldKingdom.tileSet = new Set(oldKingdom.tiles);
    }
    // (re)build the new kingdom's list from scratch in that case too
    newKingdom.tiles = [];
    newKingdom.tileSet = new Set();
    for (const ti of remainingTiles) {
      if (claimed.has(ti))
        GameStateHelper.addTileToKingdom(gs, newKingdom, gs.tiles[ti]);
    }

    const leftover = remainingTiles.filter((ti) => !claimed.has(ti));

    if (newKingdom.tiles.length < 2) {
      // dissolve single-tile kingdoms
      for (const ti of newKingdom.tiles.slice()) {
        const tile = gs.tiles[ti];
        if (tile.content != null) {
          if (tile.content.k === "capital") GameStateHelper.spawnTree(gs, tile);
          else if (tile.content.k === "tower") tile.content = null;
        }
        GameStateHelper.removeTileFromKingdomStruct(gs, tile);
      }
      GameStateHelper.dropKingdom(gs, newKingdom);
    } else if (capitalTile == null) {
      GameStateHelper.createCapital(gs, newKingdom);
    }

    if (leftover.length > 0) {
      GameStateHelper.updateSplitKingdom(gs, leftover, oldKingdomId, depth + 1);
    }
    if (
      oldKingdom != null &&
      oldKingdom.tiles.length === 0 &&
      gs.kingdomById.has(oldKingdom.id)
    ) {
      GameStateHelper.dropKingdom(gs, oldKingdom);
    }
  },

  removeKingdom(gs, kingdom) {
    GameStateHelper.dropKingdom(gs, kingdom);
  },

  mergeConnectedKingdoms(gs, tile) {
    const kingdom = gs.kingdomById.get(tile.kingdom);
    if (!kingdom) return;
    for (const neighborTile of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (neighborTile == null || neighborTile.player !== tile.player) continue;
      const neighborKingdom =
        neighborTile.kingdom != null
          ? gs.kingdomById.get(neighborTile.kingdom)
          : null;
      if (neighborKingdom == null) {
        GameStateHelper.addTileToKingdom(gs, kingdom, neighborTile);
        neighborTile.player = tile.player;
      } else if (neighborKingdom !== kingdom) {
        GameStateHelper.combineKingdoms(gs, kingdom, neighborKingdom);
        gs.activeKingdom = kingdom.id;
        kingdom.wasActiveInCurrentTurn = true;
      }
    }
  },

  // ---------- tree spreading ----------
  getTilesOakTreesWillSpreadTo(gs) {
    const blackList = new Set();
    const result = [];
    for (const tile of gs.tiles) {
      if (blackList.has(tile.idx)) continue;
      if (tile.content != null && tile.content.k === "tree") {
        const candidates = [];
        let neighborTreeTile = null;
        for (const neighbor of HexMapHelper.getNeighborTiles(gs, tile)) {
          if (neighbor == null) continue;
          if (
            !blackList.has(neighbor.idx) &&
            neighbor.content == null &&
            !GameStateHelper.isCoastTile(gs, neighbor)
          ) {
            candidates.push(neighbor);
          } else if (
            neighbor.content != null &&
            neighbor.content.k === "tree" &&
            !blackList.has(neighbor.idx)
          ) {
            neighborTreeTile = neighbor;
          }
        }
        if (neighborTreeTile != null && candidates.length > 0) {
          candidates.sort(HexMapHelper.compareTiles);
          const newTreeTile = candidates[0];
          result.push(newTreeTile);
          blackList.add(tile.idx);
          blackList.add(newTreeTile.idx);
          blackList.add(neighborTreeTile.idx);
        }
      }
    }
    return result;
  },

  getTilesPalmTreesWillSpreadTo(gs) {
    const blackList = new Set();
    const result = [];
    for (const tile of gs.tiles) {
      if (blackList.has(tile.idx)) continue;
      if (tile.content != null && tile.content.k === "palm") {
        const candidates = HexMapHelper.getNeighborTiles(gs, tile).filter(
          (neighbor) =>
            neighbor != null &&
            !blackList.has(neighbor.idx) &&
            neighbor.content == null &&
            GameStateHelper.isCoastTile(gs, neighbor),
        );
        candidates.sort(HexMapHelper.compareTiles);
        if (candidates.length > 0) {
          const newTreeTile = candidates[0];
          result.push(newTreeTile);
          blackList.add(newTreeTile.idx);
        }
      }
    }
    return result;
  },

  spreadTrees(gs) {
    const targets = GameStateHelper.getTilesOakTreesWillSpreadTo(gs).concat(
      GameStateHelper.getTilesPalmTreesWillSpreadTo(gs),
    );
    for (const tile of targets) GameStateHelper.spawnTree(gs, tile);
  },

  progressBlockingObjects(gs, player) {
    for (const tile of gs.tiles) {
      if (tile.player === player.index && tile.content != null) {
        if (tile.content.k === "gravestone") {
          GameStateHelper.spawnTree(gs, tile);
        } else if (tile.kingdom == null && tile.content.k === "unit") {
          tile.content = Content.gravestone();
        }
      }
    }
  },

  // ---------- forgotten kingdom heuristic ----------
  getFirstForgottenKingdom(gs) {
    for (let ki = 0; ki < gs.kingdoms.length; ki++) {
      const kingdom = gs.kingdoms[ki];
      if (
        kingdom.player !== gs.players[gs.playerTurn].index ||
        kingdom.wasActiveInCurrentTurn
      )
        continue;
      let hasRemovableTileContent = false;
      let hasEmptyTile = false;
      let sumOfUnitStrength = 0;
      for (const ti of kingdom.tiles) {
        const tile = gs.tiles[ti];
        if (tile.content == null) hasEmptyTile = true;
        else if (tile.content.k === "unit")
          sumOfUnitStrength += Content.strength(tile.content);
        else if (
          !hasRemovableTileContent &&
          (Content.isTreeish(tile.content) || tile.content.k === "gravestone")
        )
          hasRemovableTileContent = true;
      }
      const affordablePeasants = Math.floor(kingdom.savings / 10);
      let sumOfTotalPossibleUnitStrength =
        sumOfUnitStrength + affordablePeasants * 1;
      sumOfTotalPossibleUnitStrength = Math.min(
        sumOfTotalPossibleUnitStrength,
        4,
      );
      const canAffordTower = kingdom.savings >= TOWER_COST;
      if (
        GameStateHelper.wasKingdomPotentiallyForgotten(
          gs,
          kingdom,
          canAffordTower,
          hasEmptyTile,
          hasRemovableTileContent,
          sumOfTotalPossibleUnitStrength,
        )
      ) {
        return kingdom;
      }
    }
    return null;
  },

  wasKingdomPotentiallyForgotten(
    gs,
    kingdom,
    canAffordTower,
    hasEmptyTile,
    hasTree,
    sumStrength,
  ) {
    if (canAffordTower && hasEmptyTile) return true;
    if (sumStrength > 0) {
      if (hasTree) return true;
      for (const ti of kingdom.tiles) {
        const tile = gs.tiles[ti];
        for (const nt of HexMapHelper.getNeighborTiles(gs, tile)) {
          if (
            nt != null &&
            nt.kingdom !== tile.kingdom &&
            GameStateHelper.getProtectionLevel(gs, nt) < sumStrength
          )
            return true;
        }
      }
    }
    return false;
  },

  // ---------- turn handling ----------
  endTurn(gs) {
    // win condition
    let noOfKingdomTiles = 0;
    for (const k of gs.kingdoms) noOfKingdomTiles += k.tiles.length;
    const activePlayerIndex = gs.players[gs.playerTurn].index;
    for (const kingdom of gs.kingdoms) {
      if (
        kingdom.player === activePlayerIndex &&
        kingdom.tiles.length >= noOfKingdomTiles * WIN_LANDMASS_PERCENTAGE &&
        gs.winner !== kingdom.player
      ) {
        gs.winner = kingdom.player;
        gs.winningRound = gs.round;
        break;
      }
    }
    // next player
    gs.playerTurn++;
    if (gs.playerTurn >= gs.players.length) {
      gs.round++;
      gs.playerTurn = 0;
      GameStateHelper.spreadTrees(gs);
    }
    GameStateHelper.progressBlockingObjects(gs, gs.players[gs.playerTurn]);
    // defeat check
    const alivePlayerIndices = new Set(gs.kingdoms.map((k) => k.player));
    for (const player of gs.players) {
      if (player.roundOfDefeat != null) continue;
      if (!alivePlayerIndices.has(player.index))
        player.roundOfDefeat = gs.round;
    }
    // reset active kingdom, update savings of new active player
    gs.activeKingdom = null;
    const newActiveIndex = gs.players[gs.playerTurn].index;
    for (const kingdom of gs.kingdoms) {
      if (kingdom.player === newActiveIndex) {
        if (gs.round !== 1)
          kingdom.savings += GameStateHelper.getKingdomIncome(gs, kingdom);
        const salaries = GameStateHelper.getKingdomSalaries(gs, kingdom);
        if (kingdom.savings < salaries) {
          for (const ti of kingdom.tiles) {
            const tile = gs.tiles[ti];
            if (tile.content != null && tile.content.k === "unit")
              tile.content = Content.gravestone();
          }
        } else {
          kingdom.savings -= salaries;
          for (const ti of kingdom.tiles) {
            const tile = gs.tiles[ti];
            if (tile.content != null && tile.content.k === "unit")
              tile.content.canAct = true;
          }
        }
      }
      kingdom.wasActiveInCurrentTurn = false;
    }
    return gs;
  },

  // ---------- moves ----------
  applyPlayerMove(gs, move) {
    if (!move || typeof move.type !== "string") return gs;
    const tile = move.pos ? GameStateHelper.tileAt(gs, move.pos) : null;
    switch (move.type) {
      case "PICK_UP":
        if (tile) GameStateHelper.pickupObject(gs, tile);
        break;
      case "PLACE_OWN":
        if (tile) GameStateHelper.placeOwn(gs, tile);
        break;
      case "COMBINE_UNITS":
        if (tile) GameStateHelper.combineUnits(gs, tile);
        break;
      case "CONQUER":
        if (tile) GameStateHelper.conquer(gs, tile);
        break;
      case "BUY_PEASANT":
        GameStateHelper.buyPeasant(gs);
        break;
      case "BUY_TOWER":
        GameStateHelper.buyTower(gs);
        break;
      case "BUY_AND_PLACE_PEASANT":
        GameStateHelper.buyPeasant(gs);
        if (tile) GameStateHelper.placeOwn(gs, tile);
        break;
      case "BUY_AND_PLACE_TOWER":
        GameStateHelper.buyTower(gs);
        if (tile) GameStateHelper.placeOwn(gs, tile);
        break;
      case "ACTIVATE_KINGDOM":
        if (tile && tile.kingdom != null && gs.kingdomById.has(tile.kingdom))
          GameStateHelper.activateKingdom(gs, gs.kingdomById.get(tile.kingdom));
        break;
      default:
        throw new Error("Unexpected player move type " + move.type);
    }
  },
};

// ---------------------------------------------------------------------------
// InputValidationHelper port (static rule checks)
// ---------------------------------------------------------------------------
const InputValidationHelper = {
  isWater(tile) {
    return tile == null;
  },

  isCorrectPlayersTurn(gs, actingPlayerIndex) {
    return gs.players[gs.playerTurn].index === actingPlayerIndex;
  },

  checkChangeActiveKingdom(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (playerIndex !== tile.player) return false;
    if (gs.heldObject != null) return false;
    if (tile.kingdom == null) return false;
    return gs.activeKingdom !== tile.kingdom;
  },

  checkPickupObject(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (playerIndex !== tile.player) return false;
    if (gs.heldObject != null) return false;
    if (tile.content == null) return false;
    if (tile.player !== playerIndex) return false;
    if (tile.content.k !== "unit") return false;
    return tile.content.canAct;
  },

  checkPlaceOwn(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (gs.heldObject == null) return false;
    if (playerIndex !== tile.player) return false;
    if (tile.kingdom == null || tile.kingdom !== gs.activeKingdom) return false;
    if (
      tile.content != null &&
      Content.isBlocking(tile.content) &&
      gs.heldObject.k !== "unit"
    )
      return false;
    return tile.content == null || Content.isBlocking(tile.content);
  },

  checkBuyAndPlaceUnitInstantly(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (!InputValidationHelper.checkBuyObject(gs, playerIndex, "unit"))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (playerIndex !== tile.player) return false;
    if (gs.activeKingdom == null || gs.activeKingdom !== tile.kingdom)
      return false;
    return tile.content == null || Content.isBlocking(tile.content);
  },

  checkBuyAndPlaceTowerInstantly(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    const activeKingdom =
      gs.activeKingdom != null ? gs.kingdomById.get(gs.activeKingdom) : null;
    if (activeKingdom == null) return false;
    if (activeKingdom.savings < TOWER_COST) return false;
    if (gs.heldObject != null) return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (playerIndex !== tile.player) return false;
    if (gs.activeKingdom !== tile.kingdom) return false;
    return tile.content == null;
  },

  checkCombineUnits(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (tile.content == null || gs.heldObject == null) return false;
    if (playerIndex !== tile.player) return false;
    if (tile.kingdom == null || gs.activeKingdom !== tile.kingdom) return false;
    if (gs.heldObject.k !== "unit" || tile.content.k !== "unit") return false;
    const sum = unitStrength(gs.heldObject) + unitStrength(tile.content);
    return sum <= 4;
  },

  checkConquer(gs, playerIndex, tile) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    if (InputValidationHelper.isWater(tile)) return false;
    if (gs.heldObject == null) return false;
    if (tile.player === playerIndex) return false;
    if (gs.heldObject.k !== "unit") return false;
    if (
      tile.content != null &&
      Content.strength(tile.content) >= Content.strength(gs.heldObject)
    )
      return false;
    let nextToOwnKingdom = false;
    for (const neighborTile of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (neighborTile == null) continue;
      if (
        neighborTile.kingdom != null &&
        neighborTile.kingdom === gs.activeKingdom
      )
        nextToOwnKingdom = true;
      const nc = neighborTile.content;
      if (
        tile.kingdom != null &&
        neighborTile.kingdom === tile.kingdom &&
        nc != null &&
        Content.strength(nc) >= Content.strength(gs.heldObject)
      ) {
        return false;
      }
    }
    return nextToOwnKingdom;
  },

  checkEndTurn(gs, playerIndex) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    return gs.heldObject == null;
  },

  checkBuyObject(gs, playerIndex, targetKind) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    const activeKingdom =
      gs.activeKingdom != null ? gs.kingdomById.get(gs.activeKingdom) : null;
    if (activeKingdom == null) return false;
    const cost = targetKind === "unit" ? 10 : TOWER_COST;
    if (activeKingdom.savings < cost) return false;
    return (
      gs.heldObject == null ||
      (gs.heldObject.k === "unit" &&
        unitStrength(gs.heldObject) < 4 &&
        targetKind === "unit")
    );
  },

  checkUndoAction(gs, playerIndex, isUndoPossible) {
    if (!InputValidationHelper.isCorrectPlayersTurn(gs, playerIndex))
      return false;
    return isUndoPossible;
  },

  checkPlayerMove(gs, playerIndex, move, isUndoPossible) {
    const tile = move.pos ? GameStateHelper.tileAt(gs, move.pos) : null;
    switch (move.type) {
      case "PICK_UP":
        return InputValidationHelper.checkPickupObject(gs, playerIndex, tile);
      case "PLACE_OWN":
        return InputValidationHelper.checkPlaceOwn(gs, playerIndex, tile);
      case "COMBINE_UNITS":
        return InputValidationHelper.checkCombineUnits(gs, playerIndex, tile);
      case "CONQUER":
        return InputValidationHelper.checkConquer(gs, playerIndex, tile);
      case "BUY_PEASANT":
        return InputValidationHelper.checkBuyObject(gs, playerIndex, "unit");
      case "BUY_TOWER":
        return InputValidationHelper.checkBuyObject(gs, playerIndex, "tower");
      case "BUY_AND_PLACE_PEASANT":
        return InputValidationHelper.checkBuyAndPlaceUnitInstantly(
          gs,
          playerIndex,
          tile,
        );
      case "BUY_AND_PLACE_TOWER":
        return InputValidationHelper.checkBuyAndPlaceTowerInstantly(
          gs,
          playerIndex,
          tile,
        );
      case "ACTIVATE_KINGDOM":
        return InputValidationHelper.checkChangeActiveKingdom(
          gs,
          playerIndex,
          tile,
        );
      case "END_TURN":
        return InputValidationHelper.checkEndTurn(gs, playerIndex);
      case "UNDO_LAST_MOVE":
        return InputValidationHelper.checkUndoAction(
          gs,
          playerIndex,
          !!isUndoPossible,
        );
      default:
        throw new Error("Unknown player move type " + move.type);
    }
  },
};

export {
  Random,
  RMULT,
  RADD,
  RMASK,
  javaRound,
  HEX_OUTER_RADIUS,
  HEXTILE_WIDTH,
  HEXTILE_HEIGHT,
  HexMapHelper,
  UNITS,
  UNIT_BY_STRENGTH,
  TOWER_COST,
  TOWER_STRENGTH,
  CAPITAL_STRENGTH,
  DEAFULT_INITIAL_TREE_DENSITY,
  WIN_LANDMASS_PERCENTAGE,
  INTELLIGENCE,
  MAP_SIZES,
  DENSITIES,
  Content,
  unitStrength,
  unitStrengthStatic,
  GameStateHelper,
  InputValidationHelper,
};
