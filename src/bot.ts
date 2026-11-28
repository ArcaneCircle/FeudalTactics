// Feudal Tactics — webxdc port: bot AI.
// Direct port of de.sesu8642.feudaltactics.lib.ingame.botai.BotAi (GPL-3.0-or-later)
// from https://github.com/Sesu8642/FeudalTactics

import { t } from "./i18n.js";
import {
  Random,
  HexMapHelper,
  UNITS,
  UNIT_BY_STRENGTH,
  TOWER_COST,
  Content,
  unitStrength,
  GameStateHelper,
  InputValidationHelper,
} from "./core";
import type {
  GameState,
  Kingdom,
  Tile,
  UnitStrength,
  UnitTypeInfo,
  Intelligence,
  RandomInstance,
  ContentType,
} from "./core";

interface ScoreInfo {
  tile: Tile | null;
  score: number;
  requiredStrength?: UnitStrength;
}

class PickedUpUnits {
  counts: Record<UnitStrength, number>;
  constructor() {
    this.counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
  ofStrength(s: UnitStrength): number {
    return this.counts[s];
  }
  addStrength(s: UnitStrength): void {
    this.counts[s]++;
  }
  removeStrength(s: UnitStrength, amount = 1): void {
    this.counts[s] -= amount;
  }
  total(): number {
    return this.counts[1] + this.counts[2] + this.counts[3] + this.counts[4];
  }
}

const BotAi = {
  // Generator: performs the whole bot turn on gs. Yields between kingdoms.
  *doTurn(gs: GameState, intelligence: Intelligence): Generator<void> {
    const random = new Random(BotAi.stateHash(gs));
    let next = BotAi.getNextKingdom(gs);
    while (next != null) {
      next.doneMoving = true;
      BotAi.doKingdomMove(gs, next, intelligence, random);
      yield;
      next = BotAi.getNextKingdom(gs);
    }
    for (const kingdom of gs.kingdoms) {
      if (kingdom.doneMoving) kingdom.doneMoving = false;
    }
  },

  // Deterministic stand-in for GameState.hashCode(): based on turn, round,
  // player index and tile composition.
  stateHash(gs: GameState): number {
    let h = 2166136261 >>> 0;
    const mix = (v: number): void => {
      h ^= v & 0xffffffff;
      h = Math.imul(h, 16777619) >>> 0;
    };
    mix(gs.playerTurn);
    mix(gs.round);
    mix(gs.players.length);
    for (const t of gs.tiles) {
      mix(t.pos.x + 1000);
      mix(t.pos.y + 1000);
      mix(Number(t.player ?? 0) + 1);
      const c = t.content;
      mix(
        c == null
          ? 0
          : {
              unit: 10,
              tower: 20,
              capital: 30,
              tree: 40,
              palm: 50,
              gravestone: 60,
            }[c.k] + (c.k === "unit" ? unitStrength(c) : 0),
      );
    }
    for (const k of gs.kingdoms) {
      mix(k.player + 7);
      mix(k.savings + 50);
    }
    return h >>> 0;
  },

  getNextKingdom(gs: GameState): Kingdom | null {
    const activeIndex = gs.players[gs.playerTurn].index;
    for (const kingdom of gs.kingdoms) {
      if (!kingdom.doneMoving && kingdom.player === activeIndex) return kingdom;
    }
    return null;
  },

  activeKingdomOf(gs: GameState): Kingdom | undefined {
    return gs.activeKingdom == null
      ? undefined
      : gs.kingdomById.get(gs.activeKingdom);
  },

  doKingdomMove(
    gs: GameState,
    kingdom: Kingdom,
    intelligence: Intelligence,
    random: RandomInstance,
  ): void {
    gs.activeKingdom = kingdom.id;
    const pickedUpUnits = new PickedUpUnits();
    BotAi.pickUpAllAvailableUnits(gs, kingdom, pickedUpUnits);
    const placedTowerTiles = new Set<number>();

    BotAi.removeBlockingObjects(
      gs,
      pickedUpUnits,
      intelligence.blockingObjectRemovalScoreTreshold,
    );
    BotAi.defendMostImportantTiles(
      gs,
      intelligence,
      pickedUpUnits,
      placedTowerTiles,
    );
    if (random.nextFloat() <= intelligence.chanceToConquerPerTurn) {
      BotAi.conquerAsMuchAsPossible(gs, intelligence, pickedUpUnits);
    }
    if (intelligence.reconsidersWhichTilesToProtect) {
      BotAi.sellTowers(
        gs,
        GameStateHelper.kingdomById(gs, gs.activeKingdom),
        placedTowerTiles,
      );
      BotAi.pickUpAllAvailableUnits(
        gs,
        GameStateHelper.kingdomById(gs, gs.activeKingdom),
        pickedUpUnits,
      );
      BotAi.defendMostImportantTiles(
        gs,
        intelligence,
        pickedUpUnits,
        placedTowerTiles,
      );
      BotAi.conquerAsMuchAsPossible(gs, intelligence, pickedUpUnits);
    }
    BotAi.removeBlockingObjects(gs, pickedUpUnits, 0);
    BotAi.protectWithLeftoverUnits(gs, intelligence, pickedUpUnits);
  },

  pickUpAllAvailableUnits(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): void {
    for (const ti of kingdom.tiles.slice()) {
      const tile = gs.tiles[ti];
      if (
        tile.content != null &&
        tile.content.k === "unit" &&
        tile.content.canAct
      ) {
        pickedUpUnits.addStrength(
          Content.strength(tile.content) as UnitStrength,
        );
        tile.content = null;
      }
    }
  },

  removeBlockingObjects(
    gs: GameState,
    pickedUpUnits: PickedUpUnits,
    minimumRemovalScoreTreshold: number,
  ): void {
    const tilesWithBlockingObjects = new Map<number, Tile>();
    for (const ti of GameStateHelper.kingdomById(gs, gs.activeKingdom).tiles) {
      const tile = gs.tiles[ti];
      if (tile.content != null && Content.isBlocking(tile.content))
        tilesWithBlockingObjects.set(tile.idx, tile);
    }
    let best = BotAi.getBestBlockingObjectRemovalScore(gs, [
      ...tilesWithBlockingObjects.values(),
    ]);
    while (best.score >= minimumRemovalScoreTreshold) {
      if (
        pickedUpUnits.ofStrength(1) >= 1 ||
        BotAi.acquireUnit(
          gs,
          GameStateHelper.kingdomById(gs, gs.activeKingdom),
          pickedUpUnits,
          1,
        )
      ) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile as Tile);
        tilesWithBlockingObjects.delete((best.tile as Tile).idx);
        best = BotAi.getBestBlockingObjectRemovalScore(gs, [
          ...tilesWithBlockingObjects.values(),
        ]);
      } else {
        return;
      }
    }
  },

  defendMostImportantTiles(
    gs: GameState,
    intelligence: Intelligence,
    pickedUpUnits: PickedUpUnits,
    placedTowerTiles: Set<number>,
  ): void {
    const interestingProtectionTiles = BotAi.getInterestingProtectionTiles(gs);
    let best = BotAi.getBestDefenseTileScore(
      gs,
      intelligence,
      interestingProtectionTiles,
    );
    while (best.score >= intelligence.protectWithTowerScoreTreshold) {
      if (
        InputValidationHelper.checkBuyObject(
          gs,
          gs.players[gs.playerTurn].index,
          "tower",
        )
      ) {
        GameStateHelper.buyTower(gs);
        GameStateHelper.placeOwn(gs, best.tile as Tile);
        placedTowerTiles.add((best.tile as Tile).idx);
      } else if (pickedUpUnits.ofStrength(1) > 0) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile as Tile);
      } else if (
        InputValidationHelper.checkBuyObject(
          gs,
          gs.players[gs.playerTurn].index,
          "unit",
        )
      ) {
        GameStateHelper.buyPeasant(gs);
        GameStateHelper.placeOwn(gs, best.tile as Tile);
      } else {
        break;
      }
      best = BotAi.getBestDefenseTileScore(
        gs,
        intelligence,
        interestingProtectionTiles,
      );
    }
    while (best.score >= intelligence.protectWithUnitScoreTreshold) {
      if (
        pickedUpUnits.ofStrength(1) > 0 ||
        BotAi.acquireUnit(
          gs,
          GameStateHelper.kingdomById(gs, gs.activeKingdom),
          pickedUpUnits,
          1,
        )
      ) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile as Tile);
      } else {
        break;
      }
      best = BotAi.getBestDefenseTileScore(
        gs,
        intelligence,
        interestingProtectionTiles,
      );
    }
  },

  conquerAsMuchAsPossible(
    gs: GameState,
    intelligence: Intelligence,
    pickedUpUnits: PickedUpUnits,
  ): void {
    let unableToConquerAnyMore = false;
    while (!unableToConquerAnyMore) {
      const possibleConquerTiles = BotAi.determineNeighboringEnemyTiles(gs);
      if (possibleConquerTiles.length === 0) break;

      const scoreInfos = possibleConquerTiles.map((t) =>
        BotAi.getOffenseTileScoreInfo(gs, intelligence, t),
      );
      scoreInfos.sort((o1, o2) => {
        let result = o2.score - o1.score;
        if (result === 0)
          result = HexMapHelper.compareTiles(o1.tile as Tile, o2.tile as Tile);
        return result;
      });

      let conquered = false;
      for (const info of scoreInfos) {
        if (pickedUpUnits.total() === 0) break;
        for (let i = info.requiredStrength as number; i <= 4; i++) {
          const st = i as UnitStrength;
          if (
            BotAi.conquerTileWithStoredUnit(
              gs,
              info.tile as Tile,
              UNIT_BY_STRENGTH[st],
              pickedUpUnits.ofStrength(st),
            )
          ) {
            pickedUpUnits.removeStrength(st);
            conquered = true;
            break;
          }
        }
        if (conquered) break;
      }
      if (conquered) continue;

      // buy or combine more units
      let minRequired = Infinity;
      for (const info of scoreInfos)
        minRequired = Math.min(minRequired, info.requiredStrength as number);
      if (
        !BotAi.acquireUnit(
          gs,
          GameStateHelper.kingdomById(gs, gs.activeKingdom),
          pickedUpUnits,
          minRequired as UnitStrength,
        )
      ) {
        unableToConquerAnyMore = true;
      }
    }
  },

  determineNeighboringEnemyTiles(gs: GameState): Tile[] {
    const result = [];
    const seen = new Set();
    for (const ti of GameStateHelper.kingdomById(gs, gs.activeKingdom).tiles) {
      const tile = gs.tiles[ti];
      for (const nt of HexMapHelper.getNeighborTiles(gs, tile)) {
        if (nt != null && nt.kingdom !== tile.kingdom && !seen.has(nt.idx)) {
          seen.add(nt.idx);
          result.push(nt);
        }
      }
    }
    return result;
  },

  acquireUnit(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
    strength: UnitStrength,
  ): boolean {
    switch (strength) {
      case 1:
        return BotAi.acquirePeasant(gs, kingdom, pickedUpUnits);
      case 2:
        return BotAi.acquireSpearman(gs, kingdom, pickedUpUnits);
      case 3:
        return BotAi.acquireKnight(gs, kingdom, pickedUpUnits);
      case 4:
        return BotAi.acquireBaron(gs, kingdom, pickedUpUnits);
      default:
        return false;
    }
  },

  acquirePeasant(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): boolean {
    if (
      BotAi.canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, UNITS.PEASANT)
    ) {
      BotAi.buyUnitDirectly(kingdom, pickedUpUnits, UNITS.PEASANT);
      return true;
    }
    return false;
  },

  acquireSpearman(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): boolean {
    if (pickedUpUnits.ofStrength(1) >= 2) {
      pickedUpUnits.removeStrength(1, 2);
      pickedUpUnits.addStrength(2);
      return true;
    } else if (
      pickedUpUnits.ofStrength(1) >= 1 &&
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        UNITS.SPEARMAN.salary +
        UNITS.PEASANT.salary >=
        0 ||
        kingdom.savings > UNITS.SPEARMAN.salary * 3) &&
      kingdom.savings >= 10
    ) {
      kingdom.savings -= 10;
      pickedUpUnits.addStrength(2);
      pickedUpUnits.removeStrength(1);
      return true;
    } else if (
      BotAi.canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, UNITS.SPEARMAN)
    ) {
      BotAi.buyUnitDirectly(kingdom, pickedUpUnits, UNITS.SPEARMAN);
      return true;
    }
    return false;
  },

  acquireKnight(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): boolean {
    if (pickedUpUnits.ofStrength(1) >= 1 && pickedUpUnits.ofStrength(2) >= 1) {
      pickedUpUnits.removeStrength(1);
      pickedUpUnits.removeStrength(2);
      pickedUpUnits.addStrength(3);
      return true;
    } else if (
      pickedUpUnits.ofStrength(2) >= 1 &&
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        UNITS.KNIGHT.salary +
        UNITS.SPEARMAN.salary >=
        0 ||
        kingdom.savings > UNITS.KNIGHT.salary * 3) &&
      kingdom.savings > 10
    ) {
      kingdom.savings -= 10;
      pickedUpUnits.removeStrength(2);
      pickedUpUnits.addStrength(3);
      return true;
    } else if (
      BotAi.canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, UNITS.KNIGHT)
    ) {
      BotAi.buyUnitDirectly(kingdom, pickedUpUnits, UNITS.KNIGHT);
      return true;
    }
    return false;
  },

  acquireBaron(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): boolean {
    if (pickedUpUnits.ofStrength(1) >= 1 && pickedUpUnits.ofStrength(3) >= 1) {
      pickedUpUnits.removeStrength(1);
      pickedUpUnits.removeStrength(3);
      pickedUpUnits.addStrength(4);
      return true;
    } else if (pickedUpUnits.ofStrength(2) >= 2) {
      pickedUpUnits.removeStrength(2);
      pickedUpUnits.removeStrength(2);
      pickedUpUnits.addStrength(4);
      return true;
    } else if (
      pickedUpUnits.ofStrength(3) >= 1 &&
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        UNITS.BARON.salary +
        UNITS.KNIGHT.salary >=
        0 ||
        kingdom.savings > UNITS.BARON.salary * 3) &&
      kingdom.savings >= 10
    ) {
      kingdom.savings -= 10;
      pickedUpUnits.removeStrength(3);
      pickedUpUnits.addStrength(4);
      return true;
    } else if (
      pickedUpUnits.ofStrength(2) >= 1 &&
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        UNITS.BARON.salary +
        UNITS.SPEARMAN.salary >=
        0 ||
        kingdom.savings > UNITS.BARON.salary * 3) &&
      kingdom.savings >= 20
    ) {
      kingdom.savings -= 20;
      pickedUpUnits.removeStrength(2);
      pickedUpUnits.addStrength(4);
      return true;
    } else if (
      BotAi.canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, UNITS.BARON)
    ) {
      BotAi.buyUnitDirectly(kingdom, pickedUpUnits, UNITS.BARON);
      return true;
    }
    return false;
  },

  canKingdomSustainNewUnit(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
    unitType: UnitTypeInfo,
  ): boolean {
    return (
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        unitType.salary >=
        0 ||
        kingdom.savings > unitType.salary * 3) &&
      kingdom.savings >= 10 * unitType.strength
    );
  },

  buyUnitDirectly(
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
    unitType: UnitTypeInfo,
  ): void {
    kingdom.savings -= 10 * unitType.strength;
    pickedUpUnits.addStrength(unitType.strength);
  },

  protectWithLeftoverUnits(
    gs: GameState,
    intelligence: Intelligence,
    pickedUpUnits: PickedUpUnits,
  ): void {
    const interestingProtectionTiles = BotAi.getInterestingProtectionTiles(gs);
    let best = BotAi.getBestDefenseTileScore(
      gs,
      intelligence,
      interestingProtectionTiles,
    );
    while (best.score >= 0) {
      if (pickedUpUnits.total() === 0) break;
      for (let s = 4; s >= 1; s--) {
        const st = s as UnitStrength;
        if (pickedUpUnits.ofStrength(st) > 0) {
          gs.heldObject = Content.unit(UNIT_BY_STRENGTH[st]);
          GameStateHelper.placeOwn(gs, best.tile as Tile);
          pickedUpUnits.removeStrength(st);
          break;
        }
      }
      best = BotAi.getBestDefenseTileScore(
        gs,
        intelligence,
        interestingProtectionTiles,
      );
    }
    BotAi.placeLeftOverUnitsSomeWhere(gs, pickedUpUnits);
  },

  placeLeftOverUnitsSomeWhere(
    gs: GameState,
    pickedUpUnits: PickedUpUnits,
  ): void {
    for (let s = 1; s <= 4; s++) {
      const st = s as UnitStrength;
      for (let i = 0; i < pickedUpUnits.ofStrength(st); i++) {
        const tile = BotAi.findEmptyOrTreeTileInActiveKingdom(gs);
        if (tile != null) {
          gs.heldObject = Content.unit(UNIT_BY_STRENGTH[st]);
          GameStateHelper.placeOwn(gs, tile);
        }
      }
    }
  },

  findEmptyOrTreeTileInActiveKingdom(gs: GameState): Tile | null {
    const k =
      gs.activeKingdom == null ? null : gs.kingdomById.get(gs.activeKingdom);
    if (!k) return null;
    for (const ti of k.tiles) {
      const tile = gs.tiles[ti];
      if (tile.content == null || tile.content.k === "tree") return tile;
    }
    return null;
  },

  sellTowers(
    gs: GameState,
    kingdom: Kingdom | null,
    placedTowerTiles: Set<number>,
  ): void {
    if (!kingdom) return;
    for (const ti of placedTowerTiles) {
      const tile = gs.tiles[ti];
      if (tile != null && tile.content != null && tile.content.k === "tower") {
        tile.content = null;
        kingdom.savings += TOWER_COST;
      } else if (tile != null && tile.content == null) {
        kingdom.savings += TOWER_COST;
      }
    }
  },

  getActualKingdomSalaries(
    gs: GameState,
    kingdom: Kingdom,
    pickedUpUnits: PickedUpUnits,
  ): number {
    let result = GameStateHelper.getKingdomSalaries(gs, kingdom);
    for (let s = 1; s <= 4; s++) {
      const st = s as UnitStrength;
      result += pickedUpUnits.ofStrength(st) * UNIT_BY_STRENGTH[st].salary;
    }
    return result;
  },

  getInterestingProtectionTiles(gs: GameState): Set<number> {
    const result = new Set<number>();
    const active = gs.activeKingdom;
    for (const ti of GameStateHelper.kingdomById(gs, active).tiles) {
      const tile = gs.tiles[ti];
      for (const nn of HexMapHelper.getNeighborsNeighborTiles(gs, tile)) {
        if (nn != null && nn.kingdom !== active) {
          result.add(tile.idx);
          break;
        }
      }
    }
    return result;
  },

  getBestBlockingObjectRemovalScore(gs: GameState, tiles: Tile[]): ScoreInfo {
    let best: ScoreInfo = { tile: null, score: -1 };
    for (const tile of tiles) {
      const score = BotAi.getBlockingObjectRemovalScore(gs, tile);
      if (
        score > best.score ||
        (score === best.score &&
          best.tile != null &&
          HexMapHelper.compareTiles(tile, best.tile) > 0)
      ) {
        best = { tile, score };
      }
    }
    return best;
  },

  getBlockingObjectRemovalScore(gs: GameState, tile: Tile): number {
    const c = tile.content as ContentType;
    if (c.k === "palm") return BotAi.getPalmTreeRemovalScore(gs, tile);
    if (c.k === "tree") return BotAi.getRegularTreeRemovalScore(gs, tile);
    if (c.k === "gravestone") return BotAi.getGraveStoneRemovalScore(gs, tile);
    throw new Error("unexpected content for removal score: " + c.k);
  },

  getPalmTreeRemovalScore(gs: GameState, tile: Tile): number {
    for (const nt of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (
        nt != null &&
        nt.content == null &&
        nt.kingdom === tile.kingdom &&
        GameStateHelper.isCoastTile(gs, nt)
      )
        return 9;
    }
    return 6;
  },

  getRegularTreeRemovalScore(gs: GameState, tile: Tile): number {
    let hasPartnerTree = false;
    let hasSpaceToSpread = false;
    for (const nt of HexMapHelper.getNeighborTiles(gs, tile)) {
      if (nt != null) {
        if (
          nt.content == null &&
          nt.kingdom === tile.kingdom &&
          !GameStateHelper.isCoastTile(gs, nt)
        )
          hasSpaceToSpread = true;
        if (nt.content != null && nt.content.k === "tree")
          hasPartnerTree = true;
      }
    }
    if (hasPartnerTree && hasSpaceToSpread) return 10;
    return 3;
  },

  getGraveStoneRemovalScore(gs: GameState, tile: Tile): number {
    const willBecomePalm = GameStateHelper.isCoastTile(gs, tile);
    let score = -2;
    score += willBecomePalm
      ? BotAi.getPalmTreeRemovalScore(gs, tile)
      : BotAi.getRegularTreeRemovalScore(gs, tile);
    return score;
  },

  getBestDefenseTileScore(
    gs: GameState,
    intelligence: Intelligence,
    interestingTiles: Set<number>,
  ): ScoreInfo {
    let best: ScoreInfo = { tile: null, score: -1 };
    for (const ti of interestingTiles) {
      const tile = gs.tiles[ti];
      const score = BotAi.getTileDefenseScore(gs, intelligence, tile);
      if (
        score > best.score ||
        (score === best.score &&
          best.tile != null &&
          HexMapHelper.compareTiles(tile, best.tile) > 0)
      ) {
        best = { tile, score };
      }
    }
    return best;
  },

  getTileDefenseScore(
    gs: GameState,
    intelligence: Intelligence,
    tile: Tile,
  ): number {
    if (tile.content != null) return -1;
    let tileIsBorder = false;
    let tileIsProtected = false;
    let score = 0;
    for (const neighborTile of HexMapHelper.getNeighborTiles(gs, tile)) {
      let neighborIsBorder = false;
      let neighborIsProtected = false;
      if (neighborTile != null && neighborTile.kingdom != null) {
        if (neighborTile.kingdom !== tile.kingdom) {
          tileIsBorder = true;
        } else {
          if (
            neighborTile.content != null &&
            Content.strength(neighborTile.content) > 0
          ) {
            tileIsProtected = true;
            neighborIsProtected = true;
          }
          for (const nn of HexMapHelper.getNeighborTiles(gs, neighborTile)) {
            if (nn != null) {
              if (nn.kingdom != null && nn.kingdom !== tile.kingdom)
                neighborIsBorder = true;
              else if (
                nn.kingdom === tile.kingdom &&
                nn.content != null &&
                Content.strength(nn.content) > 0
              )
                neighborIsProtected = true;
            }
          }
        }
      }
      if (neighborIsBorder) score += neighborIsProtected ? 1 : 10;
    }
    if (tileIsBorder) score += tileIsProtected ? 1 : 5;
    if (!intelligence.smartDefending) return 0;
    return score;
  },

  getOffenseTileScoreInfo(
    gs: GameState,
    intelligence: Intelligence,
    tile: Tile,
  ): ScoreInfo {
    let score;
    let requiredStrength: number =
      tile.content == null ? 1 : Content.strength(tile.content) + 1;
    const tileKingdom = tile.kingdom;
    if (tileKingdom == null) {
      score = tile.content == null ? 1 : 5;
    } else {
      if (tile.content != null) {
        if (tile.content.k !== "capital")
          score = Content.strength(tile.content) + 2;
        else score = 50;
      } else {
        score = 2;
      }
      const neighborTiles = HexMapHelper.getNeighborTiles(gs, tile).slice();
      neighborTiles.push(tile);
      for (const nt of neighborTiles) {
        if (
          nt != null &&
          nt.kingdom === tile.kingdom &&
          nt.content != null &&
          Content.strength(nt.content) >= requiredStrength
        ) {
          requiredStrength = Content.strength(nt.content) + 1;
        } else if (nt != null && nt.kingdom === gs.activeKingdom) {
          score++;
        }
      }
    }
    if (!intelligence.smartAttacking) score = 0;
    if (gs.players[tile.player as number].type === "BOT")
      score += intelligence.attackOtherBotsBias;
    return { tile, score, requiredStrength: requiredStrength as UnitStrength };
  },

  conquerTileWithStoredUnit(
    gs: GameState,
    tile: Tile,
    unitType: UnitTypeInfo,
    nrAvailableUnits: number,
  ): boolean {
    if (nrAvailableUnits > 0) {
      gs.heldObject = Content.unit(unitType);
      GameStateHelper.conquer(gs, tile);
      return true;
    }
    return false;
  },
};

export { PickedUpUnits, BotAi };
