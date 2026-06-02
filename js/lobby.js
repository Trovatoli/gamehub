async function loadLobbies(){
const list=document.getElementById('lobby-list');
if(!list)return;
list.innerHTML='<div style="color:var(--muted);font-size:12px;padding:20px;text-align:center">Lade...</div>';

let lobbies=[];

// 1. Load from server
try{
const res=await apiCall('lobbies','GET');

if(res?.lobbies&&Array.isArray(res.lobbies)) lobbies=res.lobbies;
}catch(ex){console.log('[lobbies] error:',ex);}

// 2. Local lobbies only as last resort - clear stale ones
try{
const local=JSON.parse(localStorage.getItem('gh_active_lobbies')||'[]');
// Only show local lobbies not already in server list, max 10min old
const fresh=local.filter(l=>(Date.now()-l.ts)<120000); // only 2min
fresh.forEach(ll=>{
if(!lobbies.find(l=>l.roomId===ll.roomId)){
lobbies.push({
roomId:ll.roomId,game:ll.game,vsAI:ll.vsAI||false,
host:{name:ll.hostName},players:[{name:ll.hostName}],
state:'playing',maxPlayers:ll.game==='kniffel'?6:2,
spectators:0,created:ll.ts
});
}
});
// Keep only fresh
localStorage.setItem('gh_active_lobbies',JSON.stringify(fresh));
}catch(ex){}

if(!lobbies.length){
list.innerHTML='<div style="color:var(--muted);font-size:13px;padding:30px;text-align:center">'+t('lobby.no.lobbies')+'<br><span style="font-size:11px">'+t('lobby.create.hint')+'</span></div>';
return;
}

const gameNames=({snake:'🐍 '+t('game.snake'),pong:'🏓 '+t('game.pong'),vier:'🔴 '+t('game.vier'),battle:'🚢 '+t('game.battle'),kniffel:'🎲 '+t('game.kniffel')});
list.innerHTML=lobbies.map(r=>{
const isWaiting=r.state==='waiting';
const vsAI=r.vsAI;
const spectators=r.spectators||0;
const playerCount=r.players?.length||(r.guest?2:1);
const maxP=r.maxPlayers||2;
const canJoin=isWaiting&&!vsAI&&playerCount<maxP;
const isKniffel=r.game==='kniffel';
const hostName=r.host?.name||r.players?.[0]?.name||'?';
return `<div class="lobby-card">
<div class="lob-icon">${gameNames[r.game]?.split(' ')[0]||'🎮'}</div>
<div class="lob-info">
<div class="lob-name">${gameNames[r.game]||r.game}${vsAI?' vs KI':''}</div>
<div class="lob-host">Von ${hostName}</div>
${spectators>0?`<div style="font-size:10px;color:var(--muted)">👁 ${spectators} Zuschauer</div>`:''}
</div>
<div class="lob-right">
<div class="lob-count">${playerCount}/${maxP}</div>
<div class="lob-status ${isWaiting?'st-w':'st-f'}">${isWaiting?'Wartet':'Läuft'}</div>
<div style="display:flex;gap:4px;margin-top:4px">
${canJoin?`<button onclick="${isKniffel?`joinKniffelLobby('${r.roomId}')`:`joinPublicLobby('${r.roomId}','${r.game}')`}" style="padding:3px 8px;background:var(--c1);color:#000;border:none;border-radius:4px;font-size:10px;font-weight:800;cursor:pointer;font-family:inherit">Beitreten</button>`:''}
<button onclick="spectateGame('${r.roomId}','${r.game}')" style="padding:3px 8px;background:var(--bg3);border:1px solid var(--border);color:var(--muted);border-radius:4px;font-size:10px;cursor:pointer;font-family:inherit">👁 Zuschauen</button>
</div>
</div>
</div>`;
}).join('');
}

async function createPublicLobby(game){
if(!fbUser){showToast(t('auth.need.login'));return;}
// Create waiting room for PvP
const res=await apiCall('rooms/create','POST',{game});
if(!res?.roomId){showToast(t('lobby.error'));return;}
await apiCall('lobbies/create','POST',{game,vsAI:false,hostName:fbUser.name,roomId:res.roomId});
saveActiveLobby(res.roomId,game,fbUser.name,false);
showToast(t('lobby.created'));
// Show online waiting screen
showOnlineWaiting(res.roomId,game);
loadLobbies();
}

async function createAILobby(game){
if(!fbUser){showToast(t('auth.need.login'));return;}
// Solo games don't need a lobby
if(game==='snakeclassic'||game==='pacman'){
  startGame(game,{diff:'medium',ctrl:'Pfeiltasten',mode:'Solo',players:[{name:fbUser.name,type:'human',color:0}]});
  return;
}
const res=await apiCall('lobbies/create','POST',{game,vsAI:true,hostName:fbUser.name});
if(res?.roomId){
startGame(game,{diff:'medium',ctrl:'Pfeiltasten',mode:'Solo',
players:[{name:fbUser.name,type:'human',color:0},{name:'Computer',type:'ai',color:5}],
onlineRoomId:res.roomId,publicLobby:true});
loadLobbies();
}
}

