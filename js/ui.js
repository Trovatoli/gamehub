function nav(page,el){
// Toggle: only when in-game, clicking same page closes it and returns to game
console.log('[TOGGLE] currentGame='+!!currentGame+' _navInGamePage='+window._navInGamePage+' page='+page);
if(currentGame&&window._navInGamePage===page&&page!=='game'&&page!=='home'){
  window._navInGamePage=null;
  // Remove overlay panel if it exists
  const _ol=document.getElementById('nav-overlay');
  if(_ol){
    // Restore page back to original parent before removing overlay
    const _pg=_ol.querySelector('.page');
    if(_pg&&_pg._origParent){
      _pg.classList.remove('active');
      _pg.style.flex='';_pg.style.minHeight='';_pg.style.display='';
      if(_pg._origNextSibling)_pg._origParent.insertBefore(_pg,_pg._origNextSibling);
      else _pg._origParent.appendChild(_pg);
    }
    _ol.remove();
  }
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  paused=false;
  document.getElementById('page-game').classList.add('active');
  updateBackToGameBtn();
  return;
}
if(currentGame&&page!=='game'&&page!=='home') window._navInGamePage=page;
else if(page==='game') window._navInGamePage=null;
// If navigating away from game but game is still running, just pause (don't stop)
const wasInGame=document.getElementById('page-game')?.classList.contains('active');
if(page!=='game'&&page!=='premenu'){
if(wasInGame&&currentGame&&page!=='home'){
// Pause game without stopping it
paused=true;
} else {
stopAll();
}
}
// If returning to game, unpause
if(page==='game'&&currentGame)paused=false;
document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
if(page==='game'||(wasInGame&&currentGame&&page!=='home')){
// Keep game page visible, show target as overlay if not game
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.getElementById('page-game')?.classList.add('active');
if(page!=='game'){
// Show non-game page as floating overlay
let overlay=document.getElementById('nav-overlay');
if(!overlay){
overlay=document.createElement('div');
overlay.id='nav-overlay';
overlay.style.cssText='position:fixed;top:0;right:0;bottom:0;width:min(420px,80vw);background:var(--bg2,var(--bg));border-left:1px solid var(--border);z-index:100;display:flex;flex-direction:column;overflow:hidden;box-shadow:-4px 0 20px rgba(0,0,0,.4);';
document.body.appendChild(overlay);
}
const targetPage=document.getElementById('page-'+page);
if(targetPage){
// Clear overlay but keep close button
overlay.innerHTML='';
const closeBtn=document.createElement('div');
closeBtn.innerHTML=t('lobby.close.back');
closeBtn.style.cssText='padding:10px 16px;cursor:pointer;font-size:13px;color:var(--accent);border-bottom:1px solid var(--border);font-weight:700;flex-shrink:0;';
closeBtn.onclick=()=>nav('game');
overlay.appendChild(closeBtn);
// Show target page over the game (no moving - avoids restore bugs)
targetPage.classList.add('active');
targetPage.style.position='fixed';
targetPage.style.inset='48px 0 0 var(--sidebar)';
targetPage.style.zIndex='500';
targetPage.style.background='var(--bg)';
overlay._activePage2=targetPage;
overlay._activePage=page;
// Init page content
if(page==='account'){try{renderAccount();loadFriendRequests();}catch(e){}}
if(page==='lobby'){try{loadLobbies();}catch(e){}}
if(page==='stats'){try{updateStats();}catch(e){}}
if(page==='impressum'){try{renderImpressum&&renderImpressum();}catch(e){}}

}
} else {
// Returning to game - move page back and close overlay
const ol=document.getElementById('nav-overlay');
if(ol){
const pg=ol._activePage2;
if(pg){
pg.classList.remove('active');
pg.style.position='';pg.style.inset='';pg.style.zIndex='';pg.style.background='';
}
ol.remove();
}
paused=false;
}
} else {
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
const p=document.getElementById('page-'+page);
if(p)p.classList.add('active');
const ol=document.getElementById('nav-overlay');
if(ol)ol.remove();
}
document.getElementById('page-title').textContent=getPageTitle(page);
// Show/hide topbar back button
const _tbBtn=document.getElementById('topbar-game-back');
if(_tbBtn)_tbBtn.style.display=(currentGame&&page!=='game')?'block':'none';
if(el)el.classList.add('active');
if(page!=='game')document.getElementById('igchat').classList.remove('show');
if(page==='account'){renderAccount();loadFriendRequests();setTimeout(renderFriendsSidebar,100);}
if(page==='stats'){updateStats();setTimeout(()=>{
try{
const u=JSON.parse(localStorage.getItem('ghUser')||'{}');
const av=u.avatar||currentUser?.avatar||'';
const pa=document.getElementById('profile-av-display');
if(pa){pa.textContent=av||currentUser?.name?.slice(0,2)?.toUpperCase()||'?';pa.style.fontSize=av?'28px':'18px';}
}catch(e){}
},50);}
if(page==='lobby'){loadLobbies();clearInterval(window._lobbyTimer);window._lobbyTimer=setInterval(loadLobbies,5000);}
else{clearInterval(window._lobbyTimer);}
applyTranslations();
updateBackToGameBtn();
}

// ════════════════════════════════════════════════
// GAME LAUNCHER
// ════════════════════════════════════════════════
// Games that need pre-menu (ctrl/difficulty choice)

function launch(type){
// Use new lobby select for all games
openLobbySelect(type);
}

