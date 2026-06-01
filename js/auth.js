function fbLogout() {
fbUser = null; fbToken = null; currentUser = null;
try { localStorage.removeItem('ghToken'); localStorage.removeItem('ghUser'); } catch(e) {}
updateUserUI();
}

async function fbChangePassword(oldPass, newPass){
if(!fbToken) return {ok:false,msg:'Nicht eingeloggt'};
const r=await apiCall('change-password','POST',{oldPassword:oldPass,newPassword:newPass});
return r?.ok?{ok:true}:{ok:false,msg:r?.error||'Fehler'};
}

async function fbDeleteAccount(){
if(!fbToken) return;
if(!confirm(t('auth.delete.confirm'))) return;
const r=await apiCall('delete-account','POST',{});
if(r?.ok){
showToast(t('auth.deleted'));
fbLogout();
nav('home');
} else showToast('Fehler: '+(r?.error||'?'));
}

function openPasswordChange(){
const old=document.getElementById('pw-modal');if(old)old.remove();
const m=document.createElement('div');
m.id='pw-modal';
m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center';
m.innerHTML=`<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:28px;max-width:340px;width:90%">
<div style="font-size:15px;font-weight:800;color:var(--text);margin-bottom:20px">🔒 Passwort ändern</div>
<input id="pw-old" type="password" placeholder="" data-i18n-ph='auth.pw.old.placeholder' style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;box-sizing:border-box;margin-bottom:10px">
<input id="pw-new" type="password" placeholder="" data-i18n-ph='auth.pw.new.placeholder' style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;box-sizing:border-box;margin-bottom:10px">
<input id="pw-new2" type="password" placeholder="" data-i18n-ph='auth.pw.new2.placeholder' style="width:100%;padding:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;color:var(--text);font-family:inherit;font-size:13px;box-sizing:border-box;margin-bottom:16px">
<div style="display:flex;gap:8px">
<button id="pw-save" style="flex:1;padding:11px;background:var(--c1);color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-family:inherit">Speichern</button>
<button onclick="document.getElementById('pw-modal').remove()" style="padding:11px 14px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);cursor:pointer;font-family:inherit">✕</button>
</div>
<div id="pw-msg" style="margin-top:10px;font-size:12px;color:var(--muted);text-align:center"></div>
</div>`;
document.body.appendChild(m);
m.addEventListener('click',e=>{if(e.target===m)m.remove();});
m.querySelector('#pw-save').addEventListener('click',async()=>{
const o=m.querySelector('#pw-old').value;
const n=m.querySelector('#pw-new').value;
const n2=m.querySelector('#pw-new2').value;
const msg=m.querySelector('#pw-msg');
if(!o||!n){msg.textContent=t('auth.fill.all');return;}
if(n!==n2){msg.textContent=t('auth.pw.mismatch');return;}
if(n.length<6){msg.textContent=t('auth.pw.short');return;}
msg.textContent=t('auth.pw.saving');
const r=await fbChangePassword(o,n);
if(r.ok){msg.style.color='var(--c4)';msg.textContent=t('auth.pw.changed');setTimeout(()=>m.remove(),1500);}
else{msg.style.color='#ff4444';msg.textContent='❌ '+r.msg;}
});
}

async function fbSaveScore(game, score) {
if(!score||score<=0)return;
// gh_scores = highscore per game (for leaderboard)
// gh_total = cumulative total (adds up every win)
try{
// Update highscores
const scores=JSON.parse(localStorage.getItem('gh_scores')||'{}');
if(!scores[game]||score>scores[game])scores[game]=score;
localStorage.setItem('gh_scores',JSON.stringify(scores));
// Update cumulative total
const prevTotal=parseInt(localStorage.getItem('gh_total')||'0');
const newTotal=prevTotal+score;
localStorage.setItem('gh_total',String(newTotal));
// Update currentUser
if(currentUser){
currentUser.scores=scores;
currentUser.total=newTotal;
updateUserUI();
}
showToast('🏆 +'+score+t('points.suffix')+'! '+t('ui.total')+': '+newTotal,2000);
}catch(ex){}
// Save to server if logged in
if(!fbToken)return;
try{
const res=await apiCall('scores','POST',{game,score});
if(res&&res.scores&&currentUser){
currentUser.scores=res.scores;
// Don't overwrite local cumulative total with server highscore total
updateUserUI();
}
}catch(ex){}
}

