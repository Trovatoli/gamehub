function initPong(opts){
const C=document.getElementById('gc');
// Fill the container
const area=document.getElementById('canvas-area');
const W=area?Math.max(area.clientWidth,400):740;
const H=area?Math.max(area.clientHeight,300):500;
C.width=W; C.height=H;
const ctx=C.getContext('2d');

// ── constants ──────────────────────────────
const PW=14, PH=Math.round(H*0.18), WIN=10;
const BALL_SPD = {easy:7, medium:10, hard:14}[opts.diff||'medium'] || 10;
const AI_SPD   = {easy:4, medium:6, hard:9}[opts.diff||'medium'] || 6;
const isKeys   = opts.ctrl==='W/S Tasten'||opts.ctrl==='Pfeiltasten'||opts.ctrl==='Arrow Keys';
const p2ctrl   = opts.p2ctrl||opts.players?.[1]?.ctrl||'';
const p2IsKeys = p2ctrl==='W/S Tasten'||p2ctrl==='Pfeiltasten'||p2ctrl==='Arrow Keys';

const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.type==='human'?(opts.players?.[1]?.name||'Spieler 2'):'KI');
document.getElementById('s2lbl').textContent=p2name;
if(opts.isSpectator){
document.getElementById('g-status').textContent='👁 Zuschauer-Modus';
} else {
document.getElementById('g-status').textContent=(isKeys?t('pong.ctrl.keys'):t('pong.ctrl.mouse'))+t('pong.status.local')+WIN+t('points.suffix');
}

// ── mutable state ──────────────────────────
let p1y = H/2 - PH/2;   // player paddle y
let p2y = H/2 - PH/2;   // AI paddle y
let bx  = W/2, by=H/2;  // ball pos
let bvx = 0,   bvy = 0; // ball velocity (0 = not in play)
let s1=0, s2=0;          // scores
let wait=60;
let nextBallDir=-1;      // direction for next serve
let over=false;
const keys={};

// ── helpers ────────────────────────────────
function launchBall(dir){
bvx = dir * BALL_SPD;
bvy = (Math.random()>0.5 ? 1 : -1) * BALL_SPD * 0.65;
}

function point(playerScored){
// Reset ball to center, start countdown
bx=W/2; by=H/2; bvx=0; bvy=0;
if(playerScored){
s1++;
document.getElementById('s1').textContent=s1;
sndScore();
if(opts.isOnline&&s1>=10&&currentGame._rematch){
over=true;paused=true;
document.getElementById('g-status').textContent=t('pong.you.win');
currentGame._rematch.show(true);
}
nextBallDir=-1; // toward AI after player scores
if(s1>=WIN){over=true; document.getElementById('g-status').textContent='🏆 '+(opts.players?.[0]?.name||'P1')+' '+t('game.win')+' '+s1+':'+s2; sndWin(); fbSaveScore('pong',s1*100); return;}
} else {
s2++;
document.getElementById('s2').textContent=s2;
sndFail();
if(opts.isOnline&&s2>=10&&currentGame._rematch){
over=true;paused=true;
document.getElementById('g-status').textContent=t('pong.opp.win');
currentGame._rematch.show(false);
}
nextBallDir=1; // toward player after AI scores
if(s2>=WIN){over=true; document.getElementById('g-status').textContent=p2name+t('vier.win.msg')+' '+s2+':'+s1; sndFail(); if(opts.isOnline)showLocalRematch(''); return;}
}
wait=55;
}