function startGame(type,opts={}){
stopAll();paused=false;
lastGameType=type;lastGameOpts=opts;
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.getElementById('page-game').classList.add('active');
document.getElementById('page-title').textContent=t('game.start');
document.getElementById('s1').textContent='0';
document.getElementById('s2').textContent='0';
const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.type==='human'?(opts.players?.[1]?.name||'Spieler 2'):(opts.players?.[1]?.type==='ai'?'KI':''));
document.getElementById('s2lbl').textContent=p2name;
// Hide P2 score chip for solo modes (snakeclassic, or no opponent)
const _s2chip=document.getElementById('s2-chip');
if(_s2chip){
  const _solo = type==='snakeclassic' || (!opts.isOnline && (!opts.players || opts.players.length<=1) && !opts.vsAI);
  _s2chip.style.display = _solo ? 'none' : '';
}
document.getElementById('pause-overlay').classList.remove('show');
document.getElementById('gc').style.display='block';
document.getElementById('kniffel-ui').style.display='none';
document.getElementById('kniffel-ui').innerHTML='';
// Remove any lingering overlay divs (e.g. snake-gameover)
const ca=document.getElementById('canvas-area');
if(ca) ca.querySelectorAll('div:not(#kniffel-ui):not(.pause-overlay):not(#settings-overlay)').forEach(el=>el.remove());
const names=({snake:t('game.snake'),pong:t('game.pong'),vier:t('game.vier'),battle:t('game.battle'),kniffel:t('game.kniffel')});
document.getElementById('g-title').textContent=names[type]||type;
document.getElementById('g-status').textContent=t('game.ready')||'Bereit';
// Hide restart button in online mode
const restartBtn=document.querySelector('.ctrl-btn[onclick="restartGame()"]');
if(restartBtn)restartBtn.style.display=(lastGameOpts&&lastGameOpts.isOnline)?'none':'';
currentGame={type,loop:null,raf:null,_cleanup:null};
// Register public lobby on server (all games, even vs AI)
// Skip if already has a room (kniffel online, invite games)
// Broadcast game status to friends
if(fbUser&&!opts.isSpectator)broadcastGameStatus(type,opts.onlineRoomId||'');
if(fbUser&&!opts.isSpectator&&!opts.onlineRoomId){
const isAI=opts.players?.[1]?.type==='ai'||!opts.isOnline;
apiCall('lobbies/create','POST',{game:type,vsAI:isAI,hostName:fbUser.name}).then(res=>{
if(res?.roomId)saveActiveLobby(res.roomId,type,fbUser.name,isAI);
if(res?.roomId){
if(!opts.onlineRoomId)opts.onlineRoomId=res.roomId;
// Connect WS as host so room shows as active in lobby
const proto=location.protocol==='https:'?'wss:':'ws:';
const wsLobby=new WebSocket(proto+'//'+location.host);
wsLobby.onopen=()=>{
wsLobby.send(JSON.stringify({type:'join',roomId:res.roomId,role:'host',name:fbUser.name}));
};
wsLobby.onmessage=(ev)=>{
try{
const msg=JSON.parse(ev.data);
if(msg.type==='start'||msg.type==='waiting'){}
}catch(ex){}
};
wsLobby.onclose=()=>stopCanvasStream();
if(currentGame){
currentGame._lobbyWs=wsLobby;
currentGame._lobbyRoomId=res.roomId;
setTimeout(startCanvasStream,1000);
// Heartbeat every 30s to keep lobby alive
currentGame._heartbeat=setInterval(()=>{
if(!currentGame)return;
apiCall('rooms/'+res.roomId+'/sync','POST',{heartbeat:true,ts:Date.now()}).catch(()=>{});
},30000);
}
}
}).catch(()=>{});
}
// Use rAF to ensure layout is complete before reading canvas dimensions
// Init touch after game initializes
setTimeout(()=>initTouchControls(type),500);
requestAnimationFrame(()=>{
if(!currentGame)return; // was stopped before frame fired
const _st=document.getElementById('g-status');
if(_st)_st.textContent='Starte '+type+'...';    try{
if(type==='snake')initSnake(opts);
else if(type==='snakeclassic')initSnakeClassic(opts);
else if(type==='pong')initPong(opts);
else if(type==='vier')initVier(opts);
else if(type==='battle')initBattle(opts);
else if(type==='kniffel')initKniffel(opts);
else if(type==='pacman')initPacman(opts);
else{if(_st)_st.textContent=t('game.unknown.type')+': '+type;}    }catch(err){
console.error('GAME INIT ERROR:',type,err);
if(_st)_st.textContent='❌ '+err.message;
}
});
}
const _activeLoops=new Set();
const _safeInterval=(fn,ms)=>{const id=setInterval(fn,ms);_activeLoops.add(id);return id;};
const _clearAllLoops=()=>{_activeLoops.forEach(id=>clearInterval(id));_activeLoops.clear();};

function togglePause(){
paused=!paused;
const btn=document.getElementById('pause-btn');
const overlay=document.getElementById('pause-overlay');
if(btn)btn.textContent=paused?t('game.resume'):t('game.pause');
if(overlay)overlay.style.display=paused?'flex':'none';
if(currentGame){
if(paused&&currentGame._pauseFn)currentGame._pausePlay=false;
else if(!paused&&currentGame._resumeFn)currentGame._resumeFn();
}
}

var _pingInterval=null;
function startPingMeasure(ws){
clearInterval(_pingInterval);
_pingInterval=setInterval(()=>{
if(ws&&ws.readyState===1)
ws.send(JSON.stringify({type:'ping',ts:Date.now()}));
},2000);
}

function showPing(ms){
let el=document.getElementById('ping-display');
if(!el){
el=document.createElement('div');
el.id='ping-display';
el.style.cssText='position:fixed;top:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:'+(ms<80?'#00f5ff':ms<150?'#ffcc00':'#ff4444')+';font-size:11px;font-family:monospace;padding:2px 8px;border-radius:4px;z-index:9999;pointer-events:none';
document.body.appendChild(el);
}
el.style.color=ms<80?'#00f5ff':ms<150?'#ffcc00':'#ff4444';
el.textContent='🌐 '+ms+'ms';
// Remove when game stops
setTimeout(()=>{if(document.getElementById('ping-display')===el)el.remove();},5000);
}

