import { I18N, t } from "./i18n.js";
import {
  HexMapHelper,
  INTELLIGENCE,
  MAP_SIZES,
  DENSITIES,
  Content,
  GameStateHelper,
  InputValidationHelper,
  UNITS,
  UNIT_BY_STRENGTH,
  HEX_OUTER_RADIUS,
  HEXTILE_WIDTH,
  HEXTILE_HEIGHT,
  javaRound,
  WIN_LANDMASS_PERCENTAGE,
} from "./core.js";
import { BotAi } from "./bot.js";
import {
  PLAYER_COLOR_CSS,
  TextureAtlasHelper,
  MapCamera,
  MapRenderer,
  GameStateConverter,
} from "./render.js";
import "./styles.css";

const App = {
  gs: null, // authoritative game state (prepared, with derived indexes)
  camera: new MapCamera(),
  renderer: null,
  undoStack: [], // serialized snapshots of the current turn
  lastTap: { key: null, time: 0 },
  enemyRunning: false,
  skipEnemyDisplay: false,
  prefs: {
    showEnemyTurns: true,
    enemySpeed: 300,
    warnForgotten: true,
    autoEnd: false,
  },
  challengeReported: false, // a challenge result was already sent this game
  spectating: false, // the player was defeated and watches the bots finish
  pendingMoveTimer: null,
  gameOverShown: false,
  botGenerator: null,
  botTimer: null,
};

