function initSocialWS(){
if(!fbToken||!fbUser)return;
loadDMsLocal();
if(socialWs&&(socialWs.readyState===0||socialWs.readyState===1))return;
if(socialWs){try{socialWs.close();}catch(e){}}
const proto=location.protocol==='https:'?'wss:':'ws:';
socialWs=new WebSocket(proto+'//'+location.host);
socialWs.onopen=()=>{
socialWs.send(JSON.stringify({type:'auth',token:fbToken}));
};
socialWs.onmessage=(e)=>{
const msg=JSON.parse(e.data);
if(msg.type==='auth_ok') { renderFriendsSidebar(); }
if(msg.type==='player_joined'){
updateKniffelWaitingPlayers(msg.players);
}
if(msg.type==='game_start'){
const waitEl=document.getElementById('kniffel-waiting');
if(waitEl){waitEl.remove();startKniffelOnline(msg.players,msg.roomId);}
}
if(msg.type==='friends_list'){
// Deduplicate by uid
const rawFriends=msg.friends||[];
const seen=new Set();
friendsList=rawFriends.filter(f=>{if(seen.has(f.uid))return false;seen.add(f.uid);return true;});
pendingRequests=msg.requests||[];
renderFriendsSidebar();
renderDMList();
renderFriendRequests();
}
if(msg.type==='presence'){
const f=friendsList.find(f=>f.uid===msg.uid);
if(f){f.online=msg.online;renderFriendsSidebar();renderDMList();}
}
if(msg.type==='friend_request'){
pendingRequests.push({uid:msg.fromUid,name:msg.fromName});
showToast('👋 '+msg.fromName+' '+t('friend.wants'));
renderFriendRequests();
}
if(msg.type==='friend_added'){
if(!friendsList.find(f=>f.uid===msg.uid)){
friendsList.push({uid:msg.uid,name:msg.name,avatar:msg.avatar||'',online:false});
}
showToast('🎉 '+msg.name+' '+t('friend.now.friend'));
renderFriendsSidebar();renderDMList();
}
if(msg.type==='dm'){
const uid=msg.fromUid;
if(!dmHistories[uid])dmHistories[uid]=[];
dmHistories[uid].push({from:msg.fromName,text:msg.text,ts:msg.ts,own:false});
saveDMsLocal();
if(activeDmUid===uid){
renderDMMessages(uid);
} else {
// Show toast notification
showToast('💬 '+msg.fromName+': '+msg.text.slice(0,40),4000);
// Show unread badge on friend in sidebar
const friendEl=document.getElementById('friend-'+uid);
if(friendEl&&!document.getElementById('dm-badge-'+uid)){
const badge=document.createElement('span');
badge.id='dm-badge-'+uid;
badge.style.cssText='background:var(--c3);color:#fff;border-radius:50%;width:16px;height:16px;font-size:9px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0';
badge.textContent='!';
friendEl.appendChild(badge);
}
// Update DM list unread count
renderDMList();
}
}
if(msg.type==='dm_sent'){
// Confirmed by server - already in local history
}
if(msg.type==='search_results') renderSearchResults(msg.results);
if(msg.type==='game_invite'){
showGameInvite(msg.fromUid,msg.fromName,msg.game,msg.roomId);
}
if(msg.type==='game_status'){
const f=friendsList.find(x=>x.uid===msg.uid);
if(f){f.currentGame=msg.game||'';renderFriendsSidebar();renderDMList();}
}
if(msg.type==='igchat'){
const sameRoom=!msg.roomId||!lastGameOpts?.onlineRoomId||msg.roomId===lastGameOpts.onlineRoomId;
if(sameRoom){
igChatAddMsg(msg.from,msg.text,false);
// Always notify
showToast('💬 '+msg.from+': '+msg.text.slice(0,30));
// Flash chat button
const chatBtn=document.querySelector('.igchat-toggle');
if(chatBtn){
chatBtn.style.background='var(--c3)';
chatBtn.style.boxShadow='0 0 12px var(--c3)';
setTimeout(()=>{chatBtn.style.background='';chatBtn.style.boxShadow='';},1500);
}
// Beep
try{const ac=new AudioContext();const o=ac.createOscillator();const g=ac.createGain();o.connect(g);g.connect(ac.destination);o.frequency.value=880;g.gain.setValueAtTime(0.1,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.15);o.start();o.stop(ac.currentTime+0.15);}catch(ex){}
}
}
if(msg.type==='avatar_update'){
const f=friendsList.find(x=>x.uid===msg.uid);
if(f&&msg.avatar){
f.avatar=msg.avatar;
try{const c=JSON.parse(localStorage.getItem('gh_friend_avatars')||'{}');c[f.uid]=msg.avatar;localStorage.setItem('gh_friend_avatars',JSON.stringify(c));}catch(e){}
renderFriendsSidebar();renderDMList();
}
}
};
socialWs.onclose=()=>{ setTimeout(initSocialWS,3000); };
}