function stopAll(){
clearInterval(_pingInterval);
document.getElementById('ping-display')?.remove();
_clearAllLoops(); // kill ALL intervals
// Clear ingame chat history
const igmsgs=document.getElementById('igmsgs');
if(igmsgs)igmsgs.innerHTML='';
// Hide chat panel
const igchat=document.getElementById('igchat');
if(igchat)igchat.classList.remove('show');
if(currentGame){
if(currentGame._cleanup)currentGame._cleanup();
if(currentGame.raf)cancelAnimationFrame(currentGame.raf);
// Close lobby WS so room disappears from lobby list
stopCanvasStream();
broadcastGameStatus('',''); // clear game status
if(currentGame._lobbyRoomId){
removeActiveLobby(currentGame._lobbyRoomId);
// Mark room as closed on server
apiCall('rooms/'+currentGame._lobbyRoomId+'/sync','POST',{state:'closed',ts:Date.now()}).catch(()=>{});
}
if(currentGame._heartbeat)clearInterval(currentGame._heartbeat);
if(currentGame._lobbyWs)try{currentGame._lobbyWs.close();}catch(ex){}
currentGame=null;
}
document.getElementById('pause-overlay').classList.remove('show');
paused=false;
}
function initChatOverlay(overlay){
// Chat overlay just needs the DM list to work
try{renderDMList&&renderDMList();}catch(e){}
// Wire up send button in overlay
const sendBtn=overlay.querySelector('.chat-send-btn,.send-btn,[onclick*="sendDM"],[onclick*="sendMsg"]');
const inp=overlay.querySelector('.chat-input,input[type="text"]');
if(sendBtn&&inp){
sendBtn.onclick=()=>{try{sendMsg&&sendMsg();inp.value='';}catch(e){}};
}
}
function stopAndHome(){stopAll();paused=false;nav('home',document.querySelectorAll('.nav-item')[0]);}
function backToGame(){
if(!currentGame)return;
paused=false;
document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
const p=document.getElementById('page-game');
if(p)p.classList.add('active');
document.getElementById('page-title').textContent='';
updateBackToGameBtn();
}
function updateBackToGameBtn(){
let btn=document.getElementById('back-to-game-btn');
if(currentGame&&!document.getElementById('page-game')?.classList.contains('active')){
if(!btn){
btn=document.createElement('div');
btn.id='back-to-game-btn';
btn.onclick=backToGame;
btn.style.cssText='cursor:pointer;padding:8px 12px;margin:8px;background:var(--accent);color:#000;border-radius:8px;font-size:13px;font-weight:700;text-align:center;display:flex;align-items:center;gap:6px;';
btn.innerHTML=t('game.back');
const sidebar=document.querySelector('.sidebar');
if(sidebar)sidebar.insertBefore(btn,sidebar.firstChild);
}
btn.style.display='flex';
} else if(btn){
btn.style.display='none';
}
}
function restartGame(){
if(!lastGameType)return;
if(lastGameOpts&&lastGameOpts.isOnline){
// Online: create fresh room of same game type
stopAll();
createOnlineRoom(lastGameType);
return;
}
startGame(lastGameType,lastGameOpts);
}