// ── draw ───────────────────────────────────
function draw(){
ctx.fillStyle='#05050f';
ctx.fillRect(0,0,W,H);

// center line
ctx.setLineDash([8,8]);
ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1;
ctx.beginPath(); ctx.moveTo(W/2,0); ctx.lineTo(W/2,H); ctx.stroke();
ctx.setLineDash([]);

// scores
ctx.font='bold 44px monospace'; ctx.textAlign='center';
ctx.fillStyle='rgba(0,245,255,.3)'; ctx.fillText(s1, W/4, 55);
ctx.fillStyle='rgba(255,68,255,.3)'; ctx.fillText(s2, W*3/4, 55);
ctx.font='10px monospace'; ctx.fillStyle='rgba(255,255,255,.2)';
ctx.fillText('bis '+WIN, W/2, H-7);
ctx.textAlign='left';

// player paddle (cyan, left)
ctx.shadowColor='#00f5ff'; ctx.shadowBlur=14;
ctx.fillStyle='#00f5ff';
ctx.fillRect(10, p1y, PW, PH);

// AI paddle (pink, right)
ctx.shadowColor='#ff44ff';
ctx.fillStyle='#ff44ff';
ctx.fillRect(W-10-PW, p2y, PW, PH);
ctx.shadowBlur=0;

// paddle labels
ctx.font='bold 9px sans-serif'; ctx.textAlign='center';
ctx.fillStyle='rgba(0,245,255,.7)';
ctx.fillText('DU', 10+PW/2, p1y-4);
ctx.fillStyle='rgba(255,68,255,.7)';
ctx.fillText('KI', W-10-PW/2, p2y-4);
ctx.textAlign='left';

// ball (only when in play)
if(bvx!==0 || bvy!==0){
ctx.shadowColor='#fff'; ctx.shadowBlur=16;
ctx.fillStyle='#fff';
ctx.beginPath(); ctx.arc(bx,by,7,0,Math.PI*2); ctx.fill();
ctx.shadowBlur=0;
} else if(!over){
// blinking dot during wait
if(Math.floor(wait/8)%2===0){
ctx.fillStyle='rgba(255,255,255,.3)';
ctx.beginPath(); ctx.arc(W/2,H/2,6,0,Math.PI*2); ctx.fill();
}
}

// game over overlay
if(over){
ctx.fillStyle='rgba(0,0,0,.78)'; ctx.fillRect(0,0,W,H);
ctx.fillStyle = s1>=WIN ? '#00f5ff' : '#ff44ff';
ctx.font='bold 26px monospace'; ctx.textAlign='center';
ctx.fillText(s1>=WIN?'DU GEWINNST!':'KI GEWINNT!', W/2, H/2-12);
ctx.fillStyle='#bbb'; ctx.font='14px monospace';
ctx.fillText(s1+' : '+s2, W/2, H/2+14);
ctx.fillText('↺  Neustart drücken', W/2, H/2+40);
ctx.textAlign='left';
}
}

// ── game loop ──────────────────────────────
currentGame._rafActive=true;
let _lastFrame=0;
const _gameLoop=(ts)=>{
if(!currentGame||!currentGame._rafActive)return;
requestAnimationFrame(_gameLoop);
const dt=ts-_lastFrame;
if(dt<14)return; // cap at ~70fps max
_lastFrame=ts;
{
if(paused || over){ draw(); return; }

// ── move player paddle ──
// Player 1 movement
if(isKeys){
const useArrows=opts.ctrl==='Pfeiltasten'||opts.ctrl==='Arrow Keys';
const up=useArrows?keys['ArrowUp']:(keys['w']||keys['W']);
const dn=useArrows?keys['ArrowDown']:(keys['s']||keys['S']);
if(opts.isOnline && !opts.isHost){
if(up) p2y = Math.max(0, p2y-9);
if(dn) p2y = Math.min(H-PH, p2y+9);
} else {
if(up) p1y = Math.max(0, p1y-9);
if(dn) p1y = Math.min(H-PH, p1y+9);
}
}
// Player 2 local human movement
if(!opts.isOnline && opts.players?.[1]?.type==='human' && p2IsKeys){
const p2A=p2ctrl==='Pfeiltasten'||p2ctrl==='Arrow Keys';
const up2=p2A?keys['ArrowUp']:(keys['w']||keys['W']);
const dn2=p2A?keys['ArrowDown']:(keys['s']||keys['S']);
if(up2) p2y = Math.max(0, p2y-9);
if(dn2) p2y = Math.min(H-PH, p2y+9);
}

// ── move AI paddle ──
if(!opts.isOnline&&opts.players?.[1]?.type!=='human'){const aiMid=p2y+PH/2;if(aiMid<by-5)p2y=Math.min(H-PH,p2y+AI_SPD);else if(aiMid>by+5)p2y=Math.max(0,p2y-AI_SPD);}

// ── wait countdown ──
if(wait>0){
wait--;
if(wait===0) launchBall(nextBallDir);
draw(); return;
}

// ── move ball - both run local physics for smooth gameplay
if(true){
bx += bvx;
by += bvy;

// top / bottom wall
if(by < 7)   { by=7;   bvy= Math.abs(bvy); sndHit(); }
if(by > H-7) { by=H-7; bvy=-Math.abs(bvy); sndHit(); }

// speed cap
const sp = Math.sqrt(bvx*bvx+bvy*bvy);
if(sp>35){ bvx=bvx/sp*35; bvy=bvy/sp*35; }

// player paddle hit (left side)
if(bvx<0 && bx<=10+PW+7 && bx>=5 && by>=p1y-5 && by<=p1y+PH+5){
bvx = Math.abs(bvx) * 1.08;
bvy += (by - (p1y+PH/2)) * 0.07;
bx = 10+PW+8; // push out of paddle
sndHit();
}

// AI paddle hit (right side)
if(bvx>0 && bx>=W-10-PW-7 && bx<=W-5 && by>=p2y-5 && by<=p2y+PH+5){
bvx = -Math.abs(bvx) * 1.08;
bvy += (by - (p2y+PH/2)) * 0.07;
bx = W-10-PW-8; // push out of paddle
sndHit();
}

// ── scoring ──
if(bx < 0)  { point(false); } // AI scores
if(bx > W)  { point(true);  } // player scores
} // end host-only ball physics

draw();
}
};
requestAnimationFrame(_gameLoop);
// ── input ──────────────────────────────────
function onMouse(e){
if(isKeys) return;
const r = C.getBoundingClientRect();
const scaleY = H / r.height;
const py = Math.max(0, Math.min(H-PH, (e.clientY - r.top) * scaleY - PH/2));
if(opts.isOnline && !opts.isHost) p2y = py;
else p1y = py;
}
C.addEventListener('mousemove', onMouse);