// ---------------------------------------------------------------------------
// Persistence (localStorage survives app restarts on the same device)
// ---------------------------------------------------------------------------
const Store = {
  key(name) {
    return "feudaltactics.xdc." + name;
  },
  get(name, fallback) {
    try {
      const raw = localStorage.getItem(Store.key(name));
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(name, value) {
    try {
      localStorage.setItem(Store.key(name), JSON.stringify(value));
    } catch (e) {
      /* storage may be unavailable */
    }
  },
  remove(name) {
    try {
      localStorage.removeItem(Store.key(name));
    } catch (e) {}
  },
  trySet(name, value) {
    try {
      localStorage.setItem(Store.key(name), JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
};

App.activeIsHuman = function () {
  if (!App.gs) return false;
  const active = App.gs.players[App.gs.playerTurn];
  if (active.type !== "HUMAN") return false;
  // while spectating, the (defeated) human seat is played out automatically
  return !App.spectating;
};

App.maybeStartEnemyTurn = function () {
  if (!App.gs) return;
  if (App.activeIsHuman()) {
    App.skipEnemyDisplay = false;
    UI.updateHud();
    return;
  }
  if (App.spectating) {
    Flow.autoPlaySeat();
    return;
  }
  Flow.startEnemyTurn();
};

// ---------------------------------------------------------------------------
// Small DOM helpers
// ---------------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
let toastTimer = null;
function toast(msg, ms = 2200) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}
function show(id) {
  $(id).classList.remove("hidden");
}
function hide(id) {
  $(id).classList.add("hidden");
}
function showOverlayOnly(id) {
  for (const o of [
    "menu",
    "setup",
    "challenges",
    "howto",
    "dialog",
    "gameover",
  ]) {
    if (o === id) show(o);
    else hide(o);
  }
}
function hideAllOverlays() {
  for (const o of [
    "menu",
    "setup",
    "challenges",
    "howto",
    "dialog",
    "gameover",
  ])
    hide(o);
}

function dialog(title, text, buttons) {
  $("dialog-title").textContent = title;
  $("dialog-text").textContent = text;
  const wrap = $("dialog-buttons");
  wrap.innerHTML = "";
  for (const b of buttons) {
    if (b.hidden) continue; // a caller may omit an action that does not apply
    const el = document.createElement("button");
    el.className =
      "big-btn" + (b.primary ? " primary" : b.subtle ? " subtle" : "");
    el.textContent = b.label;
    el.onclick = () => {
      hide("dialog");
      if (b.action) b.action();
    };
    wrap.appendChild(el);
  }
  show("dialog");
}

// ---------------------------------------------------------------------------
// webxdc
// ---------------------------------------------------------------------------

const DeepLink = {
  FIELDS: {
    seed: "s",
    playerCount: "p",
    humanIndex: "h",
    botLevel: "d",
    mapSize: "m",
    density: "x",
  },

  // Builds the href for an update payload, or null if the payload has no game
  // setup to open.
  forPayload(p) {
    if (!p || typeof p !== "object") return null;
    const day = p.daily || Daily.fromId(p.id);
    if (day) {
      if (p.t !== "challenge" && p.t !== "result") return null;
      return "index.html?t=daily&d=" + encodeURIComponent(Daily.seed(day));
    }
    if (p.t !== "challenge" && p.t !== "result") return null;
    const f = DeepLink.FIELDS;
    const q = [];
    if (p.seed != null) q.push(f.seed + "=" + encodeURIComponent(p.seed));
    for (const k of [
      "playerCount",
      "humanIndex",
      "botLevel",
      "mapSize",
      "density",
    ]) {
      if (p[k] != null) q.push(f[k] + "=" + encodeURIComponent(p[k]));
    }
    if (q.length < 6) return null; // without the full setup the link is useless
    if (p.id != null) q.push("id=" + encodeURIComponent(String(p.id)));
    return "index.html?t=" + p.t + "&" + q.join("&");
  },

  parse() {
    try {
      const url = new URL(window.location.href);
      let params = url.searchParams;
      if (!params.get("t") && url.hash.length > 1)
        params = new URLSearchParams(url.hash.slice(1));
      const t = params.get("t");
      if (!t) return null;
      if (t !== "challenge" && t !== "result" && t !== "daily") return null;
      if (t === "daily") {
        // "d" is the seed here, not the difficulty: Daily.fromSeed turns it back
        // into the date and Daily.SETUP supplies the rest of the setup.
        const day = Daily.fromSeed(params.get("d"));
        if (!day) return null;
        return { t, id: Daily.id(day), cfg: DeepLink.dailyCfg(day) };
      }
      const f = DeepLink.FIELDS;
      const num = (v) =>
        v != null && v !== "" && isFinite(parseInt(v, 10))
          ? parseInt(v, 10)
          : null;
      const cfg = {
        seed: num(params.get(f.seed)),
        playerCount: num(params.get(f.playerCount)),
        humanIndex: num(params.get(f.humanIndex)),
        botLevel: params.get(f.botLevel),
        mapSize: params.get(f.mapSize),
        density: params.get(f.density),
      };
      const complete =
        cfg.seed != null &&
        cfg.playerCount != null &&
        cfg.humanIndex != null &&
        cfg.botLevel &&
        cfg.mapSize &&
        cfg.density;
      return { t, id: params.get("id") || null, cfg: complete ? cfg : null };
    } catch (e) {
      return null;
    }
  },

  dailyCfg(day) {
    const meta = Daily.meta(day);
    return {
      id: meta.id,
      daily: day,
      seed: meta.seed,
      playerCount: meta.playerCount,
      humanIndex: meta.humanIndex,
      botLevel: meta.botLevel,
      mapSize: meta.mapSize,
      density: meta.density,
      landMass: meta.landMass,
    };
  },

  // Applies a parsed target.
  //
  // Like clicking "Play" on a challenge card but with a confirmation step: the
  // New Game dialog opens pre-filled with the shared map, and Start begins the
  // same game. The shared game then runs as a challenge, so its result is
  // posted back to the chat exactly as if Play had been pressed.
  apply(target) {
    if (!target || !target.cfg) return false;
    // Opening a daily link must behave exactly like picking "Challenge of the
    // Day" from the menu: same dialog, same lock, same result reporting.
    if (target.t === "daily") return Setup.openDaily(target.cfg.daily);
    hideAllOverlays();
    show("setup");
    Setup.prefill(Object.assign({ id: target.id }, target.cfg), target.t);
    return true;
  },
};

// ---------------------------------------------------------------------------
// Challenge of the day. The seed is derived from the UTC date, so everyone in
// the chat plays the same map on the same day without any coordination.
//
// UTC on purpose: a local-time seed would give players in different time zones
// different maps for the same calendar day, and the chat line names the day.
//
// 2026-01-01 -> seed 20260101, id "daily-2026-01-01", label "1/1/2026"
// ---------------------------------------------------------------------------
const Daily = {
  ID_PREFIX: "daily-",

  // Canonical "Y-M-D". Accepts a Date, an already normalised key (so callers
  // can pass either without caring) or nothing for today.
  key(d) {
    if (typeof d === "string") {
      const s = d.trim();
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
        const [y, m, day] = s.split("-").map(Number);
        return y + "-" + m + "-" + day;
      }
      return Daily.fromSeed(s) || Daily.key();
    }
    const t = d instanceof Date ? d : new Date();
    return (
      t.getUTCFullYear() + "-" + (t.getUTCMonth() + 1) + "-" + t.getUTCDate()
    );
  },

  // day/month/year -> seed, so the seed itself reads as a date
  seed(key) {
    const [y, m, d] = key.split("-").map(Number);
    return y * 10000 + m * 100 + d;
  },

  // "1/1/2026" - the form shown in chat
  label(key) {
    const [y, m, d] = key.split("-").map(Number);
    return `${d}/${m}/${y}`;
  },

  id(key) {
    return Daily.ID_PREFIX + key;
  },

  // The date a challenge id belongs to, or null if it is not a daily challenge.
  fromId(id) {
    return typeof id === "string" && id.indexOf(Daily.ID_PREFIX) === 0
      ? id.slice(Daily.ID_PREFIX.length)
      : null;
  },

  // A shared daily link carries a date, but a payload written by an older
  // version of the app (or by a client that only knows the seed) may carry the
  // numeric seed instead. Accept both and return the normalised "Y-M-D" key.
  fromSeed(v) {
    if (v == null || v === "") return null;
    const str = String(v).trim();
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return y + "-" + m + "-" + d;
      return null;
    }
    const n = parseInt(str, 10);
    if (!isFinite(n) || n <= 0) return null;
    // the seed reads as a date: YYYYMMDD
    const y = Math.floor(n / 10000),
      m = Math.floor((n % 10000) / 100),
      d = n % 100;
    if (y >= 1970 && y <= 9999 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return y + "-" + m + "-" + d;
    return null;
  },

  // Fixed part of the daily: 5 enemies (6 players), medium size, compact.
  // Difficulty is the one setting the player may choose, and it is reported in
  // the chat line ("in hard mode") so a result is never ambiguous.
  SETUP: {
    playerCount: 6,
    humanIndex: 0,
    botLevel: "LEVEL_3", // hard, the default
    mapSize: "MEDIUM",
    density: "DENSE",
  },

  // Which difficulty a daily result was played on. Prefers what was actually
  // played; falls back to the challenge's own setting.
  difficultyOf(difficulty) {
    const key =
      typeof difficulty === "string"
        ? difficulty
        : difficulty && difficulty.difficulty;
    return key || Daily.SETUP.botLevel;
  },

  // "hard mode" from LEVEL_3
  modeLabel(difficulty) {
    const name =
      (INTELLIGENCE[Daily.difficultyOf(difficulty)] || {}).name || "?";
    return name.toLowerCase() + " mode";
  },

  meta(key) {
    const k = key || Daily.key();
    return Object.assign(
      {
        id: Daily.id(k),
        daily: k,
        seed: Daily.seed(k),
        landMass: MAP_SIZES.MEDIUM,
        created: Date.now(),
      },
      Daily.SETUP,
    );
  },
};

const Chat = {
  available: false,
  challenges: new Map(), // id -> {meta, results:[...], prevMeta}
  selfAddr: "local",
  selfName: null, // set below: translated "You" until webxdc provides a name

  init() {
    try {
      if (typeof window !== "undefined" && window.webxdc) {
        Chat.available = true;
        Chat.selfAddr = window.webxdc.selfAddr || "local";
        Chat.selfName = window.webxdc.selfName || t("ui.you");
        if (typeof window.webxdc.setUpdateListener === "function") {
          window.webxdc.setUpdateListener(
            (update) => Chat.handleUpdate(update),
            0,
          );
        }
      }
    } catch (e) {
      Chat.available = false;
    }
  },

  handleUpdate(update) {
    const p = update && update.payload;
    if (!p || typeof p !== "object") return;
    if (p.t === "daily" && p.daily) {
      // A peer started today's map. Register it so the challenge list and any
      // later result line can describe it, but do not count it as unseen: it is
      // not a map to hand out.
      if (!Chat.challenges.has(p.id)) {
        Chat.challenges.set(p.id, {
          meta: Daily.meta(p.daily),
          results: [],
          daily: true,
        });
      }
      return;
    }
    if (p.t === "challenge") {
      const c = Chat.challenges.get(p.id) || { results: [] };
      c.meta = {
        id: p.id,
        creator: p.creator || "?",
        creatorAddr: p.creatorAddr || (c.meta && c.meta.creatorAddr) || null,
        seed: p.seed,
        playerCount: p.playerCount,
        botLevel: p.botLevel,
        mapSize: p.mapSize,
        density: p.density,
        humanIndex: p.humanIndex,
        daily: p.daily || Daily.fromId(p.id) || null,
        created: p.created || 0,
      };
      Chat.challenges.set(p.id, c);
      if (App.gs == null) UI.updateChallengeBadge();
    } else if (p.t === "result") {
      const c = Chat.challenges.get(p.id);
      if (!c) return;
      // one result per player and challenge (keep the best/earliest)
      // one result per player *and mode*: a daily lets people pick a difficulty,
      // and an easy win should not overwrite a hard one
      const mode = p.mode || null;
      const dup = c.results.findIndex(
        (r) => r.addr === p.addr && (r.mode || null) === mode,
      );
      const entry = {
        addr: p.addr,
        name: p.name || "?",
        victory: !!p.victory,
        round: p.round || 0,
        aborted: !!p.aborted,
        mode,
        created: p.created || 0,
      };
      if (dup >= 0) {
        const old = c.results[dup];
        const better =
          (entry.victory && !old.victory) ||
          (entry.victory === old.victory &&
            entry.round > 0 &&
            entry.round < old.round);
        if (better) c.results[dup] = entry;
      } else {
        c.results.push(entry);
      }
      if (
        document.getElementById("challenges") &&
        !document.getElementById("challenges").classList.contains("hidden")
      ) {
        UI.renderChallengeList();
      }
      UI.updateChallengeBadge();
    }
  },

  send(payload, info, applyLocally) {
    if (!Chat.available) {
      toast(t("toast.chatUnavailable"));
      return false;
    }
    // `href` makes the update's info message in the chat tappable: the
    // messenger then starts this app at <root>/<href> and DeepLink takes over.
    const href = DeepLink.forPayload(payload);
    // Apply optimistically. Messengers are allowed to drop updates (e.g. when
    // the user may not post), and some do not replay the own update, so we
    // cannot rely on the listener echoing it back.
    try {
      // Only `payload` and `info` are set (plus `href` where it applies).
      // `summary` would repeat the same text beside the app icon, and `notify`
      // would push a ping for every challenge and result - neither is wanted.
      const update = { payload, info };
      if (href) update.href = href;
      window.webxdc.sendUpdate(update, "");
    } catch (e) {
      toast(t("toast.sendFailed"));
      return false;
    }
    if (applyLocally) Chat.applySeen(payload);
    return true;
  },

  // de-duplicated local application of an update (own sends + listener)
  applied: new Set(),
  applySeen(payload) {
    const key = payload && payload.t === "challenge" ? "c:" + payload.id : null;
    if (key) {
      if (Chat.applied.has(key)) return;
      Chat.applied.add(key);
    }
    Chat.handleUpdate({ payload });
  },

  describeMap(meta) {
    return t("chat.mapDetails", {
      difficulty: (INTELLIGENCE[meta.botLevel] || {}).name || "?",
      size: mapSizeName(meta.mapSize) || "?",
      players: meta.playerCount,
      seed: meta.seed,
    });
  },

  challengeInfoText(meta) {
    const day = (meta && meta.daily) || Daily.fromId(meta && meta.id);
    if (day)
      return t("chat.sharedDaily", {
        name: Chat.selfName,
        date: Daily.label(day),
      });
    return t("chat.sharedChallenge", {
      name: Chat.selfName,
      difficulty: (INTELLIGENCE[meta.botLevel] || {}).name || "?",
      size: mapSizeName(meta.mapSize) || "?",
      players: meta.playerCount,
      seed: meta.seed,
    });
  },

  resultInfoText(meta, victory, round, aborted) {
    const key = aborted ? "GaveUp" : victory ? "Beat" : "Lost";
    const day = (meta && meta.daily) || Daily.fromId(meta && meta.id);
    if (day) {
      // "Foo beat the challenge of the day (1/1/2026) in hard mode"
      const lvl = meta && (meta.mode || meta.botLevel);
      const modeSuffix = lvl
        ? t("mode.suffix", {
            mode: (INTELLIGENCE[Daily.difficultyOf(lvl)] || {}).name || "?",
          })
        : "";
      return t("chat.result" + key + "Daily", {
        name: Chat.selfName,
        date: Daily.label(day),
        modeSuffix,
      }).replace(/\s+$/, "");
    }
    // without a known challenge there are no map details to show
    if (!meta) {
      return aborted
        ? t("chat.resultGaveUpShort", { name: Chat.selfName })
        : t("chat.result" + key + "Short", { name: Chat.selfName, round });
    }
    return t("chat.result" + key, {
      name: Chat.selfName,
      round,
      map: Chat.describeMap(meta),
    });
  },

  sendChallenge(meta) {
    return Chat.send(
      Object.assign(
        { t: "challenge", creator: Chat.selfName, creatorAddr: Chat.selfAddr },
        meta,
      ),
      Chat.challengeInfoText(meta),
      true,
    );
  },

  // Announce that the player started today's map. No href and no "challenge"
  // payload: the day is the challenge, so there is nothing to hand out - only a
  // line in the chat and a result to compare later.
  sendDailyJoin(day) {
    // The join line is not a challenge or a result, so it gets no href: there
    // is nothing to open that the "Challenge of the Day" button would not open.
    // The seed is still in the payload so a reader can tell which map it was.
    return Chat.send(
      {
        t: "daily",
        id: Daily.id(day),
        daily: day,
        seed: Daily.seed(day),
        addr: Chat.selfAddr,
        name: Chat.selfName,
        created: Date.now(),
      },
      t("chat.joinDaily", { name: Chat.selfName, date: Daily.label(day) }),
    );
  },

  // `mode` is the difficulty actually played (a daily allows changing it).
  sendResult(id, victory, round, aborted, mode) {
    // A result is posted against a known challenge, so merge that challenge's
    // setup into the payload: the href then carries everything needed to open
    // the New Game dialog, and a peer that missed the original challenge can
    // still start it from the result message.
    const c = id ? Chat.challenges.get(id) : null;
    const meta = c && c.meta ? c.meta : null;
    const day = (meta && meta.daily) || Daily.fromId(id);
    const setup = meta
      ? {
          seed: meta.seed,
          playerCount: meta.playerCount,
          humanIndex: meta.humanIndex,
          botLevel: meta.botLevel,
          mapSize: meta.mapSize,
          density: meta.density,
        }
      : {};
    if (day) {
      setup.daily = day;
      if (mode) {
        // report the difficulty that was really played, not the challenge default
        setup.mode = mode;
        setup.botLevel = mode;
      }
    }
    return Chat.send(
      Object.assign(
        {
          t: "result",
          id,
          addr: Chat.selfAddr,
          name: Chat.selfName,
          victory,
          round,
          aborted: !!aborted,
          created: Date.now(),
        },
        setup,
      ),
      Chat.resultInfoText(
        mode && day ? Object.assign({}, meta, { mode }) : meta,
        victory,
        round,
        aborted,
      ),
    );
  },

  // best result per challenge (by player)
  bestFor(id) {
    const c = Chat.challenges.get(id);
    if (!c) return null;
    let best = null;
    for (const r of c.results) {
      if (r.addr !== Chat.selfAddr) continue;
      if (
        !best ||
        (r.victory && !best.victory) ||
        (r.victory === best.victory && r.round < best.round && !r.aborted)
      )
        best = r;
    }
    return best;
  },

  beatenCount() {
    if (Store.get("challengesSeen", false)) return 0;
    return 0;
  },
};

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
const Flow = {
  prefsFromSettings() {
    App.prefs.showEnemyTurns = $("pref-show-enemy-turns").checked;
    App.prefs.enemySpeed = parseInt($("pref-enemy-speed").value, 10);
    App.prefs.warnForgotten = $("pref-warn-forgotten").checked;
    App.prefs.autoEnd = $("pref-auto-end").checked;
    Store.set("prefs", App.prefs);
  },

  loadPrefs() {
    const p = Store.get("prefs", null);
    if (p) Object.assign(App.prefs, p);
    $("pref-show-enemy-turns").checked = App.prefs.showEnemyTurns;
    $("pref-enemy-speed").value = String(App.prefs.enemySpeed);
    $("pref-warn-forgotten").checked = App.prefs.warnForgotten;
    $("pref-auto-end").checked = App.prefs.autoEnd;
  },

  setupFromConfig(cfg) {
    const players = [];
    for (let i = 0; i < cfg.playerCount; i++) {
      players.push({
        index: i,
        type: i === cfg.humanIndex ? "HUMAN" : "BOT",
        roundOfDefeat: null,
      });
    }
    const gs = GameStateHelper.createEmpty();
    GameStateHelper.initializeMap(
      gs,
      players,
      cfg.landMass,
      cfg.density,
      null,
      cfg.seed,
    );
    gs.botIntelligence = cfg.botLevel;
    gs.challengeId = cfg.challengeId || null;
    gs.config = {
      seed: cfg.seed,
      playerCount: cfg.playerCount,
      humanIndex: cfg.humanIndex,
      botLevel: cfg.botLevel,
      mapSize: cfg.mapSize,
      density: cfg.density,
      landMass: cfg.landMass,
      challengeId: cfg.challengeId || null,
    };
    return gs;
  },

  // Campaign of a new game from the setup screen
  startFromSetup() {
    // The chosen colour lives in Setup.values.humanIndex (set by renderColors).
    // This used to read a `data-selected` attribute that nothing ever wrote, so
    // the picked colour was silently ignored and player 1 was always used.
    const humanIndex = Setup.values.humanIndex | 0;
    const count = parseInt(Setup.values.numbots, 10) + 1;
    if (humanIndex >= count) {
      toast(t("toast.colorNotOccupied"));
      return;
    }
    let seed = parseInt($("seed-input").value, 10);
    if (!isFinite(seed) || seed < 0) seed = Date.now() >>> 0;
    seed = seed >>> 0;
    const cfg = {
      seed,
      playerCount: count,
      humanIndex,
      botLevel: Setup.values.difficulty,
      mapSize: Setup.values.mapsize,
      density: Setup.values.density,
      landMass: MAP_SIZES[Setup.values.mapsize],
    };
    // Opened from a challenge link: if nothing was changed, play it as that
    // challenge so the result is reported back to the chat. The id from the
    // message is used verbatim rather than recomputed. Editing any value turns
    // it back into a normal game.
    let challenge = null;
    let daily = null;
    const link = Setup.challenge;
    if (link && link.cfg) {
      const c = link.cfg;
      const isDaily = link.kind === "daily";
      // A daily lets the player pick the difficulty; that choice is reported in
      // the chat line, so it must not count as "the setup was changed".
      const same =
        c.seed === cfg.seed &&
        c.playerCount === cfg.playerCount &&
        c.humanIndex === cfg.humanIndex &&
        (isDaily || c.botLevel === cfg.botLevel) &&
        c.mapSize === cfg.mapSize &&
        Setup.densityName(c.density) === Setup.densityName(cfg.density);
      if (same) {
        challenge = link.id || null;
        if (isDaily) daily = c.daily || Daily.fromId(link.id);
      }
    }
    Setup.setMode(false);
    this.beginGame(cfg, challenge);
    // tell the chat that someone else played today's map, without sending a
    // "challenge" update: the challenge is the date, not something to share
    if (daily) Chat.sendDailyJoin(daily);
  },

  beginGame(cfg, challenge) {
    App.challengeReported = false;
    App.undoStack = [];
    Store.remove("game");
    Store.remove("save");
    App.gameOverShown = false;
    App.spectating = false;
    App.gs = Flow.setupFromConfig(cfg);
    if (challenge) App.gs.challengeId = challenge;
    hideAllOverlays();
    show("hud");
    Store.remove("save");
    layoutForMap(App.gs);
    UI.onGameStateChanged(true);
    App.maybeStartEnemyTurn();
    if (App.gs.challengeId) Flow.announceChallenge();
  },

  // True while the running game is the challenge of the day. The challenge id
  // is the day either way, so this is only about what may be shared.
  isDaily(gs) {
    const g = gs || App.gs;
    return !!(g && g.challengeId && Daily.fromId(g.challengeId));
  },

  // Build the payload for "I beat this map in round N — can you?"
  challengeMetaFromState(gs, round) {
    const cfg = gs.config;
    if (!cfg) return null;
    return {
      id: Flow.makeChallengeId(cfg),
      seed: cfg.seed,
      playerCount: cfg.playerCount,
      botLevel: cfg.botLevel,
      mapSize: cfg.mapSize,
      density: cfg.density,
      humanIndex: cfg.humanIndex,
      landMass: cfg.landMass,
      round: round == null ? null : round,
      created: Date.now(),
    };
  },

  announceChallenge() {
    const c = Chat.challenges.get(App.gs.challengeId);
    if (c && c.meta && c.meta.creator)
      toast(`Challenge by ${c.meta.creator}`, 2600);
  },

  snapshot() {
    return GameStateHelper.serialize(App.gs);
  },

  pushUndo() {
    App.undoStack.push(Flow.snapshot());
    if (App.undoStack.length > 200) App.undoStack.shift();
    Flow.saveGame();
  },

  clearUndo() {
    const had = App.undoStack.length > 0;
    App.undoStack = [];
    if (!had) return;
    const bundle = Store.get("game", null);
    if (bundle) Store.trySet("game", { save: bundle.save, undo: [] });
  },

  saveGame() {
    if (!App.gs || Flow.isGameOver()) return;
    const stack = App.undoStack;
    const bundle = { save: Flow.snapshot(), undo: stack };
    if (!Store.trySet("game", bundle)) {
      App.undoStack = [];
      if (!Store.trySet("game", { save: bundle.save, undo: null })) {
        Store.set("save", bundle.save);
      }
    }
  },

  restoreIfAny() {
    const bundle = Store.get("game", null);
    const save = bundle ? bundle.save : Store.get("save", null);
    if (!save) return false;
    try {
      const gs = GameStateHelper.fromSerialized(save);
      if (!gs || !gs.tiles || gs.tiles.length === 0) return false;
      App.gs = gs;
      App.undoStack = (
        bundle && Array.isArray(bundle.undo) ? bundle.undo : []
      ).slice();
      hideAllOverlays();
      show("hud");
      layoutForMap(gs);
      UI.onGameStateChanged(true);
      App.maybeStartEnemyTurn();
      return true;
    } catch (e) {
      return false;
    }
  },

  isGameOver() {
    if (!App.gs) return false;
    const alive = App.gs.players.filter((p) => p.roundOfDefeat == null);
    return alive.length <= 1 || App.gs.winner != null;
  },

  human() {
    return App.gs ? App.gs.players.find((p) => p.type === "HUMAN") : null;
  },

  activeIsHuman() {
    return App.activeIsHuman();
  },

  maybeStartEnemyTurn() {
    return App.maybeStartEnemyTurn();
  },

  // While spectating, the defeated human seat has no kingdoms left; skip it.
  autoPlaySeat() {
    if (!App.gs || !App.spectating) return;
    const active = App.gs.players[App.gs.playerTurn];
    if (active.type !== "HUMAN") {
      Flow.startEnemyTurn();
      return;
    }
    setTimeout(
      () => {
        if (!App.gs || !App.spectating) return;
        GameStateHelper.endTurn(App.gs);
        App.gs.activeKingdom = null;
        UI.onGameStateChanged(false);
        if (Flow.checkGameEnd()) return;
        App.maybeStartEnemyTurn();
      },
      App.prefs.showEnemyTurns ? 400 : 0,
    );
  },

  // Drives one bot turn, yielding between steps so the UI can animate it.
  startEnemyTurn() {
    if (!App.gs) return;
    const active = App.gs.players[App.gs.playerTurn];
    if (active.type !== "BOT") return;
    App.enemyRunning = true;
    UI.updateHud();
    const intel = INTELLIGENCE[App.gs.botIntelligence] || INTELLIGENCE.LEVEL_1;
    App.botGenerator = BotAi.doTurn(App.gs, intel);
    const speed = App.prefs.showEnemyTurns ? App.prefs.enemySpeed : 0;
    if (speed === 0) {
      // fast-forward without rendering intermediate states
      for (;;) {
        const r = App.botGenerator.next();
        if (r.done) break;
      }
      App.botGenerator = null;
      App.enemyRunning = false;
      Flow.finishEnemyTurn();
      return;
    }
    const step = () => {
      App.botTimer = null;
      if (!App.gs || !App.botGenerator) return;
      const r = App.botGenerator.next();
      if (r.done) {
        App.botGenerator = null;
        App.enemyRunning = false;
        Flow.finishEnemyTurn();
        return;
      }
      App.renderer.updateGameState(App.gs);
      UI.updateHud();
      App.botTimer = setTimeout(step, speed);
    };
    App.botTimer = setTimeout(step, speed);
  },

  stopEnemyTurn() {
    if (App.botTimer) {
      clearTimeout(App.botTimer);
      App.botTimer = null;
    }
    App.botGenerator = null;
    App.enemyRunning = false;
  },

  finishEnemyTurn() {
    if (!App.gs) return;
    // end the bot's turn
    GameStateHelper.endTurn(App.gs);
    App.gs.activeKingdom = null;
    Flow.clearUndo();
    UI.onGameStateChanged(false);
    if (Flow.checkGameEnd()) return;
    if (App.activeIsHuman() && App.gs.heldObject == null) {
      // fresh human turn
      Flow.saveGame();
    }
    App.maybeStartEnemyTurn();
  },

  checkGameEnd() {
    if (!App.gs) return false;
    const alive = App.gs.players.filter((p) => p.roundOfDefeat == null);
    const human = Flow.human();
    const humanDefeated = human == null || human.roundOfDefeat != null;
    if (alive.length <= 1 || App.gs.winner != null) {
      if (!App.gameOverShown) {
        App.spectating = false;
        UI.showGameOver(
          humanDefeated && App.gs.winner !== (human ? human.index : -1),
        );
      }
      return true;
    }
    if (humanDefeated && !App.spectating) {
      if (!App.gameOverShown) UI.showDefeatedDialog();
      return true;
    }
    return false;
  },

  // Report the end of a challenge game exactly once per session.
  reportChallengeEnd(victory, round, aborted) {
    const id = App.gs && App.gs.challengeId;
    if (!id) return false;
    if (App.challengeReported) return false;
    App.challengeReported = true;
    const mode = App.gs && App.gs.config ? App.gs.config.botLevel : null;
    const sent = Chat.sendResult(id, victory, round, aborted, mode);
    const c = Chat.challenges.get(id);
    if (c) UI.renderChallengeList && UI.renderChallengeList();
    return sent;
  },

  // ---------- player input handling ----------
  onTap(worldX, worldY) {
    if (!App.gs || !Flow.activeIsHuman() || App.enemyRunning || App.spectating)
      return;
    const gs = App.gs;
    const hex = HexMapHelper.worldCoordsToHexCoords({ x: worldX, y: worldY });
    const tile = GameStateHelper.tileAt(gs, hex);
    const player = gs.players[gs.playerTurn];
    const now = Date.now();
    const key = hex.x + "," + hex.y;
    const isDoubleTap = App.lastTap.key === key && now - App.lastTap.time < 400;
    App.lastTap = { key, time: now };

    GameStateHelper.prepare(gs);
    let didSomething = false;

    // clicking a tile of the active player's kingdom selects that kingdom
    if (
      tile != null &&
      tile.player === player.index &&
      tile.kingdom != null &&
      gs.heldObject == null &&
      InputValidationHelper.checkChangeActiveKingdom(gs, player.index, tile)
    ) {
      Flow.tryMove({ type: "ACTIVATE_KINGDOM", pos: tile.pos });
    } else if (tile != null) {
      if (gs.heldObject == null) {
        if (
          isDoubleTap &&
          InputValidationHelper.checkBuyAndPlaceUnitInstantly(
            gs,
            player.index,
            tile,
          )
        ) {
          Flow.tryMove({ type: "BUY_AND_PLACE_PEASANT", pos: tile.pos });
        } else if (
          InputValidationHelper.checkPickupObject(gs, player.index, tile)
        ) {
          Flow.tryMove({ type: "PICK_UP", pos: tile.pos });
        }
      } else {
        if (tile.player === player.index) {
          if (InputValidationHelper.checkCombineUnits(gs, player.index, tile)) {
            Flow.tryMove({ type: "COMBINE_UNITS", pos: tile.pos });
          } else if (
            InputValidationHelper.checkPlaceOwn(gs, player.index, tile)
          ) {
            Flow.tryMove({ type: "PLACE_OWN", pos: tile.pos });
          }
        } else if (InputValidationHelper.checkConquer(gs, player.index, tile)) {
          Flow.tryMove({ type: "CONQUER", pos: tile.pos });
        }
      }
    }
    UI.onGameStateChanged(false);
  },

  tryMove(move) {
    const gs = App.gs;
    if (!gs) return false;
    GameStateHelper.prepare(gs);
    const player = gs.players[gs.playerTurn];
    if (
      !InputValidationHelper.checkPlayerMove(
        gs,
        player.index,
        move,
        App.undoStack.length > 0,
      )
    )
      return false;
    if (move.type !== "ACTIVATE_KINGDOM") Flow.pushUndo();
    GameStateHelper.applyPlayerMove(gs, move);
    GameStateHelper.prepare(gs);
    Flow.afterHumanMove(move);
    return true;
  },

  afterHumanMove(move) {
    const gs = App.gs;
    gs.dirty = true;
    UI.onGameStateChanged(false);
    Flow.saveGame();
    if (App.pendingMoveTimer) clearTimeout(App.pendingMoveTimer);
    // only offer "all moves done" feedback after moves that consume a unit
    const consumesUnit =
      move &&
      (move.type === "PLACE_OWN" ||
        move.type === "CONQUER" ||
        move.type === "COMBINE_UNITS");
    if (!consumesUnit) return;
    App.pendingMoveTimer = setTimeout(() => {
      if (!App.gs || !Flow.activeIsHuman() || App.enemyRunning) return;
      if (App.gs.heldObject != null) return;
      if (Flow.allMovesDone()) {
        if (App.prefs.autoEnd) Flow.endTurn(true);
        else UI.showHint(t("hud.allMovesDone"));
      }
    }, 500);
  },

  // Buying always needs a selected kingdom: the cost comes out of that
  // kingdom's savings. Without one there is nothing to buy from, so bail out
  // silently rather than showing "not enough money".
  canBuyFromSelection() {
    return !!(
      App.gs &&
      App.gs.activeKingdom != null &&
      Flow.activeIsHuman() &&
      !App.enemyRunning
    );
  },

  buyPeasant() {
    if (!Flow.canBuyFromSelection()) return;
    if (Flow.tryMove({ type: "BUY_PEASANT" })) {
      if (App.gs.heldObject != null && App.gs.heldObject.t === "BARON") {
        // upgrades keep the held object; nothing else to do
      }
    } else {
      toast(t("toast.notEnoughPeasant"));
    }
  },

  buyCastle() {
    if (!Flow.canBuyFromSelection()) return;
    if (!Flow.tryMove({ type: "BUY_CASTLE" }))
      toast(t("toast.notEnoughCastle"));
  },

  undo() {
    if (!App.gs || !Flow.activeIsHuman() || App.enemyRunning) return;
    if (App.undoStack.length === 0) {
      toast(t("toast.nothingToUndo"));
      return;
    }
    const snap = App.undoStack.pop();
    App.gs = GameStateHelper.fromSerialized(snap);
    App.lastTap = { key: null, time: 0 };
    UI.onGameStateChanged(false);
    Flow.saveGame();
  },

  endTurnClick() {
    if (!App.gs || !Flow.activeIsHuman() || App.enemyRunning) return;
    if (App.gs.heldObject != null) {
      toast(t("toast.placeFirst"));
      return;
    }
    const forgotten = App.prefs.warnForgotten
      ? GameStateHelper.getFirstForgottenKingdom(App.gs)
      : null;
    if (forgotten != null) {
      dialog(t("dlg.endTurn.title"), t("dlg.endTurn.text"), [
        { label: t("dlg.endTurn.yes"), action: () => Flow.endTurn(false) },
        { label: t("dlg.endTurn.keep"), subtle: true },
      ]);
      return;
    }
    Flow.endTurn(false);
  },

  endTurn(auto) {
    if (!App.gs) return;
    Flow.clearUndo();
    GameStateHelper.endTurn(App.gs);
    App.gs.activeKingdom = null;
    App.lastTap = { key: null, time: 0 };
    UI.onGameStateChanged(false);
    if (Flow.checkGameEnd()) return;
    App.maybeStartEnemyTurn();
  },

  allMovesDone() {
    const gs = App.gs;
    const activeIndex = gs.players[gs.playerTurn].index;
    for (const k of gs.kingdoms) {
      if (k.player !== activeIndex) continue;
      for (const ti of k.tiles) {
        const tile = gs.tiles[ti];
        if (
          tile.content != null &&
          tile.content.k === "unit" &&
          tile.content.canAct
        )
          return false;
      }
    }
    return true;
  },

  shareCurrentChallenge() {
    const gs = App.gs;
    if (!gs) return false;
    // A daily is not shareable: everyone already has the day, and posting its
    // settings as a challenge would put a duplicate map in the chat. Whoever
    // gets here (the menu hides the row) keeps their game untouched.
    if (Flow.isDaily(gs)) return false;
    const meta = Flow.challengeMetaFromState(gs, null);
    if (!meta) {
      toast(t("toast.noShareable"));
      return false;
    }
    if (!Chat.sendChallenge(meta)) return false;
    gs.challengeId = meta.id;
    if (gs.config) gs.config.challengeId = meta.id;
    App.challengeReported = false;
    toast(t("toast.challengeShared"));
    Flow.saveGame();
    return true;
  },

  // The id is derived only from the map-determining settings, so every peer
  // that plays the same challenge sees the same id.
  makeChallengeId(cfg) {
    return [
      cfg.seed,
      cfg.playerCount,
      cfg.humanIndex,
      cfg.botLevel,
      cfg.mapSize,
      cfg.density,
    ].join("-");
  },
};

// ---------------------------------------------------------------------------
// Setup screen state
// ---------------------------------------------------------------------------
const Setup = {
  values: {
    difficulty: "LEVEL_3",
    mapsize: "MEDIUM",
    // Compact. This is the single source of truth: Setup.init() applies these
    // values to the dialog, so the `class="active"` in index.html must match or
    // it will be overridden on startup.
    density: "DENSE",
    numbots: "5",
    humanIndex: 0,
  },
  // Set when the dialog was opened from a challenge deep link: the game that
  // Start begins is that challenge, not a fresh one.
  challenge: null, // { id, cfg, kind: "shared" | "daily" }

  // Setup.values doubles as the dialog's state AND the stored preference, so a
  // challenge preview has to snapshot the player's own settings and restore
  // them, otherwise previewing someone's map would silently change the default
  // for the next normal game.
  saved: null, // snapshot of the player's own values while previewing

  BINDS: [
    ["difficulty", "difficulty"],
    ["mapsize", "mapsize"],
    ["density", "density"],
    ["numbots", "numbots"],
  ],
  locked: false, // true while the challenge of the day is open

  // The density is a name in the UI but a number in the generator (Densities
  // enum: LOOSE 3, MEDIUM 0, DENSE -3). Challenge payloads in the wild can
  // carry either, so normalise to the name the dialog uses.
  densityName(v) {
    if (typeof v === "string" && DENSITIES[v] != null) return v;
    for (const k of Object.keys(DENSITIES)) if (DENSITIES[k] === v) return k;
    return "MEDIUM";
  },

  // Fills the dialog from a challenge config without starting anything. The
  // values live in the dialog only; cancelling leaves the player's own saved
  // preferences (Store "setup") untouched.
  prefill(cfg, kind) {
    Setup.saved = Object.assign({}, Setup.values);
    Setup.challenge =
      kind === "challenge"
        ? { id: cfg.id, cfg: Object.assign({}, cfg), kind: "shared" }
        : null;
    Setup.values.difficulty = cfg.botLevel;
    Setup.values.mapsize = cfg.mapSize;
    Setup.values.density = Setup.densityName(cfg.density);
    Setup.values.numbots = String(Math.max(1, cfg.playerCount - 1));
    Setup.values.humanIndex = cfg.humanIndex;
    for (const [id, key] of Setup.BINDS) {
      const el = $(id);
      if (!el) continue;
      for (const btn of el.querySelectorAll("button")) {
        btn.classList.toggle(
          "active",
          btn.getAttribute("data-value") === String(Setup.values[key]),
        );
      }
    }
    Setup.renderColors();
    const seed = $("seed-input");
    if (seed) seed.value = String(cfg.seed);
    Setup.setMode("shared");
  },

  // Opens the New Game dialog pre-filled with today's map. Same dialog as a
  // shared challenge, so the player can see what they are about to play.
  // Opens today's dialog, or the dialog for a shared link's day. A past day is
  // still playable so an old message stays useful; the reporting below treats
  // it like any other daily.
  openDaily(day) {
    const meta = Daily.meta(day || Daily.key());
    Setup.prefill(Object.assign({ id: meta.id }, meta), "challenge");
    Setup.challenge.kind = "daily";
    hide("menu");
    show("setup");
    Setup.setMode("daily");
  },

  // Disables the setup controls. Used for the daily challenge, where every
  // player must get the identical map. The player's own values are restored by
  // setMode(false), so nothing leaks into a later normal game.
  // `on` is false | "shared" | "daily". A daily keeps the difficulty editable,
  // because that choice is reported in the chat line.
  lock(on) {
    // Guard the handlers as well as the buttons: a disabled button does not stop
    // a programmatic click, and a changed setting would silently make the daily
    // a different game from everyone else's.
    Setup.locked = !!on;
    const daily = on === "daily";
    // difficulty is the one control a daily leaves editable, so it is handled
    // separately: locking is not additive, a previous lock must be undone
    const free = daily ? "difficulty" : null;
    if (free) {
      const d = $(free);
      if (d) {
        d.classList.remove("locked");
        for (const c of d.querySelectorAll("button")) {
          c.disabled = false;
          c.classList.remove("self-disabled");
        }
      }
    }
    const ids = ["color-picker", "seed-input", "btn-random-seed"]
      .concat(Setup.BINDS.map(([id]) => id))
      .filter((id) => id !== free);
    for (const id of ids) {
      const el = $(id);
      if (!el) continue;
      el.classList.toggle("locked", on);
      // el is either a container of option buttons or a single control (the
      // seed input, the random-seed button) - querySelectorAll excludes el
      const selfControl = el.tagName === "INPUT" || el.tagName === "BUTTON";
      if (selfControl) {
        el.disabled = on;
        // The CSS dims through a `.locked` ancestor, which a single control
        // does not have - it IS the locked element. Mark it so it dims too.
        el.classList.toggle("self-disabled", on);
      }
      for (const c of el.querySelectorAll("button, input")) c.disabled = on;
    }
  },

  // Banner + button label: makes it obvious that Start begins a shared
  // challenge (and that leaving the values alone plays the identical map).
  setMode(on) {
    // `on` is false | "shared" | "daily"
    // Everything except the difficulty is locked for a daily: changing those
    // would silently turn it into a different game. lock() takes the mode
    // itself, not a boolean, so it knows what to leave editable.
    Setup.lock(on);
    const title = $("setup-title");
    // A link may open another day than today's, so name the day it really is.
    const dailyDay =
      on === "daily" && Setup.challenge ? Setup.challenge.cfg.daily : null;
    if (title) {
      title.textContent =
        on === "daily"
          ? dailyDay && dailyDay !== Daily.key()
            ? t("setup.dailyTitle") + " · " + Daily.label(dailyDay)
            : t("setup.dailyTitle")
          : t("setup.title");
    }
    const banner = $("setup-challenge-note");
    if (banner) {
      banner.classList.toggle("hidden", !on);
      if (on === "daily") {
        banner.innerHTML =
          dailyDay && dailyDay !== Daily.key()
            ? t("setup.pastDailyNote", { date: Daily.label(dailyDay) })
            : t("setup.dailyNote");
      } else if (on) {
        banner.innerHTML = t("setup.sharedNote");
      }
    }
    const start = $("btn-start");
    if (start)
      start.textContent = on ? t("setup.startChallenge") : t("setup.start");
    if (!on) {
      Setup.challenge = null;
      if (Setup.saved) {
        Object.assign(Setup.values, Setup.saved);
        Setup.saved = null;
        Store.set("setup", Setup.values);
        // repaint the dialog so the restored values are what is shown
        for (const [id, key] of Setup.BINDS) {
          const el = $(id);
          if (!el) continue;
          for (const btn of el.querySelectorAll("button")) {
            btn.classList.toggle(
              "active",
              btn.getAttribute("data-value") === String(Setup.values[key]),
            );
          }
        }
        Setup.renderColors();
      }
    }
  },
  init() {
    const saved = Store.get("setup", null);
    if (saved) Object.assign(Setup.values, saved);
    const bind = (id, key) => {
      const el = $(id);
      for (const btn of el.querySelectorAll("button")) {
        btn.classList.toggle(
          "active",
          btn.getAttribute("data-value") === String(Setup.values[key]),
        );
        btn.onclick = () => {
          // a daily allows choosing the difficulty - it is reported in the chat
          const allowed =
            !Setup.locked ||
            (key === "difficulty" &&
              Setup.challenge &&
              Setup.challenge.kind === "daily");
          if (!allowed) return;
          Setup.values[key] = btn.getAttribute("data-value");
          for (const b of el.querySelectorAll("button"))
            b.classList.toggle("active", b === btn);
          Store.set("setup", Setup.values);
          Setup.renderColors();
          if (key === "numbots") Setup.syncSeedUi();
        };
      }
    };
    for (const [id, key] of Setup.BINDS) bind(id, key);
    Setup.renderColors();
    $("btn-random-seed").onclick = () => {
      if (Setup.locked) return;
      Setup.syncSeedUi(true);
    };
  },

  renderColors() {
    const count = parseInt(Setup.values.numbots, 10) + 1;
    const wrap = $("color-picker");
    wrap.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const s = document.createElement("button");
      s.className = "swatch" + (i === Setup.values.humanIndex ? " active" : "");
      s.style.background = PLAYER_COLOR_CSS[i];
      s.title = t("setup.player", { n: i + 1 });
      s.onclick = () => {
        if (Setup.locked) return;
        Setup.values.humanIndex = i;
        Store.set("setup", Setup.values);
        Setup.renderColors();
      };
      // The swatches are rebuilt on every difficulty change, so a locked daily
      // would otherwise hand out freshly enabled buttons that only look dim
      // because of the early return above.
      s.disabled = Setup.locked;
      wrap.appendChild(s);
    }
  },

  syncSeedUi(forceNew) {
    const input = $("seed-input");
    if (forceNew || !input.value || input.value === "0") {
      // Date.now() alone repeats when the button is pressed twice within the
      // same millisecond (and can repeat across restarts), which would bring
      // back the very bug of playing the same island twice.
      let seed = 0;
      for (let i = 0; i < 8; i++) {
        seed = Math.floor(Math.random() * 1e9);
        if (String(seed) !== input.value) break;
      }
      input.value = String(seed);
    }
  },
};

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
// Alpha bounding box of one sprite cell, in cell-local pixels, plus a cache keyed
// by sheet + cell so measuring happens once per sprite and not once per paint.
const spriteInkCache = new Map();
function spriteInk(sp) {
  const key = sp.w + "x" + sp.h + "@" + sp.x + "," + sp.y;
  const hit = spriteInkCache.get(key);
  if (hit !== undefined) return hit;
  const c = document.createElement("canvas");
  c.width = sp.w;
  c.height = sp.h;
  const cx = c.getContext("2d", { willReadFrequently: true });
  cx.drawImage(sp.image, sp.x, sp.y, sp.w, sp.h, 0, 0, sp.w, sp.h);
  let data;
  try {
    data = cx.getImageData(0, 0, sp.w, sp.h).data;
  } catch (e) {
    return null; // canvas is somehow tainted: caller keeps the icon hidden
  }
  let x0 = sp.w,
    y0 = sp.h,
    x1 = -1,
    y1 = -1;
  for (let y = 0; y < sp.h; y++) {
    for (let x = 0; x < sp.w; x++) {
      if (data[(y * sp.w + x) * 4 + 3] === 0) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  const ink = x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  spriteInkCache.set(key, ink);
  return ink;
}

const UI = {
  hudHeldObject: undefined,

  onGameStateChanged(full) {
    if (!App.gs) return;
    App.renderer.updateGameState(App.gs);
    UI.updateHud();
    UI.updateHand(true);
  },

  updateHud() {
    const gs = App.gs;
    if (!gs) return;
    GameStateHelper.prepare(gs);
    const active = gs.players[gs.playerTurn];
    const human = Flow.human();
    const activeColor = PLAYER_COLOR_CSS[active.index];
    $("turn-hex").querySelector("polygon").setAttribute("fill", activeColor);

    const line1 = $("hud-line1");
    const line2 = $("hud-line2");
    const bottom = $("hud-bottom");

    if (App.spectating) {
      line1.textContent = t("hud.spectating");
      line1.classList.remove("warn");
      line2.textContent = t("hud.roundEnemy", {
        round: gs.round,
        who: active.type === "HUMAN" ? "…" : t("hud.enemy"),
      });
      bottom.classList.add("enemy-turn");
      $("btn-endturn").disabled = true;
      $("btn-peasant").disabled = true;
      $("btn-castle").disabled = true;
      $("btn-undo").disabled = true;
      return;
    }
    if (App.gameOverShown) {
      const human = Flow.human();
      const humanWon =
        gs.winner != null && human != null && gs.winner === human.index;
      line1.textContent = humanWon
        ? t("hud.victory")
        : human == null || human.roundOfDefeat != null
          ? t("hud.defeat")
          : t("hud.gameOver");
      line1.classList.remove("warn");
      line2.textContent = t("hud.round", {
        round: gs.winningRound || gs.round,
      });
      bottom.classList.add("enemy-turn");
      $("btn-endturn").disabled = true;
      $("btn-peasant").disabled = true;
      $("btn-castle").disabled = true;
      $("btn-undo").disabled = true;
      return;
    }
    if (active.type === "BOT") {
      line1.textContent = t("hud.enemyTurn");
      line1.classList.remove("warn");
      line2.textContent = t("hud.round", { round: gs.round });
      bottom.classList.add("enemy-turn");
      $("btn-endturn").disabled = true;
    } else {
      bottom.classList.remove("enemy-turn");
      $("btn-endturn").disabled = false;
      const kingdom =
        gs.activeKingdom != null ? gs.kingdomById.get(gs.activeKingdom) : null;
      if (kingdom != null) {
        const income = GameStateHelper.getKingdomIncome(gs, kingdom);
        const salaries = GameStateHelper.getKingdomSalaries(gs, kingdom);
        const balance = income - salaries;
        const balanceText = balance < 0 ? String(balance) : "+" + balance;
        const bankrupt = kingdom.savings + balance < 0;
        line1.innerHTML = "";
        const span = document.createElement("span");
        span.textContent = t("hud.savings", {
          savings: kingdom.savings,
          balance: balanceText,
        });
        if (bankrupt) span.className = "warn";
        line1.appendChild(span);
        line2.textContent = t("hud.roundTurn", {
          round: gs.round,
          turn:
            active.index === (human ? human.index : -1)
              ? t("hud.yourTurn")
              : t("hud.enemy"),
        });
      } else {
        line1.textContent = t("hud.selectKingdom");
        line1.classList.remove("warn");
        line2.textContent = t("hud.round", { round: gs.round });
      }
    }
    const myKingdom =
      gs.activeKingdom != null ? gs.kingdomById.get(gs.activeKingdom) : null;
    const canBuy = active.type === "HUMAN" && myKingdom != null;
    $("btn-peasant").disabled = !(canBuy && myKingdom.savings >= 10);
    $("btn-castle").disabled = !(canBuy && myKingdom.savings >= 15);
    $("btn-undo").disabled =
      !(active.type === "HUMAN" && App.undoStack.length > 0) ||
      App.enemyRunning;
    UI.updateHand(false);
  },

  paintSprite(element, name, boxPx) {
    const sp = TextureAtlasHelper.sprite(name, 0);
    if (!sp.image) return; // sheets not decoded yet: painted again after load
    const ink = spriteInk(sp);
    if (!ink) return;
    const scale = boxPx / Math.max(ink.w, ink.h);
    element.style.imageRendering = "pixelated";
    element.style.backgroundRepeat = "no-repeat";
    element.style.backgroundImage = `url(${sp.image.src})`;
    element.style.backgroundSize =
      sp.image.naturalWidth * scale +
      "px " +
      sp.image.naturalHeight * scale +
      "px";
    const offX = boxPx / 2 - (ink.x + ink.w / 2) * scale - sp.x * scale;
    const offY = boxPx / 2 - (ink.y + ink.h / 2) * scale - sp.y * scale;
    element.style.backgroundPosition = `${offX}px ${offY}px`;
    element.style.width = boxPx + "px";
    element.style.height = boxPx + "px";
  },

  renderToolIcons() {
    for (const el of document.querySelectorAll(".tool-icon[data-icon]")) {
      const px = parseFloat(el.dataset.size || "46");
      UI.paintSprite(el, el.dataset.icon, px);
    }
  },

  updateHand(force) {
    const gs = App.gs;
    const hand = $("hand");
    if (!gs || gs.heldObject == null) {
      hand.classList.add("hidden");
      App.hudHeldObject = null;
      return;
    }
    const held = gs.heldObject;
    hand.classList.remove("hidden");
    const key = held.k + ":" + (held.t || "") + ":" + (held.canAct ? 1 : 0);
    if (!force && key === App.hudHeldObject) return;
    App.hudHeldObject = key;
    const name = TextureAtlasHelper.regionNameForContent(held);
    const sp = TextureAtlasHelper.sprite(name, 0);
    const inner = $("hand-inner");
    // show the sprite by windowing its sheet with background positioning
    const scale = 52 / sp.w;
    inner.style.backgroundImage = `url(${sp.image.src})`;
    inner.style.backgroundSize =
      sp.image.naturalWidth * scale +
      "px " +
      sp.image.naturalHeight * scale +
      "px";
    inner.style.backgroundPosition = `${-sp.x * scale}px ${-sp.y * scale}px`;
    inner.style.width = sp.w * scale + "px";
    inner.style.height = sp.h * scale + "px";
    $("hand-count").textContent =
      Content.strength(held) > 0 ? String(Content.strength(held)) : "";
    $("hand-count").style.display =
      Content.strength(held) > 0 ? "block" : "none";
  },

  showHint(text) {
    const hint = $("hint");
    hint.textContent = text;
    hint.classList.remove("hidden");
    if (this._hintTimer) clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => hint.classList.add("hidden"), 3200);
  },

  showGameOver(humanLost) {
    if (App.gameOverShown) return;
    App.gameOverShown = true;
    const gs = App.gs;
    const human = Flow.human();
    const humanWon =
      gs.winner != null && human != null && gs.winner === human.index;
    const stillAlive = gs.players.filter((p) => p.roundOfDefeat == null).length;
    const defeatedEveryone = humanWon && stillAlive <= 1;
    const winRound = gs.winningRound || gs.round;
    let title, text;
    if (humanWon) {
      title = t("over.victoryTitle");
      text = defeatedEveryone
        ? t("over.allDefeated", { round: winRound })
        : t("over.surrendered", { round: winRound });
    } else {
      title = t("over.defeatTitle");
      if (gs.winner != null) {
        text =
          gs.winner === (human ? human.index : -1)
            ? t("over.wonRound", { round: winRound })
            : t("over.enemyMajority", { round: winRound });
      } else {
        text = t("over.allConquered", { round: gs.round });
      }
    }
    $("gameover-title").textContent = title;
    $("gameover-text").textContent = text;
    const buttons = $("gameover-buttons");
    buttons.innerHTML = "";
    const add = (label, cls, action) => {
      const b = document.createElement("button");
      b.className = "big-btn " + cls;
      b.textContent = label;
      b.onclick = action;
      buttons.appendChild(b);
    };
    add(t("over.newGame"), "", () => {
      Store.remove("save");
      Store.remove("game");
      Flow.clearUndo();
      App.gs = null;
      showOverlayOnly("setup");
      Setup.setMode(false);
      Setup.syncSeedUi(true);
    });
    add(t("over.mainMenu"), "subtle", () => {
      Store.remove("save");
      Store.remove("game");
      Flow.clearUndo();
      App.gs = null;
      showOverlayOnly("menu");
    });
    Store.remove("save");
    show("gameover");
    // freeze the HUD: it must not claim it is an enemy's turn behind the dialog
    UI.updateHud();
  },

  showDefeatedDialog() {
    const gs = App.gs;
    const round = Flow.human().roundOfDefeat || gs.round;
    dialog(t("dlg.defeat.title"), t("dlg.defeat.text", { round }), [
      {
        label: t("hud.spectating"),
        primary: true,
        action: () => {
          App.spectating = true;
          App.gameOverShown = false;
          App.maybeStartEnemyTurn();
        },
      },
      {
        label: t("over.newGame"),
        action: () => {
          Store.remove("save");
          Store.remove("game");
          Flow.clearUndo();
          App.gs = null;
          showOverlayOnly("setup");
          Setup.setMode(false);
          Setup.syncSeedUi(true);
        },
      },
      {
        label: t("over.mainMenu"),
        subtle: true,
        action: () => {
          Store.remove("save");
          Store.remove("game");
          Flow.clearUndo();
          App.gs = null;
          showOverlayOnly("menu");
        },
      },
    ]);
    Flow.reportChallengeEnd(false, round, false);
    Store.remove("save");
  },

  updateChallengeBadge() {
    const unseen = UI.unseenChallenges();
    const badge = $("challenge-badge");
    badge.textContent = String(unseen);
    badge.classList.toggle("visible", unseen > 0);
  },

  unseenChallenges() {
    const seen = Store.get("challengesSeen", {}) || {};
    let count = 0;
    for (const id of Chat.challenges.keys()) if (!seen[id]) count++;
    return count;
  },

  markChallengesSeen() {
    const seen = Store.get("challengesSeen", {}) || {};
    for (const id of Chat.challenges.keys()) seen[id] = true;
    Store.set("challengesSeen", seen);
    UI.updateChallengeBadge();
  },

  renderChallengeList() {
    const list = $("challenge-list");
    list.innerHTML = "";
    const items = [...Chat.challenges.values()].filter((c) => c.meta);
    items.sort((a, b) => (b.meta.created || 0) - (a.meta.created || 0));
    if (items.length === 0) {
      const p = document.createElement("p");
      p.className = "small";
      p.textContent = Chat.available ? t("list.empty") : t("list.unavailable");
      list.appendChild(p);
      return;
    }
    for (const c of items) {
      const m = c.meta;
      const div = document.createElement("div");
      div.className = "challenge-item";
      const info = document.createElement("div");
      info.className = "info";
      const day = m.daily || Daily.fromId(m.id);
      // A link may point at another day than today's. Only today's may be
      // played from here (an old day is settled), but the card still names it.
      const today = day === Daily.key();
      const title = document.createElement("div");
      title.className = "title";
      title.textContent = day
        ? t("list.cardDaily", { date: Daily.label(day) })
        : t("list.cardPlayers", {
            players: m.playerCount,
            difficulty: (INTELLIGENCE[m.botLevel] || {}).name || "?",
          });
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = day
        ? t("list.cardDailyMeta", {
            players: m.playerCount,
            size: mapSizeName(m.mapSize),
            modeLabel: Daily.modeLabel(m.botLevel),
          })
        : t("list.cardMeta", {
            size: mapSizeName(m.mapSize),
            seed: m.seed,
            creator: m.creator || "?",
          });
      info.appendChild(title);
      info.appendChild(meta);
      const mine = Chat.bestFor(c.meta.id);
      if (mine) {
        const res = document.createElement("div");
        res.className = "meta";
        res.textContent = mine.aborted
          ? t("list.youGaveUp")
          : mine.victory
            ? t("list.yourBestWin", { round: mine.round })
            : t("list.yourBestLoss", { round: mine.round });
        if (mine.victory) res.classList.add("beaten");
        info.appendChild(res);
      }
      // everyone's reported results, so players can compare
      if (c.results.length > 0) {
        const board = document.createElement("div");
        board.className = "challenge-board";
        const sorted = c.results.slice().sort((a, b) => {
          if (a.aborted !== b.aborted) return a.aborted ? 1 : -1;
          if (a.victory !== b.victory) return a.victory ? -1 : 1;
          return (a.round || 1e9) - (b.round || 1e9);
        });
        for (const r of sorted) {
          const row = document.createElement("div");
          row.className =
            "board-row" + (r.addr === Chat.selfAddr ? " you" : "");
          const name = document.createElement("span");
          name.className = "board-name";
          name.textContent =
            (r.addr === Chat.selfAddr ? t("ui.you") : r.name) +
            (r.addr === m.creatorAddr ? " ★" : "");
          const val = document.createElement("span");
          val.className = "board-val" + (r.victory ? " won" : "");
          val.textContent = r.aborted
            ? t("board.gaveUp")
            : r.victory
              ? t("board.won", { round: r.round })
              : t("board.lost", { round: r.round });
          if (r.mode) val.textContent += ` · ${Daily.modeLabel(r.mode)}`;
          row.appendChild(name);
          row.appendChild(val);
          board.appendChild(row);
        }
        info.appendChild(board);
      }
      div.appendChild(info);
      const play = document.createElement("button");
      play.className = "big-btn primary";
      // a daily challenge is joined, not handed out: only today's can be played
      play.textContent = day && !today ? t("ui.expired") : t("ui.play");
      play.style.minHeight = "36px";
      play.style.fontSize = "14px";
      play.disabled = !!day && !today;
      play.onclick = () => {
        UI.markChallengesSeen();
        Flow.beginGame(
          {
            seed: m.seed,
            playerCount: m.playerCount,
            humanIndex: m.humanIndex,
            botLevel: m.botLevel,
            mapSize: m.mapSize,
            density: m.density,
            landMass: m.landMass || MAP_SIZES[m.mapSize] || 50,
          },
          m.id,
        );
      };
      div.appendChild(play);
      list.appendChild(div);
    }
  },
};

function mapSizeName(size) {
  // unknown sizes fall through to the raw key rather than disappearing
  const key = "size." + size;
  const name = t(key);
  return name === key ? size : name;
}

// ---------------------------------------------------------------------------
// Input: pan / zoom / taps
// ---------------------------------------------------------------------------
const Input = {
  pointers: new Map(),
  drag: null,
  pinch: null,
  tapStart: null,
  longPressTimer: null,
  longPressFired: false,

  init(canvas) {
    canvas.addEventListener("pointerdown", (e) => Input.pointerDown(e));
    canvas.addEventListener("pointermove", (e) => Input.pointerMove(e));
    canvas.addEventListener("pointerup", (e) => Input.pointerUp(e));
    canvas.addEventListener("pointercancel", (e) => Input.pointerCancel(e));
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const factor = e.deltaY > 0 ? 1.12 : 1 / 1.12;
        Input.zoomAt(e.offsetX, e.offsetY, factor);
      },
      { passive: false },
    );
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
        Flow.buyPeasant();
      } else if (e.button === 1) {
        e.preventDefault();
        Flow.buyCastle();
      }
    });
    window.addEventListener("keydown", (e) => {
      if (!App.gs) return;
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "SELECT"))
        return;
      if (
        e.key === "Backspace" ||
        (e.key === "z" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        Flow.undo();
      } else if (e.key === "1") {
        Flow.buyPeasant();
      } else if (e.key === "2") {
        Flow.buyCastle();
      } else if (e.key === "e") {
        Flow.endTurnClick();
      }
    });
  },

  zoomAt(sx, sy, factor) {
    const cam = App.camera;
    const before = cam.screenToWorld(sx, sy);
    cam.zoom = Math.min(Math.max(cam.zoom * factor, 0.02), 6);
    const after = cam.screenToWorld(sx, sy);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  },

  pointerDown(e) {
    const canvas = e.target;
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    Input.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Input.pointers.size === 1) {
      Input.tapStart = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        moved: false,
        button: e.button,
      };
      Input.drag = { lastX: e.clientX, lastY: e.clientY };
      if (e.pointerType !== "mouse" || e.button === 0) {
        Input.longPressTimer = setTimeout(() => {
          if (Input.tapStart && !Input.tapStart.moved) {
            Input.longPressFired = true;
            Flow.buyCastle();
          }
        }, 650);
      }
    } else if (Input.pointers.size === 2) {
      if (Input.longPressTimer) clearTimeout(Input.longPressTimer);
      const pts = [...Input.pointers.values()];
      Input.pinch = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
        zoom: App.camera.zoom,
      };
      if (Input.tapStart) Input.tapStart.moved = true;
    }
  },

  pointerMove(e) {
    if (!Input.pointers.has(e.pointerId)) return;
    Input.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (Input.pointers.size === 2 && Input.pinch) {
      const pts = [...Input.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const factor = Input.pinch.dist / Math.max(dist, 1);
      App.camera.zoom = Math.min(Math.max(Input.pinch.zoom * factor, 0.02), 6);
      const cam = App.camera;
      // pan with the midpoint
      cam.x -= (cx - Input.pinch.cx) * cam.zoom;
      cam.y += (cy - Input.pinch.cy) * cam.zoom;
      Input.pinch.cx = cx;
      Input.pinch.cy = cy;
      return;
    }
    if (Input.tapStart) {
      const dx = e.clientX - Input.tapStart.x;
      const dy = e.clientY - Input.tapStart.y;
      if (Math.hypot(dx, dy) > 8) {
        Input.tapStart.moved = true;
        if (Input.longPressTimer) clearTimeout(Input.longPressTimer);
      }
    }
    if (Input.drag) {
      const dx = e.clientX - Input.drag.lastX;
      const dy = e.clientY - Input.drag.lastY;
      if (Input.tapStart && Input.tapStart.moved) {
        App.camera.x -= dx * App.camera.zoom;
        App.camera.y += dy * App.camera.zoom;
      }
      Input.drag.lastX = e.clientX;
      Input.drag.lastY = e.clientY;
    }
  },

  pointerUp(e) {
    if (Input.longPressTimer) clearTimeout(Input.longPressTimer);
    Input.pointers.delete(e.pointerId);
    if (Input.pointers.size < 2) Input.pinch = null;
    if (Input.pointers.size > 0) return;
    Input.drag = null;
    const start = Input.tapStart;
    Input.tapStart = null;
    if (!start || start.moved || Input.longPressFired) {
      Input.longPressFired = false;
      return;
    }
    if (e.button !== undefined && e.button !== 0 && e.pointerType === "mouse")
      return;
    // convert to world coords
    const rect = $("map").getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const world = App.camera.screenToWorld(sx, sy);
    Flow.onTap(world.x, world.y);
  },

  pointerCancel(e) {
    Input.pointers.delete(e.pointerId);
    if (Input.longPressTimer) clearTimeout(Input.longPressTimer);
    Input.tapStart = null;
    Input.drag = null;
    Input.pinch = null;
  },
};