// DB helpers (same interface as before)
async function fbGet(path) {
return await apiCall(path.replace('rooms/', 'rooms/').replace('/sync', '/sync'), 'GET');
}
async function fbSet(path, data) {
const parts = path.split('/');
if (parts[0] === 'rooms') {
const res = await apiCall('rooms/create', 'POST', { ...data, roomId: parts[1] });
return !res.error;
}
return true;
}
async function fbUpdate(path, data) {
const parts = path.split('/');
if (parts[0] === 'rooms' && parts[2] === 'sync') {
await apiCall('rooms/' + parts[1] + '/sync', 'POST', data);
return true;
}
if (parts[0] === 'rooms' && !parts[2]) {
// Update room (e.g. join)
if (data.guest && data.state === 'playing') {
await apiCall('rooms/' + parts[1] + '/join', 'POST', {});
return true;
}
}
return true;
}
async function fbDelete(path) {
const parts = path.split('/');
if (parts[0] === 'rooms') {
await apiCall('rooms/' + parts[1], 'POST', { action: 'delete' });
}
return true;
}

function initFirebase() {
// Restore session from localStorage
try {
const savedToken = localStorage.getItem('ghToken');
const savedUser = localStorage.getItem('ghUser');
if (savedToken && savedUser) {
fbToken = savedToken;
fbUser = JSON.parse(savedUser);
// Restore scores from saved user data
const savedUserData = JSON.parse(savedUser);
const ghScores=JSON.parse(localStorage.getItem('gh_scores')||'{}');
const ghTotal=parseInt(localStorage.getItem('gh_total')||'0');
const mergedScores=Object.keys(ghScores).length>0?ghScores:(savedUserData.scores||{});
const finalTotal=ghTotal>0?ghTotal:(savedUserData.total||0);
const savedAvatar=(()=>{try{return JSON.parse(localStorage.getItem('ghUser')||'{}').avatar||'';}catch(e){return '';}})();
currentUser = { ...fbUser, total: finalTotal, scores: mergedScores, avatar: savedAvatar };
window._fbUser=fbUser;
updateUserUI();
setTimeout(initSocialWS,800);
// Load scores in background
apiCall('login', 'POST', {}).catch(() => {});
}
} catch(e) {}
}

// ── ONLINE LOBBY ─────────────────────────────────
let onlineRoomId=null,onlineGameType=null,onlineRole=null,onlinePollTimer=null;

async function createOnlineRoom(gameType){
if(!fbUser||!fbToken){showToast(t('auth.need.login'));return;}
// Kniffel: show waiting room for multiple players
if(gameType==='kniffel'){
showKniffelWaitingRoom();
return;
}
showToast(t('lobby.creating'));

// Create room on our server
const res = await apiCall('rooms/create', 'POST', { game: gameType });
if(res.error||!res.roomId){showToast(t('error.generic')+': '+(res.error||t('error.room.creating')));return;}

const roomId = res.roomId;
onlineRoomId=roomId;
onlineGameType=gameType;
onlineRole='host';

showOnlineWaiting(roomId,gameType);

// Poll for guest joining every 2 seconds
onlinePollTimer=setInterval(async()=>{
const room=await apiCall('rooms/'+roomId,'GET');
if(!room||room.error){clearInterval(onlinePollTimer);return;}
if(room.guest&&room.state==='playing'){
clearInterval(onlinePollTimer);
const el=document.getElementById('online-waiting');
if(el)el.remove();
showToast('🎮 '+room.guest.name+' ist beigetreten!');
setTimeout(()=>startOnlineGame(gameType,'host',room.guest.name),1000);
}
},2000);
}