async function joinKniffelLobby(roomId){
if(!fbUser){showToast(t('auth.need.login'));return;}
const res=await apiCall('rooms/'+roomId+'/join-multi','POST',{name:fbUser.name});
if(!res||res.error){showToast(t('error.generic')+': '+(res?.error||'?'));return;}
showToast(t('lobby.joined'));
// Show waiting UI
const el=document.createElement('div');
el.id='kniffel-join-wait';
el.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;font-family:inherit';
el.innerHTML=`<div style="background:#0d0d18;border:1px solid rgba(255,215,0,.3);border-radius:16px;padding:32px;text-align:center;max-width:360px">
<div style="font-size:36px;margin-bottom:10px">🎲</div>
<div style="font-size:16px;font-weight:800;color:#ffd700;margin-bottom:6px">'+t('game.title.kniffel')+' Online</div>
<div style="font-size:13px;color:#6060a0;margin-bottom:20px">Beigetreten! Warte auf Host...</div>
<div id="kniffel-join-players" style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px"></div>
<button onclick="document.getElementById('kniffel-join-wait').remove();clearInterval(window._kniffelJoinPoll2)" style="padding:8px 20px;background:transparent;border:1px solid #1e1e38;border-radius:8px;color:#6060a0;cursor:pointer;font-family:inherit;font-size:12px">Abbrechen</button>
</div>`;
document.body.appendChild(el);
// Update players display
function updateJoinPlayers(players){
const list=document.getElementById('kniffel-join-players');
if(!list)return;
list.innerHTML=(players||[]).map((p,i)=>`<div style="background:rgba(255,215,0,.05);border:1px solid rgba(255,215,0,.15);border-radius:6px;padding:6px 10px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:#fff">${p.name}</span>${i===0?'<span style="font-size:10px;color:#ffd700;margin-left:auto">👑</span>':''}</div>`).join('');
}
updateJoinPlayers(res.players);
// Poll until game starts - check both 'started' and via WS notification
window._kniffelJoinPoll2=setInterval(async()=>{
if(!document.getElementById('kniffel-join-wait')){clearInterval(window._kniffelJoinPoll2);return;}
const r=await apiCall('rooms/'+roomId+'/players','GET');
if(!r)return;
if(r.players)updateJoinPlayers(r.players);
if(r.state==='started'||r.state==='playing'){
clearInterval(window._kniffelJoinPoll2);
document.getElementById('kniffel-join-wait')?.remove();
startKniffelOnline(r.players||[],roomId);
}
},1500);
// Also listen via socialWs for instant notification
if(socialWs&&socialWs.readyState===1){
const _origMsg=socialWs.onmessage;
socialWs.onmessage=(ev)=>{
if(_origMsg)_origMsg(ev);
try{
const msg=JSON.parse(ev.data);
if(msg.type==='game_start'&&msg.roomId===roomId){
clearInterval(window._kniffelJoinPoll2);
document.getElementById('kniffel-join-wait')?.remove();
socialWs.onmessage=_origMsg;
startKniffelOnline(msg.players,roomId);
}
}catch(ex){}
};
}
}

async function joinPublicLobby(roomId,game){
if(!fbUser){showToast(t('auth.need.login'));return;}
// Get room info first
const room=await apiCall('rooms/'+roomId,'GET');
if(!room||room.error){showToast(t('error.room.not.found'));return;}
if(room.state!=='waiting'){showToast(t('error.room.full'));return;}
const hostName=room.host?.name||'Host';
const res=await apiCall('rooms/'+roomId+'/join','POST',{});
if(res&&!res.error){
startGame(game,{
diff:'medium',ctrl:'Pfeiltasten',mode:'Online',
onlineRole:'guest',onlineRoomId:roomId,
opponentName:hostName,
players:[{name:hostName,type:'online',color:0},{name:fbUser.name,type:'human',color:1}],
isOnline:true,isHost:false
});
}else{showToast('Fehler: '+(res?.error||t('error.room.not.found')));}
}

