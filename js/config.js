// ══════════════════
// v1779546401
const _buildTs=1779546401;
window.onerror=function(msg,src,line,col,err){console.error('GLOBAL ERROR:',msg,'at line',line,col,err);return false;};
// Global state
var currentUser=null;
const TRANSLATIONS={
de:{
// Navigation
'score.you':'Du','score.ai':'KI','player.1':'Spieler 1','player.2':'Spieler 2','player.3':'Spieler 3','player.4':'Spieler 4',
'nav.games':'Spiele','nav.lobby':'Lobby','nav.chat':'Chat',
'nav.stats':'Statistik','nav.settings':'Einstellungen','nav.impressum':'Impressum',
'impressum.provider':'Anbieter','impressum.contact':'Kontakt',
'impressum.responsible':'Verantwortlich (§ 55 Abs. 2 RStV)',
'impressum.responsible.text':'Betreiber dieser Seite',
'impressum.disclaimer':'Haftungsausschluss',
'impressum.disclaimer.text':'Diese Webseite ist ein privates, nicht kommerzielles Hobbyprojekt. Keine Haftung für Richtigkeit oder Vollständigkeit der Inhalte.',
'impressum.privacy':'Datenschutz',
'impressum.privacy.text':'Keine Weitergabe personenbezogener Daten an Dritte. Gespeichert: E-Mail, Benutzername, Spielstatistiken.',
'impressum.rights':'Alle Rechte vorbehalten',
'navg.play':'Spielen','navg.community':'Community','navg.settings':'Einstellungen',
// Home
'home.title':'Spiel auswählen','home.subtitle':'SPIEL AUSWÄHLEN',
// Game cards
'card.snake.sub':'Pfeiltasten · vs KI','card.pong.sub':'Maus oder Tasten',
'card.vier.sub':'Klick · vs KI','card.battle.sub':'Platziere deine Flotte',
'card.kniffel.sub':'Solo oder vs KI','card.pacman.sub':'Klassisch oder Modern',
'card.snakeclassic.sub':'Nostalgie · Solo',
// Lobby
'lobby.mode.title':'Spielmodus','lobby.mode.local':'Lokal','lobby.mode.online':'Online',
'lobby.mode.soon':'BALD','lobby.mode.local.sub':'Am gleichen Gerät','lobby.mode.online.sub':'Mit Freunden',
'lobby.players':'Spieler','lobby.add.human':'+ Spieler hinzufügen','lobby.add.ai':'🤖 KI hinzufügen',
'lobby.difficulty':'KI-Schwierigkeit','lobby.diff.easy':'Leicht','lobby.diff.medium':'Mittel',
'lobby.diff.hard':'Schwer','lobby.start':'▶ Spiel starten','lobby.back':'← Zurück zu Spielen',
'lobby.control':'Steuerung','lobby.human':'Mensch','lobby.ai':'KI','lobby.ctrl.default':'Pfeiltasten',
'lobby.create':'🌐 Raum erstellen','lobby.join':'Raum beitreten','lobby.code':'Raumcode eingeben',
'lobby.join.btn':'Beitreten','lobby.creating':'Erstelle Raum...','lobby.joining':'Suche Raum...',
'lobby.created':'Lobby erstellt! Warte auf Gegner...','lobby.full':'Lobby ist voll',
'lobby.joined':'Verbunden!','lobby.error':'Fehler beim Erstellen',
'lobby.copy':'Link kopiert! ✓','lobby.waiting':'⏳ Warte auf Gegner...',
// Settings
'set.pagetitle':'Einstellungen','set.theme':'Design Theme','set.lang':'Sprache',
'set.audio':'Audio','set.game':'Spiel','set.sounds':'Spielsounds',
'set.music':'Musik','set.notify':'Benachrichtigungen','set.anim':'Animationen','set.hints':'Hinweise',
'set.subtitle':'EINSTELLUNGEN',
// Badges
'badge.hot':'Beliebt','badge.live':'Live','badge.new':'Neu',
// Game status
'game.pause':'⏸ Pause','game.resume':'▶ Weiter',
'game.start':'Klicke um zu starten','game.over':'Spiel beendet',
'game.win':'🏆 Du gewinnst!','game.lose':'💀 Du verlierst!',
'game.draw':'Unentschieden!','game.rematch':'↺ Rematch','game.menu':'Menü',
'game.waiting':'⏳ Warte auf Gegner...','game.your.turn':'🎯 Dein Zug!',
'game.opp.turn':'⏳ Gegner ist dran...','game.connecting':'Verbinde...',
// Auth
'auth.login':'Anmelden','auth.register':'Registrieren','auth.logout':'Abmelden',
'auth.email':'E-Mail','auth.password':'Passwort','auth.name':'Name',
'auth.fill.all':'Bitte alle Felder ausfüllen',
'auth.pw.mismatch':'Passwörter stimmen nicht überein',
'auth.pw.short':'Mindestens 6 Zeichen',
'auth.pw.wrong':'Aktuelles Passwort falsch',
'auth.pw.changed':'✅ Passwort geändert!',
'auth.pw.saving':'Speichere...','auth.pw.change':'🔒 Passwort ändern',
'auth.delete':'Account löschen','auth.delete.confirm':'Account wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!',
'auth.deleted':'Account gelöscht','auth.need.login':'Bitte zuerst einloggen',
// Friends
'friends.add':'Freund hinzufügen','friends.added':'ist jetzt dein Freund!',
'friends.request':'Freundschaftsanfrage','friends.accept':'Annehmen','friends.decline':'Ablehnen',
'friends.remove':'Freund entfernen','friends.remove.confirm':'Freund wirklich entfernen?',
'friends.online':'online','friends.offline':'offline','friends.playing':'spielt',
'friends.invite':'Einladen','friends.search':'Spieler suchen...',
'friends.not.found':'Spieler nicht gefunden',
// Chat
'chat.placeholder':'Nachricht schreiben...','chat.send':'Senden',
'chat.ingame':'In-Game Chat','chat.new':'💬 Neue Nachricht',
// Errors
'error.network':'Netzwerkfehler','error.room.full':'Raum ist bereits voll',
'error.room.not.found':'Lobby nicht gefunden','error.login.first':'Bitte zuerst einloggen',
'error.generic':'Ein Fehler ist aufgetreten',
// Game specific
'pong.left':'Du spielst Links (Blau)','pong.right':'Du spielst Rechts (Lila)',
'battle.place':'Schiff platzieren','battle.rotate':'R = Drehen',
'battle.waiting.ships':'✅ Schiffe platziert! Warte auf Gegner...',
'battle.your.shot':'🎯 Klick auf GEGNER-Feld zum Schießen | Treffer = nochmal dran!',
'battle.opp.shot':'⏳ Gegner ist dran...','battle.hit':'💥 Treffer! Nochmal!',
'battle.miss':'Daneben!','battle.sunk':'Versenkt!',
'battle.you.win':'🏆 Du gewinnst!','battle.you.lose':'💀 Du hast verloren!',
'kniffel.start':'Klicke Würfeln um zu starten!','kniffel.roll':'Würfeln',
'kniffel.take':'Eintragen','kniffel.waiting.turn':'Warte auf deinen Zug...',
'vier.click':'Klicke eine Spalte','vier.your.turn':'Dein Zug','vier.ai.turn':'KI denkt...',
'vier.win':'🎉 Du gewinnst!','vier.lose':'KI gewinnt','vier.opp.win':'Gegner gewinnt',
'snake.start':'Pfeiltasten zum Starten','snake.game.over':'GAME OVER',
'rematch.waiting':'Warte auf Rematch-Einladung vom Gewinner...',
'opp.quit':'Gegner hat das Spiel verlassen!','opp.won.quit':'🏆 Du gewinnst! (Gegner hat aufgegeben)',
'conn.lost':'⚠️ Verbindung getrennt!',
// Account
'account.scores':'🏆 Meine Highscores','account.total':'Gesamtpunkte',
'account.online':'☁ Online gespeichert',
// Game names
'game.snake':'Snake','game.pong':'Pong',
'game.vier':'4 Gewinnt','game.battle':'Schiffe versenken',
'game.kniffel':'Kniffel','game.pacman':'Pac-Man',
'game.snakeclassic':'Snake Classic',
// Lobby-specific
'lobby.kniffel.online':'Kniffel Online',
'lobby.waiting.host':'Warte auf Host...',
'lobby.players.count':'Spieler',
// Battle strings
'battle.all.sunk':'Alle Schiffe versenkt!',
'battle.place.ships':'Schiffe platzieren',
'battle.play':'spielen',
// Stats
'stats.highscores':'Meine Highscores','stats.total':'Gesamtpunkte',
'stats.best':'Bestes Spiel','stats.online':'Online gespeichert',
// Chat
'chat.with':'Chat mit','chat.ingame.title':'In-Game Chat',
'chat.empty':'Noch keine Nachrichten',
// Lobby page
'lobby.open':'Offene Lobbys','lobby.refresh':'Aktualisieren',
'lobby.vs.player':'VS Spieler','lobby.create.lobby':'Lobby erstellen',
'lobby.no.open':'Keine offenen Lobbys','lobby.spectate':'Zuschauen',
'lobby.join.btn2':'Beitreten',
// Chat page
'chat.friends':'Freunde','chat.search':'Suchen...',
'chat.select.friend':'Wähle einen Freund','chat.select.hint':'Wähle einen Freund zum Chatten',
'chat.write':'Nachricht schreiben...','chat.no.friends':'Noch keine Freunde',
// Stats page
'stats.total.points':'Gesamtpunktzahl','stats.best.game':'Bestes Spiel',
'stats.friends':'Freunde','stats.rank':'Rang','stats.total2':'Gesamt',
'stats.leaderboard':'Bestenliste',
// UI elements
'ui.add.player':'+ Spieler hinzufügen','ui.points':'Punkte',
'ui.total':'Gesamt',
'lobby.no.lobbies':'Keine aktiven Lobbys.','lobby.create.hint':'Erstelle eine mit den Buttons oben!',
'game.title.kniffel':'Kniffel','game.title.battle':'Schiffe versenken',
'points.suffix':' Punkte',
'nav.back':'← Zurück','auth.not.logged.in':'Nicht eingeloggt','auth.click.login':'Klick zum Login','game.back.short':'Zurück zum Spiel',
},
en:{
// Navigation
'nav.games':'Games','nav.lobby':'Lobby','nav.chat':'Chat',
'nav.stats':'Statistics','nav.settings':'Settings','nav.impressum':'Imprint',
'impressum.provider':'Provider','impressum.contact':'Contact',
'impressum.responsible':'Responsible (§ 55 Abs. 2 RStV)',
'impressum.responsible.text':'Operator of this site',
'impressum.disclaimer':'Disclaimer',
'impressum.disclaimer.text':'This website is a private, non-commercial hobby project. No liability for accuracy or completeness of content.',
'impressum.privacy':'Privacy',
'impressum.privacy.text':'No personal data shared with third parties. Stored: email, username, game statistics.',
'impressum.rights':'All rights reserved',
'navg.play':'Play','navg.community':'Community','navg.settings':'Settings',
// Home
'home.title':'Choose a Game','home.subtitle':'CHOOSE A GAME',
// Game cards
'card.snake.sub':'Arrow Keys · vs AI','card.pong.sub':'Mouse or Keys',
'card.vier.sub':'Click · vs AI','card.battle.sub':'Place your fleet',
'card.kniffel.sub':'Solo or vs AI','card.pacman.sub':'Classic or Modern',
'card.snakeclassic.sub':'Nostalgia · Solo',
// Lobby
'lobby.mode.title':'Game Mode','lobby.mode.local':'Local','lobby.mode.online':'Online',
'lobby.mode.soon':'SOON','lobby.mode.local.sub':'On the same device','lobby.mode.online.sub':'With friends',
'lobby.players':'Players','lobby.add.human':'+ Add Player','lobby.add.ai':'🤖 Add AI',
'lobby.difficulty':'AI Difficulty','lobby.diff.easy':'Easy','lobby.diff.medium':'Medium',
'lobby.diff.hard':'Hard','lobby.start':'▶ Start Game','lobby.back':'← Back to Games',
'lobby.control':'Controls','lobby.human':'Human','lobby.ai':'AI','lobby.ctrl.default':'Arrow Keys',
'lobby.create':'🌐 Create Room','lobby.join':'Join Room','lobby.code':'Enter room code',
'lobby.join.btn':'Join','lobby.creating':'Creating room...','lobby.joining':'Searching room...',
'lobby.created':'Lobby created! Waiting for opponent...','lobby.full':'Lobby is full',
'lobby.joined':'Connected!','lobby.error':'Error creating room',
'lobby.copy':'Link copied! ✓','lobby.waiting':'⏳ Waiting for opponent...',
// Settings
'set.pagetitle':'Settings','set.theme':'Design Theme','set.lang':'Language',
'set.audio':'Audio','set.game':'Game','set.sounds':'Game Sounds',
'set.music':'Music','set.notify':'Notifications','set.anim':'Animations','set.hints':'Hints',
'set.subtitle':'SETTINGS',
// Badges
'badge.hot':'Popular','badge.live':'Live','badge.new':'New',
// Game status
'game.pause':'⏸ Pause','game.resume':'▶ Resume',
'game.start':'Click to start','game.over':'Game Over',
'game.win':'🏆 You win!','game.lose':'💀 You lose!',
'game.draw':'Draw!','game.rematch':'↺ Rematch','game.menu':'Menu',
'game.waiting':'⏳ Waiting for opponent...','game.your.turn':'🎯 Your turn!',
'game.opp.turn':"⏳ Opponent\'s turn...",'game.connecting':'Connecting...',
// Auth
'auth.login':'Login','auth.register':'Register','auth.logout':'Logout',
'auth.email':'Email','auth.password':'Password','auth.name':'Name',
'auth.fill.all':'Please fill in all fields',
'auth.pw.mismatch':'Passwords do not match',
'auth.pw.short':'At least 6 characters',
'auth.pw.wrong':'Current password incorrect',
'auth.pw.changed':'✅ Password changed!',
'auth.pw.saving':'Saving...','auth.pw.change':'🔒 Change Password',
'auth.delete':'Delete Account','auth.delete.confirm':'Really delete account? This cannot be undone!',
'auth.deleted':'Account deleted','auth.need.login':'Please log in first',
// Friends
'friends.add':'Add Friend','friends.added':'is now your friend!',
'friends.request':'Friend Request','friends.accept':'Accept','friends.decline':'Decline',
'friends.remove':'Remove Friend','friends.remove.confirm':'Really remove friend?',
'friends.online':'online','friends.offline':'offline','friends.playing':'playing',
'friends.invite':'Invite','friends.search':'Search players...',
'friends.not.found':'Player not found',
// Chat
'chat.placeholder':'Write a message...','chat.send':'Send',
'chat.ingame':'In-Game Chat','chat.new':'💬 New message',
// Errors
'error.network':'Network error','error.room.full':'Room is already full',
'error.room.not.found':'Lobby not found','error.login.first':'Please log in',
'error.generic':'An error occurred',
// Game specific
'pong.left':'You play Left (Blue)','pong.right':'You play Right (Purple)',
'battle.place':'Place ship','battle.rotate':'R = Rotate',
'battle.waiting.ships':'✅ Ships placed! Waiting for opponent...',
'battle.your.shot':'🎯 Click ENEMY grid to shoot | Hit = shoot again!',
'battle.opp.shot':'⏳ Opponent\'s turn...','battle.hit':'💥 Hit! Go again!',
'battle.miss':'Missed!','battle.sunk':'Sunk!',
'battle.you.win':'🏆 You win!','battle.you.lose':'💀 You lose!',
'kniffel.start':'Click Roll to start!','kniffel.roll':'Roll',
'kniffel.take':'Score','kniffel.waiting.turn':'Waiting for your turn...',
'vier.click':'Click a column','vier.your.turn':'Your turn','vier.ai.turn':'AI thinking...',
'vier.win':'🎉 You win!','vier.lose':'AI wins','vier.opp.win':'Opponent wins',
'snake.start':'Arrow keys to start','snake.game.over':'GAME OVER',
'rematch.waiting':'Waiting for rematch invitation from winner...',
'opp.quit':'Opponent left the game!','opp.won.quit':'🏆 You win! (Opponent quit)',
'conn.lost':'⚠️ Connection lost!',
// Account
'account.scores':'🏆 My High Scores','account.total':'Total Points',
'account.online':'☁ Saved online',
// Game names
'game.snake':'Snake','game.pong':'Pong',
'game.vier':'Connect Four','game.battle':'Battleship',
'game.kniffel':'Yahtzee','game.pacman':'Pac-Man',
'game.snakeclassic':'Snake Classic',
// Lobby-specific
'lobby.kniffel.online':'Yahtzee Online',
'lobby.waiting.host':'Waiting for host...',
'lobby.players.count':'Players',
// Battle strings
'battle.all.sunk':'All ships sunk!',
'battle.place.ships':'Place ships',
'battle.play':'play',
// Stats
'stats.highscores':'My High Scores','stats.total':'Total Points',
'stats.best':'Best Game','stats.online':'Saved online',
// Chat
'chat.with':'Chat with','chat.ingame.title':'In-Game Chat',
'chat.empty':'No messages yet',
// Lobby page
'lobby.open':'Open Lobbies','lobby.refresh':'Refresh',
'lobby.vs.player':'VS Player','lobby.create.lobby':'Create Lobby',
'lobby.no.open':'No open lobbies','lobby.spectate':'Watch',
'lobby.join.btn2':'Join',
// Chat page
'chat.friends':'Friends','chat.search':'Search...',
'chat.select.friend':'Select a Friend','chat.select.hint':'Select a friend to chat',
'chat.write':'Write a message...','chat.no.friends':'No friends yet',
// Stats page
'stats.total.points':'Total Points','stats.best.game':'Best Game',
'stats.friends':'Friends','stats.rank':'Rank','stats.total2':'Total',
'stats.leaderboard':'Leaderboard',
// UI elements
'ui.add.player':'+ Add Player','ui.points':'Points',
'ui.total':'Total',
'lobby.no.lobbies':'No active lobbies.','lobby.create.hint':'Create one with the buttons above!',
'game.title.kniffel':'Yahtzee','game.title.battle':'Battleship',
'score.you':'You','score.ai':'AI','player.1':'Player 1','player.2':'Player 2','player.3':'Player 3','player.4':'Player 4',
'points.suffix':' Points',
'nav.back':'← Back','auth.not.logged.in':'Not logged in','auth.click.login':'','game.back.short':'Back to Game',
},
};

