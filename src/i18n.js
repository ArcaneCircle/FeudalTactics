export const I18N = (() => {
  const DICTS = {
    en: {
      "menu.tagline": "Medieval strategy. Conquer the island.",
      "menu.newGame": "New Game",
      "menu.daily": "Challenge of the Day",
      "menu.challenges": "Challenges",
      "menu.settings": "Settings",
      "menu.about": "About",
      "ui.back": "Back",
      "ui.you": "You",
      "ui.cancel": "Cancel",
      "ui.play": "Play",
      "ui.expired": "Expired",

      "settings.showEnemyTurns": "Show enemy turns",
      "settings.enemySpeed": "Enemy turn speed",
      "settings.warnForgotten": "Warn about forgotten kingdoms",
      "settings.autoEnd": "Auto-end turn when all units have acted",

      "about.p1":
        "A port of <b>Feudal Tactics</b>, the medieval strategy game by Sesu8642 inspired by Sean O'Connor's <i>Slay</i>. The rules, map generation and enemy AI come from the original GPL-3.0-or-later Java source, reimplemented to run in a browser.",
      "about.p2":
        "This port adds enhanced graphics and extra features: a list of challenges shared in the chat and a daily challenge.",
      "about.p3":
        "Runs fully offline inside a webxdc mini app. No tracking, no network access, no ads. Your games are saved locally in this chat's app storage.",
      "about.p4":
        "<b>Challenges:</b> inside a messenger you can share a map to the chat and compare results with everyone who plays it.",

      "hud.menu": "Menu",
      "hud.undo": "Undo (Backspace)",
      "hud.buyPeasant": "Buy peasant (right click / 1)",
      "hud.buyTower": "Buy tower (middle click / 2)",
      "hud.endTurn": "End turn",
      "hud.spectating": "Spectating",
      "hud.victory": "Victory",
      "hud.defeat": "Defeat",
      "hud.gameOver": "Game over",
      "hud.enemyTurn": "Enemy turn",
      "hud.enemy": "Enemy",
      "hud.yourTurn": "Your turn",
      "hud.round": "Round {round}",
      "hud.roundEnemy": "Round {round} · {who}",
      "hud.roundTurn": "Round {round} · {turn}",
      "hud.savings": "Savings: {savings} ({balance})",
      "hud.selectKingdom": "Select a kingdom.",
      "hud.allMovesDone": "All moves done — press ➜ to end your turn.",
      "setup.color": "Your color",
      "setup.difficulty": "Enemy difficulty",
      "setup.mapsize": "Map size",
      "setup.density": "Map density",
      "setup.enemies": "Enemies",
      "setup.seed": "Seed",
      "setup.start": "Start game",
      "setup.startChallenge": "Start challenge",
      "setup.randomSeed": "Generate a random seed",
      "setup.player": "Player {n}",
      "setup.dailyNote":
        "Challenge of the day — one map for everyone today. You may pick the <strong>difficulty</strong>; it is shown with your result. Press <strong>Start challenge</strong> to play it.",
      "setup.pastDailyNote":
        "Challenge of the day ({date}) — a past day, still the same map for everyone. You may pick the <strong>difficulty</strong>; it is shown with your result. Press <strong>Start challenge</strong> to play it.",
      "setup.sharedNote":
        "Shared challenge — these are the settings from the chat. Press <strong>Start challenge</strong> to play the identical map; your result goes back to the chat.",

      "diff.LEVEL_1": "Easy",
      "diff.LEVEL_2": "Medium",
      "diff.LEVEL_3": "Hard",
      "diff.LEVEL_4": "Very hard",
      "size.SMALL": "Small",
      "size.MEDIUM": "Medium",
      "size.LARGE": "Large",
      "size.XLARGE": "Huge",
      "size.XXLARGE": "Gigantic",
      "density.LOOSE": "Spread-out",
      "density.MEDIUM": "Moderate",
      "density.DENSE": "Compact",

      "mode.label": "{modeLower} mode",
      "mode.suffix": "in {modeLower} mode",

      "chat.sharedChallenge":
        "{name} shared a challenge • difficulty {difficultyLower}, size {sizeLower}, {players} players, seed {seed}",
      "chat.sharedDaily": "{name} shared the challenge of the day ({date})",
      "chat.joinDaily": "{name} joined the challenge of the day ({date})",
      "chat.mapDetails":
        "difficulty {difficultyLower}, size {sizeLower}, {players} players, seed {seed}",
      "chat.resultBeat": "{name} beat a challenge in round {round} • {map}",
      "chat.resultLost": "{name} lost a challenge in round {round} • {map}",
      "chat.resultGaveUp": "{name} gave up a challenge • {map}",
      "chat.resultBeatShort": "{name} beat a challenge in round {round}",
      "chat.resultLostShort": "{name} lost a challenge in round {round}",
      "chat.resultGaveUpShort": "{name} gave up a challenge",
      "chat.resultBeatDaily":
        "{name} beat the challenge of the day ({date}) {modeSuffix}",
      "chat.resultLostDaily":
        "{name} lost the challenge of the day ({date}) {modeSuffix}",
      "chat.resultGaveUpDaily":
        "{name} gave up the challenge of the day ({date}) {modeSuffix}",

      "toast.chatUnavailable":
        "Chat integration is only available inside a webxdc messenger.",
      "toast.sendFailed": "Could not send update.",
      "toast.colorNotOccupied":
        "Your color must be one of the occupied starting positions.",
      "toast.notEnoughPeasant": "Not enough money for a peasant.",
      "toast.notEnoughTower": "Not enough money for a tower.",
      "toast.nothingToUndo": "Nothing to undo.",
      "toast.placeFirst": "Place your object on the map first.",
      "toast.noShareable": "This game has no shareable settings.",
      "toast.challengeShared": "Challenge shared to the chat!",

      "dlg.endTurn.title": "End turn?",
      "dlg.endTurn.text":
        "You might have forgotten to do your moves for a kingdom.\n\nAre you sure you want to end your turn?",
      "dlg.endTurn.yes": "Yes, end turn",
      "dlg.endTurn.keep": "Keep playing",
      "dlg.menu.share": "Share challenge to chat",
      "dlg.menu.resign": "Resign (back to menu)",
      "dlg.menu.close": "Close menu",
      "dlg.resign.title": "Resign?",
      "dlg.resign.text": "Your progress will be lost. Are you sure?",
      "dlg.resign.confirm": "Resign",
      "dlg.defeat.text":
        "All your kingdoms were conquered by the enemy in round {round}.",

      "over.victoryTitle": "VICTORY!",
      "over.defeatTitle": "DEFEAT!",
      "over.allDefeated": "You defeated all your enemies in round {round}.",
      "over.surrendered": "Your enemies surrendered in round {round}.",
      "over.wonRound": "You won in round {round}.",
      "over.enemyMajority":
        "Your enemy conquered a majority of the territory in round {round}.",
      "over.allConquered": "All your kingdoms were conquered in round {round}.",
      "over.newGame": "New game",
      "over.mainMenu": "Main menu",
      "list.intro":
        "Maps shared in this chat. Play the exact same island and settings. Your best result is sent back to the chat.",
      "list.empty":
        "No challenges yet. Start a game and use the menu button during the game to share it to the chat!",
      "list.unavailable":
        "Chat integration is not available here. Challenges appear when this app is used in Delta Chat or another webxdc messenger.",
      "list.yourBestWin": "Your best: victory in round {round}",
      "list.yourBestLoss": "Your best: defeat in round {round}",
      "list.youGaveUp": "You gave up",
      "list.cardDaily": "Challenge of the day · {date}",
      "list.cardPlayers": "{players} players · {difficulty}",
      "list.cardDailyMeta": "{players} players · {size} · {modeLabel}",
      "list.cardMeta": "{size} · seed {seed} · by {creator}",
      "board.won": "won · round {round}",
      "board.lost": "lost · round {round}",
      "board.gaveUp": "gave up",

      "howto.title": "How to Play",
      "howto.p1":
        "Each tile is colored to show which player owns it. Two or more connected tiles of the same color form a <b>kingdom</b>. Conquer the whole island to win: the game ends when one player owns 80% of all kingdom tiles.",
      "howto.p2":
        "<b>Select a kingdom</b> by tapping one of your tiles (white outline). Its finances are shown in the top left: <i>Savings (+income)</i>. Each kingdom earns one coin per tile that has no tree on it. Units cost salary every turn.",
      "howto.p3":
        "<b>Units &amp; towers:</b> buy a peasant for 10 coins, place it on one of your own tiles or on an enemy tile adjacent to your kingdom. Place a peasant on another unit to combine them into a stronger unit. Only knights and barons can destroy towers.",
      "howto.unit": "Unit",
      "howto.strength": "Strength",
      "howto.salary": "Salary",
      "unit.PEASANT": "Peasant",
      "unit.SPEARMAN": "Spearman",
      "unit.KNIGHT": "Knight",
      "unit.BARON": "Baron",
      "howto.p5":
        "<b>Protection:</b> units, capitals and towers protect their tile and all adjacent tiles; a digit and a shield in the corner of a tile show its protection level. You need a <i>stronger</i> unit than the protection to conquer.",
      "howto.p6":
        "<b>Capitals:</b> if a capital is destroyed (or a tile is cut off), the kingdom's savings are lost and a new capital is placed. If a kingdom is split, only the part with the capital keeps the money.",
      "howto.p7":
        "<b>Trees</b> block income. Palm trees grow on coast and spread every round; pine trees spread when two are adjacent. Place a unit on a tree to chop it (the unit cannot act afterwards). <b>Gravestones</b> appear when units can't be paid and turn into trees.",
      "howto.p8":
        "<b>Controls:</b> tap a tile to select a kingdom, tap a unit to pick it up and tap a target to place/conquer/combine. Double-tap an empty tile of the selected kingdom to buy and place a peasant at once. Buy buttons are at the bottom (right-click = peasant, middle-click = tower, long press also buys a tower). Undo works within your turn and the game is saved automatically.",
      "howto.p9":
        "<b>Challenges:</b> in a messenger you can share the current map to the chat. Everyone who plays it gets the same island and posts their result, so you can compare who won in the fewest rounds.",
    },

    de: {
      "menu.tagline": "Mittelalterliche Strategie. Erobere die Insel.",
      "menu.newGame": "Neues Spiel",
      "menu.daily": "Herausforderung des Tages",
      "menu.challenges": "Herausforderungen",
      "menu.settings": "Einstellungen",
      "menu.about": "Über",
      "ui.back": "Zurück",
      "ui.you": "Du",
      "ui.cancel": "Abbrechen",
      "ui.play": "Spielen",
      "ui.expired": "Abgelaufen",

      "settings.showEnemyTurns": "Gegnerzüge anzeigen",
      "settings.enemySpeed": "Geschwindigkeit der Gegnerzüge",
      "settings.warnForgotten": "Vor vergessenen Königreichen warnen",
      "settings.autoEnd":
        "Zug automatisch beenden, wenn alle Einheiten gehandelt haben",

      "about.p1":
        "Eine Umsetzung von <b>Feudal Tactics</b>, dem mittelalterlichen Strategiespiel von Sesu8642 mit Anleihen bei Sean O'Connors <i>Slay</i>. Spielregeln, Kartengenerierung und gegnerische KI stammen aus dem ursprünglichen Java-Quellcode unter GPL-3.0-or-later und wurden für den Browser neu umgesetzt.",
      "about.p2":
        "Diese Umsetzung bringt aufgewertete Grafik und zusätzliche Funktionen mit: eine Liste der im Chat geteilten Herausforderungen und eine tägliche Herausforderung.",
      "about.p3":
        "Läuft vollständig offline als webxdc-Mini-App. Kein Tracking, kein Netzwerkzugriff, keine Werbung. Deine Spiele werden lokal im App-Speicher dieses Chats gesichert.",
      "about.p4":
        "<b>Herausforderungen:</b> In einem Messenger kannst du eine Karte in den Chat teilen und Ergebnisse mit allen vergleichen, die sie spielen.",

      "hud.menu": "Menü",
      "hud.undo": "Rückgängig (Backspace)",
      "hud.buyPeasant": "Bauern kaufen (Rechtsklick / 1)",
      "hud.buyTower": "Turm kaufen (Mittelklick / 2)",
      "hud.endTurn": "Zug beenden",
      "hud.spectating": "Zuschauen",
      "hud.victory": "Sieg",
      "hud.defeat": "Niederlage",
      "hud.gameOver": "Spiel vorbei",
      "hud.enemyTurn": "Gegnerzug",
      "hud.enemy": "Gegner",
      "hud.yourTurn": "Dein Zug",
      "hud.round": "Runde {round}",
      "hud.roundEnemy": "Runde {round} · {who}",
      "hud.roundTurn": "Runde {round} · {turn}",
      "hud.savings": "Ersparnisse: {savings} ({balance})",
      "hud.selectKingdom": "Wähle ein Königreich.",
      "hud.allMovesDone":
        "Alle Züge erledigt — drücke ➜, um deinen Zug zu beenden.",
      "setup.color": "Deine Farbe",
      "setup.difficulty": "Gegnerstärke",
      "setup.mapsize": "Kartengröße",
      "setup.density": "Kartendichte",
      "setup.enemies": "Gegner",
      "setup.seed": "Seed",
      "setup.start": "Spiel starten",
      "setup.startChallenge": "Herausforderung starten",
      "setup.randomSeed": "Zufälligen Seed erzeugen",
      "setup.player": "Spieler {n}",
      "setup.dailyNote":
        "Herausforderung des Tages — eine Karte für alle heute. Du darfst die <strong>Schwierigkeit</strong> wählen; sie wird mit deinem Ergebnis angezeigt. Drücke <strong>Herausforderung starten</strong>, um sie zu spielen.",
      "setup.pastDailyNote":
        "Herausforderung des Tages ({date}) — ein vergangener Tag, aber dieselbe Karte für alle. Du darfst die <strong>Schwierigkeit</strong> wählen; sie wird mit deinem Ergebnis angezeigt. Drücke <strong>Herausforderung starten</strong>, um sie zu spielen.",
      "setup.sharedNote":
        "Geteilte Herausforderung — das sind die Einstellungen aus dem Chat. Drücke <strong>Herausforderung starten</strong>, um die identische Karte zu spielen; dein Ergebnis geht zurück in den Chat.",

      "diff.LEVEL_1": "Leicht",
      "diff.LEVEL_2": "Mittel",
      "diff.LEVEL_3": "Schwer",
      "diff.LEVEL_4": "Sehr schwer",
      "size.SMALL": "Klein",
      "size.MEDIUM": "Mittel",
      "size.LARGE": "Groß",
      "size.XLARGE": "Riesig",
      "size.XXLARGE": "Gigantisch",
      "density.LOOSE": "Weitläufig",
      "density.MEDIUM": "Mäßig",
      "density.DENSE": "Kompakt",

      "mode.label": "Modus: {mode}",
      "mode.suffix": "im Modus {mode}",

      "chat.sharedChallenge":
        "{name} hat eine Herausforderung geteilt • {difficulty} als Schwierigkeit, {size} als Größe, {players} Spieler, Seed {seed}",
      "chat.sharedDaily":
        "{name} hat die Herausforderung des Tages geteilt ({date})",
      "chat.joinDaily":
        "{name} ist der Herausforderung des Tages beigetreten ({date})",
      "chat.mapDetails":
        "{difficulty} als Schwierigkeit, {size} als Größe, {players} Spieler, Seed {seed}",
      "chat.resultBeat":
        "{name} hat eine Herausforderung in Runde {round} gewonnen • {map}",
      "chat.resultLost":
        "{name} hat eine Herausforderung in Runde {round} verloren • {map}",
      "chat.resultGaveUp": "{name} hat eine Herausforderung aufgegeben • {map}",
      "chat.resultBeatShort":
        "{name} hat eine Herausforderung in Runde {round} gewonnen",
      "chat.resultLostShort":
        "{name} hat eine Herausforderung in Runde {round} verloren",
      "chat.resultGaveUpShort": "{name} hat eine Herausforderung aufgegeben",
      "chat.resultBeatDaily":
        "{name} hat die Herausforderung des Tages ({date}) {modeSuffix} gewonnen",
      "chat.resultLostDaily":
        "{name} hat die Herausforderung des Tages ({date}) {modeSuffix} verloren",
      "chat.resultGaveUpDaily":
        "{name} hat die Herausforderung des Tages ({date}) {modeSuffix} aufgegeben",

      "toast.chatUnavailable":
        "Die Chat-Anbindung gibt es nur in einem webxdc-Messenger.",
      "toast.sendFailed": "Die Nachricht konnte nicht gesendet werden.",
      "toast.colorNotOccupied":
        "Deine Farbe muss eine der besetzten Startpositionen sein.",
      "toast.notEnoughPeasant": "Nicht genug Geld für einen Bauern.",
      "toast.notEnoughTower": "Nicht genug Geld für einen Turm.",
      "toast.nothingToUndo": "Nichts rückgängig zu machen.",
      "toast.placeFirst": "Platziere zuerst dein Objekt auf der Karte.",
      "toast.noShareable": "Dieses Spiel hat keine teilbaren Einstellungen.",
      "toast.challengeShared": "Herausforderung in den Chat geteilt!",

      "dlg.endTurn.title": "Zug beenden?",
      "dlg.endTurn.text":
        "Vielleicht hast du die Züge für ein Königreich vergessen.\n\nWillst du deinen Zug wirklich beenden?",
      "dlg.endTurn.yes": "Ja, Zug beenden",
      "dlg.endTurn.keep": "Weiterspielen",
      "dlg.menu.share": "Herausforderung in den Chat teilen",
      "dlg.menu.resign": "Aufgeben (zurück zum Menü)",
      "dlg.menu.close": "Menü schließen",
      "dlg.resign.title": "Aufgeben?",
      "dlg.resign.text": "Dein Fortschritt geht verloren. Bist du sicher?",
      "dlg.resign.confirm": "Aufgeben",
      "dlg.defeat.text":
        "Alle deine Königreiche wurden in Runde {round} vom Gegner erobert.",

      "over.victoryTitle": "SIEG!",
      "over.defeatTitle": "NIEDERLAGE!",
      "over.allDefeated": "Du hast in Runde {round} alle Gegner besiegt.",
      "over.surrendered": "Deine Gegner haben in Runde {round} aufgegeben.",
      "over.wonRound": "Du hast in Runde {round} gewonnen.",
      "over.enemyMajority":
        "Dein Gegner hat in Runde {round} die Mehrheit des Gebiets erobert.",
      "over.allConquered":
        "Alle deine Königreiche wurden in Runde {round} erobert.",
      "over.newGame": "Neues Spiel",
      "over.mainMenu": "Hauptmenü",
      "list.intro":
        "In diesem Chat geteilte Karten. Spiele dieselbe Insel mit denselben Einstellungen. Dein bestes Ergebnis geht zurück in den Chat.",
      "list.empty":
        "Noch keine Herausforderungen. Starte ein Spiel und teile es über den Menü-Button während des Spiels in den Chat!",
      "list.unavailable":
        "Die Chat-Anbindung ist hier nicht verfügbar. Herausforderungen erscheinen, wenn diese App in Delta Chat oder einem anderen webxdc-Messenger läuft.",
      "list.yourBestWin": "Dein Bestes: Sieg in Runde {round}",
      "list.yourBestLoss": "Dein Bestes: Niederlage in Runde {round}",
      "list.youGaveUp": "Du hast aufgegeben",
      "list.cardDaily": "Herausforderung des Tages · {date}",
      "list.cardPlayers": "{players} Spieler · {difficulty}",
      "list.cardDailyMeta": "{players} Spieler · {size} · {modeLabel}",
      "list.cardMeta": "{size} · Seed {seed} · von {creator}",
      "board.won": "gewonnen · Runde {round}",
      "board.lost": "verloren · Runde {round}",
      "board.gaveUp": "aufgegeben",

      "howto.title": "Spielanleitung",
      "howto.p1":
        "Jedes Feld ist eingefärbt und zeigt so, welchem Spieler es gehört. Zwei oder mehr verbundene Felder derselben Farbe bilden ein <b>Königreich</b>. Erobere die ganze Insel: Das Spiel endet, wenn ein Spieler 80 % aller Königreichsfelder besitzt.",
      "howto.p2":
        "<b>Wähle ein Königreich</b>, indem du auf eines deiner Felder tippst (weiße Umrandung). Seine Finanzen stehen oben links: <i>Ersparnisse (+Einkommen)</i>. Jedes Königreich verdient eine Münze pro Feld ohne Baum. Einheiten kosten jede Runde Sold.",
      "howto.p3":
        "<b>Einheiten &amp; Türme:</b> Kaufe einen Bauern für 10 Münzen und setze ihn auf ein eigenes Feld oder auf ein gegnerisches Feld neben deinem Königreich. Setze einen Bauern auf eine andere Einheit, um sie zu einer stärkeren Einheit zu vereinen. Nur Ritter und Barone können Türme zerstören.",
      "howto.unit": "Einheit",
      "howto.strength": "Stärke",
      "howto.salary": "Sold",
      "unit.PEASANT": "Bauer",
      "unit.SPEARMAN": "Speerkämpfer",
      "unit.KNIGHT": "Ritter",
      "unit.BARON": "Baron",
      "howto.p5":
        "<b>Schutz:</b> Einheiten, Hauptstädte und Türme schützen ihr Feld und alle angrenzenden Felder; eine Ziffer mit Schild in der Ecke eines Feldes zeigt seine Schutzstufe. Zum Erobern brauchst du eine <i>stärkere</i> Einheit als den Schutz.",
      "howto.p6":
        "<b>Hauptstädte:</b> Wird eine Hauptstadt zerstört (oder ein Feld abgeschnitten), sind die Ersparnisse des Königreichs verloren und eine neue Hauptstadt wird gesetzt. Wird ein Königreich geteilt, behält nur der Teil mit der Hauptstadt das Geld.",
      "howto.p7":
        "<b>Bäume</b> blockieren das Einkommen. Palmen wachsen an der Küste und breiten sich jede Runde aus; Kiefern breiten sich aus, wenn zwei nebeneinander stehen. Setze eine Einheit auf einen Baum, um ihn zu fällen (die Einheit kann danach nicht mehr handeln). <b>Grabsteine</b> erscheinen, wenn Einheiten nicht bezahlt werden können, und werden zu Bäumen.",
      "howto.p8":
        "<b>Steuerung:</b> Tippe ein Feld an, um ein Königreich zu wählen, tippe eine Einheit an, um sie aufzunehmen, und tippe ein Ziel an, um sie zu setzen, zu erobern oder zu vereinen. Doppeltippe auf ein leeres Feld des gewählten Königreichs, um einen Bauern zu kaufen und sofort zu setzen. Die Kauftasten sind unten (Rechtsklick = Bauer, Mittelklick = Turm, langes Drücken kauft ebenfalls einen Turm). Rückgängig gilt innerhalb deines Zuges, und das Spiel wird automatisch gesichert.",
      "howto.p9":
        "<b>Herausforderungen:</b> In einem Messenger kannst du die aktuelle Karte in den Chat teilen. Alle, die sie spielen, bekommen dieselbe Insel und posten ihr Ergebnis, sodass du vergleichen kannst, wer in den wenigsten Runden gewonnen hat.",
    },

    fr: {
      "menu.tagline": "Stratégie médiévale. Conquiers l'île.",
      "menu.newGame": "Nouvelle partie",
      "menu.daily": "Défi du jour",
      "menu.challenges": "Défis",
      "menu.settings": "Réglages",
      "menu.about": "À propos",
      "ui.back": "Retour",
      "ui.you": "Toi",
      "ui.cancel": "Annuler",
      "ui.play": "Jouer",
      "ui.expired": "Expiré",

      "settings.showEnemyTurns": "Afficher les tours de l'ennemi",
      "settings.enemySpeed": "Vitesse des tours de l'ennemi",
      "settings.warnForgotten": "Avertir des royaumes oubliés",
      "settings.autoEnd":
        "Terminer le tour automatiquement quand toutes les unités ont agi",

      "about.p1":
        "Une adaptation de <b>Feudal Tactics</b>, le jeu de stratégie médiéval de Sesu8642 inspiré de <i>Slay</i> de Sean O'Connor. Les règles, la génération des cartes et l'IA ennemie proviennent du code source Java original sous GPL-3.0-or-later et ont été réécrites pour fonctionner dans un navigateur.",
      "about.p2":
        "Cette version apporte des graphismes améliorés et des fonctionnalités supplémentaires : une liste des défis partagés dans la discussion et un défi quotidien.",
      "about.p3":
        "Fonctionne entièrement hors ligne dans une mini-application webxdc. Aucun suivi, aucun accès réseau, aucune publicité. Tes parties sont enregistrées localement dans le stockage de cette discussion.",
      "about.p4":
        "<b>Défis :</b> dans une messagerie, tu peux partager une carte dans la discussion et comparer tes résultats avec tous ceux qui la jouent.",

      "hud.menu": "Menu",
      "hud.undo": "Annuler (Retour arrière)",
      "hud.buyPeasant": "Acheter un paysan (clic droit / 1)",
      "hud.buyTower": "Acheter une tour (clic du milieu / 2)",
      "hud.endTurn": "Terminer le tour",
      "hud.spectating": "En spectateur",
      "hud.victory": "Victoire",
      "hud.defeat": "Défaite",
      "hud.gameOver": "Partie terminée",
      "hud.enemyTurn": "Tour de l'ennemi",
      "hud.enemy": "Ennemi",
      "hud.yourTurn": "Ton tour",
      "hud.round": "Manche {round}",
      "hud.roundEnemy": "Manche {round} · {who}",
      "hud.roundTurn": "Manche {round} · {turn}",
      "hud.savings": "Économies : {savings} ({balance})",
      "hud.selectKingdom": "Sélectionne un royaume.",
      "hud.allMovesDone":
        "Tous les coups sont joués — appuie sur ➜ pour terminer ton tour.",
      "setup.color": "Ta couleur",
      "setup.difficulty": "Difficulté ennemie",
      "setup.mapsize": "Taille de la carte",
      "setup.density": "Densité de la carte",
      "setup.enemies": "Ennemis",
      "setup.seed": "Graine",
      "setup.start": "Lancer la partie",
      "setup.startChallenge": "Lancer le défi",
      "setup.randomSeed": "Générer une graine aléatoire",
      "setup.player": "Joueur {n}",
      "setup.dailyNote":
        "Défi du jour — une seule carte pour tout le monde aujourd'hui. Tu peux choisir la <strong>difficulté</strong> ; elle apparaîtra avec ton résultat. Appuie sur <strong>Lancer le défi</strong> pour jouer.",
      "setup.pastDailyNote":
        "Défi du jour ({date}) — un jour passé, mais toujours la même carte pour tout le monde. Tu peux choisir la <strong>difficulté</strong> ; elle apparaîtra avec ton résultat. Appuie sur <strong>Lancer le défi</strong> pour jouer.",
      "setup.sharedNote":
        "Défi partagé — voici les réglages de la discussion. Appuie sur <strong>Lancer le défi</strong> pour jouer la carte identique ; ton résultat sera renvoyé dans la discussion.",

      "diff.LEVEL_1": "Facile",
      "diff.LEVEL_2": "Moyen",
      "diff.LEVEL_3": "Difficile",
      "diff.LEVEL_4": "Très difficile",
      "size.SMALL": "Petite",
      "size.MEDIUM": "Moyenne",
      "size.LARGE": "Grande",
      "size.XLARGE": "Énorme",
      "size.XXLARGE": "Gigantesque",
      "density.LOOSE": "Aérée",
      "density.MEDIUM": "Modérée",
      "density.DENSE": "Compacte",

      "mode.label": "mode {modeLower}",
      "mode.suffix": "en mode {modeLower}",

      "chat.sharedChallenge":
        "{name} a partagé un défi • difficulté {difficultyLower}, taille {sizeLower}, {players} joueurs, graine {seed}",
      "chat.sharedDaily": "{name} a partagé le défi du jour ({date})",
      "chat.joinDaily": "{name} a rejoint le défi du jour ({date})",
      "chat.mapDetails":
        "difficulté {difficultyLower}, taille {sizeLower}, {players} joueurs, graine {seed}",
      "chat.resultBeat": "{name} a gagné un défi à la manche {round} • {map}",
      "chat.resultLost": "{name} a perdu un défi à la manche {round} • {map}",
      "chat.resultGaveUp": "{name} a abandonné un défi • {map}",
      "chat.resultBeatShort": "{name} a gagné un défi à la manche {round}",
      "chat.resultLostShort": "{name} a perdu un défi à la manche {round}",
      "chat.resultGaveUpShort": "{name} a abandonné un défi",
      "chat.resultBeatDaily":
        "{name} a gagné le défi du jour ({date}) {modeSuffix}",
      "chat.resultLostDaily":
        "{name} a perdu le défi du jour ({date}) {modeSuffix}",
      "chat.resultGaveUpDaily":
        "{name} a abandonné le défi du jour ({date}) {modeSuffix}",

      "toast.chatUnavailable":
        "L'intégration à la discussion n'est disponible que dans une messagerie webxdc.",
      "toast.sendFailed": "Impossible d'envoyer la mise à jour.",
      "toast.colorNotOccupied":
        "Ta couleur doit être l'une des positions de départ occupées.",
      "toast.notEnoughPeasant": "Pas assez d'argent pour un paysan.",
      "toast.notEnoughTower": "Pas assez d'argent pour une tour.",
      "toast.nothingToUndo": "Rien à annuler.",
      "toast.placeFirst": "Place d'abord ton objet sur la carte.",
      "toast.noShareable": "Cette partie n'a pas de réglages à partager.",
      "toast.challengeShared": "Défi partagé dans la discussion !",

      "dlg.endTurn.title": "Terminer le tour ?",
      "dlg.endTurn.text":
        "Tu as peut-être oublié de jouer les coups d'un royaume.\n\nVeux-tu vraiment terminer ton tour ?",
      "dlg.endTurn.yes": "Oui, terminer le tour",
      "dlg.endTurn.keep": "Continuer à jouer",
      "dlg.menu.share": "Partager le défi dans la discussion",
      "dlg.menu.resign": "Abandonner (retour au menu)",
      "dlg.menu.close": "Fermer le menu",
      "dlg.resign.title": "Abandonner ?",
      "dlg.resign.text": "Ta progression sera perdue. Es-tu sûr ?",
      "dlg.resign.confirm": "Abandonner",
      "dlg.defeat.text":
        "Tous tes royaumes ont été conquis par l'ennemi à la manche {round}.",

      "over.victoryTitle": "VICTOIRE !",
      "over.defeatTitle": "DÉFAITE !",
      "over.allDefeated": "Tu as vaincu tous tes ennemis à la manche {round}.",
      "over.surrendered": "Tes ennemis ont capitulé à la manche {round}.",
      "over.wonRound": "Tu as gagné à la manche {round}.",
      "over.enemyMajority":
        "Ton ennemi a conquis la majorité du territoire à la manche {round}.",
      "over.allConquered":
        "Tous tes royaumes ont été conquis à la manche {round}.",
      "over.newGame": "Nouvelle partie",
      "over.mainMenu": "Menu principal",
      "list.intro":
        "Cartes partagées dans cette discussion. Joue exactement la même île et les mêmes réglages. Ton meilleur résultat sera renvoyé dans la discussion.",
      "list.empty":
        "Aucun défi pour l'instant. Lance une partie et utilise le bouton du menu pendant la partie pour la partager dans la discussion !",
      "list.unavailable":
        "L'intégration à la discussion n'est pas disponible ici. Les défis apparaissent quand cette application est utilisée dans Delta Chat ou une autre messagerie webxdc.",
      "list.yourBestWin": "Ton meilleur : victoire à la manche {round}",
      "list.yourBestLoss": "Ton meilleur : défaite à la manche {round}",
      "list.youGaveUp": "Tu as abandonné",
      "list.cardDaily": "Défi du jour · {date}",
      "list.cardPlayers": "{players} joueurs · {difficulty}",
      "list.cardDailyMeta": "{players} joueurs · {size} · {modeLabel}",
      "list.cardMeta": "{size} · graine {seed} · par {creator}",
      "board.won": "gagné · manche {round}",
      "board.lost": "perdu · manche {round}",
      "board.gaveUp": "abandonné",

      "howto.title": "Comment jouer",
      "howto.p1":
        "Chaque case est colorée pour montrer à quel joueur elle appartient. Deux cases reliées ou plus de la même couleur forment un <b>royaume</b>. Conquiers toute l'île pour gagner : la partie se termine quand un joueur possède 80 % des cases de royaumes.",
      "howto.p2":
        "<b>Sélectionne un royaume</b> en touchant une de tes cases (contour blanc). Ses finances s'affichent en haut à gauche : <i>Économies (+revenu)</i>. Chaque royaume gagne une pièce par case sans arbre. Les unités coûtent une solde à chaque tour.",
      "howto.p3":
        "<b>Unités et tours :</b> achète un paysan pour 10 pièces, place-le sur une de tes cases ou sur une case ennemie voisine de ton royaume. Place un paysan sur une autre unité pour les fusionner en une unité plus forte. Seuls les chevaliers et les barons peuvent détruire les tours.",
      "howto.unit": "Unité",
      "howto.strength": "Force",
      "howto.salary": "Solde",
      "unit.PEASANT": "Paysan",
      "unit.SPEARMAN": "Lancier",
      "unit.KNIGHT": "Chevalier",
      "unit.BARON": "Baron",
      "howto.p5":
        "<b>Protection :</b> les unités, les capitales et les tours protègent leur case et toutes les cases voisines ; un chiffre suivi d'un bouclier dans le coin d'une case indique son niveau de protection. Il te faut une unité <i>plus forte</i> que la protection pour conquérir.",
      "howto.p6":
        "<b>Capitales :</b> si une capitale est détruite (ou qu'une case est isolée), les économies du royaume sont perdues et une nouvelle capitale est placée. Si un royaume est coupé en deux, seule la partie avec la capitale garde l'argent.",
      "howto.p7":
        "<b>Les arbres</b> bloquent le revenu. Les palmiers poussent sur la côte et se répandent à chaque manche ; les pins se répandent quand deux sont voisins. Place une unité sur un arbre pour l'abattre (l'unité ne peut plus agir ensuite). Les <b>pierres tombales</b> apparaissent quand des unités ne peuvent pas être payées et deviennent des arbres.",
      "howto.p8":
        "<b>Commandes :</b> touche une case pour sélectionner un royaume, touche une unité pour la prendre et touche une cible pour la placer, conquérir ou fusionner. Touche deux fois une case vide du royaume sélectionné pour acheter et placer un paysan d'un coup. Les boutons d'achat sont en bas (clic droit = paysan, clic du milieu = tour, un appui long achète aussi une tour). L'annulation fonctionne pendant ton tour et la partie est enregistrée automatiquement.",
      "howto.p9":
        "<b>Défis :</b> dans une messagerie, tu peux partager la carte actuelle dans la discussion. Tous ceux qui la jouent obtiennent la même île et publient leur résultat, pour comparer qui a gagné en le moins de manches.",
    },

    it: {
      "menu.tagline": "Strategia medievale. Conquista l'isola.",
      "menu.newGame": "Nuova partita",
      "menu.daily": "Sfida del giorno",
      "menu.challenges": "Sfide",
      "menu.settings": "Impostazioni",
      "menu.about": "Informazioni",
      "ui.back": "Indietro",
      "ui.you": "Tu",
      "ui.cancel": "Annulla",
      "ui.play": "Gioca",
      "ui.expired": "Scaduta",

      "settings.showEnemyTurns": "Mostra i turni del nemico",
      "settings.enemySpeed": "Velocità dei turni del nemico",
      "settings.warnForgotten": "Avvisa dei regni dimenticati",
      "settings.autoEnd":
        "Termina il turno automaticamente quando tutte le unità hanno agito",

      "about.p1":
        "Un adattamento di <b>Feudal Tactics</b>, il gioco di strategia medievale di Sesu8642 ispirato a <i>Slay</i> di Sean O'Connor. Regole, generazione delle mappe e IA nemica provengono dal codice sorgente Java originale sotto GPL-3.0-or-later e sono state riscritte per il browser.",
      "about.p2":
        "Questa versione aggiunge grafica migliorata e funzioni extra: un elenco delle sfide condivise nella chat e una sfida giornaliera.",
      "about.p3":
        "Funziona completamente offline dentro una mini app webxdc. Nessun tracciamento, nessun accesso alla rete, nessuna pubblicità. Le tue partite vengono salvate localmente nella memoria dell'app di questa chat.",
      "about.p4":
        "<b>Sfide:</b> in un messenger puoi condividere una mappa nella chat e confrontare i risultati con tutti quelli che la giocano.",

      "hud.menu": "Menu",
      "hud.undo": "Annulla (Backspace)",
      "hud.buyPeasant": "Compra un contadino (clic destro / 1)",
      "hud.buyTower": "Compra una torre (clic centrale / 2)",
      "hud.endTurn": "Termina il turno",
      "hud.spectating": "Spettatore",
      "hud.victory": "Vittoria",
      "hud.defeat": "Sconfitta",
      "hud.gameOver": "Partita finita",
      "hud.enemyTurn": "Turno del nemico",
      "hud.enemy": "Nemico",
      "hud.yourTurn": "Il tuo turno",
      "hud.round": "Round {round}",
      "hud.roundEnemy": "Round {round} · {who}",
      "hud.roundTurn": "Round {round} · {turn}",
      "hud.savings": "Risparmi: {savings} ({balance})",
      "hud.selectKingdom": "Scegli un regno.",
      "hud.allMovesDone":
        "Tutte le mosse fatte — premi ➜ per terminare il turno.",
      "setup.color": "Il tuo colore",
      "setup.difficulty": "Difficoltà nemica",
      "setup.mapsize": "Dimensione mappa",
      "setup.density": "Densità mappa",
      "setup.enemies": "Nemici",
      "setup.seed": "Seme",
      "setup.start": "Inizia la partita",
      "setup.startChallenge": "Inizia la sfida",
      "setup.randomSeed": "Genera un seme casuale",
      "setup.player": "Giocatore {n}",
      "setup.dailyNote":
        "Sfida del giorno — una sola mappa per tutti oggi. Puoi scegliere la <strong>difficoltà</strong>; verrà mostrata con il tuo risultato. Premi <strong>Inizia la sfida</strong> per giocarla.",
      "setup.pastDailyNote":
        "Sfida del giorno ({date}) — un giorno passato, ma sempre la stessa mappa per tutti. Puoi scegliere la <strong>difficoltà</strong>; verrà mostrata con il tuo risultato. Premi <strong>Inizia la sfida</strong> per giocarla.",
      "setup.sharedNote":
        "Sfida condivisa — queste sono le impostazioni dalla chat. Premi <strong>Inizia la sfida</strong> per giocare la mappa identica; il tuo risultato tornerà nella chat.",

      "diff.LEVEL_1": "Facile",
      "diff.LEVEL_2": "Medio",
      "diff.LEVEL_3": "Difficile",
      "diff.LEVEL_4": "Molto difficile",
      "size.SMALL": "Piccola",
      "size.MEDIUM": "Media",
      "size.LARGE": "Grande",
      "size.XLARGE": "Enorme",
      "size.XXLARGE": "Gigantesca",
      "density.LOOSE": "Sparsa",
      "density.MEDIUM": "Moderata",
      "density.DENSE": "Compatta",

      "mode.label": "modalità {modeLower}",
      "mode.suffix": "in modalità {modeLower}",

      "chat.sharedChallenge":
        "{name} ha condiviso una sfida • difficoltà {difficultyLower}, dimensione {sizeLower}, {players} giocatori, seme {seed}",
      "chat.sharedDaily": "{name} ha condiviso la sfida del giorno ({date})",
      "chat.joinDaily": "{name} è entrato nella sfida del giorno ({date})",
      "chat.mapDetails":
        "difficoltà {difficultyLower}, dimensione {sizeLower}, {players} giocatori, seme {seed}",
      "chat.resultBeat": "{name} ha vinto una sfida al round {round} • {map}",
      "chat.resultLost": "{name} ha perso una sfida al round {round} • {map}",
      "chat.resultGaveUp": "{name} ha abbandonato una sfida • {map}",
      "chat.resultBeatShort": "{name} ha vinto una sfida al round {round}",
      "chat.resultLostShort": "{name} ha perso una sfida al round {round}",
      "chat.resultGaveUpShort": "{name} ha abbandonato una sfida",
      "chat.resultBeatDaily":
        "{name} ha vinto la sfida del giorno ({date}) {modeSuffix}",
      "chat.resultLostDaily":
        "{name} ha perso la sfida del giorno ({date}) {modeSuffix}",
      "chat.resultGaveUpDaily":
        "{name} ha abbandonato la sfida del giorno ({date}) {modeSuffix}",

      "toast.chatUnavailable":
        "L'integrazione con la chat è disponibile solo dentro un messenger webxdc.",
      "toast.sendFailed": "Impossibile inviare l'aggiornamento.",
      "toast.colorNotOccupied":
        "Il tuo colore deve essere una delle posizioni di partenza occupate.",
      "toast.notEnoughPeasant": "Soldi insufficienti per un contadino.",
      "toast.notEnoughTower": "Soldi insufficienti per una torre.",
      "toast.nothingToUndo": "Niente da annullare.",
      "toast.placeFirst": "Prima posiziona il tuo oggetto sulla mappa.",
      "toast.noShareable": "Questa partita non ha impostazioni da condividere.",
      "toast.challengeShared": "Sfida condivisa nella chat!",

      "dlg.endTurn.title": "Terminare il turno?",
      "dlg.endTurn.text":
        "Forse hai dimenticato di fare le mosse di un regno.\n\nVuoi davvero terminare il turno?",
      "dlg.endTurn.yes": "Sì, termina il turno",
      "dlg.endTurn.keep": "Continua a giocare",
      "dlg.menu.share": "Condividi la sfida nella chat",
      "dlg.menu.resign": "Abbandona (torna al menu)",
      "dlg.menu.close": "Chiudi il menu",
      "dlg.resign.title": "Abbandonare?",
      "dlg.resign.text": "I tuoi progressi andranno persi. Sei sicuro?",
      "dlg.resign.confirm": "Abbandona",
      "dlg.defeat.text":
        "Tutti i tuoi regni sono stati conquistati dal nemico al round {round}.",

      "over.victoryTitle": "VITTORIA!",
      "over.defeatTitle": "SCONFITTA!",
      "over.allDefeated": "Hai sconfitto tutti i nemici al round {round}.",
      "over.surrendered": "I tuoi nemici si sono arresi al round {round}.",
      "over.wonRound": "Hai vinto al round {round}.",
      "over.enemyMajority":
        "Il tuo nemico ha conquistato la maggior parte del territorio al round {round}.",
      "over.allConquered":
        "Tutti i tuoi regni sono stati conquistati al round {round}.",
      "over.newGame": "Nuova partita",
      "over.mainMenu": "Menu principale",
      "list.intro":
        "Mappe condivise in questa chat. Gioca la stessa isola e le stesse impostazioni. Il tuo miglior risultato torna nella chat.",
      "list.empty":
        "Ancora nessuna sfida. Inizia una partita e usa il pulsante del menu durante il gioco per condividerla nella chat!",
      "list.unavailable":
        "L'integrazione con la chat non è disponibile qui. Le sfide compaiono quando questa app viene usata in Delta Chat o in un altro messenger webxdc.",
      "list.yourBestWin": "Il tuo meglio: vittoria al round {round}",
      "list.yourBestLoss": "Il tuo meglio: sconfitta al round {round}",
      "list.youGaveUp": "Hai abbandonato",
      "list.cardDaily": "Sfida del giorno · {date}",
      "list.cardPlayers": "{players} giocatori · {difficulty}",
      "list.cardDailyMeta": "{players} giocatori · {size} · {modeLabel}",
      "list.cardMeta": "{size} · seme {seed} · di {creator}",
      "board.won": "vinto · round {round}",
      "board.lost": "perso · round {round}",
      "board.gaveUp": "abbandonato",

      "howto.title": "Come giocare",
      "howto.p1":
        "Ogni casella è colorata per mostrare a quale giocatore appartiene. Due o più caselle collegate dello stesso colore formano un <b>regno</b>. Conquista tutta l'isola per vincere: la partita finisce quando un giocatore possiede l'80% di tutte le caselle dei regni.",
      "howto.p2":
        "<b>Scegli un regno</b> toccando una delle tue caselle (bordo bianco). Le sue finanze sono in alto a sinistra: <i>Risparmi (+entrate)</i>. Ogni regno guadagna una moneta per ogni casella senza albero. Le unità costano uno stipendio ogni turno.",
      "howto.p3":
        "<b>Unità e torri:</b> compra un contadino per 10 monete, posizionalo su una tua casella o su una casella nemica adiacente al tuo regno. Posiziona un contadino su un'altra unità per unirle in un'unità più forte. Solo cavalieri e baroni possono distruggere le torri.",
      "howto.unit": "Unità",
      "howto.strength": "Forza",
      "howto.salary": "Stipendio",
      "unit.PEASANT": "Contadino",
      "unit.SPEARMAN": "Lanciere",
      "unit.KNIGHT": "Cavaliere",
      "unit.BARON": "Barone",
      "howto.p5":
        "<b>Protezione:</b> unità, capitali e torri proteggono la loro casella e tutte quelle adiacenti; una cifra seguita da uno scudo nell'angolo della casella mostra il livello di protezione. Per conquistare serve un'unità <i>più forte</i> della protezione.",
      "howto.p6":
        "<b>Capitali:</b> se una capitale viene distrutta (o una casella viene isolata), i risparmi del regno vanno persi e viene collocata una nuova capitale. Se un regno viene diviso, solo la parte con la capitale mantiene il denaro.",
      "howto.p7":
        "<b>Gli alberi</b> bloccano le entrate. Le palme crescono sulla costa e si diffondono ogni round; i pini si diffondono quando due sono adiacenti. Posiziona un'unità su un albero per abbatterlo (l'unità poi non può più agire). Le <b>lapidi</b> compaiono quando le unità non possono essere pagate e diventano alberi.",
      "howto.p8":
        "<b>Comandi:</b> tocca una casella per scegliere un regno, tocca un'unità per prenderla e tocca un bersaglio per posizionarla, conquistare o unire. Tocca due volte una casella vuota del regno scelto per comprare e posizionare subito un contadino. I pulsanti di acquisto sono in basso (clic destro = contadino, clic centrale = torre, anche la pressione prolungata compra una torre). L'annullamento vale nel tuo turno e la partita viene salvata automaticamente.",
      "howto.p9":
        "<b>Sfide:</b> in un messenger puoi condividere la mappa attuale nella chat. Tutti quelli che la giocano ricevono la stessa isola e pubblicano il loro risultato, così puoi confrontare chi ha vinto in meno round.",
    },

    es: {
      "menu.tagline": "Estrategia medieval. Conquista la isla.",
      "menu.newGame": "Nueva partida",
      "menu.daily": "Reto del día",
      "menu.challenges": "Retos",
      "menu.settings": "Ajustes",
      "menu.about": "Acerca de",
      "ui.back": "Atrás",
      "ui.you": "Tú",
      "ui.cancel": "Cancelar",
      "ui.play": "Jugar",
      "ui.expired": "Caducado",

      "settings.showEnemyTurns": "Mostrar los turnos del enemigo",
      "settings.enemySpeed": "Velocidad de los turnos del enemigo",
      "settings.warnForgotten": "Avisar de reinos olvidados",
      "settings.autoEnd":
        "Terminar el turno automáticamente cuando todas las unidades hayan actuado",

      "about.p1":
        "Una adaptación de <b>Feudal Tactics</b>, el juego de estrategia medieval de Sesu8642 inspirado en <i>Slay</i> de Sean O'Connor. Las reglas, la generación de mapas y la IA enemiga provienen del código fuente Java original bajo GPL-3.0-or-later y se han reescrito para funcionar en el navegador.",
      "about.p2":
        "Esta versión añade gráficos mejorados y funciones extra: una lista de los retos compartidos en el chat y un reto diario.",
      "about.p3":
        "Funciona totalmente sin conexión dentro de una mini app webxdc. Sin rastreo, sin acceso a la red y sin publicidad. Tus partidas se guardan localmente en el almacenamiento de esta conversación.",
      "about.p4":
        "<b>Retos:</b> dentro de una mensajería puedes compartir un mapa en el chat y comparar resultados con todos los que lo jueguen.",

      "hud.menu": "Menú",
      "hud.undo": "Deshacer (Retroceso)",
      "hud.buyPeasant": "Comprar campesino (clic derecho / 1)",
      "hud.buyTower": "Comprar torre (clic central / 2)",
      "hud.endTurn": "Terminar turno",
      "hud.spectating": "Observando",
      "hud.victory": "Victoria",
      "hud.defeat": "Derrota",
      "hud.gameOver": "Fin de la partida",
      "hud.enemyTurn": "Turno del enemigo",
      "hud.enemy": "Enemigo",
      "hud.yourTurn": "Tu turno",
      "hud.round": "Ronda {round}",
      "hud.roundEnemy": "Ronda {round} · {who}",
      "hud.roundTurn": "Ronda {round} · {turn}",
      "hud.savings": "Ahorros: {savings} ({balance})",
      "hud.selectKingdom": "Selecciona un reino.",
      "hud.allMovesDone":
        "Todos los movimientos hechos — pulsa ➜ para terminar tu turno.",
      "setup.color": "Tu color",
      "setup.difficulty": "Dificultad enemiga",
      "setup.mapsize": "Tamaño del mapa",
      "setup.density": "Densidad del mapa",
      "setup.enemies": "Enemigos",
      "setup.seed": "Semilla",
      "setup.start": "Empezar partida",
      "setup.startChallenge": "Empezar reto",
      "setup.randomSeed": "Generar una semilla aleatoria",
      "setup.player": "Jugador {n}",
      "setup.dailyNote":
        "Reto del día — un solo mapa para todos hoy. Puedes elegir la <strong>dificultad</strong>; se mostrará con tu resultado. Pulsa <strong>Empezar reto</strong> para jugarlo.",
      "setup.pastDailyNote":
        "Reto del día ({date}) — un día pasado, pero el mismo mapa para todos. Puedes elegir la <strong>dificultad</strong>; se mostrará con tu resultado. Pulsa <strong>Empezar reto</strong> para jugarlo.",
      "setup.sharedNote":
        "Reto compartido — estos son los ajustes del chat. Pulsa <strong>Empezar reto</strong> para jugar el mapa idéntico; tu resultado volverá al chat.",

      "diff.LEVEL_1": "Fácil",
      "diff.LEVEL_2": "Medio",
      "diff.LEVEL_3": "Difícil",
      "diff.LEVEL_4": "Muy difícil",
      "size.SMALL": "Pequeño",
      "size.MEDIUM": "Mediano",
      "size.LARGE": "Grande",
      "size.XLARGE": "Enorme",
      "size.XXLARGE": "Gigantesco",
      "density.LOOSE": "Dispersa",
      "density.MEDIUM": "Moderada",
      "density.DENSE": "Compacta",

      "mode.label": "modo {modeLower}",
      "mode.suffix": "en modo {modeLower}",

      "chat.sharedChallenge":
        "{name} ha compartido un reto • dificultad {difficultyLower}, tamaño {sizeLower}, {players} jugadores, semilla {seed}",
      "chat.sharedDaily": "{name} ha compartido el reto del día ({date})",
      "chat.joinDaily": "{name} se ha unido al reto del día ({date})",
      "chat.mapDetails":
        "dificultad {difficultyLower}, tamaño {sizeLower}, {players} jugadores, semilla {seed}",
      "chat.resultBeat": "{name} ha ganado un reto en la ronda {round} • {map}",
      "chat.resultLost":
        "{name} ha perdido un reto en la ronda {round} • {map}",
      "chat.resultGaveUp": "{name} ha abandonado un reto • {map}",
      "chat.resultBeatShort": "{name} ha ganado un reto en la ronda {round}",
      "chat.resultLostShort": "{name} ha perdido un reto en la ronda {round}",
      "chat.resultGaveUpShort": "{name} ha abandonado un reto",
      "chat.resultBeatDaily":
        "{name} ha ganado el reto del día ({date}) {modeSuffix}",
      "chat.resultLostDaily":
        "{name} ha perdido el reto del día ({date}) {modeSuffix}",
      "chat.resultGaveUpDaily":
        "{name} ha abandonado el reto del día ({date}) {modeSuffix}",

      "toast.chatUnavailable":
        "La integración con el chat solo está disponible dentro de una mensajería webxdc.",
      "toast.sendFailed": "No se pudo enviar la actualización.",
      "toast.colorNotOccupied":
        "Tu color debe ser una de las posiciones iniciales ocupadas.",
      "toast.notEnoughPeasant": "No hay dinero suficiente para un campesino.",
      "toast.notEnoughTower": "No hay dinero suficiente para una torre.",
      "toast.nothingToUndo": "Nada que deshacer.",
      "toast.placeFirst": "Coloca primero tu objeto en el mapa.",
      "toast.noShareable": "Esta partida no tiene ajustes que compartir.",
      "toast.challengeShared": "¡Reto compartido en el chat!",

      "dlg.endTurn.title": "¿Terminar el turno?",
      "dlg.endTurn.text":
        "Quizá hayas olvidado hacer los movimientos de un reino.\n\n¿Seguro que quieres terminar tu turno?",
      "dlg.endTurn.yes": "Sí, terminar turno",
      "dlg.endTurn.keep": "Seguir jugando",
      "dlg.menu.share": "Compartir reto en el chat",
      "dlg.menu.resign": "Abandonar (volver al menú)",
      "dlg.menu.close": "Cerrar el menú",
      "dlg.resign.title": "¿Abandonar?",
      "dlg.resign.text": "Perderás tu progreso. ¿Seguro?",
      "dlg.resign.confirm": "Abandonar",
      "dlg.defeat.text":
        "El enemigo ha conquistado todos tus reinos en la ronda {round}.",

      "over.victoryTitle": "¡VICTORIA!",
      "over.defeatTitle": "¡DERROTA!",
      "over.allDefeated":
        "Has derrotado a todos tus enemigos en la ronda {round}.",
      "over.surrendered": "Tus enemigos se han rendido en la ronda {round}.",
      "over.wonRound": "Has ganado en la ronda {round}.",
      "over.enemyMajority":
        "Tu enemigo ha conquistado la mayor parte del territorio en la ronda {round}.",
      "over.allConquered":
        "Todos tus reinos han sido conquistados en la ronda {round}.",
      "over.newGame": "Nueva partida",
      "over.mainMenu": "Menú principal",
      "list.intro":
        "Mapas compartidos en este chat. Juega exactamente la misma isla y los mismos ajustes. Tu mejor resultado se envía de vuelta al chat.",
      "list.empty":
        "Aún no hay retos. ¡Empieza una partida y usa el botón del menú durante el juego para compartirla en el chat!",
      "list.unavailable":
        "La integración con el chat no está disponible aquí. Los retos aparecen cuando esta app se usa en Delta Chat u otra mensajería webxdc.",
      "list.yourBestWin": "Tu mejor: victoria en la ronda {round}",
      "list.yourBestLoss": "Tu mejor: derrota en la ronda {round}",
      "list.youGaveUp": "Has abandonado",
      "list.cardDaily": "Reto del día · {date}",
      "list.cardPlayers": "{players} jugadores · {difficulty}",
      "list.cardDailyMeta": "{players} jugadores · {size} · {modeLabel}",
      "list.cardMeta": "{size} · semilla {seed} · por {creator}",
      "board.won": "ganado · ronda {round}",
      "board.lost": "perdido · ronda {round}",
      "board.gaveUp": "abandonado",

      "howto.title": "¿Cómo jugar?",
      "howto.p1":
        "Cada casilla tiene un color que muestra a qué jugador pertenece. Dos o más casillas conectadas del mismo color forman un <b>reino</b>. Conquista toda la isla para ganar: la partida acaba cuando un jugador posee el 80 % de las casillas de los reinos.",
      "howto.p2":
        "<b>Selecciona un reino</b> tocando una de tus casillas (borde blanco). Sus finanzas aparecen arriba a la izquierda: <i>Ahorros (+ingresos)</i>. Cada reino gana una moneda por cada casilla sin árbol. Las unidades cuestan un salario cada turno.",
      "howto.p3":
        "<b>Unidades y torres:</b> compra un campesino por 10 monedas y colócalo en una de tus casillas o en una casilla enemiga junto a tu reino. Coloca un campesino sobre otra unidad para unirlas en una unidad más fuerte. Solo los caballeros y los barones pueden destruir torres.",
      "howto.unit": "Unidad",
      "howto.strength": "Fuerza",
      "howto.salary": "Salario",
      "unit.PEASANT": "Campesino",
      "unit.SPEARMAN": "Lancero",
      "unit.KNIGHT": "Caballero",
      "unit.BARON": "Barón",
      "howto.p5":
        "<b>Protección:</b> las unidades, las capitales y las torres protegen su casilla y todas las adyacentes; una cifra seguida de un escudo en la esquina de una casilla muestra su nivel de protección. Necesitas una unidad <i>más fuerte</i> que la protección para conquistar.",
      "howto.p6":
        "<b>Capitales:</b> si se destruye una capital (o se aísla una casilla), los ahorros del reino se pierden y se coloca una nueva capital. Si un reino se divide, solo la parte con la capital conserva el dinero.",
      "howto.p7":
        "<b>Los árboles</b> bloquean los ingresos. Las palmeras crecen en la costa y se extienden cada ronda; los pinos se extienden cuando dos están juntos. Coloca una unidad sobre un árbol para talarlo (la unidad ya no podrá actuar). Las <b>lápidas</b> aparecen cuando no se pueden pagar unidades y se convierten en árboles.",
      "howto.p8":
        "<b>Controles:</b> toca una casilla para seleccionar un reino, toca una unidad para cogerla y toca un objetivo para colocarla, conquistar o combinar. Toca dos veces una casilla vacía del reino seleccionado para comprar y colocar un campesino de una vez. Los botones de compra están abajo (clic derecho = campesino, clic central = torre, una pulsación larga también compra una torre). Deshacer funciona durante tu turno y la partida se guarda automáticamente.",
      "howto.p9":
        "<b>Retos:</b> en una mensajería puedes compartir el mapa actual en el chat. Todos los que lo jueguen reciben la misma isla y publican su resultado, así puedes comparar quién ganó en menos rondas.",
    },

    pt: {
      "menu.tagline": "Estratégia medieval. Conquista a ilha.",
      "menu.newGame": "Novo jogo",
      "menu.daily": "Desafio do dia",
      "menu.challenges": "Desafios",
      "menu.settings": "Definições",
      "menu.about": "Sobre",
      "ui.back": "Voltar",
      "ui.you": "Tu",
      "ui.cancel": "Cancelar",
      "ui.play": "Jogar",
      "ui.expired": "Expirado",

      "settings.showEnemyTurns": "Mostrar os turnos do inimigo",
      "settings.enemySpeed": "Velocidade dos turnos do inimigo",
      "settings.warnForgotten": "Avisar de reinos esquecidos",
      "settings.autoEnd":
        "Terminar o turno automaticamente quando todas as unidades tiverem agido",

      "about.p1":
        "Uma adaptação de <b>Feudal Tactics</b>, o jogo de estratégia medieval de Sesu8642 inspirado em <i>Slay</i>, de Sean O'Connor. As regras, a geração de mapas e a IA inimiga vêm do código-fonte Java original sob GPL-3.0-or-later e foram reescritas para funcionar no navegador.",
      "about.p2":
        "Esta versão traz gráficos melhorados e funcionalidades extra: uma lista dos desafios partilhados no chat e um desafio diário.",
      "about.p3":
        "Funciona totalmente offline dentro de uma mini app webxdc. Sem rastreio, sem acesso à rede e sem publicidade. Os teus jogos são guardados localmente no armazenamento desta conversa.",
      "about.p4":
        "<b>Desafios:</b> dentro de um mensageiro podes partilhar um mapa no chat e comparar resultados com todos os que o jogarem.",

      "hud.menu": "Menu",
      "hud.undo": "Desfazer (Retrocesso)",
      "hud.buyPeasant": "Comprar camponês (clique direito / 1)",
      "hud.buyTower": "Comprar torre (clique do meio / 2)",
      "hud.endTurn": "Terminar turno",
      "hud.spectating": "A assistir",
      "hud.victory": "Vitória",
      "hud.defeat": "Derrota",
      "hud.gameOver": "Fim do jogo",
      "hud.enemyTurn": "Turno do inimigo",
      "hud.enemy": "Inimigo",
      "hud.yourTurn": "O teu turno",
      "hud.round": "Ronda {round}",
      "hud.roundEnemy": "Ronda {round} · {who}",
      "hud.roundTurn": "Ronda {round} · {turn}",
      "hud.savings": "Poupanças: {savings} ({balance})",
      "hud.selectKingdom": "Seleciona um reino.",
      "hud.allMovesDone":
        "Todas as jogadas feitas — carrega em ➜ para terminar o teu turno.",
      "setup.color": "A tua cor",
      "setup.difficulty": "Dificuldade inimiga",
      "setup.mapsize": "Tamanho do mapa",
      "setup.density": "Densidade do mapa",
      "setup.enemies": "Inimigos",
      "setup.seed": "Semente",
      "setup.start": "Começar jogo",
      "setup.startChallenge": "Começar desafio",
      "setup.randomSeed": "Gerar uma semente aleatória",
      "setup.player": "Jogador {n}",
      "setup.dailyNote":
        "Desafio do dia — um só mapa para todos hoje. Podes escolher a <strong>dificuldade</strong>; ela aparece com o teu resultado. Carrega em <strong>Começar desafio</strong> para o jogar.",
      "setup.pastDailyNote":
        "Desafio do dia ({date}) — um dia passado, mas o mesmo mapa para todos. Podes escolher a <strong>dificuldade</strong>; ela aparece com o teu resultado. Carrega em <strong>Começar desafio</strong> para o jogar.",
      "setup.sharedNote":
        "Desafio partilhado — estas são as definições do chat. Carrega em <strong>Começar desafio</strong> para jogar o mapa idêntico; o teu resultado volta para o chat.",

      "diff.LEVEL_1": "Fácil",
      "diff.LEVEL_2": "Médio",
      "diff.LEVEL_3": "Difícil",
      "diff.LEVEL_4": "Muito difícil",
      "size.SMALL": "Pequeno",
      "size.MEDIUM": "Médio",
      "size.LARGE": "Grande",
      "size.XLARGE": "Enorme",
      "size.XXLARGE": "Gigantesco",
      "density.LOOSE": "Espalhada",
      "density.MEDIUM": "Moderada",
      "density.DENSE": "Compacta",

      "mode.label": "modo {modeLower}",
      "mode.suffix": "em modo {modeLower}",

      "chat.sharedChallenge":
        "{name} partilhou um desafio • dificuldade {difficultyLower}, tamanho {sizeLower}, {players} jogadores, semente {seed}",
      "chat.sharedDaily": "{name} partilhou o desafio do dia ({date})",
      "chat.joinDaily": "{name} entrou no desafio do dia ({date})",
      "chat.mapDetails":
        "dificuldade {difficultyLower}, tamanho {sizeLower}, {players} jogadores, semente {seed}",
      "chat.resultBeat": "{name} ganhou um desafio na ronda {round} • {map}",
      "chat.resultLost": "{name} perdeu um desafio na ronda {round} • {map}",
      "chat.resultGaveUp": "{name} desistiu de um desafio • {map}",
      "chat.resultBeatShort": "{name} ganhou um desafio na ronda {round}",
      "chat.resultLostShort": "{name} perdeu um desafio na ronda {round}",
      "chat.resultGaveUpShort": "{name} desistiu de um desafio",
      "chat.resultBeatDaily":
        "{name} ganhou o desafio do dia ({date}) {modeSuffix}",
      "chat.resultLostDaily":
        "{name} perdeu o desafio do dia ({date}) {modeSuffix}",
      "chat.resultGaveUpDaily":
        "{name} desistiu do desafio do dia ({date}) {modeSuffix}",

      "toast.chatUnavailable":
        "A integração com o chat só está disponível dentro de um mensageiro webxdc.",
      "toast.sendFailed": "Não foi possível enviar a atualização.",
      "toast.colorNotOccupied":
        "A tua cor tem de ser uma das posições iniciais ocupadas.",
      "toast.notEnoughPeasant": "Dinheiro insuficiente para um camponês.",
      "toast.notEnoughTower": "Dinheiro insuficiente para uma torre.",
      "toast.nothingToUndo": "Nada para desfazer.",
      "toast.placeFirst": "Coloca primeiro o teu objeto no mapa.",
      "toast.noShareable": "Este jogo não tem definições para partilhar.",
      "toast.challengeShared": "Desafio partilhado no chat!",

      "dlg.endTurn.title": "Terminar o turno?",
      "dlg.endTurn.text":
        "Podes ter esquecido as jogadas de um reino.\n\nTens a certeza de que queres terminar o teu turno?",
      "dlg.endTurn.yes": "Sim, terminar turno",
      "dlg.endTurn.keep": "Continuar a jogar",
      "dlg.menu.share": "Partilhar desafio no chat",
      "dlg.menu.resign": "Desistir (voltar ao menu)",
      "dlg.menu.close": "Fechar o menu",
      "dlg.resign.title": "Desistir?",
      "dlg.resign.text": "O teu progresso perde-se. Tens a certeza?",
      "dlg.resign.confirm": "Desistir",
      "dlg.defeat.text":
        "Todos os teus reinos foram conquistados pelo inimigo na ronda {round}.",

      "over.victoryTitle": "VITÓRIA!",
      "over.defeatTitle": "DERROTA!",
      "over.allDefeated": "Derrotaste todos os teus inimigos na ronda {round}.",
      "over.surrendered": "Os teus inimigos renderam-se na ronda {round}.",
      "over.wonRound": "Ganhaste na ronda {round}.",
      "over.enemyMajority":
        "O teu inimigo conquistou a maioria do território na ronda {round}.",
      "over.allConquered":
        "Todos os teus reinos foram conquistados na ronda {round}.",
      "over.newGame": "Novo jogo",
      "over.mainMenu": "Menu principal",
      "list.intro":
        "Mapas partilhados neste chat. Joga exatamente a mesma ilha e as mesmas definições. O teu melhor resultado volta para o chat.",
      "list.empty":
        "Ainda não há desafios. Começa um jogo e usa o botão do menu durante o jogo para o partilhar no chat!",
      "list.unavailable":
        "A integração com o chat não está disponível aqui. Os desafios aparecem quando esta app é usada no Delta Chat ou noutro mensageiro webxdc.",
      "list.yourBestWin": "O teu melhor: vitória na ronda {round}",
      "list.yourBestLoss": "O teu melhor: derrota na ronda {round}",
      "list.youGaveUp": "Desististe",
      "list.cardDaily": "Desafio do dia · {date}",
      "list.cardPlayers": "{players} jogadores · {difficulty}",
      "list.cardDailyMeta": "{players} jogadores · {size} · {modeLabel}",
      "list.cardMeta": "{size} · semente {seed} · por {creator}",
      "board.won": "ganhou · ronda {round}",
      "board.lost": "perdeu · ronda {round}",
      "board.gaveUp": "desistiu",

      "howto.title": "Como jogar",
      "howto.p1":
        "Cada casinha tem a cor que mostra a que jogador pertence. Duas ou mais casinhas ligadas da mesma cor formam um <b>reino</b>. Conquista a ilha inteira para vencer: o jogo termina quando um jogador possui 80% das casinhas de reinos.",
      "howto.p2":
        "<b>Seleciona um reino</b> tocando numa das tuas casinhas (contorno branco). As finanças aparecem no canto superior esquerdo: <i>Poupanças (+rendimento)</i>. Cada reino ganha uma moeda por cada casinha sem árvore. As unidades custam um salário em cada turno.",
      "howto.p3":
        "<b>Unidades e torres:</b> compra um camponês por 10 moedas e coloca-o numa das tuas casinhas ou numa casinha inimiga ao lado do teu reino. Coloca um camponês sobre outra unidade para as unir numa unidade mais forte. Só cavaleiros e barões podem destruir torres.",
      "howto.unit": "Unidade",
      "howto.strength": "Força",
      "howto.salary": "Salário",
      "unit.PEASANT": "Camponês",
      "unit.SPEARMAN": "Lanceiro",
      "unit.KNIGHT": "Cavaleiro",
      "unit.BARON": "Barão",
      "howto.p5":
        "<b>Proteção:</b> as unidades, as capitais e as torres protegem a sua casinha e todas as vizinhas; um número seguido de um escudo no canto de uma casinha mostra o seu nível de proteção. Precisas de uma unidade <i>mais forte</i> do que a proteção para conquistar.",
      "howto.p6":
        "<b>Capitais:</b> se uma capital for destruída (ou uma casinha ficar isolada), as poupanças do reino perdem-se e é colocada uma nova capital. Se um reino for dividido, só a parte com a capital fica com o dinheiro.",
      "howto.p7":
        "<b>As árvores</b> bloqueiam o rendimento. As palmeiras crescem na costa e espalham-se em cada ronda; os pinheiros espalham-se quando estão dois juntos. Coloca uma unidade sobre uma árvore para a cortar (a unidade já não pode agir). As <b>lápides</b> aparecem quando as unidades não podem ser pagas e transformam-se em árvores.",
      "howto.p8":
        "<b>Controlos:</b> toca numa casinha para selecionar um reino, toca numa unidade para a pegar e toca num alvo para a colocar, conquistar ou combinar. Toca duas vezes numa casinha vazia do reino selecionado para comprar e colocar um camponês de uma vez. Os botões de compra estão em baixo (clique direito = camponês, clique do meio = torre, um toque longo também compra uma torre). O desfazer funciona dentro do teu turno e o jogo é guardado automaticamente.",
      "howto.p9":
        "<b>Desafios:</b> num mensageiro podes partilhar o mapa atual no chat. Todos os que o jogarem recebem a mesma ilha e publicam o seu resultado, para poderes comparar quem ganhou em menos rondas.",
    },
  };

  const LANGS = ["en", "de", "fr", "it", "es", "pt"];

  // First language we can speak, in the user's own preference order.
  function detect() {
    const cands = [];
    try {
      if (navigator.languages && navigator.languages.length)
        cands.push(...navigator.languages);
      if (navigator.language) cands.push(navigator.language);
      if (navigator.userLanguage) cands.push(navigator.userLanguage);
    } catch (e) {
      /* no navigator: fall through to English */
    }
    for (const c of cands) {
      const base = String(c || "")
        .toLowerCase()
        .split(/[-_]/)[0];
      if (DICTS[base]) return base;
    }
    return "en";
  }

  const lang = detect();

  // Lower-case a label the way the target language does it, so English can say
  // "difficulty hard" while German keeps "Schwierigkeit Schwer".
  function lower(s) {
    try {
      return String(s).toLocaleLowerCase(lang);
    } catch (e) {
      return String(s).toLowerCase();
    }
  }

  // "hard" -> "Hard" (locale aware, for labels that start a sentence)
  function upper(s) {
    try {
      const str = String(s);
      return str.charAt(0).toLocaleUpperCase(lang) + str.slice(1);
    } catch (e) {
      return String(s);
    }
  }

  function t(key, vars) {
    let s = (DICTS[lang] && DICTS[lang][key]) || DICTS.en[key];
    if (s == null) return key;
    if (!vars) return s;
    // every string placeholder gets <name>Lower and <name>Cap forms, so a
    // template can put a label mid-sentence ("difficulty hard") or at the start
    // of a sentence ("Hard mode") and stay correct in every language.
    const all = Object.assign({}, vars);
    for (const k of Object.keys(vars)) {
      if (typeof vars[k] === "string") {
        all[k + "Lower"] = lower(vars[k]);
        all[k + "Cap"] = upper(vars[k]);
      }
    }
    return s.replace(/\{(\w+)\}/g, (m, k) =>
      all[k] != null ? String(all[k]) : m,
    );
  }

  // Translates the static markup: data-i18n (textContent),
  // data-i18n-html (innerHTML, for strings with <b>/<i>),
  // data-i18n-title (title and aria-label, for icon buttons).
  function apply(root) {
    const scope = root || document;
    for (const el of scope.querySelectorAll("[data-i18n]")) {
      el.textContent = t(el.getAttribute("data-i18n"));
    }
    for (const el of scope.querySelectorAll("[data-i18n-html]")) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    }
    for (const el of scope.querySelectorAll("[data-i18n-title]")) {
      const s = t(el.getAttribute("data-i18n-title"));
      el.title = s;
      if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", s);
    }
    if (scope === document) {
      document.documentElement.lang = I18N.lang;
    }
  }

  return { lang, LANGS, t, apply, detect, DICTS };
})();

// Short alias used throughout the app.
export const t = (key, vars) => I18N.t(key, vars);