function renderFriendsSidebar(){
const list=document.getElementById('friends-list');
const hdr=document.getElementById('online-hdr');
if(!list)return;
const onlineF=friendsList.filter(f=>f.online);
if(hdr)hdr.textContent=t('chat.online.count')+onlineF.length;
list.innerHTML=friendsList.map(f=>{
const ini=f.name.slice(0,2).toUpperCase();
const fav=(()=>{try{if(f.uid===currentUser?.uid){const u=JSON.parse(localStorage.getItem('ghUser')||'{}');return u.avatar||currentUser?.avatar||'';}return f.avatar||'';}catch(e){return '';}})();
return '<div class="friend" style="position:relative" id="friend-'+f.uid+'">'
+'<div data-dm-uid="'+f.uid+'" data-dm-name="'+f.name+'" style="display:flex;align-items:center;gap:8px;flex:1;cursor:pointer">'
+'<div class="av av-c" style="font-size:'+(fav?'14px':'9px')+';width:24px;height:24px">'+(fav||ini)+'</div>'
+'<div class="friend-name">'+f.name+'</div>'
+(f.currentGame?'<span style="font-size:9px;color:var(--c1);margin-left:2px">'
+({snake:'🐍',pong:'🏓',vier:'🔴',battle:'🚢',kniffel:'🎲',pacman:'👾'}[f.currentGame]||'🎮')
+'</span>':'')
+'<div class="dot '+(f.online?'dot-on':'dot-away')+'"></div>'
+'</div>'
+'<button data-remove-friend="'+f.uid+'" title="Freund entfernen" style="background:transparent;border:none;color:var(--muted);font-size:14px;cursor:pointer;padding:2px 4px;opacity:0;transition:opacity .15s">✕</button>'
+'</div>';
}).join('')||'<div style="padding:4px 8px;font-size:11px;color:var(--muted)">Noch keine Freunde</div>';
// Wire DM clicks
list.querySelectorAll('[data-dm-uid]').forEach(el=>{
el.addEventListener('click',()=>openDM(el.dataset.dmUid,el.dataset.dmName));
});
// Show remove button on hover
list.querySelectorAll('.friend').forEach(el=>{
const btn=el.querySelector('[data-remove-friend]');
if(!btn)return;
el.addEventListener('mouseenter',()=>btn.style.opacity='1');
el.addEventListener('mouseleave',()=>btn.style.opacity='0');
btn.addEventListener('click',()=>removeFriend(btn.dataset.removeFriend));
});
}

async function removeFriend(uid){
if(!confirm(t('friends.remove.confirm')))return;
friendsList=friendsList.filter(f=>f.uid!==uid);
renderFriendsSidebar();
renderDMList();
showToast(t('friend.removed'));
try{
await apiCall('friends/remove','POST',{uid});
}catch(e){}
}