function t(key){return(TRANSLATIONS[currentLang]||TRANSLATIONS.de)[key]||TRANSLATIONS.de[key]||'';}  // never show raw key
let currentLang='de';
let friendsList=[];
let socialWs=null;
let unreadCounts={};
let activeDmUid=null;
let pendingRequests=[];

const API = location.origin; // same server

let fbUser = null;
let fbToken = null;

// ── AUTH ─────────────────────────────────────────
async function apiCall(path, method='GET', body=null) {
try {
const opts = {
method,
headers: { 'Content-Type': 'application/json' },
signal: AbortSignal.timeout(5000) // 5s timeout
};
if (fbToken) opts.headers['Authorization'] = 'Bearer ' + fbToken;
if (body) opts.body = JSON.stringify(body);
const r = await fetch(API + '/api/' + path, opts);
return await r.json();
} catch(e) {
if(e.name !== 'AbortError') console.error('API error:', path, e.message);
return { error: t('network.error') };
}
}

async function fbRegister(email, pass, name) {
const res = await apiCall('register', 'POST', { email, password: pass, name });
if (res.error) return { ok: false, msg: res.error };
fbToken = res.token;
fbUser = { uid: res.uid, name: res.name, email: res.email };
currentUser = { ...fbUser, scores: {}, total: 0 };
try { localStorage.setItem('ghToken', fbToken); localStorage.setItem('ghUser', JSON.stringify(fbUser)); } catch(e) {}
updateUserUI();
return { ok: true };
}

async function fbLogin(email, pass) {
const res = await apiCall('login', 'POST', { email, password: pass });
if (res.error) return { ok: false, msg: res.error };
fbToken = res.token;
fbUser = { uid: res.uid, name: res.name, email: res.email };
// Use local cumulative total if higher than server total
const localTotal=parseInt(localStorage.getItem('gh_total')||'0');
const localScores=JSON.parse(localStorage.getItem('gh_scores')||'{}');
const serverTotal=res.total||0;
const bestTotal=Math.max(localTotal,serverTotal);
// Merge local and server scores (take best of each)
const mergedScores={...( res.scores||{}),...localScores};
Object.keys(res.scores||{}).forEach(g=>{if((res.scores[g]||0)>(mergedScores[g]||0))mergedScores[g]=res.scores[g];});
currentUser = { ...fbUser, scores: mergedScores, total: bestTotal };
localStorage.setItem('gh_total',String(bestTotal));
localStorage.setItem('gh_scores',JSON.stringify(mergedScores));
try { localStorage.setItem('ghToken', fbToken); localStorage.setItem('ghUser', JSON.stringify({...fbUser,scores:mergedScores,total:bestTotal})); } catch(e) {}
updateUserUI();
return { ok: true };
}