async function spectateGame(roomId,game){
const room=await apiCall('rooms/'+roomId,'GET');
if(!room||room.error){showToast(t('lobby.room.not.active'));return;}
await apiCall('rooms/'+roomId+'/spectate','POST',{});

const players=room.players||[room.host];
const gameNames=({snake:'🐍 '+t('game.snake'),pong:'🏓 '+t('game.pong'),vier:'🔴 '+t('game.vier'),battle:'🚢 '+t('game.battle'),kniffel:'🎲 '+t('game.kniffel')});

if(game==='kniffel'){
// Start real Kniffel UI in spectator mode - all players are 'online' (no control)
const spectatorPlayers=players.map((p,i)=>({
name:p.name, type:'online', color:i, uid:p.uid
}));
startGame('kniffel',{
diff:'medium', mode:'Zuschauer',
isOnline:true, isSpectator:true,
onlineRoomId:roomId,
players:spectatorPlayers,
playerNames:players.map(p=>p.name)
});
document.getElementById('g-status').textContent='👁 Zuschauer-Modus';
document.getElementById('pause-btn').style.display='none';
// Poll and update scores/dice every 1.5s
window._specPoll=_safeInterval(async()=>{
if(!currentGame||currentGame.type!=='kniffel'){clearInterval(window._specPoll);return;}
const res=await apiCall('rooms/'+roomId+'/sync','GET');
if(!res)return;
const d=res.sync||res;
// Update via global render functions
if(d.scores&&window.__kSpectatorUpdate){
window.__kSpectatorUpdate(d.scores,d.dice,d.held,d.currentPlayerIdx);
}
},1500);
return;
}

// Non-kniffel: canvas stream overlay
document.getElementById('spectator-overlay')?.remove();
const overlay=document.createElement('div');
overlay.id='spectator-overlay';
overlay.style.cssText='position:fixed;inset:0;z-index:9999;background:#06060f;display:flex;flex-direction:column;font-family:inherit';
overlay.innerHTML=`
<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--border);flex-shrink:0">
<span style="color:var(--c1);font-weight:800">👁 ${gameNames[game]||game}: ${players.map(p=>p.name).join(' vs ')}</span>
<div style="display:flex;align-items:center;gap:10px">
<span id="spec-status" style="font-size:10px;color:var(--muted)">Verbinde...</span>
<button id="spec-leave" style="padding:4px 12px;background:transparent;border:1px solid var(--border);border-radius:6px;color:var(--muted);cursor:pointer;font-family:inherit;font-size:11px">✕</button>
</div>
</div>
<div style="flex:1;display:flex;align-items:center;justify-content:center;min-height:0;padding:16px">
<img id="spec-canvas" style="max-width:100%;max-height:100%;border-radius:8px;border:1px solid var(--border);display:none">
<div id="spec-waiting" style="text-align:center;color:var(--muted)">
<div style="font-size:48px;margin-bottom:12px">⏳</div>
<div>Warte auf Live-Stream...</div>
</div>
</div>`;
document.body.appendChild(overlay);

const proto=location.protocol==='https:'?'wss:':'ws:';
const wsSpec=new WebSocket(proto+'//'+location.host);
wsSpec.onopen=()=>wsSpec.send(JSON.stringify({type:'join',roomId,role:'spectator',name:'Zuschauer'}));
wsSpec.onmessage=(ev)=>{
try{
const msg=JSON.parse(ev.data);
if(msg.type==='frame'){
const img=document.getElementById('spec-canvas');
const wait=document.getElementById('spec-waiting');
if(img){img.src=msg.data;img.style.display='block';}
if(wait)wait.style.display='none';
const st=document.getElementById('spec-status');if(st)st.textContent='🔴 Live';
}
}catch(ex){}
};
overlay.querySelector('#spec-leave').addEventListener('click',()=>{
overlay.remove();wsSpec.close();
});
}
function selLobbyGame(el,game,icon){
lobbyGame=game;lobbyIcon=icon;
document.querySelectorAll('#create-panel .opt-btn').forEach(b=>b.classList.remove('sel'));
el.classList.add('sel');
}
function createLobby(){
if(!currentUser){nav('account');return;}
const name=(document.getElementById('lobby-name')?.value||'').trim()||currentUser.name+"'s Lobby";
const card=document.createElement('div');card.className='lobby-card';
card.innerHTML=`<div class="lob-icon">${lobbyIcon}</div><div class="lob-info"><div class="lob-name">${name}</div><div class="lob-host">Von ${currentUser.name}</div></div><div class="lob-right"><div class="lob-count">1/2</div><div class="lob-status st-w">Wartet</div></div>`;
card.onclick=()=>joinLobby(card,name,lobbyIcon,lobbyGame);
document.getElementById('lobby-list').appendChild(card);
toggleCreatePanel();
setTimeout(()=>launch(lobbyGame),300);
}
function joinLobby(el,name,icon,game){
const st=el.querySelector('.lob-status');
if(st&&st.classList.contains('st-f')){alert('Lobby ist voll!');return;}
if(!currentUser){nav('account');return;}
if(st){st.textContent='Voll';st.className='lob-status st-f';}
const c=el.querySelector('.lob-count');if(c)c.textContent='2/2';
setTimeout(()=>launch(game||'pong'),400);
}

;