function renderDMList(){
const list=document.getElementById('dm-list');
if(!list)return;
list.innerHTML=friendsList.map(f=>{
const ini=f.name.slice(0,2).toUpperCase();
const fav=f.avatar||'';
const active=activeDmUid===f.uid;
const unread=unreadCounts[f.uid]||0;
return '<div class="room-item'+(active?' active':'')+'" data-dm-open="'+f.uid+'" data-dm-name="'+f.name+'">'
+'<div class="av av-c" style="width:20px;height:20px;font-size:'+(fav?'13px':'8px')+';flex-shrink:0">'+(fav||ini)+'</div>'
+'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.name+'</span>'
+(unread?'<span style="background:var(--c3);color:#fff;border-radius:10px;padding:1px 5px;font-size:9px;font-weight:800">'+unread+'</span>':'')
+(f.currentGame?'<span style="font-size:9px;color:var(--c1);margin-left:2px">'
+({snake:'🐍',pong:'🏓',vier:'🔴',battle:'🚢',kniffel:'🎲',pacman:'👾'}[f.currentGame]||'🎮')
+'</span>':'')
+'<div class="dot '+(f.online?'dot-on':'dot-away')+'"></div>'
+'</div>';
}).join('')||'<div style="padding:6px 8px;font-size:11px;color:var(--muted)">Freunde hinzufügen →</div>';
list.querySelectorAll('[data-dm-open]').forEach(el=>{
el.addEventListener('click',()=>{
const uid=el.dataset.dmOpen,name=el.dataset.dmName;
unreadCounts[uid]=0;
openDM(uid,name);
});
});
}

function renderFriendRequests(){
// Show in sidebar
const sec=document.getElementById('friend-requests-section');
if(!sec)return;
if(!pendingRequests.length){sec.style.display='none';return;}
sec.style.display='block';
sec.innerHTML=
'<div style="font-size:9px;font-weight:700;color:var(--c3);letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">'
+pendingRequests.length+' Anfrage'+(pendingRequests.length>1?'n':'')+'</div>'
+pendingRequests.map((r,i)=>
'<div style="background:rgba(255,64,129,.08);border:1px solid rgba(255,64,129,.25);border-radius:8px;padding:7px 8px;margin-bottom:5px">'
+'<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:5px">👋 '+r.name+'</div>'
+'<div style="display:flex;gap:5px">'
+'<button data-accept="'+r.uid+'" style="flex:1;padding:4px;background:var(--c4);color:#000;border:none;border-radius:5px;font-size:11px;font-weight:800;cursor:pointer;font-family:inherit">✓ Annehmen</button>'
+'<button data-decline="'+r.uid+'" style="padding:4px 8px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:5px;font-size:11px;cursor:pointer;font-family:inherit">✗ Ablehnen</button>'
+'</div></div>'
).join('');
// Wire buttons
sec.querySelectorAll('[data-accept]').forEach(btn=>btn.addEventListener('click',()=>acceptFriendRequest(btn.dataset.accept)));
sec.querySelectorAll('[data-decline]').forEach(btn=>btn.addEventListener('click',()=>declineFriendRequest(btn.dataset.decline)));
}