// ---------------------------------------------------------------------------
// Menu wiring
// ---------------------------------------------------------------------------
UI.openMenu = function () {
  show("menu");
  $("menu-main").classList.remove("hidden");
  show("menu-logo");
  for (const id of ["menu-settings", "menu-about"]) hide(id);
  UI.updateChallengeBadge();
};

function wireMenu() {
  $("btn-newgame").onclick = () => {
    hide("menu");
    Setup.setMode(false);
    show("setup");
    Setup.syncSeedUi(true);
  };
  $("btn-daily").onclick = () => Setup.openDaily();
  $("btn-challenges").onclick = () => {
    hide("menu");
    show("challenges");
    UI.renderChallengeList();
    UI.markChallengesSeen();
  };
  $("btn-howto").onclick = () => {
    hide("menu");
    show("howto");
  };
  $("btn-settings").onclick = () => {
    hide("menu-main");
    hide("menu-logo");
    show("menu-settings");
  };
  $("btn-about").onclick = () => {
    hide("menu-main");
    hide("menu-logo");
    show("menu-about");
  };
  $("btn-setup-back").onclick = () => {
    Setup.setMode(false);
    hide("setup");
    show("menu");
  };
  $("btn-start").onclick = () => {
    hide("setup");
    Flow.startFromSetup();
  };
  for (const b of document.querySelectorAll("[data-back]")) {
    b.onclick = () => {
      if (UI._returnToGameAfterHowto) {
        UI._returnToGameAfterHowto = false;
        hide("howto");
        show("hud");
        return;
      }
      hide("menu-about");
      hide("menu-settings");
      hide("howto");
      hide("challenges");
      show("menu");
      show("menu-main");
      show("menu-logo");
    };
  }
  for (const id of [
    "pref-show-enemy-turns",
    "pref-enemy-speed",
    "pref-warn-forgotten",
    "pref-auto-end",
  ]) {
    $(id).addEventListener("change", () => Flow.prefsFromSettings());
  }
  $("btn-menu").onclick = () => {
    if (!App.gs) {
      UI.openMenu();
      return;
    }
    // A daily must not be shared as a challenge: the day is the challenge and
    // everyone already has it, so sharing would post a duplicate map into the
    // chat. The row is left out entirely rather than shown disabled.
    const inDaily = Flow.isDaily(App.gs);
    dialog(t("dlg.menu.title"), "", [
      {
        label: t("dlg.menu.share"),
        primary: true,
        hidden: inDaily,
        action: () => Flow.shareCurrentChallenge(),
      },
      {
        label: t("dlg.menu.resign"),
        action: () => {
          dialog(t("dlg.resign.title"), t("dlg.resign.text"), [
            {
              label: t("dlg.resign.confirm"),
              primary: true,
              action: () => {
                if (App.gs && App.gs.challengeId)
                  Flow.reportChallengeEnd(false, App.gs.round, true);
                Flow.stopEnemyTurn();
                Store.remove("save");
                Store.remove("game");
                Flow.clearUndo();
                App.gs = null;
                hide("hud");
                UI.openMenu();
              },
            },
            { label: t("ui.cancel"), subtle: true },
          ]);
        },
      },
      {
        label: t("dlg.menu.howto"),
        action: () => {
          hide("hud");
          show("howto");
          UI._returnToGameAfterHowto = true;
        },
      },
      {
        label: t("dlg.menu.close"),
        subtle: true,
        action: () => {},
      },
    ]);
  };
  $("btn-help").onclick = () => {
    show("howto");
    UI._returnToGameAfterHowto = true;
  };
  $("btn-undo").onclick = () => Flow.undo();
  $("btn-peasant").onclick = () => Flow.buyPeasant();
  $("btn-castle").onclick = () => Flow.buyCastle();
  $("btn-endturn").onclick = () => Flow.endTurnClick();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const w = window.innerWidth;
  const h = window.innerHeight;
  App.renderer.resize(w, h, dpr);
}