async function joinOnlineRoom(code){
if(!fbUser||!fbToken){showToast(t('auth.need.login'));return;}
if(!code||code.length<4){showToast(t('error.enter.code'));return;}
showToast(t('lobby.joining'));
const roomId=code.trim().toUpperCase();

const room=await apiCall('rooms/'+roomId,'GET');
if(!room||room.error){showToast('❌ '+t('error.room.not.found'));return;}

// Kniffel multi: join as additional player
if(room.game==='kniffel'){
const joinRes=await apiCall('rooms/'+roomId+'/join-multi','POST',{name:fbUser.name});
if(!joinRes||joinRes.error){showToast('❌ '+(joinRes?.error||t('error.generic')));return;}
showToast(t('lobby.joined'));
// Wait for game_start
window._kniffelJoinPoll=setInterval(async()=>{
const r=await apiCall('rooms/'+roomId+'/players','GET');
if(r?.state==='started'){
clearInterval(window._kniffelJoinPoll);
startKniffelOnline(r.players,roomId);
}
},2000);
return;
}

if(room.state!=='waiting'){showToast('❌ '+t('error.room.full'));return;}
const joinRes=await apiCall('rooms/'+roomId+'/join','POST',{});
if(!joinRes||joinRes.error){showToast('❌ '+t('error.join.fail'));return;}

onlineRoomId=roomId;
onlineGameType=room.game;
onlineRole='guest';
showToast('✅ '+t('lobby.joined')+' '+room.host.name+'!');
setTimeout(()=>startOnlineGame(room.game,'guest',room.host.name),1000);
}

function cancelOnlineWait(){
if(onlinePollTimer){clearInterval(onlinePollTimer);onlinePollTimer=null;}
if(onlineRoomId)fbDelete('rooms/'+onlineRoomId);
const el=document.getElementById('online-waiting');
if(el)el.remove();
onlineRoomId=null;
}

function saveActiveLobby(roomId,game,hostName,vsAI){
try{
const lobbies=JSON.parse(localStorage.getItem('gh_active_lobbies')||'[]');
// Keep only fresh lobbies (max 30min), remove duplicates for same host
const filtered=lobbies.filter(l=>l.roomId!==roomId&&l.hostName!==hostName&&(Date.now()-l.ts)<1800000);
filtered.push({roomId,game,hostName,vsAI,ts:Date.now()});
localStorage.setItem('gh_active_lobbies',JSON.stringify(filtered.slice(-10)));
}catch(ex){}
}
function removeActiveLobby(roomId){
try{
const lobbies=JSON.parse(localStorage.getItem('gh_active_lobbies')||'[]');
localStorage.setItem('gh_active_lobbies',JSON.stringify(lobbies.filter(l=>l.roomId!==roomId)));
}catch(ex){}
}

async function showKniffelWaitingRoom(){
if(!fbUser){showToast(t('auth.need.login'));return;}
showToast(t('lobby.creating'));
const res=await apiCall('rooms/create','POST',{game:'kniffel'});
if(!res?.roomId){showToast(t('lobby.error'));return;}
const roomId=res.roomId;
onlineRoomId=roomId;
// Register as public lobby so others can find and join it
await apiCall('lobbies/create','POST',{game:'kniffel',vsAI:false,hostName:fbUser.name,roomId}).catch(()=>{});
saveActiveLobby(roomId,'kniffel',fbUser.name,false);

// Connect WS so room appears as active in lobby list
const proto=location.protocol==='https:'?'wss:':'ws:';
const wsKniffel=new WebSocket(proto+'//'+location.host);
wsKniffel.onopen=()=>{
wsKniffel.send(JSON.stringify({type:'join',roomId,role:'host',name:fbUser.name}));
};
window._kniffelHostWs=wsKniffel;

const shareUrl=location.href.split('?')[0]+'?join-kniffel='+roomId;
const el=document.createElement('div');
el.id='kniffel-waiting';
el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.95);font-family:inherit';
el.innerHTML=`
<div style="background:linear-gradient(135deg,#0d0d20,#0a0a18);border:1px solid rgba(255,215,0,.3);border-radius:20px;padding:36px 32px;text-align:center;max-width:460px;width:92%;box-shadow:0 0 60px rgba(255,215,0,.1)">
<div style="font-size:40px;margin-bottom:8px">🎲</div>
<div style="font-size:11px;font-weight:700;color:#ffd700;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">'+t('game.title.kniffel')+' Online</div>
<div style="font-size:18px;font-weight:900;color:#fff;margin-bottom:20px">Warteraum</div>

<div style="background:#060614;border:2px solid rgba(255,215,0,.2);border-radius:12px;padding:16px;margin-bottom:16px">
<div style="font-size:10px;font-weight:700;color:#ffd700;letter-spacing:2px;margin-bottom:8px">RAUM-CODE</div>
<div style="font-size:40px;font-weight:900;color:#ffd700;letter-spacing:8px;font-family:monospace">${roomId}</div>
<div style="font-size:10px;color:#3a3a5a;margin-top:6px">Bis zu 6 Spieler können beitreten</div>
</div>

<div style="margin-bottom:16px">
<div style="font-size:10px;font-weight:700;color:#6060a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Spieler (1/5)</div>
<div id="kniffel-players-list" style="display:flex;flex-direction:column;gap:6px">
<div style="background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">
<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,215,0,.15);color:#ffd700;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">${fbUser.name.slice(0,2).toUpperCase()}</div>
<span style="font-size:13px;color:#fff;font-weight:700">${fbUser.name}</span>
<span style="font-size:10px;color:#ffd700;margin-left:auto">👑 Host</span>
</div>
</div>
</div>

<div style="background:#060614;border:1px solid #1e1e38;border-radius:10px;padding:10px 14px;font-size:11px;color:#ffd700;word-break:break-all;cursor:pointer;margin-bottom:16px" id="kniffel-share-link" title="Klicken zum Kopieren">${shareUrl}</div>

<div style="display:flex;gap:8px">
<button id="kniffel-start-btn" style="flex:1;padding:13px;background:#ffd700;color:#000;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit">▶ Spiel starten</button>
<button id="kniffel-cancel-btn" style="padding:13px 16px;background:transparent;border:1px solid #1e1e38;border-radius:10px;color:#6060a0;cursor:pointer;font-family:inherit;font-size:12px">Abbrechen</button>
</div>
</div>`;
document.body.appendChild(el);