async function openDM(uid,name){
activeDmUid=uid;
nav('chat',document.querySelectorAll('.nav-item')[2]);
const nameEl=document.getElementById('chat-with-name');
const statusEl=document.getElementById('chat-with-status');
const invBtn=document.getElementById('chat-invite-btn');
// Set avatar in chat header
const chatAv=document.getElementById('chat-with-av');
if(chatAv){const f2=friendsList.find(x=>x.uid===uid);chatAv.textContent=f2?.avatar||name.slice(0,2).toUpperCase();chatAv.style.fontSize=f2?.avatar?'18px':'10px';}
const inp=document.getElementById('cinput');
const sendBtn=document.getElementById('chat-send-btn');
if(nameEl)nameEl.textContent=name;
const f=friendsList.find(f=>f.uid===uid);
if(statusEl)statusEl.textContent=f?.online?t('friend.status.online'):'';
if(invBtn){invBtn.style.display='';invBtn.onclick=()=>sendGameInvite(uid);}
if(inp){inp.disabled=false;inp.placeholder='Nachricht an '+name+'...';}
if(sendBtn)sendBtn.disabled=false;
renderDMList();
// Load history from server
if(fbUser&&(!dmHistories[uid]||dmHistories[uid].length===0)){
try{
const res=await apiCall('dm/'+uid,'GET');
if(res&&Array.isArray(res.messages)){
dmHistories[uid]=res.messages.map(m=>({
from:m.fromName,text:m.text,ts:m.ts,own:m.fromUid===fbUser.uid
}));
}
}catch(e){}
}
renderDMMessages(uid);
// Clear unread badge
const badge=document.getElementById('dm-badge-'+uid);
if(badge)badge.remove();
// Wire send
if(inp)inp.onkeydown=(ev)=>{if(ev.key==='Enter')sendMsg();};
if(sendBtn)sendBtn.onclick=sendMsg;
}

function renderDMMessages(uid){
const msgs=document.getElementById('msgs');
if(!msgs)return;
const hist=dmHistories[uid]||[];
if(!hist.length){
msgs.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--muted);font-size:12px">'+t('chat.dm.empty')+'</div>';
return;
}
msgs.innerHTML=hist.map(m=>{
const t=new Date(m.ts).toTimeString().slice(0,5);
const ini=(m.from||'Du').slice(0,2).toUpperCase();
return m.own
?`<div class="msg own"><div class="av av-c" id="my-lb-av" style="width:24px;height:24px;font-size:${currentUser?.avatar?'15px':'9px'}">${currentUser?.avatar||fbUser?.name?.slice(0,2).toUpperCase()||'Du'}</div><div class="msg-body"><div class="msg-meta"><span class="msg-name">Du</span><span class="msg-time">${t}</span></div><div class="msg-text">${m.text}</div></div></div>`
:`<div class="msg"><div class="av av-c" style="width:24px;height:24px;font-size:${(friendsList.find(x=>x.uid===activeDmUid)?.avatar)?'15px':'9px'}">${friendsList.find(x=>x.uid===activeDmUid)?.avatar||ini}</div><div class="msg-body"><div class="msg-meta"><span class="msg-name">${m.from}</span><span class="msg-time">${t}</span></div><div class="msg-text">${m.text}</div></div></div>`;
}).join('');
msgs.scrollTop=msgs.scrollHeight;
}

function saveDMsLocal(){
try{localStorage.setItem('gh_dms',JSON.stringify(dmHistories));}catch(e){}
}
function loadDMsLocal(){
try{const d=localStorage.getItem('gh_dms');if(d)dmHistories=JSON.parse(d);}catch(e){}
}

function sendMsg(){
const inp=document.getElementById('cinput');
const txt=(inp?.value||'').trim();
if(!txt||!activeDmUid)return;
if(!dmHistories[activeDmUid])dmHistories[activeDmUid]=[];
dmHistories[activeDmUid].push({from:fbUser?.name||'Du',text:txt,ts:Date.now(),own:true});
inp.value='';
renderDMMessages(activeDmUid);
saveDMsLocal();
sndPlace();
if(socialWs&&socialWs.readyState===1)
socialWs.send(JSON.stringify({type:'dm',toUid:activeDmUid,text:txt}));
}