// ════════════════════════════════════════════════
// SOUND
// ════════════════════════════════════════════════
let audioCtx=null;
const settings={sound:true,music:false,notify:true,anim:true,hints:true};
function getACtx(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)();return audioCtx;}
function beep(freq,dur,type='square',vol=0.13){
if(!settings.sound)return;
try{const c=getACtx(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);
o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(vol,c.currentTime);
g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+dur);o.start();o.stop(c.currentTime+dur);}catch(e){}
}
function playBeep(freq,dur,type,vol){beep(freq,dur,type||'square',vol||0.13);}
function sndHit(){playBeep(440,.08,'square',.12);}
function sndScore(){playBeep(880,.15,'sine',.18);setTimeout(()=>playBeep(1100,.15,'sine',.15),100);}
function sndFail(){playBeep(200,.3,'sawtooth',.1);}
function sndPlace(){playBeep(600,.06,'sine',.1);}
function showBattleEndScreen(won){
const ca=document.getElementById('canvas-area');
if(!ca)return;
document.getElementById('battle-end')?.remove();
document.getElementById('rematch-local')?.remove();

const N=10;
const COL_LABELS=['A','B','C','D','E','F','G','H','I','J'];
const isDE=currentLang!=='en';

// ── Board renderer ───────────────────────────────────────
function renderBoard(ships, shotHits, shotMisses, label, accentColor){
// Normalize all keys to "r,c" strings
const hitKeys=new Set();
shotHits.forEach(k=>hitKeys.add(typeof k==='number'?`${Math.floor(k/10)},${k%10}`:String(k)));
const missKeys=new Set();
shotMisses.forEach(k=>missKeys.add(typeof k==='number'?`${Math.floor(k/10)},${k%10}`:String(k)));

// Map ship cells + sunk state
const shipMap=new Map(); // "r,c" -> {sunk}
ships.forEach(ship=>{
ship.cells.forEach(({r,c})=>shipMap.set(`${r},${c}`,{sunk:!!ship.sunk}));
});

const CS=26; // cell size px
let rows='';

// Column headers
rows+=`<div style="display:flex;gap:1px;margin-bottom:2px;padding-left:18px">
${COL_LABELS.map(c=>`<div style="width:${CS}px;text-align:center;font-size:8px;font-weight:700;color:rgba(255,255,255,.35)">${c}</div>`).join('')}
</div>`;

for(let r=0;r<N;r++){
let cells=`<div style="width:16px;font-size:8px;font-weight:700;color:rgba(255,255,255,.35);display:flex;align-items:center;justify-content:flex-end;padding-right:2px">${r+1}</div>`;
for(let c=0;c<N;c++){
const key=`${r},${c}`;
const isHit=hitKeys.has(key);
const isMiss=missKeys.has(key);
const ship=shipMap.get(key);
const hasShip=!!ship;

let bg,bdr,inner='';

if(isHit && hasShip){
// 💥 Torpedo hit on ship — bright red, unmistakable
const sunkGlow=ship.sunk?'0 0 10px #ff1744,inset 0 0 8px rgba(255,23,68,.4)':'0 0 6px rgba(255,100,50,.6)';
bg=ship.sunk?'#b71c1c':'#c62828';
bdr=ship.sunk?'2px solid #ff1744':'2px solid #ff5252';
inner=`<div style="font-size:13px;line-height:1;filter:drop-shadow(0 0 3px #ff1744)">💥</div>`;
} else if(isMiss){
// ○ Missed shot — clear white circle, contrasts water
bg='rgba(20,40,70,.8)';
bdr='1px solid rgba(100,160,255,.4)';
inner=`<div style="width:8px;height:8px;border-radius:50%;border:2px solid rgba(120,180,255,.8);background:rgba(100,180,255,.15)"></div>`;
} else if(hasShip){
// ▪ Intact ship — solid grey-blue, clearly visible
bg='rgba(40,80,120,.9)';
bdr='2px solid rgba(80,140,200,.7)';
inner=`<div style="width:${CS-8}px;height:${CS-8}px;border-radius:2px;background:rgba(100,160,220,.5)"></div>`;
} else {
// Empty water — dark, minimal
bg='rgba(5,15,35,.7)';
bdr='1px solid rgba(255,255,255,.06)';
}

cells+=`<div style="width:${CS}px;height:${CS}px;background:${bg};border:${bdr};border-radius:3px;display:flex;align-items:center;justify-content:center;pointer-events:none"></div>`.replace(
'pointer-events:none"></div>',
`pointer-events:none">${inner}</div>`
);
}
rows+=`<div style="display:flex;gap:1px;margin-bottom:1px">${cells}</div>`;
}

// Stats row
const hits=[...hitKeys].length;
const misses=[...missKeys].length;
const total=hits+misses;
const acc=total>0?Math.round(hits/total*100):0;
const sunk=ships.filter(sh=>sh.sunk).length;

return `<div style="display:flex;flex-direction:column;align-items:center;gap:8px">
<div style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:${accentColor};padding:3px 12px;border:1px solid ${accentColor};border-radius:20px;background:${accentColor}18">${label}</div>
<div style="background:#060d1a;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:8px">${rows}</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font-size:10px;width:100%">
<div style="display:flex;align-items:center;gap:4px">
<div style="font-size:12px">💥</div>
<span style="color:#ff5252;font-weight:700">${isDE?'Treffer':'Hits'}: ${hits}</span>
</div>
<div style="display:flex;align-items:center;gap:4px">
<div style="width:8px;height:8px;border-radius:50%;border:2px solid rgba(120,180,255,.8)"></div>
<span style="color:rgba(120,180,255,.8);font-weight:700">${isDE?'Fehlschüsse':'Misses'}: ${misses}</span>
</div>
<div style="display:flex;align-items:center;gap:4px">
<div style="width:10px;height:10px;border-radius:2px;background:rgba(100,160,220,.5);border:1px solid rgba(80,140,200,.7)"></div>
<span style="color:rgba(80,140,200,.9)">${isDE?'Genauigkeit':'Accuracy'}: ${acc}%</span>
</div>
<div style="display:flex;align-items:center;gap:4px">
<span style="color:#ff8a65">🚢 ${isDE?'Versenkt':'Sunk'}: ${sunk}/${ships.length}</span>
</div>
</div>
</div>`;
}

// ── Gather data ──────────────────────────────────────────
const bd=(currentGame&&currentGame._battleData)||{};
const myShips=bd.myShips||[];
const oppShips=bd.oppShips||[];
const myHitsOnOpp=bd.myHitsOnOpp||new Set();
const myMissesOnOpp=bd.myMissesOnOpp||new Set();
const oppHitsOnMe=bd.oppHitsOnMe||new Set();
const oppMissesOnMe=bd.oppMissesOnMe||new Set();

// ── Build HTML ───────────────────────────────────────────
const winColor=won?'#00f5ff':'#ff4444';
const winGlow=won?'0 0 40px rgba(0,245,255,.4)':'0 0 40px rgba(255,68,68,.4)';
const winEmoji=won?'🏆':'💀';
const winText=won?(isDE?'DU GEWINNST!':'YOU WIN!'):(isDE?'DU VERLIERST!':'YOU LOSE!');
const p2label=isDE?'Gegnerische Flotte':'Enemy Fleet';
const p1label=isDE?'Deine Flotte':'Your Fleet';

const myBoardHTML=renderBoard(myShips,oppHitsOnMe,oppMissesOnMe,p1label,'#00b4d8');
const oppBoardHTML=renderBoard(oppShips,myHitsOnOpp,myMissesOnOpp,p2label,'#e040fb');

const div=document.createElement('div');
div.id='battle-end';
div.style.cssText='position:absolute;inset:0;background:rgba(2,8,20,.97);display:flex;flex-direction:column;align-items:center;gap:14px;z-index:10;overflow-y:auto;overflow-x:hidden;padding:14px 10px 20px';

div.innerHTML=`
<!-- Winner banner -->
<div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0">
<div style="font-size:30px;font-weight:900;color:${winColor};text-shadow:${winGlow};letter-spacing:.05em">${winEmoji} ${winText}</div>
<div style="width:80px;height:2px;background:${winColor};border-radius:2px;opacity:.6"></div>
</div>

<!-- Legend -->
<div style="display:flex;gap:14px;font-size:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:6px 14px">
<span style="display:flex;align-items:center;gap:4px"><span style="font-size:12px">💥</span><span style="color:#ff5252;font-weight:700">${isDE?'Treffer':'Hit'}</span></span>
<span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:50%;border:2px solid rgba(120,180,255,.8);display:inline-block"></span><span style="color:rgba(120,180,255,.8)">${isDE?'Fehlschuss':'Miss'}</span></span>
<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:rgba(100,160,220,.5);border:1px solid rgba(80,140,200,.7);display:inline-block"></span><span style="color:rgba(80,140,200,.9)">${isDE?'Schiff':'Ship'}</span></span>
<span style="display:flex;align-items:center;gap:4px"><span style="width:10px;height:10px;border-radius:2px;background:#b71c1c;border:2px solid #ff1744;display:inline-block"></span><span style="color:#ff5252">${isDE?'Versenkt':'Sunk'}</span></span>
</div>

<!-- Boards -->
<div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;align-items:flex-start">
<div id="be-myboard">${myBoardHTML}</div>
<div id="be-oppboard">${oppBoardHTML}</div>
</div>

<!-- Buttons -->
<div style="display:flex;gap:10px">
<button id="battle-rematch" style="padding:10px 28px;background:var(--c1);color:#000;border:none;border-radius:10px;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit;letter-spacing:.03em">↺ Rematch</button>
<button id="battle-menu" style="padding:10px 18px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.15);border-radius:10px;font-size:13px;color:rgba(255,255,255,.6);cursor:pointer;font-family:inherit">${t('game.menu')}</button>
</div>`;

ca.appendChild(div);

// ── Button handlers ──────────────────────────────────────
div.querySelector('#battle-rematch').addEventListener('click',async()=>{
div.remove();
if(lastGameOpts?.isOnline){
const ws=currentGame?._battleWs;
if(won){
const res=await apiCall('rooms/create','POST',{game:'battle'});
if(res?.roomId){
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'battle_rematch',roomId:res.roomId}));
stopAll();startGame('battle',{...lastGameOpts,onlineRoomId:res.roomId,isHost:true});
}
}else{
showToast(t('rematch.waiting'));
const savedOpts={...lastGameOpts},savedWs=ws;
const origSocialMsg=socialWs?.onmessage;
const checkRematch=(ev)=>{
try{
const msg=JSON.parse(typeof ev==='string'?ev:ev.data);
if(msg.type==='battle_rematch'){
socialWs&&(socialWs.onmessage=origSocialMsg);
if(savedWs)savedWs.onmessage=null;
div.remove();stopAll();
apiCall('rooms/'+msg.roomId+'/join','POST',{}).then(()=>startGame('battle',{...savedOpts,onlineRoomId:msg.roomId,isHost:false}));
}
}catch(ex){}
};
if(savedWs&&savedWs.readyState===1)savedWs.onmessage=ev=>checkRematch(ev);
if(socialWs&&socialWs.readyState===1){const p=socialWs.onmessage;socialWs.onmessage=ev=>{if(p)p(ev);checkRematch(ev);};}
}
}else{restartGame();}
});
div.querySelector('#battle-menu').addEventListener('click',()=>{div.remove();stopAndHome();});
}