// Copy link
el.querySelector('#kniffel-share-link').addEventListener('click',()=>{
navigator.clipboard.writeText(shareUrl).catch(()=>{});
showToast(t('lobby.copy'));
});

// Start button
el.querySelector('#kniffel-start-btn').addEventListener('click',async()=>{
const res2=await apiCall('rooms/'+roomId+'/start','POST',{});
if(res2?.ok){
el.remove();
startKniffelOnline(res2.players||[{uid:fbUser.uid,name:fbUser.name}],roomId);
}
});

// Cancel
el.querySelector('#kniffel-cancel-btn').addEventListener('click',()=>{
el.remove();
if(window._kniffelHostWs)try{window._kniffelHostWs.close();}catch(ex){}
clearInterval(window._kniffelPoll);
cancelOnlineWait();
});

// Poll for players joining
window._kniffelPoll=setInterval(async()=>{
if(!document.getElementById('kniffel-waiting')){clearInterval(window._kniffelPoll);return;}
const r=await apiCall('rooms/'+roomId+'/players','GET');
if(r?.players)updateKniffelWaitingPlayers(r.players);
if(r?.state==='started'){
clearInterval(window._kniffelPoll);
document.getElementById('kniffel-waiting')?.remove();
startKniffelOnline(r.players,roomId);
}
},2000);
}

function updateKniffelWaitingPlayers(players){
const list=document.getElementById('kniffel-players-list');
if(!list||!players)return;
list.innerHTML=players.map((p,i)=>`
<div style="background:rgba(255,215,0,.08);border:1px solid rgba(255,215,0,.2);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">
<div style="width:28px;height:28px;border-radius:50%;background:rgba(255,215,0,.15);color:#ffd700;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px">${p.name.slice(0,2).toUpperCase()}</div>
<span style="font-size:13px;color:#fff;font-weight:700">${p.name}</span>
${i===0?'<span style="font-size:10px;color:#ffd700;margin-left:auto">👑 Host</span>':''}
</div>`).join('');
// Update count
const title=document.querySelector('#kniffel-waiting [style*="Spieler"]');
if(title)title.textContent=t('lobby.players.count')+' ('+players.length+'/6)';
}