function renderSearchResults(results){
const el=document.getElementById('search-results');
if(!el)return;
if(!results.length){el.innerHTML='<div style="padding:4px 8px;font-size:11px;color:var(--muted)">Niemanden gefunden</div>';return;}
el.innerHTML=results.map(u=>{
const isFriend=friendsList.find(f=>f.uid===u.uid);
const isPending=(pendingRequests||[]).find(r=>r.uid===u.uid)||(u.pending);
return `<div class="room-item" style="justify-content:space-between;gap:4px">
<div style="display:flex;align-items:center;gap:6px;min-width:0;flex:1">
<div class="av av-c" style="width:20px;height:20px;font-size:${u.avatar?'13px':'8px'};flex-shrink:0">${u.avatar||u.name.slice(0,2).toUpperCase()}</div>
<span style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.name}</span>
<div class="dot ${u.online?'dot-on':'dot-away'}" style="flex-shrink:0"></div>
</div>
${isFriend?'<span style="font-size:10px;color:var(--c4);flex-shrink:0">✓ Freund</span>':
isPending?'<span style="font-size:10px;color:var(--muted);flex-shrink:0">⏳</span>':
`<button data-add-friend="${u.uid}" onclick="sendFriendRequest('${u.uid}','${u.name}')" style="padding:3px 8px;background:var(--c1);color:#000;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;font-family:inherit;flex-shrink:0">+ Freund</button>`}
</div>`;
}).join('');
}

async function sendFriendRequest(uid,name){
if(!fbUser){showToast(t('auth.need.login'));return;}
// HTTP + WS
const res=await apiCall('friends/request','POST',{toUid:uid});
if(res&&!res.error){
showToast(t('friend.request.sent')+name+t('friend.request.sent2'));
// Also via WS if connected
if(socialWs&&socialWs.readyState===1)
socialWs.send(JSON.stringify({type:'friend_request',toUid:uid}));
// Update UI - mark as pending
document.querySelectorAll('[data-add-friend="'+uid+'"]').forEach(btn=>{
btn.textContent='⏳ Ausstehend';btn.disabled=true;
});
} else {
showToast(res?.error||t('error.send'));
}
}

async function acceptFriendRequest(uid){
const req=pendingRequests.find(r=>r.uid===uid);
pendingRequests=pendingRequests.filter(r=>r.uid!==uid);
if(req&&!friendsList.find(f=>f.uid===uid))
friendsList.push({uid,name:req.name,online:false});
renderFriendRequests();
renderFriendsSidebar();
renderDMList();
showToast('🎉 '+(req?.name||t('lobby.players'))+' '+t('friend.now.friend'));
try{
await apiCall('friends/accept','POST',{fromUid:uid});
if(socialWs&&socialWs.readyState===1)
socialWs.send(JSON.stringify({type:'friend_accept',fromUid:uid}));
}catch(e){}
}

async function declineFriendRequest(uid){
pendingRequests=pendingRequests.filter(r=>r.uid!==uid);
renderFriendRequests();
showToast(currentLang==='en'?'Request declined':'Anfrage abgelehnt');
try{
if(socialWs&&socialWs.readyState===1)
socialWs.send(JSON.stringify({type:'friend_decline',fromUid:uid}));
}catch(e){}
}

function sendGameInvite(toUid){
if(!fbUser){showToast(t('auth.need.login'));return;}
const friend=friendsList.find(f=>f.uid===toUid);
const friendName=friend?.name||'Freund';

// Show game picker
const old=document.getElementById('invite-modal');
if(old)old.remove();
const modal=document.createElement('div');
modal.id='invite-modal';
modal.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center';
const games=[
{id:'snake',icon:'🐍',name:'Snake'},
{id:'pong',icon:'🏓',name:'Pong'},
{id:'vier',icon:'🔴',name:t('game.vier')},
{id:'battle',icon:'🚢',name:t('game.battle')},
];
modal.innerHTML=`
<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:340px">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
<span style="font-size:15px;font-weight:800;color:var(--text)">🎮 ${friendName} einladen</span>
<button id="inv-close" style="background:transparent;border:none;color:var(--muted);font-size:24px;cursor:pointer;line-height:1">×</button>
</div>
<div style="font-size:12px;color:var(--muted);margin-bottom:12px">Spiel auswählen:</div>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="inv-games">
${games.map(g=>`
<button data-game="${g.id}" style="padding:14px 10px;background:var(--bg3);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;font-family:inherit;transition:all .15s;text-align:center">
<div style="font-size:24px;margin-bottom:4px">${g.icon}</div>
<div style="font-size:12px;font-weight:700;color:var(--text)">${g.name}</div>
</button>`).join('')}
</div>
<div id="inv-ctrl" style="display:none;margin-top:12px"></div>
<button id="inv-start" style="display:none;width:100%;margin-top:12px;padding:11px;background:var(--c1);color:#000;border:none;border-radius:9px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit">▶ Einladen & Starten</button>
<div id="inv-status" style="margin-top:12px;font-size:12px;color:var(--muted);text-align:center;display:none"></div>
</div>`;
document.body.appendChild(modal);
modal.querySelector('#inv-close').addEventListener('click',()=>modal.remove());
modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});