function sndWin(){
[523,659,784,1047].forEach((f,i)=>setTimeout(()=>playBeep(f,.2,'sine',.15),i*120));
}

function showLocalRematch(winnerName){
const ca=document.getElementById('canvas-area');
if(!ca)return;
document.getElementById('rematch-local')?.remove();
const div=document.createElement('div');
div.id='rematch-local';
div.style.cssText='position:absolute;bottom:20px;left:50%;transform:translateX(-50%);display:flex;gap:8px;align-items:center;z-index:10;pointer-events:all';
div.innerHTML=`
<div style="background:#0d0d18;border:1px solid var(--border);border-radius:10px;padding:10px 16px;display:flex;gap:10px;align-items:center">
<span style="font-size:12px;color:var(--muted)">${winnerName?'🏆 '+winnerName+' gewinnt!':'Game Over'}</span>
<button id="rematch-local-btn" style="padding:6px 16px;background:var(--c1);color:#000;border:none;border-radius:7px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px">↺ Rematch</button>
<button id="menu-local-btn" style="padding:6px 12px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:7px;cursor:pointer;font-family:inherit;font-size:12px">${t('game.menu')}</button>
</div>`;
ca.appendChild(div);
div.querySelector('#rematch-local-btn').addEventListener('click',()=>{div.remove();restartGame();});
div.querySelector('#menu-local-btn').addEventListener('click',()=>{div.remove();stopAndHome();});
}

// ── TOUCH CONTROLS ───────────────────────────────
let _touchStartX=0,_touchStartY=0;

function initTouchControls(game){
const gc=document.getElementById('gc');
if(!gc||!('ontouchstart' in window))return;

if(game==='snake'||game==='pacman'){
// Swipe to change direction
gc.addEventListener('touchstart',e=>{
_touchStartX=e.touches[0].clientX;
_touchStartY=e.touches[0].clientY;
e.preventDefault();
},{passive:false});
gc.addEventListener('touchend',e=>{
const dx=e.changedTouches[0].clientX-_touchStartX;
const dy=e.changedTouches[0].clientY-_touchStartY;
const absDx=Math.abs(dx),absDy=Math.abs(dy);
if(Math.max(absDx,absDy)<20)return; // too short
let key;
if(absDx>absDy){key=dx>0?'ArrowRight':'ArrowLeft';}
else{key=dy>0?'ArrowDown':'ArrowUp';}
document.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true}));
e.preventDefault();
},{passive:false});
// Show swipe hint overlay
const hint=document.createElement('div');
hint.style.cssText='position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.5);color:rgba(255,255,255,.5);font-size:10px;padding:3px 8px;border-radius:6px;pointer-events:none;z-index:3';
hint.textContent=currentLang==='en'?'⬅ Swipe to control ➡':'⬅ Wischen zum Steuern ➡';
document.getElementById('canvas-area')?.appendChild(hint);
setTimeout(()=>hint.remove(),3000);
}

if(game==='pong'){
// Touch drag for paddle
gc.addEventListener('touchmove',e=>{
const rect=gc.getBoundingClientRect();
const y=e.touches[0].clientY-rect.top;
const ratio=y/rect.height;
document.dispatchEvent(new CustomEvent('pong-touch-y',{detail:{ratio}}));
e.preventDefault();
},{passive:false});
}
}

function syncLobbyScore(s1,s2){
const ws=currentGame?._lobbyWs;
if(ws&&ws.readyState===1){
ws.send(JSON.stringify({type:'sync',data:{s1,s2}}));
}
if(currentGame?._lobbyRoomId){
apiCall('rooms/'+currentGame._lobbyRoomId+'/sync','POST',{s1,s2}).catch(()=>{});
}
}

// Stream canvas to spectators via WS
let _streamTimer=null;
function startCanvasStream(){
if(_streamTimer)clearInterval(_streamTimer);
_streamTimer=setInterval(()=>{
const ws=currentGame?._lobbyWs;
if(!ws||ws.readyState!==1)return;
try{
let frame=null;
const c=document.getElementById('gc');
if(c&&c.style.display!=='none'&&c.width>0){
// Normal canvas game
frame=c.toDataURL('image/jpeg',0.6);
} else {
// Kniffel or other DOM-based game - capture the whole game area
const area=document.getElementById('canvas-area');
if(!area)return;
// Use html2canvas-like approach: draw to offscreen canvas
// Simple: just send a score update instead for DOM games
const s1=document.getElementById('s1')?.textContent||'0';
const s2=document.getElementById('s2')?.textContent||'0';
ws.send(JSON.stringify({type:'sync',data:{s1:parseInt(s1)||0,s2:parseInt(s2)||0}}));
return;
}
if(frame)ws.send(JSON.stringify({type:'frame',data:frame}));
}catch(ex){}
},150);
}
function stopCanvasStream(){
if(_streamTimer){clearInterval(_streamTimer);_streamTimer=null;}
}