function onKeyDown(e){
if(e.key==='p'||e.key==='P'){ togglePause(); return; }
// Player 1
const useArrows=opts.ctrl==='Pfeiltasten'||opts.ctrl==='Arrow Keys';
const useWS=opts.ctrl==='W/S Tasten';
if(useArrows&&(e.key==='ArrowUp'||e.key==='ArrowDown')){keys[e.key]=true;e.preventDefault();}
else if(useWS&&(e.key==='w'||e.key==='W'||e.key==='s'||e.key==='S')){keys[e.key]=true;e.preventDefault();}
// Player 2 local (only if human p2 and not online)
if(!opts.isOnline&&opts.players?.[1]?.type==='human'){
const p2A=p2ctrl==='Pfeiltasten'||p2ctrl==='Arrow Keys';
const p2WS=p2ctrl==='W/S Tasten';
if(p2A&&(e.key==='ArrowUp'||e.key==='ArrowDown')){keys[e.key]=true;e.preventDefault();}
else if(p2WS&&(e.key==='w'||e.key==='W'||e.key==='s'||e.key==='S')){keys[e.key]=true;e.preventDefault();}
}
}
function onKeyUp(e){
keys[e.key]=false;
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup',   onKeyUp);

currentGame._cleanup = ()=>{
document.removeEventListener('keydown', onKeyDown);
document.removeEventListener('keyup',   onKeyUp);
C.removeEventListener('mousemove', onMouse);
if(currentGame._ws)try{currentGame._ws.close();}catch(e){}
};

// ── Online multiplayer sync ───────────────────
if(opts.isOnline && opts.onlineRoomId){
if(opts.isSpectator){
const proto=location.protocol==='https:'?'wss:':'ws:';
const wsSpec=new WebSocket(proto+'//'+location.host);
let _targetBx=bx,_targetBy=by,_targetP1y=p1y,_targetP2y=p2y;
wsSpec.onopen=()=>wsSpec.send(JSON.stringify({type:'join',roomId:opts.onlineRoomId,role:'spectator',name:'Zuschauer'}));
wsSpec.onmessage=(ev)=>{
try{
const msg=JSON.parse(ev.data);
if(msg.type==='sync'||msg.type==='spectating'){
if(msg.bx!==undefined){
const newBx=msg.bx*W,newBy=msg.by*H;
// Snap if too far, else lerp target
if(Math.abs(bx-newBx)>W*0.15||Math.abs(by-newBy)>H*0.15){
bx=newBx;by=newBy; // snap
} else {
_targetBx=newBx;_targetBy=newBy; // smooth lerp
}
bvx=msg.bvx*W;bvy=msg.bvy*H;
}
if(msg.p1y!==undefined)_targetP1y=msg.p1y*H;
// Don't update own paddle from server (use local)
if(msg.p2y!==undefined)_targetP2y=msg.p2y*H;
if(msg.s1!==undefined){s1=msg.s1;s2=msg.s2;
document.getElementById('s1').textContent=s1;
document.getElementById('s2').textContent=s2;}
}
if(msg.type==='opponent_left'){
over=true;paused=true;sndWin();
document.getElementById('g-status').textContent=t('opp.won.quit');
showLocalRematch('');
}
}catch(ex){}
};
currentGame._ws=wsSpec;
// Game loop still runs for drawing - but no input
currentGame._cleanup=()=>{
document.removeEventListener('keydown',onKeyDown);
document.removeEventListener('keyup',onKeyUp);
C.removeEventListener('mousemove',onMouse);
try{wsSpec.close();}catch(ex){}
};
return; // skip normal WS setup below
}
const isHost=opts.isHost;
let ws=null;
let wsReady=false;

function connectWS(){
const proto=location.protocol==='https:'?'wss:':'ws:';
const wsUrl=proto+'//'+location.host;
ws=new window.WebSocket(wsUrl);

ws.onopen=()=>{
ws.send(JSON.stringify({type:'join',roomId:opts.onlineRoomId,role:isHost?'host':'guest',name:currentUser?.name||'Spieler'}));
};

ws.onmessage=(e)=>{
const msg=JSON.parse(e.data);

if(msg.type==='waiting'){
paused=true;
document.getElementById('g-status').textContent=t('game.waiting');
}

if(msg.type==='start'){
wsReady=true;
paused=false;
document.getElementById('g-status').textContent=isHost?t('pong.left'):t('pong.right');
}

if(msg.type==='sync'&&!isHost){
// Guest: use server as correction only (client predicts locally)
if(msg.bx!==undefined){
const sBx=msg.bx*W,sBy=msg.by*H;
const dist=Math.sqrt((bx-sBx)**2+(by-sBy)**2);
if(dist>W*0.06){bx=sBx;by=sBy;} // snap only if far off
bvx=msg.bvx*W;bvy=msg.bvy*H; // always update velocity
}
if(msg.p1y!==undefined){
const tp1=msg.p1y*H;
p1y=p1y*0.6+tp1*0.4; // smooth opponent paddle
}
if(msg.s1!==undefined&&(msg.s1!==s1||msg.s2!==s2)){
s1=msg.s1;s2=msg.s2;
document.getElementById('s1').textContent=s1;
document.getElementById('s2').textContent=s2;
}
if(msg.over){
over=true;paused=true;
const won=msg.guestWon;
document.getElementById('g-status').textContent=won?t('pong.you.win'):t('pong.opp.win');
if(won)fbSaveScore('pong',s2*100);
if(currentGame._rematch)currentGame._rematch.show(won);
}
}

if(msg.type==='paddle'&&isHost){
// Smooth guest paddle
const targetP2y=Math.max(0,Math.min(H-PH,msg.p2y*H));
p2y=p2y*0.5+targetP2y*0.5;
}

if(msg.type==='bounce'&&isHost){
// Guest detected collision - apply it on host too
bx=msg.bx*W; by=msg.by*H;
bvx=msg.bvx*W; bvy=msg.bvy*H;
// Smooth guest paddle
const targetP2y=Math.max(0,Math.min(H-PH,msg.p2y*H));
p2y=p2y*0.5+targetP2y*0.5;
sndHit();
}

if(msg.type==='rematch_request'){
// Show that opponent wants rematch
const btn=document.getElementById('rematch-btn');
const status=document.getElementById('rematch-status');
if(status)status.textContent=t('game.opp.rematch');
}

if(msg.type==='rematch_go'){
const ov=document.getElementById('rematch-overlay');
if(ov)ov.remove();
setTimeout(()=>startGame(lastGameType,lastGameOpts),300);
}

if(msg.type==='opponent_left'){
showToast(t('opp.quit'));
over=true;paused=true;
}
};

ws.onerror=(e)=>console.error('WS error:',e);
ws.onclose=()=>{
if(!over)showToast(t('conn.interrupted'));
};
}

connectWS();
paused=true; // wait for opponent

// Host sends game state at 30fps via WebSocket
if(isHost){
_safeInterval(()=>{
if(!wsReady||!ws||ws.readyState!==1)return;
// Send normalized 0-1 coordinates so guest can scale to their canvas
ws.send(JSON.stringify({type:'sync',data:{
bx:bx/W, by:by/H,
bvx:bvx/W, bvy:bvy/H,
p1y:p1y/H, s1, s2,
over:over, guestWon:over&&s2>=WIN
}}));
},50); // 20fps corrections
} else {
// Guest sends paddle at 60fps for smooth collision
_safeInterval(()=>{
if(!wsReady||!ws||ws.readyState!==1)return;
ws.send(JSON.stringify({type:'paddle',p2y:p2y/H}));
},16);
}

// Override rematch to use WebSocket
setTimeout(()=>{
if(currentGame._rematch){
const origShow=currentGame._rematch.show;
currentGame._rematch.show=function(won){
origShow(won);
// Override rematch button to use WS
setTimeout(()=>{
const btn=document.getElementById('rematch-btn');
if(btn){
btn.onclick=null;
btn.addEventListener('click',()=>{
btn.disabled=true;btn.textContent=(currentLang==='en'?'Wait...':'Warte...');
if(ws&&ws.readyState===1)ws.send(JSON.stringify({type:'rematch'}));
});
}
},100);
};
}
},500);

// Store ws for cleanup
currentGame._ws=ws;
}}

// ════════════════════════════════════════════════
// 4 GEWINNT
// ════════════════════════════════════════════════