// Hover effect
modal.querySelectorAll('[data-game]').forEach(btn=>{
btn.addEventListener('mouseenter',()=>{if(!btn.classList.contains('sel')){btn.style.borderColor='var(--c1)';btn.style.background='rgba(0,245,255,.05)';}});
btn.addEventListener('mouseleave',()=>{if(!btn.classList.contains('sel')){btn.style.borderColor='var(--border)';btn.style.background='var(--bg3)';}});
btn.addEventListener('click',()=>{
modal.querySelectorAll('[data-game]').forEach(b=>{b.classList.remove('sel');b.style.borderColor='var(--border)';b.style.background='var(--bg3)';});
btn.classList.add('sel');btn.style.borderColor='var(--c1)';btn.style.background='rgba(0,245,255,.08)';
// Show ctrl picker
const gameCtrls={snake:['Pfeiltasten','WASD'],pong:['Maus','W/S Tasten','Pfeiltasten'],vier:[],battle:[],kniffel:[]}[btn.dataset.game]||[];
const ctrlDiv=modal.querySelector('#inv-ctrl');
if(gameCtrls.length){
ctrlDiv.style.display='block';
ctrlDiv.innerHTML='<div style="font-size:11px;color:var(--muted);margin-bottom:6px">'+t('lobby.ctrl.hint')+'</div><div style="display:flex;gap:6px;flex-wrap:wrap" id="ctrl-btns">'
+gameCtrls.map((c,i)=>'<button data-ctrl="'+c+'" style="padding:5px 12px;border-radius:7px;border:1.5px solid '+(i===0?'var(--c1)':'var(--border)')+';background:'+(i===0?'rgba(0,245,255,.08)':'var(--bg3)')+';color:'+(i===0?'var(--c1)':'var(--muted)')+';cursor:pointer;font-family:inherit;font-size:12px">'+c+'</button>').join('')+'</div>';
ctrlDiv.querySelectorAll('[data-ctrl]').forEach(cb=>{
cb.addEventListener('click',()=>{
ctrlDiv.querySelectorAll('[data-ctrl]').forEach(x=>{x.style.borderColor='var(--border)';x.style.background='var(--bg3)';x.style.color='var(--muted)';});
cb.style.borderColor='var(--c1)';cb.style.background='rgba(0,245,255,.08)';cb.style.color='var(--c1)';
});
});
} else {
ctrlDiv.style.display='none';
}
modal.querySelector('#inv-start').style.display='block';
});
});