// ════════════════════════════════════════════════
// THEME & SETTINGS
// ════════════════════════════════════════════════
function setTheme(t,btn){
document.body.className='theme-'+t;
document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
if(btn)btn.classList.add('active');
try{localStorage.setItem('ghtheme',t);}catch(e){}
}
function setLang(l,btn){
document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
if(btn)btn.classList.add('active');
}
function toggleSetting(k,el){settings[k]=!settings[k];if(el)el.classList.toggle('on',settings[k]);}

// ════════════════════════════════════════════════
// SOCIAL - Real friends & chat via WebSocket
// ════════════════════════════════════════════════

let dmHistories={}; // uid -> [{from,text,ts,own}]

const AVATARS=['😀','😎','🤖','👾','🎮','🦊','🐉','🦁','🐺','🎯','⚡','🔥','💎','🌟','🏆','🎲','🚀','🦄','🐼','🎭'];

function openAvatarPicker(){
if(!fbUser){showToast(t('auth.need.login'));return;}
const old=document.getElementById('avatar-modal');if(old)old.remove();
const modal=document.createElement('div');
modal.id='avatar-modal';
modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center';
modal.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:320px;width:90%">
<div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:16px">Avatar wählen</div>
<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px">
${AVATARS.map(a=>`<button data-av="${a}" style="padding:8px;font-size:24px;background:var(--bg3);border:2px solid ${(currentUser?.avatar===a)?'var(--c1)':'var(--border)'};border-radius:8px;cursor:pointer;transition:all .15s">${a}</button>`).join('')}
</div>
<div style="display:flex;gap:8px">
<button id="av-save" style="flex:1;padding:10px;background:var(--c1);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit">Speichern</button>
<button onclick="document.getElementById('avatar-modal').remove()" style="padding:10px 14px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);cursor:pointer;font-family:inherit">✕</button>
</div>
</div>`;
document.body.appendChild(modal);
let selected=currentUser?.avatar||'';
modal.querySelectorAll('[data-av]').forEach(btn=>{
btn.addEventListener('click',()=>{
selected=btn.dataset.av;
modal.querySelectorAll('[data-av]').forEach(b=>b.style.borderColor='var(--border)');
btn.style.borderColor='var(--c1)';
});
});
modal.querySelector('#av-save').addEventListener('click',()=>{
if(!selected)return;
if(currentUser)currentUser.avatar=selected;
// Save to localStorage
try{const u=JSON.parse(localStorage.getItem('ghUser')||'{}');u.avatar=selected;localStorage.setItem('ghUser',JSON.stringify(u));}catch(ex){}
// Update display
const av=document.getElementById('profile-av-display');if(av){av.textContent=selected;av.style.fontSize='24px';}
const sb=document.getElementById('sb-av');if(sb){sb.textContent=selected;sb.style.fontSize='16px';}
const ta=document.getElementById('top-av');if(ta){ta.textContent=selected;ta.style.fontSize='16px';}
// Save to server + broadcast to friends
if(fbToken){
apiCall('avatar','POST',{avatar:selected}).then(r=>{
if(r&&r.ok)showToast(currentLang==='en'?'Avatar saved! ':'Avatar gespeichert! '+selected);
else showToast(currentLang==='en'?'Avatar saved locally! ':'Avatar lokal gespeichert! '+selected);
}).catch(e=>{console.error('[avatar] error:',e);showToast(currentLang==='en'?'Avatar saved locally! ':'Avatar lokal gespeichert! '+selected);});
} else {
showToast(currentLang==='en'?'Avatar saved! ':'Avatar gespeichert! '+selected);
}
if(socialWs&&socialWs.readyState===1)
socialWs.send(JSON.stringify({type:'avatar_update',uid:fbUser?.uid,avatar:selected}));
modal.remove();
});
modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
}

function openAddFriend(){
if(!fbUser){showToast(t('auth.need.login'));nav('account');return;}
const old=document.getElementById('add-friend-modal');
if(old)old.remove();
const modal=document.createElement('div');
modal.id='add-friend-modal';
modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center';
modal.innerHTML=`
<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:360px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<span style="font-size:15px;font-weight:800;color:var(--text)">👥 ${t('friend.add.title')||'Spieler hinzufügen'}</span>
<button id="af-close" style="background:transparent;border:none;color:var(--muted);font-size:24px;cursor:pointer;line-height:1">×</button>
</div>
<input id="af-search" placeholder="${t('friend.search.placeholder')||'Namen eingeben...'}" maxlength="30"
style="width:100%;box-sizing:border-box;background:var(--bg3);border:1.5px solid var(--c1);border-radius:8px;padding:10px 14px;color:var(--text);font-size:14px;font-family:inherit;outline:none;margin-bottom:10px">
<div id="af-results" style="display:flex;flex-direction:column;gap:6px;max-height:260px;overflow-y:auto">
<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">'+t('friend.search.hint')+'</div>
</div>
</div>`;
document.body.appendChild(modal);
modal.querySelector('#af-close').addEventListener('click',closeAddFriend);
modal.addEventListener('click',e=>{if(e.target===modal)closeAddFriend();});
const inp=modal.querySelector('#af-search');
let _searchTimer=null;
inp.addEventListener('input',()=>{
clearTimeout(_searchTimer);
_searchTimer=setTimeout(()=>searchAddFriend(inp.value.trim()),300);
});
inp.focus();
}

function closeAddFriend(){
const m=document.getElementById('add-friend-modal');
if(m)m.remove();
}

async function searchAddFriend(q){
const resultsEl=document.getElementById('af-results');
if(!resultsEl)return;
if(q.length<2){
resultsEl.innerHTML='<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">⬆ Namen eintippen um Spieler zu finden</div>';
return;
}
resultsEl.innerHTML='<div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">Suche...</div>';

// Try HTTP search first, fallback to leaderboard search
let results=[];
try{
const res=await apiCall('leaderboard','GET');
if(res&&Array.isArray(res.leaderboard)){
results=res.leaderboard
.filter(u=>u.name&&u.name.toLowerCase().includes(q.toLowerCase())&&u.uid!==fbUser?.uid)
.map(u=>({uid:u.uid,name:u.name,online:(res.online||[]).includes(u.uid)}));
}
}catch(e){}

if(!results.length){
resultsEl.innerHTML='<div style="color:var(--muted);font-size:12px;text-align:center;padding:16px">Niemanden mit diesem Namen gefunden</div>';
return;
}

resultsEl.innerHTML=results.map(u=>{
const isFriend=friendsList.find(f=>f.uid===u.uid);
if(u.uid===fbUser?.uid)return '';
return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:8px">
<div style="width:32px;height:32px;border-radius:50%;background:rgba(0,245,255,.12);color:var(--c1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;flex-shrink:0">${u.name.slice(0,2).toUpperCase()}</div>
<div style="flex:1">
<div style="font-size:13px;font-weight:700;color:var(--text)">${u.name}</div>
<div style="font-size:10px;color:${u.online?'var(--c4)':'var(--muted)'}">${u.online?'🟢 Online':'⚫ Offline'}</div>
</div>
${isFriend
?'<span style="font-size:11px;color:var(--c4);font-weight:700">✓ Freund</span>'
:`<button onclick="sendFriendRequest('${u.uid}','${u.name}');this.textContent='✓ Gesendet';this.disabled=true;this.style.background='var(--bg2)'"
style="padding:6px 14px;background:var(--c1);color:#000;border:none;border-radius:7px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit">
+ Hinzufügen
</button>`}
</div>`;
}).join('');
}

