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
} from "./core.js";

class PickedUpUnits {
  constructor() {
    this.counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  }
  ofStrength(s) {
    return this.counts[s];
  }
  addStrength(s) {
    this.counts[s]++;
  }
  removeStrength(s, amount = 1) {
    this.counts[s] -= amount;
  }
  total() {
    return this.counts[1] + this.counts[2] + this.counts[3] + this.counts[4];
  }
}

const BotAi = {
  // Generator: performs the whole bot turn on gs. Yields between kingdoms.
  *doTurn(gs, intelligence) {
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
  stateHash(gs) {
    let h = 2166136261 >>> 0;
    const mix = (v) => {
      h ^= v & 0xffffffff;
      h = Math.imul(h, 16777619) >>> 0;
    };
    mix(gs.playerTurn);
    mix(gs.round);
    mix(gs.players.length);
    for (const t of gs.tiles) {
      mix(t.pos.x + 1000);
      mix(t.pos.y + 1000);
      mix(t.player + 1);
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

  getNextKingdom(gs) {
    const activeIndex = gs.players[gs.playerTurn].index;
    for (const kingdom of gs.kingdoms) {
      if (!kingdom.doneMoving && kingdom.player === activeIndex) return kingdom;
    }
    return null;
  },

  activeKingdomOf(gs) {
    return gs.kingdomById.get(gs.activeKingdom);
  },

  doKingdomMove(gs, kingdom, intelligence, random) {
    gs.activeKingdom = kingdom.id;
    const pickedUpUnits = new PickedUpUnits();
    BotAi.pickUpAllAvailableUnits(gs, kingdom, pickedUpUnits);
    const placedTowerTiles = new Set();

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
        gs.kingdomById.get(gs.activeKingdom),
        placedTowerTiles,
      );
      BotAi.pickUpAllAvailableUnits(
        gs,
        gs.kingdomById.get(gs.activeKingdom),
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

  pickUpAllAvailableUnits(gs, kingdom, pickedUpUnits) {
    for (const ti of kingdom.tiles.slice()) {
      const tile = gs.tiles[ti];
      if (
        tile.content != null &&
        tile.content.k === "unit" &&
        tile.content.canAct
      ) {
        pickedUpUnits.addStrength(Content.strength(tile.content));
        tile.content = null;
      }
    }
  },

  removeBlockingObjects(gs, pickedUpUnits, minimumRemovalScoreTreshold) {
    const tilesWithBlockingObjects = new Map();
    for (const ti of gs.kingdomById.get(gs.activeKingdom).tiles) {
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
          gs.kingdomById.get(gs.activeKingdom),
          pickedUpUnits,
          1,
        )
      ) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile);
        tilesWithBlockingObjects.delete(best.tile.idx);
        best = BotAi.getBestBlockingObjectRemovalScore(gs, [
          ...tilesWithBlockingObjects.values(),
        ]);
      } else {
        return;
      }
    }
  },

  defendMostImportantTiles(gs, intelligence, pickedUpUnits, placedTowerTiles) {
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
        GameStateHelper.placeOwn(gs, best.tile);
        placedTowerTiles.add(best.tile.idx);
      } else if (pickedUpUnits.ofStrength(1) > 0) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile);
      } else if (
        InputValidationHelper.checkBuyObject(
          gs,
          gs.players[gs.playerTurn].index,
          "unit",
        )
      ) {
        GameStateHelper.buyPeasant(gs);
        GameStateHelper.placeOwn(gs, best.tile);
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
          gs.kingdomById.get(gs.activeKingdom),
          pickedUpUnits,
          1,
        )
      ) {
        pickedUpUnits.removeStrength(1);
        gs.heldObject = Content.unit(UNITS.PEASANT);
        GameStateHelper.placeOwn(gs, best.tile);
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

  conquerAsMuchAsPossible(gs, intelligence, pickedUpUnits) {
    let unableToConquerAnyMore = false;
    while (!unableToConquerAnyMore) {
      const possibleConquerTiles = BotAi.determineNeighboringEnemyTiles(gs);
      if (possibleConquerTiles.length === 0) break;

      const scoreInfos = possibleConquerTiles.map((t) =>
        BotAi.getOffenseTileScoreInfo(gs, intelligence, t),
      );
      scoreInfos.sort((o1, o2) => {
        let result = o2.score - o1.score;
        if (result === 0) result = HexMapHelper.compareTiles(o1.tile, o2.tile);
        return result;
      });

      let conquered = false;
      for (const info of scoreInfos) {
        if (pickedUpUnits.total() === 0) break;
        for (let i = info.requiredStrength; i <= 4; i++) {
          if (
            BotAi.conquerTileWithStoredUnit(
              gs,
              info.tile,
              UNIT_BY_STRENGTH[i],
              pickedUpUnits.ofStrength(i),
            )
          ) {
            pickedUpUnits.removeStrength(i);
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
        minRequired = Math.min(minRequired, info.requiredStrength);
      if (
        !BotAi.acquireUnit(
          gs,
          gs.kingdomById.get(gs.activeKingdom),
          pickedUpUnits,
          minRequired,
        )
      ) {
        unableToConquerAnyMore = true;
      }
    }
  },

  determineNeighboringEnemyTiles(gs) {
    const result = [];
    const seen = new Set();
    for (const ti of gs.kingdomById.get(gs.activeKingdom).tiles) {
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

  acquireUnit(gs, kingdom, pickedUpUnits, strength) {
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

  acquirePeasant(gs, kingdom, pickedUpUnits) {
    if (
      BotAi.canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, UNITS.PEASANT)
    ) {
      BotAi.buyUnitDirectly(kingdom, pickedUpUnits, UNITS.PEASANT);
      return true;
    }
    return false;
  },

  acquireSpearman(gs, kingdom, pickedUpUnits) {
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

  acquireKnight(gs, kingdom, pickedUpUnits) {
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

  acquireBaron(gs, kingdom, pickedUpUnits) {
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

  canKingdomSustainNewUnit(gs, kingdom, pickedUpUnits, unitType) {
    return (
      (GameStateHelper.getKingdomIncome(gs, kingdom) -
        BotAi.getActualKingdomSalaries(gs, kingdom, pickedUpUnits) -
        unitType.salary >=
        0 ||
        kingdom.savings > unitType.salary * 3) &&
      kingdom.savings >= 10 * unitType.strength
    );
  },

  buyUnitDirectly(kingdom, pickedUpUnits, unitType) {
    kingdom.savings -= 10 * unitType.strength;
    pickedUpUnits.addStrength(unitType.strength);
  },

  protectWithLeftoverUnits(gs, intelligence, pickedUpUnits) {
    const interestingProtectionTiles = BotAi.getInterestingProtectionTiles(gs);
    let best = BotAi.getBestDefenseTileScore(
      gs,
      intelligence,
      interestingProtectionTiles,
    );
    while (best.score >= 0) {
      if (pickedUpUnits.total() === 0) break;
      for (let s = 4; s >= 1; s--) {
        if (pickedUpUnits.ofStrength(s) > 0) {
          gs.heldObject = Content.unit(UNIT_BY_STRENGTH[s]);
          GameStateHelper.placeOwn(gs, best.tile);
          pickedUpUnits.removeStrength(s);
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

  placeLeftOverUnitsSomeWhere(gs, pickedUpUnits) {
    for (let s = 1; s <= 4; s++) {
      for (let i = 0; i < pickedUpUnits.ofStrength(s); i++) {
        const tile = BotAi.findEmptyOrTreeTileInActiveKingdom(gs);
        if (tile != null) {
          gs.heldObject = Content.unit(UNIT_BY_STRENGTH[s]);
          GameStateHelper.placeOwn(gs, tile);
        }
      }
    }
  },

  findEmptyOrTreeTileInActiveKingdom(gs) {
    const k = gs.kingdomById.get(gs.activeKingdom);
    if (!k) return null;
    for (const ti of k.tiles) {
      const tile = gs.tiles[ti];
      if (tile.content == null || tile.content.k === "tree") return tile;
    }
    return null;
  },

  sellTowers(gs, kingdom, placedTowerTiles) {
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

  getActualKingdomSalaries(gs, kingdom, pickedUpUnits) {
    let result = GameStateHelper.getKingdomSalaries(gs, kingdom);
    for (let s = 1; s <= 4; s++)
      result += pickedUpUnits.ofStrength(s) * UNIT_BY_STRENGTH[s].salary;
    return result;
  },

  getInterestingProtectionTiles(gs) {
    const result = new Set();
    const active = gs.activeKingdom;
    for (const ti of gs.kingdomById.get(active).tiles) {
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

  getBestBlockingObjectRemovalScore(gs, tiles) {
    let best = { tile: null, score: -1 };
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

  getBlockingObjectRemovalScore(gs, tile) {
    const c = tile.content;
    if (c.k === "palm") return BotAi.getPalmTreeRemovalScore(gs, tile);
    if (c.k === "tree") return BotAi.getRegularTreeRemovalScore(gs, tile);
    if (c.k === "gravestone") return BotAi.getGraveStoneRemovalScore(gs, tile);
    throw new Error("unexpected content for removal score: " + c.k);
  },

  getPalmTreeRemovalScore(gs, tile) {
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

  getRegularTreeRemovalScore(gs, tile) {
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

  getGraveStoneRemovalScore(gs, tile) {
    const willBecomePalm = GameStateHelper.isCoastTile(gs, tile);
    let score = -2;
    score += willBecomePalm
      ? BotAi.getPalmTreeRemovalScore(gs, tile)
      : BotAi.getRegularTreeRemovalScore(gs, tile);
    return score;
  },

  getBestDefenseTileScore(gs, intelligence, interestingTiles) {
    let best = { tile: null, score: -1 };
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

  getTileDefenseScore(gs, intelligence, tile) {
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

  getOffenseTileScoreInfo(gs, intelligence, tile) {
    let score;
    let requiredStrength =
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
    if (gs.players[tile.player].type === "BOT")
      score += intelligence.attackOtherBotsBias;
    return { tile, score, requiredStrength };
  },

  conquerTileWithStoredUnit(gs, tile, unitType, nrAvailableUnits) {
    if (nrAvailableUnits > 0) {
      gs.heldObject = Content.unit(unitType);
      GameStateHelper.conquer(gs, tile);
      return true;
    }
    return false;
  },
};

export { PickedUpUnits, BotAi };