modal.querySelector('#inv-start').addEventListener('click',async()=>{
const gameBtn=modal.querySelector('[data-game].sel');
if(!gameBtn)return;
const gameId=gameBtn.dataset.game;
const ctrlBtn=modal.querySelector('[data-ctrl][style*="var(--c1)"]');
const ctrl=ctrlBtn?ctrlBtn.dataset.ctrl:'Maus';
const status=modal.querySelector('#inv-status');
status.style.display='block';status.textContent=t('lobby.creating');
modal.querySelector('#inv-start').disabled=true;

const res=await apiCall('rooms/create','POST',{game:gameId});
if(!res||res.error){status.textContent=t('error.generic')+': '+(res?.error||'?');return;}
const roomId=res.roomId;

if(socialWs&&socialWs.readyState===1){
  socialWs.send(JSON.stringify({type:'game_invite',toUid,game:gameId,roomId}));
  showToast('🎮 Einladung gesendet!');
} else {
  showToast('❌ Nicht verbunden. Bitte Seite neu laden.');
}

status.innerHTML='✅ '+t('lobby.created').split('!')[0]+'! '+t('lobby.code')+': <b style="color:var(--c1);letter-spacing:2px">'+roomId+'</b><br><span style="font-size:10px;color:var(--muted)">Warte auf '+friendName+'...</span>';

let pollTimer=setInterval(async()=>{
const room=await apiCall('rooms/'+roomId,'GET');
if(!room||room.error)return;
if(room.guest&&room.state==='playing'){
clearInterval(pollTimer);modal.remove();
startGame(gameId,{
diff:'medium',ctrl,mode:'Online',
onlineRole:'host',onlineRoomId:roomId,
opponentName:room.guest.name||friendName,
players:[{name:fbUser.name,type:'human',color:0,ctrl},{name:room.guest.name||friendName,type:'online',color:1}],
isOnline:true,isHost:true
});
}
},2000);

const cancelBtn=document.createElement('button');
cancelBtn.textContent='Abbrechen';
cancelBtn.style.cssText='margin-top:10px;padding:6px 16px;background:transparent;border:1px solid var(--border);border-radius:7px;color:var(--muted);cursor:pointer;font-family:inherit;font-size:12px;width:100%';
cancelBtn.addEventListener('click',()=>{clearInterval(pollTimer);modal.remove();});
status.appendChild(document.createElement('br'));
status.appendChild(cancelBtn);
});
}

function showGameInvite(fromUid,fromName,game,roomId){
const gameNames={snake:'🐍 Snake',pong:'🏓 Pong',vier:'🔴 4 Gewinnt',battle:'🚢 Schiffe versenken'};
// Remove old invite if exists
document.getElementById('game-invite-banner')?.remove();
const t=document.createElement('div');
t.id='game-invite-banner';
t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d0d18;border:2px solid var(--c1);color:#fff;padding:16px 22px;border-radius:14px;font-size:14px;z-index:99999;display:flex;gap:10px;align-items:center;box-shadow:0 0 30px rgba(0,245,255,.4);animation:fadeUp .3s ease;min-width:300px;';
t.innerHTML='<span>🎮 <b>'+fromName+'</b> lädt ein: '+( gameNames[game]||game)+'</span>';

const ctrls={snake:['Pfeiltasten','WASD'],pong:['Maus','W/S Tasten','Pfeiltasten'],vier:[],battle:[],kniffel:[]};
const gameCtrls=ctrls[game]||[];
let guestCtrl=gameCtrls[0]||'Maus';

// Ctrl picker for guest
if(gameCtrls.length){
const ctrlPicker=document.createElement('div');
ctrlPicker.style.cssText='display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px';
ctrlPicker.innerHTML='<span style="font-size:11px;color:var(--muted);width:100%;margin-bottom:2px">'+t('lobby.ctrl.hint')+'</span>'
+gameCtrls.map(c=>'<button data-c="'+c+'" style="padding:4px 10px;border-radius:6px;border:1.5px solid '+(c===guestCtrl?'var(--c1)':'var(--border)')+';background:'+(c===guestCtrl?'rgba(0,245,255,.08)':'transparent')+';color:'+(c===guestCtrl?'var(--c1)':'var(--muted)')+';cursor:pointer;font-family:inherit;font-size:11px">'+c+'</button>').join('');
ctrlPicker.querySelectorAll('[data-c]').forEach(b=>{
b.addEventListener('click',()=>{
guestCtrl=b.dataset.c;
ctrlPicker.querySelectorAll('[data-c]').forEach(x=>{
x.style.borderColor=x.dataset.c===guestCtrl?'var(--c1)':'var(--border)';
x.style.color=x.dataset.c===guestCtrl?'var(--c1)':'var(--muted)';
x.style.background=x.dataset.c===guestCtrl?'rgba(0,245,255,.08)':'transparent';
});
});
});
t.insertBefore(ctrlPicker,t.querySelector('button'));
}

const acceptBtn=document.createElement('button');
acceptBtn.textContent=t('lobby.join.btn');
acceptBtn.style.cssText='padding:6px 14px;background:var(--c1);color:#000;border:none;border-radius:6px;font-weight:800;cursor:pointer;font-family:inherit;font-size:13px';
acceptBtn.addEventListener('click',async()=>{
t.remove();
const joinRes=await apiCall('rooms/'+roomId+'/join','POST',{});
if(joinRes&&!joinRes.error){
startGame(game,{
diff:'medium',ctrl:guestCtrl,mode:'Online',
onlineRole:'guest',onlineRoomId:roomId,
opponentName:fromName,
players:[{name:fromName,type:'online',color:1},{name:fbUser?.name||'Du',type:'human',color:0}],
isOnline:true,isHost:false
});
} else {
showToast(t('error.generic')+': '+(joinRes?.error||t('error.room.unavailable')));
}
});

const declineBtn=document.createElement('button');
declineBtn.textContent='×';
declineBtn.style.cssText='padding:5px 10px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;cursor:pointer;font-family:inherit';
declineBtn.addEventListener('click',()=>t.remove());

t.appendChild(acceptBtn);
t.appendChild(declineBtn);
document.body.appendChild(t);
setTimeout(()=>t.remove(),20000);
}