// Wire search in modal
document.addEventListener('DOMContentLoaded',()=>{
const af=document.getElementById('af-search');
if(af){
let t=null;
af.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>searchAddFriend(af.value.trim()),300);});
af.addEventListener('keydown',e=>{if(e.key==='Escape')closeAddFriend();});
}
// Wire chat page search-input via event delegation
document.addEventListener('input',e=>{
if(!e.target||e.target.id!=='search-input')return;
const q=e.target.value.trim();
const out=document.getElementById('search-results');
if(!out)return;
if(q.length<2){out.innerHTML='';return;}
clearTimeout(window._st);
window._st=setTimeout(async()=>{
if(!fbUser){out.innerHTML='<div style="padding:6px;font-size:11px;color:var(--muted)">'+t('friend.please.login')+'</div>';return;}
out.innerHTML='<div style="padding:6px;font-size:11px;color:var(--muted)">Suche...</div>';
let results=[];
try{
const res=await apiCall('leaderboard','GET');
if(res&&Array.isArray(res.leaderboard)){
results=res.leaderboard
.filter(u=>u.name&&u.name.toLowerCase().includes(q.toLowerCase())&&u.uid!==fbUser.uid)
.map(u=>({uid:u.uid,name:u.name,online:(res.online||[]).includes(u.uid)}));
}
}catch(ex){}
if(!results.length){out.innerHTML='<div style="padding:6px;font-size:11px;color:var(--muted)">Niemanden gefunden</div>';return;}
out.innerHTML='';
// Also search own friends list first
const friendMatches=friendsList.filter(f=>f.name.toLowerCase().includes(q.toLowerCase()));
const nonFriendResults=results.filter(u=>!friendsList.find(f=>f.uid===u.uid));
const allResults=[...friendMatches.map(f=>({...f,isFriend:true})),...nonFriendResults.map(u=>({...u,isFriend:false}))];

if(!allResults.length){out.innerHTML='<div style="padding:6px;font-size:11px;color:var(--muted)">Niemanden gefunden</div>';return;}
out.innerHTML='';
allResults.forEach(u=>{
const div=document.createElement('div');
div.className='room-item';
div.style.cssText='justify-content:space-between;gap:4px;cursor:pointer';
div.innerHTML='<div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">'
+'<div class="av av-c" style="width:22px;height:22px;font-size:'+(u.avatar?'14px':'9px')+';flex-shrink:0">'+(u.avatar||u.name.slice(0,2).toUpperCase())+'</div>'
+'<div style="min-width:0">'
+'<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+u.name+'</div>'
+(u.isFriend?'<div style="font-size:9px;color:var(--c4)">✓ Freund</div>':'<div style="font-size:9px;color:var(--muted)">Kein Freund</div>')
+'</div>'
+'<div class="dot '+(u.online?'dot-on':'dot-away')+'" style="margin-left:auto;flex-shrink:0"></div>'
+'</div>'
+(u.isFriend
?'<span style="font-size:10px;color:var(--c1);flex-shrink:0">💬 Chat →</span>'
:'<button class="add-btn" style="padding:3px 8px;background:var(--c1);color:#000;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit;flex-shrink:0">+ Freund</button>');
if(u.isFriend){
// Click anywhere to open DM
div.addEventListener('click',()=>{
document.getElementById('search-input').value='';
out.innerHTML='';
openDM(u.uid,u.name);
});
} else {
div.querySelector('.add-btn').addEventListener('click',e=>{
e.stopPropagation();
sendFriendRequest(u.uid,u.name);
div.querySelector('.add-btn').textContent='✓ Gesendet';
div.querySelector('.add-btn').disabled=true;
});
}
out.appendChild(div);
});
},300);
});
});

// ── Chat Slide Panel ────────────────────────────────────────────
let _cspFriend = null;