function startKniffelOnline(players,roomId){
const opts={
diff:'medium',ctrl:'',mode:'Online',
isOnline:true,onlineRoomId:roomId,
players:players.map((p,i)=>({name:p.name,type:p.uid===fbUser?.uid?'human':'online',color:i,uid:p.uid})),
playerNames:players.map(p=>p.name),
isHost:players[0]?.uid===fbUser?.uid
};
startGame('kniffel',opts);
// Keep host WS alive for spectators - reuse it as lobby WS
if(window._kniffelHostWs&&window._kniffelHostWs.readyState===1){
if(currentGame){
currentGame._lobbyWs=window._kniffelHostWs;
currentGame._lobbyRoomId=roomId;
setTimeout(startCanvasStream,1500);
// Heartbeat every 30s
currentGame._heartbeat=setInterval(()=>{
if(!currentGame)return;
apiCall('rooms/'+roomId+'/sync','POST',{heartbeat:true,ts:Date.now()}).catch(()=>{});
},30000);
}
}
}

function showFriendOnlineStatus(){
// Show which friends are currently playing
const onlinePlaying=friendsList.filter(f=>f.online&&f.currentGame);
if(!onlinePlaying.length)return;
// Could show in lobby or as toast
}

function broadcastGameStatus(gameType,roomId){
// Tell friends what game we're playing
if(socialWs&&socialWs.readyState===1){
socialWs.send(JSON.stringify({type:'game_status',game:gameType,roomId:roomId||''}));
}
}

function showOnlineWaiting(roomId,gameType){
const gameNames=({snake:'🐍 '+t('game.snake'),pong:'🏓 '+t('game.pong'),vier:'🔴 '+t('game.vier'),battle:'🚢 '+t('game.battle'),kniffel:'🎲 '+t('game.kniffel')});
const shareUrl=location.href.split('?')[0]+'?join='+roomId;

const el=document.createElement('div');
el.id='online-waiting';
el.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.95);font-family:inherit';

el.innerHTML=
'<div style="background:linear-gradient(135deg,#0d0d20,#0a0a18);border:1px solid #00f5ff40;border-radius:20px;padding:36px 32px;text-align:center;max-width:440px;width:92%;box-shadow:0 0 60px rgba(0,245,255,.15)">'+

// Header
'<div style="font-size:36px;margin-bottom:6px">🌐</div>'+
'<div style="font-size:11px;font-weight:700;color:#00f5ff;letter-spacing:3px;text-transform:uppercase;margin-bottom:4px">Online Multiplayer</div>'+
'<div style="font-size:20px;font-weight:900;color:#fff;margin-bottom:4px">'+gameNames[gameType]+'</div>'+
'<div style="font-size:13px;color:#6060a0;margin-bottom:28px">Warte auf deinen Mitspieler...</div>'+

// Code display
'<div style="background:#060614;border:2px solid #00f5ff30;border-radius:14px;padding:20px;margin-bottom:20px">'+
'<div style="font-size:11px;font-weight:700;color:#00f5ff;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Raum-Code</div>'+
'<div style="font-size:52px;font-weight:900;color:#00f5ff;letter-spacing:10px;font-family:monospace;text-shadow:0 0 20px rgba(0,245,255,.5)">'+roomId+'</div>'+
'<div style="font-size:11px;color:#3a3a5a;margin-top:8px">Teile diesen Code mit deinem Freund</div>'+
'</div>'+

// Share link
'<div style="margin-bottom:24px">'+
'<div style="font-size:11px;font-weight:700;color:#6060a0;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px">Oder Link teilen</div>'+
'<div id="share-link" style="background:#060614;border:1px solid #1e1e38;border-radius:10px;padding:10px 14px;font-size:11px;color:#00f5ff;word-break:break-all;cursor:pointer;transition:border-color .2s" title="Klicken zum Kopieren">'+
shareUrl+
'</div>'+
'<div id="copy-hint" style="font-size:10px;color:#3a3a5a;margin-top:4px">👆 Klicken zum Kopieren</div>'+
'</div>'+

// Status
'<div style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:24px">'+
'<div style="display:flex;gap:4px">'+
'<div style="width:6px;height:6px;border-radius:50%;background:#00f5ff;animation:pulse 1.2s infinite 0s"></div>'+
'<div style="width:6px;height:6px;border-radius:50%;background:#00f5ff;animation:pulse 1.2s infinite .4s"></div>'+
'<div style="width:6px;height:6px;border-radius:50%;background:#00f5ff;animation:pulse 1.2s infinite .8s"></div>'+
'</div>'+
'<span style="font-size:13px;color:#6060a0" id="waiting-status">Warte auf Verbindung...</span>'+
'</div>'+