// Port of IngameScreen.centerMap + MapRenderer.placeCameraForFullMapView.
// The camera zoom is only ever multiplied by the fitting factor (exactly like
// the original); start from a neutral zoom for a deterministic framing.
function layoutForMap(gs) {
  gs = gs || App.gs;
  if (!gs) return;
  const coords = gs.tiles.map((t) => t.pos);
  // HUD margins: the top info bar and the bottom button bar are not map area
  const topBar = 64;
  const bottomBar = 92;
  const left = 26;
  const right = 26;
  App.camera.zoom = 1;
  App.camera.placeForFullMap(coords, left, bottomBar, right, topBar);
}

function frame(ts) {
  if (!App.lastFrameTs) App.lastFrameTs = ts;
  const dt = Math.min((ts - App.lastFrameTs) / 1000, 0.1);
  App.lastFrameTs = ts;
  if (App.gs) App.renderer.render(dt);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  resize();
});

document.addEventListener("DOMContentLoaded", async () => {
  // Translate the static markup first: everything below reads text that has
  // already been swapped into the user's language.
  I18N.apply();
  // Chat.selfName is the translated "You" unless the messenger knows the name.
  if (Chat.selfName == null) Chat.selfName = t("ui.you");
  try {
    await TextureAtlasHelper.load();
  } catch (e) {
    console.error("sprite sheets failed to load", e);
  }
  UI.renderToolIcons();
  const canvas = $("map");
  App.renderer = new MapRenderer(canvas, App.camera);
  resize();
  Input.init(canvas);
  Flow.loadPrefs();
  Setup.init();
  wireMenu();
  Chat.init();
  UI.updateChallengeBadge();

  // Deep link (?t=challenge&id=...): the update listener is attached by
  // Chat.init() above, so by the time this runs the challenge the link refers
  // to is normally already known. Prefer the link over restoring the last game.
  const link = DeepLink.parse();
  if (link) {
    DeepLink.apply(link);
    layoutForMap();
  } else {
    const restored = Flow.restoreIfAny();
    if (!restored) {
      UI.openMenu();
    } else {
      layoutForMap();
    }
  }

  // Messengers that navigate the already-running app instead of restarting it
  // fire hashchange; treat it exactly like a fresh deep link.
  window.addEventListener("hashchange", () => {
    const t = DeepLink.parse();
    if (t) DeepLink.apply(t);
  });

  requestAnimationFrame(frame);
});

// expose on window object for testing
window.__feudalTactics = {
  App,
  Store,
  toast,
  show,
  hide,
  showOverlayOnly,
  hideAllOverlays,
  dialog,
  DeepLink,
  Daily,
  Chat,
  Flow,
  Setup,
  UI,
  mapSizeName,
  Input,
  wireMenu,
  resize,
  layoutForMap,
  frame,
  I18N,
  t,
  TextureAtlasHelper,
  MapCamera,
  MapRenderer,
  PLAYER_COLOR_CSS,
  HexMapHelper,
  INTELLIGENCE,
  MAP_SIZES,
  DENSITIES,
  Content,
  GameStateHelper,
  InputValidationHelper,
  UNITS,
  UNIT_BY_STRENGTH,
  BotAi,
  GameStateConverter,
  HEX_OUTER_RADIUS,
  HEXTILE_WIDTH,
  HEXTILE_HEIGHT,
  javaRound,
  WIN_LANDMASS_PERCENTAGE,
};