function _ensureChatPanel() {
  if (document.getElementById('chat-slide-panel')) return;
  // Add CSS
  const st = document.createElement('style');
  st.textContent = `
/* ── Chat Panel ── */
#chat-slide-panel{position:fixed;top:0;right:-100vw;bottom:0;width:min(460px,88vw);background:var(--bg2,#0d0d24);border-left:2px solid var(--c1);z-index:9999;display:flex;flex-direction:column;box-shadow:-8px 0 32px rgba(0,0,0,.7);transition:right .22s ease;pointer-events:all;}
#chat-slide-panel.open{right:0;}
#chat-slide-panel .csp-hdr{display:flex;align-items:center;justify-content:space-between;padding:11px 16px;border-bottom:1px solid var(--border);flex-shrink:0;background:var(--bg3,#080818);}
#chat-slide-panel .csp-hdr b{font-size:14px;color:var(--text);}
#chat-slide-panel .csp-x{background:rgba(255,255,255,.12);border:none;color:var(--text);font-size:18px;font-weight:900;cursor:pointer;border-radius:7px;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-family:inherit;}
#chat-slide-panel .csp-body{flex:1;display:flex;overflow:hidden;}
#chat-slide-panel .csp-friends{width:150px;flex-shrink:0;border-right:1px solid var(--border);overflow-y:auto;padding:8px;}
#chat-slide-panel .csp-friend{padding:7px 6px;cursor:pointer;border-radius:7px;font-size:12px;display:flex;align-items:center;gap:6px;color:var(--text);}
#chat-slide-panel .csp-friend:hover{background:rgba(255,255,255,.06);}
#chat-slide-panel .csp-chat{flex:1;display:flex;flex-direction:column;min-width:0;}
#chat-slide-panel .csp-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:5px;}
#chat-slide-panel .csp-msg-own{background:var(--c1);color:#000;padding:5px 10px;border-radius:10px;font-size:12px;max-width:80%;align-self:flex-end;word-break:break-word;}
#chat-slide-panel .csp-msg-them{background:var(--bg3,#1a1a3a);color:var(--text);padding:5px 10px;border-radius:10px;font-size:12px;max-width:80%;align-self:flex-start;word-break:break-word;}
#chat-slide-panel .csp-inp{display:flex;gap:6px;padding:8px;border-top:1px solid var(--border);flex-shrink:0;}
#chat-slide-panel .csp-inp input{flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px;padding:7px 10px;font-family:inherit;outline:none;}
#chat-slide-panel .csp-inp button{padding:7px 14px;background:var(--c1);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit;}
`;
  document.head.appendChild(st);
  // Build HTML
  const p = document.createElement('div');
  p.id = 'chat-slide-panel';
  p.innerHTML = `
    <div class="csp-hdr"><b>💬 Chat</b><button class="csp-x" onclick="navChatClose()">✕</button></div>
    <div class="csp-body">
      <div class="csp-friends" id="csp-friends"></div>
      <div class="csp-chat">
        <div class="csp-msgs" id="csp-msgs"><div style="color:var(--muted);font-size:12px;text-align:center;padding:20px;">Wähle einen Freund</div></div>
        <div class="csp-inp">
          <input id="csp-input" placeholder="Nachricht..." disabled onkeydown="if(event.key==='Enter')cspSend()">
          <button onclick="cspSend()" id="csp-send">→</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(p);
}

function navChat(el) {
  // Not in-game: navigate to full chat page normally
  if (!currentGame) { nav('chat', el); return; }
  // In-game: use slide panel
  _ensureChatPanel();
  const p = document.getElementById('chat-slide-panel');
  const isOpen = p.classList.contains('open');
  if (isOpen) {
    p.classList.remove('open');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  } else {
    p.classList.add('open');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    _cspRenderFriends();
  }
}

function navChatClose() {
  const p = document.getElementById('chat-slide-panel');
  if (p) p.classList.remove('open');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
}

function _cspRenderFriends() {
  const list = document.getElementById('csp-friends');
  if (!list) return;
  list.innerHTML = '<div style="font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:8px;padding:2px 4px;">FREUNDE</div>';
  (friendsList || []).forEach(f => {
    const d = document.createElement('div');
    d.className = 'csp-friend';
    d.innerHTML = '<span style="width:7px;height:7px;border-radius:50%;background:'+(f.online?'#4ade80':'#555')+';flex-shrink:0;display:inline-block"></span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(f.name||'?')+'</span>';
    d.onclick = () => _cspOpen(f.uid, f.name);
    list.appendChild(d);
  });
  if (!(friendsList||[]).length) list.innerHTML += '<div style="font-size:11px;color:var(--muted);padding:4px;">Keine Freunde</div>';
}

function _cspOpen(uid, name) {
  _cspFriend = uid;
  const inp = document.getElementById('csp-input');
  const btn = document.getElementById('csp-send');
  if (inp) { inp.disabled = false; inp.placeholder = name+'...'; inp.focus(); }
  if (btn) btn.disabled = false;
  const msgs = document.getElementById('csp-msgs');
  if (!msgs) return;
  msgs.innerHTML = '<div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:8px;">'+name+'</div>';
  try {
    const k = 'dms_'+[fbUser?.uid,uid].sort().join('_');
    JSON.parse(localStorage.getItem(k)||'[]').slice(-50).forEach(m => {
      const d=document.createElement('div');
      d.className='csp-msg-'+(m.from===fbUser?.uid?'own':'them');
      d.textContent=m.text;
      msgs.appendChild(d);
    });
    msgs.scrollTop=msgs.scrollHeight;
  } catch(e){}
}

function cspSend() {
  if (!_cspFriend) return;
  const inp = document.getElementById('csp-input');
  const text = inp?.value?.trim();
  if (!text) return;
  inp.value = '';
  const msgs = document.getElementById('csp-msgs');
  if (msgs) {
    const d=document.createElement('div');d.className='csp-msg-own';d.textContent=text;
    msgs.appendChild(d);msgs.scrollTop=msgs.scrollHeight;
  }
  if (socialWs&&socialWs.readyState===1)
    socialWs.send(JSON.stringify({type:'dm',to:_cspFriend,text,from:fbUser?.uid,fromName:currentUser?.name||''}));
  try {
    const k='dms_'+[fbUser?.uid,_cspFriend].sort().join('_');
    const s=JSON.parse(localStorage.getItem(k)||'[]');
    s.push({from:fbUser?.uid,text,ts:Date.now()});
    localStorage.setItem(k,JSON.stringify(s.slice(-200)));
  } catch(e){}
}