// Wire search input
document.addEventListener('DOMContentLoaded',()=>{
const si=document.getElementById('search-input');
if(si){
let searchTimer=null;
si.addEventListener('input',()=>{
clearTimeout(searchTimer);
const q=si.value.trim();
if(q.length<2){document.getElementById('search-results').innerHTML='';return;}
searchTimer=setTimeout(async()=>{
// Use HTTP for search (works without WS)
if(!fbUser){showToast(t('auth.need.login'));return;}
const res=await apiCall('users/search?q='+encodeURIComponent(q),'GET');
if(res&&res.results)renderSearchResults(res.results);
},300);
});
}
// Wire friend requests display in chat
renderFriendRequests();
});

// ════════════════════════════════════════════════
// INGAME CHAT
// ════════════════════════════════════════════════
function toggleIgChat(){document.getElementById('igchat').classList.toggle('show');}

function igChatAddMsg(from,txt,own){
const msgs=document.getElementById('igmsgs');
if(!msgs)return;
msgs.insertAdjacentHTML('beforeend',`<div class="igm ${own?'you':'them'}"><b>${from}:</b> ${txt}</div>`);
msgs.scrollTop=msgs.scrollHeight;
}

function sendIgMsg(){
const inp=document.getElementById('igcinput'),txt=inp.value.trim();
if(!txt)return;
inp.value='';
const myName=currentUser?.name||fbUser?.name||'Du';
igChatAddMsg(myName,txt,true);
// Send via socialWs if online game
if(lastGameOpts?.isOnline&&socialWs&&socialWs.readyState===1){
socialWs.send(JSON.stringify({type:'igchat',roomId:lastGameOpts.onlineRoomId||'',from:myName,uid:fbUser?.uid||'',text:txt}));
}
}

// ════════════════════════════════════════════════
// LOBBY
// ════════════════════════════════════════════════
let lobbyGame='snake',lobbyIcon='🐍';
function toggleCreatePanel(){const p=document.getElementById('create-panel');p.classList.toggle('show');}