// Cancel button
'<button id="cancel-wait-btn" style="padding:11px 32px;background:transparent;border:1px solid #1e1e38;color:#6060a0;border-radius:10px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;transition:all .2s">← Abbrechen</button>'+

// Pulse animation
'<style>@keyframes pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}</style>'+
'</div>';

document.body.appendChild(el);

// Copy link on click
const shareEl=document.getElementById('share-link');
if(shareEl)shareEl.addEventListener('click',()=>{
try{
navigator.clipboard.writeText(shareUrl).then(()=>{
shareEl.style.borderColor='#00f5ff';
document.getElementById('copy-hint').textContent=t('lobby.link.copied');
setTimeout(()=>{
shareEl.style.borderColor='#1e1e38';
document.getElementById('copy-hint').textContent='👆 Klicken zum Kopieren';
},2000);
});
}catch(e){
// Fallback
const inp=document.createElement('input');
inp.value=shareUrl;document.body.appendChild(inp);
inp.select();document.execCommand('copy');inp.remove();
document.getElementById('copy-hint').textContent='✅ Link kopiert!';
}
});

document.getElementById('cancel-wait-btn').addEventListener('click',cancelOnlineWait);
}

function startOnlineGame(gameType,role,opponentName){
const myName=currentUser?.name||'Du';
const opts={
diff:'medium',
ctrl:'Maus',
mode:'Online',
onlineRole:role,        // 'host' or 'guest'
onlineRoomId:onlineRoomId,
opponentName:opponentName,
// Host = player 1 (left/blue), Guest = player 2 (right/red)
players: role==='host'
? [{name:myName,type:'human',color:0},{name:opponentName,type:'online',color:1}]
: [{name:opponentName,type:'online',color:1},{name:myName,type:'human',color:0}],
playerNames:[myName,opponentName],
isOnline:true,
isHost:role==='host',
};
startGame(gameType,opts);
}

// Check URL for auto-join on load
(()=>{
try{
const params=new URLSearchParams(location.search);
const joinCode=params.get('join');
if(joinCode){
setTimeout(()=>{
if(fbUser){
joinOnlineRoom(joinCode);
}else{
showToast(t('auth.need.login'));
// Store code and join after login
sessionStorage.setItem('pendingJoin',joinCode);
}
},2000);
}
}catch(e){}
})();

function showToast(msg,dur=3000){
const _toast=document.createElement('div');
_toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d0d18;border:1px solid #1e1e38;color:#fff;padding:10px 20px;border-radius:8px;font-size:13px;z-index:99999;white-space:nowrap';
_toast.textContent=msg;
document.body.appendChild(_toast);
setTimeout(()=>_toast.remove(),dur);
}

function getCanvasArea(){
const area=document.getElementById('canvas-area');
if(!area)return{w:600,h:460};
const w=area.clientWidth||area.offsetWidth||600;
const h=area.clientHeight||area.offsetHeight||460;
return{w:Math.max(w,200),h:Math.max(h,200)};
}

// ════════════════════════════════════════════════
// CORE NAVIGATION
// ════════════════════════════════════════════════
// PAGE_TITLES dynamically translated
function getPageTitle(page){
const map={
de:{home:'Spiele',game:'Spielen','lobby-select':'Spielmodus wählen',lobby:'Lobby',
chat:'Chat',stats:'Statistik',settings:'Einstellungen',account:'Account',impressum:'Impressum'},
en:{home:'Games',game:'Game Running','lobby-select':'Choose Mode',lobby:'Lobby',
chat:'Chat',stats:'Statistics',settings:'Settings',account:'Account',impressum:'Imprint'},
};
return(map[currentLang]||map.de)[page]||page;
}
const PAGE_TITLES={home:'Spiele',premenu:'','game':'Spielen','lobby-select':'Spielmodus wählen',lobby:'Lobby',
chat:'Chat',stats:'Statistik',settings:'Einstellungen',account:'Account',impressum:'Impressum'};
var currentGame=null,paused=false,lastGameType=null,lastGameOpts={};
