function initSnake(opts){  const C=document.getElementById('gc');
const {w:_aw,h:_ah}=getCanvasArea();  // Feste Rastergröße für Online-Sync-Kompatibilität
const COLS=opts.isOnline?27:Math.max(20,Math.floor(_aw/Math.max(14,Math.min(Math.floor(_aw/27),Math.floor(_ah/22)))));
const ROWS=opts.isOnline?22:Math.max(15,Math.floor(_ah/Math.max(14,Math.min(Math.floor(_aw/27),Math.floor(_ah/22)))));
const S=Math.min(Math.floor(_aw/COLS),Math.floor(_ah/ROWS));
C.width=COLS*S; C.height=ROWS*S;
const ctx=C.getContext('2d');  const speed={easy:160,medium:110,hard:75}[opts.diff||'medium']||110;

document.getElementById('g-status').textContent=t('snake.ctrl.hint');
const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.type==='human'?(opts.players?.[1]?.name||'Spieler 2'):'KI');
document.getElementById('s2lbl').textContent=p2name;
document.getElementById('s2').textContent='0';

const WALLS=opts.diff==='hard'?[
{x:8,y:5},{x:9,y:5},{x:10,y:5},
{x:14,y:14},{x:15,y:14},{x:16,y:14},
{x:5,y:10},{x:5,y:11},{x:19,y:10},{x:19,y:11}
]:[];

let snake=[{x:6,y:10},{x:5,y:10},{x:4,y:10}];
let dead=false,paused_local=false;
let dir={x:1,y:0},nextDir={x:1,y:0};
const isLocal2P=!opts.isOnline&&opts.players?.[1]?.type==='human';
let snake2=isLocal2P?[
{x:Math.floor(COLS*0.75),y:Math.floor(ROWS*0.5)},
{x:Math.floor(COLS*0.75)+1,y:Math.floor(ROWS*0.5)},
{x:Math.floor(COLS*0.75)+2,y:Math.floor(ROWS*0.5)}
]:null;
let dir2={x:-1,y:0},nextDir2={x:-1,y:0},dead2=false,score2=0;
// KI-Schlange startet auf der gegenüberliegenden Seite
let aiSnake=(isLocal2P||opts.isOnline)?[]:[{x:18,y:10},{x:19,y:10},{x:20,y:10}];
let aiDir={x:-1,y:0};
let food=placeFood();
let score=0,aiScore=0;
// Online: gegnerische Schlange (über WS empfangen)
let oppSnake=[];let oppScore=0;let oppName=opts.opponentName||'Gegner';
let _lastOppSync=0;let _oppDir={x:1,y:0};
// Online-Vorhersage-Variablen (im Funktionsscope, damit onKey zugreifen kann)
let localDir={x:1,y:0};
let localNextDir={x:1,y:0};
let localSnake=[];

function placeFood(){
let f;
let tries=0;
do{
f={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};
tries++;
}while(tries<1000&&(
snake.some(s=>s.x===f.x&&s.y===f.y)||
WALLS.some(w=>w.x===f.x&&w.y===f.y)
));
return f;
}

function moveAI(){
// KI jagt das Futter, weicht Wänden und sich selbst aus
const head=aiSnake[0];
const dx=food.x-head.x, dy=food.y-head.y;
// Bevorzugte Richtung versuchen (Richtung Futter), sonst Alternativen
const preferred=[];
if(Math.abs(dx)>=Math.abs(dy)){
preferred.push({x:dx>0?1:-1,y:0},{x:0,y:dy>0?1:-1});
}else{
preferred.push({x:0,y:dy>0?1:-1},{x:dx>0?1:-1,y:0});
}
// Verbleibende Richtungen als Fallback hinzufügen
[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}].forEach(d=>{
if(!preferred.find(p=>p.x===d.x&&p.y===d.y)) preferred.push(d);
});
for(const d of preferred){
// Keine 180-Grad-Wenden
if(d.x===-aiDir.x&&d.y===-aiDir.y) continue;
const nx=(head.x+d.x+COLS)%COLS, ny=(head.y+d.y+ROWS)%ROWS;
// Sich selbst und Wände vermeiden
if(aiSnake.some(seg=>seg.x===nx&&seg.y===ny)) continue;
if(WALLS.some(w=>w.x===nx&&w.y===ny)) continue;
aiDir=d; break;
}
const newHead={x:(head.x+aiDir.x+COLS)%COLS, y:(head.y+aiDir.y+ROWS)%ROWS};
aiSnake.unshift(newHead);
if(newHead.x===food.x&&newHead.y===food.y){
aiScore++;
document.getElementById('s2').textContent=aiScore;
food=placeFood();
}else{
aiSnake.pop();
}
}

function draw(){
ctx.fillStyle='#05050f';ctx.fillRect(0,0,C.width,C.height);
// Raster
ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;
for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,ROWS*S);ctx.stroke();}
for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(COLS*S,y*S);ctx.stroke();}
// Wände
WALLS.forEach(w=>{
ctx.fillStyle='#2a2a6a';ctx.fillRect(w.x*S+1,w.y*S+1,S-2,S-2);
ctx.strokeStyle='rgba(100,100,200,.5)';ctx.lineWidth=1;ctx.strokeRect(w.x*S+1,w.y*S+1,S-2,S-2);
});
// Futter
ctx.shadowColor='#00ff88';ctx.shadowBlur=14;ctx.fillStyle='#00ff88';
ctx.beginPath();ctx.arc(food.x*S+S/2,food.y*S+S/2,S/2-3,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
// Schlange
snake.forEach((seg,i)=>{
const alpha=i===0?1:Math.max(0.2,1-i/snake.length*0.7);
ctx.shadowBlur=i===0?10:0;ctx.shadowColor='#00f5ff';
ctx.fillStyle=`rgba(0,245,255,${alpha})`;
ctx.fillRect(seg.x*S+1,seg.y*S+1,S-2,S-2);
});
ctx.shadowBlur=0;ctx.globalAlpha=1;
// Schlange von Spieler 2
if(isLocal2P&&snake2){
snake2.forEach((seg,i)=>{
const alpha=i===0?1:Math.max(0.2,1-i/snake2.length*0.7);
ctx.globalAlpha=dead2?0.3:alpha;
ctx.fillStyle=PLAYER_COLORS[1];
ctx.shadowBlur=i===0?12:0;
ctx.shadowColor=PLAYER_COLORS[1];
ctx.fillRect(seg.x*S+1,seg.y*S+1,S-2,S-2);
ctx.shadowBlur=0;ctx.globalAlpha=1;
});
}
// Online-Gegner-Schlange
if(opts.isOnline&&oppSnake.length>0){
oppSnake.forEach((seg,i)=>{
const alpha=i===0?1:Math.max(0.2,1-i/oppSnake.length*0.7);
ctx.globalAlpha=alpha;ctx.fillStyle=PLAYER_COLORS[1];
ctx.shadowBlur=i===0?10:0;ctx.shadowColor=PLAYER_COLORS[1];
ctx.fillRect(seg.x*S+1,seg.y*S+1,S-2,S-2);
ctx.shadowBlur=0;ctx.globalAlpha=1;
});
if(oppSnake.length){
const oh=oppSnake[0];
ctx.fillStyle=PLAYER_COLORS[1];ctx.font='bold 9px monospace';ctx.textAlign='center';
ctx.fillText(oppName,oh.x*S+S/2,oh.y*S+S/2+3);ctx.textAlign='left';
}
}
// KI-Schlange
if(aiSnake.length>0){aiSnake.forEach((seg,i)=>{
const alpha=i===0?1:Math.max(0.15,1-i/aiSnake.length*0.7);
ctx.shadowBlur=i===0?10:0;ctx.shadowColor='#b94fff';
ctx.fillStyle=`rgba(185,79,255,${alpha})`;
ctx.fillRect(seg.x*S+1,seg.y*S+1,S-2,S-2);
ctx.shadowBlur=0;
});}
ctx.shadowBlur=0;
// KI-Beschriftung am Kopf
if(aiSnake.length){
const ah=aiSnake[0];
ctx.fillStyle='rgba(185,79,255,.7)';ctx.font='bold 9px monospace';ctx.textAlign='center';
ctx.fillText('KI',ah.x*S+S/2,ah.y*S+S/2+3);ctx.textAlign='left';
}
// Punktestände
ctx.fillStyle='rgba(0,245,255,.5)';ctx.font='bold 11px monospace';ctx.textAlign='left';
ctx.fillText(t('score.you')+': '+score,6,C.height-6);
ctx.fillStyle='rgba(185,79,255,.5)';ctx.textAlign='right';
ctx.fillText(t('score.ai')+': '+aiScore,C.width-6,C.height-6);ctx.textAlign='left';

}

function onKey(e){
if(opts.isOnline)return;
if(e.key==='p'||e.key==='P'){togglePause();return;}
// IMMER sowohl Pfeiltasten als auch WASD akzeptieren (online werden immer beide akzeptiert)
const arrowMap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
const wasdMap={w:{x:0,y:-1},W:{x:0,y:-1},s:{x:0,y:1},S:{x:0,y:1},a:{x:-1,y:0},A:{x:-1,y:0},d:{x:1,y:0},D:{x:1,y:0}};
const useWASD=opts.ctrl==='WASD';
// Online: immer sowohl WASD als auch Pfeiltasten akzeptieren
const map1=opts.isOnline ? {...arrowMap,...wasdMap} : (useWASD ? wasdMap : arrowMap);
const dir_d=map1[e.key];
if(dir_d){
if(opts.isOnline){
// localNextDir als Referenz für die Rückwärts-Prüfung verwenden
const curDir=localNextDir&&(localNextDir.x!==0||localNextDir.y!==0)?localNextDir:localDir;
if(!(dir_d.x===-curDir.x&&dir_d.y===-curDir.y)){
localNextDir=dir_d;
const ws2=currentGame._ws;
if(ws2&&ws2.readyState===1)
ws2.send(JSON.stringify({type:'snakeDir',dir:dir_d}));
}
e.preventDefault();
} else if(!(dir_d.x===-dir.x&&dir_d.y===-dir.y)){
nextDir=dir_d;
e.preventDefault();
}
}
// Spieler 2 (lokaler Mensch)
if(isLocal2P&&snake2&&!dead2){
const p2ctrl=opts.players?.[1]?.ctrl||'';
const useWASD2=p2ctrl==='WASD';
const map2=useWASD2
?{w:{x:0,y:-1},W:{x:0,y:-1},s:{x:0,y:1},S:{x:0,y:1},a:{x:-1,y:0},A:{x:-1,y:0},d:{x:1,y:0},D:{x:1,y:0}}
:{ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
const dir_d2=map2[e.key];
if(dir_d2&&!(dir_d2.x===-dir2.x&&dir_d2.y===-dir2.y)){nextDir2=dir_d2;e.preventDefault();}
}
}
// Online-Rematch 
if(opts.isOnline&&opts.onlineRoomId){
const myRole=opts.isHost?'p1':'p2';
const oppRole=opts.isHost?'p2':'p1';
const proto=location.protocol==='https:'?'wss:':'ws:';
const gameWs=new WebSocket(proto+'//'+location.host);
currentGame._ws=gameWs;

const TICK_MS=150;

// Tasten-Handler — eigener separater Handler für online
const arrowMap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
const wasdMap={w:{x:0,y:-1},W:{x:0,y:-1},s:{x:0,y:1},S:{x:0,y:1},a:{x:-1,y:0},A:{x:-1,y:0},d:{x:1,y:0},D:{x:1,y:0}};
const ctrlMap=opts.ctrl==='WASD'?wasdMap:arrowMap;

function onKeyOnline(e){
if(e.key==='p'||e.key==='P'){togglePause();return;}
const nd=ctrlMap[e.key];
if(!nd)return;
if(nd.x===-dir.x&&nd.y===-dir.y)return; // keine 180-Grad-Wende
nextDir=nd;
// Richtung SOFORT lokal anwenden, für ein latenzfreies Gefühl
dir=nd;
if(gameWs.readyState===1)
gameWs.send(JSON.stringify({type:'snakeDir',dir:nd}));
e.preventDefault();
}
document.addEventListener('keydown',onKeyOnline);

// Lokaler Tick — eigene Schlange läuft vollständig lokal
let _tickId=null;
let _rafActive=true;
let _rafId=null;
let _gameStarted=false;

// Lokaler Vorhersage-Tick - bewegt eigene Schlange sofort, Server korrigiert
let _localTickId=null;
function localPredictTick(){
if(dead||paused||!_gameStarted)return;
dir=nextDir;
const head={x:(snake[0].x+dir.x+COLS)%COLS,y:(snake[0].y+dir.y+ROWS)%ROWS};
// Nur lokale Selbstkollision (Server behandelt alle maßgeblichen Kollisionen)
snake.unshift({x:head.x,y:head.y});
if(head.x===food.x&&head.y===food.y){
score+=10;document.getElementById('s1').textContent=score;
} else {snake.pop();}
}

// Zeichnen: eigene Schlange lokal + Gegner interpoliert
let _oppPrev=[],_oppNext=[],_oppLerpStart=0;
function drawOnline(){
ctx.fillStyle='#05050f';ctx.fillRect(0,0,C.width,C.height);
ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;
for(let x=0;x<=COLS;x++){ctx.beginPath();ctx.moveTo(x*S,0);ctx.lineTo(x*S,ROWS*S);ctx.stroke();}
for(let y=0;y<=ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*S);ctx.lineTo(COLS*S,y*S);ctx.stroke();}
// Futter
const pulse=0.87+0.13*Math.sin(Date.now()*0.006);
ctx.shadowColor='#00ff88';ctx.shadowBlur=16*pulse;ctx.fillStyle='#00ff88';
ctx.beginPath();ctx.arc(food.x*S+S/2,food.y*S+S/2,(S/2-2)*pulse,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
// Eigene Schlange (Cyan)
snake.forEach((seg,i)=>{
ctx.globalAlpha=dead?0.3:Math.max(0.2,1-i/snake.length*0.7);
ctx.shadowBlur=i===0?12:0;ctx.shadowColor='#00f5ff';ctx.fillStyle='#00f5ff';
ctx.fillRect(seg.x*S+1,seg.y*S+1,S-2,S-2);
ctx.shadowBlur=0;ctx.globalAlpha=1;
});
// Gegner (Lila, interpoliert)
if(_oppNext.length){
const prog=_oppLerpStart>0?Math.min(1,(Date.now()-_oppLerpStart)/TICK_MS):1;
const src=_oppPrev.length===_oppNext.length?_oppPrev:_oppNext;
_oppNext.forEach((seg,i)=>{
const p=src[i]||seg;
const px=p.x+(seg.x-p.x)*prog, py=p.y+(seg.y-p.y)*prog;
ctx.globalAlpha=Math.max(0.15,1-i/_oppNext.length*0.75);
ctx.shadowBlur=i===0?10:0;ctx.shadowColor=PLAYER_COLORS[1];ctx.fillStyle=PLAYER_COLORS[1];
ctx.fillRect(px*S+1,py*S+1,S-2,S-2);
ctx.shadowBlur=0;ctx.globalAlpha=1;
});
}
}

gameWs.onopen=()=>{
gameWs.send(JSON.stringify({type:'join',roomId:opts.onlineRoomId,
role:opts.isHost?'host':'guest',name:currentUser?.name||'Spieler'}));
document.getElementById('g-status').textContent=t('game.waiting');
startPingMeasure(gameWs);
};

gameWs.onmessage=(ev)=>{
try{
const msg=JSON.parse(ev.data);
if(msg.type==='pong'){showPing(Date.now()-msg.ts);return;}
if(msg.type==='waiting'){document.getElementById('g-status').textContent=t('game.waiting');return;}

if(msg.type==='snakeState'){
const me=msg[myRole],opp=msg[oppRole];
if(!me||!opp)return;
if(!_gameStarted){
_gameStarted=true;
// Startposition vom Server synchronisieren
snake.length=0;
me.snake.forEach(seg=>snake.push({x:seg.x,y:seg.y}));
dir=opts.isHost?{x:1,y:0}:{x:-1,y:0};
nextDir={...dir};
food=msg.food;
document.getElementById('g-status').textContent='';
// Vorhersage: bei erstem Server-Zustand sofort bewegen
}
// Alles vom Server synchronisieren - Server ist maßgeblich
food=msg.food;
score=me.score||score;document.getElementById('s1').textContent=score;
oppScore=opp.score||0;document.getElementById('s2').textContent=oppScore;
// Server-Zustand anwenden, dann einen Schritt vorausschauen
if(me.snake&&me.snake.length&&!dead){
// Auf Server-Position springen
snake.length=0;
me.snake.forEach(seg=>snake.push({x:seg.x,y:seg.y}));
// Nächsten Schritt sofort vorhersagen (verbirgt Netzwerklatenz)
const pd=nextDir;
const ph={x:(snake[0].x+pd.x+COLS)%COLS,y:(snake[0].y+pd.y+ROWS)%ROWS};
if(!snake.some(seg=>seg.x===ph.x&&seg.y===ph.y)){
snake.unshift({x:ph.x,y:ph.y});
if(ph.x!==food.x||ph.y!==food.y)snake.pop();
}
}
// Gegner-Interpolation
_oppPrev=_oppNext.length?_oppNext:opp.snake.slice();
_oppNext=opp.snake.slice();_oppLerpStart=Date.now();oppSnake=opp.snake||[];
// Spielende
if(msg.over||(me.dead&&!dead)){
dead=true;_rafActive=false;
// Auf Server-Positionen springen für korrekte Todesanzeige
if(me.snake&&me.snake.length){snake.length=0;me.snake.forEach(seg=>snake.push(seg));}
if(opp.snake&&opp.snake.length){oppSnake=opp.snake.slice();}
const iWon=!me.dead&&opp.dead;
if(!document.getElementById('snake-gameover')){
if(iWon){sndWin();fbSaveScore('snake',score);}else sndFail();
const ca2=document.getElementById('canvas-area');
if(ca2){
const go2=document.createElement('div');go2.id='snake-gameover';
go2.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:5;';
const wc=iWon?'#00f5ff':'#ff4444';
const wt=iWon?(currentLang==='en'?'🏆 YOU WIN!':'🏆 DU GEWINNST!'):'💀 GAME OVER';
go2.innerHTML='<div style="font-size:28px;font-weight:900;color:'+wc+';text-shadow:0 0 20px '+wc+'">'+wt+'</div>'+
'<div style="font-size:14px;color:rgba(255,255,255,.7)">'+score+' : '+oppScore+'</div>';
ca2.appendChild(go2);showOnlineRematch(opts,iWon);
}
}
}
}
if(msg.type==='opponent_left'){
showToast(t('opp.quit'));dead=true;_rafActive=false;showOnlineRematch(opts,true);
}
}catch(ex){console.error('snake ws:',ex);}
};

gameWs.onclose=()=>{if(!dead)showToast(t('conn.lost'));};

// 60fps-Render-Schleife
(function _raf(){
if(!_rafActive)return;
_rafId=requestAnimationFrame(_raf);
drawOnline();
})();

currentGame._cleanup=()=>{
_rafActive=false;
if(_rafId)cancelAnimationFrame(_rafId);
document.removeEventListener('keydown',onKeyOnline);
document.removeEventListener('keydown',onKey);
try{gameWs.close();}catch(ex){}
};
}

if(!opts.isOnline){
document.addEventListener('keydown',onKey);

currentGame._rafActive=true;
let _lastTick2=0;

// Bewegung der KI-Schlange
function aiStep(){
if(!aiSnake||!aiSnake.length)return null;
const head=aiSnake[0];
const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
// Umkehrung herausfiltern
const validDirs=dirs.filter(d=>{
const nx=(head.x+d.x+COLS)%COLS, ny=(head.y+d.y+ROWS)%ROWS;
// Wände, sich selbst und die Spieler-Schlange vermeiden
if(WALLS.some(w=>w.x===nx&&w.y===ny))return false;
if(aiSnake.some(s=>s.x===nx&&s.y===ny))return false;
if(snake.some(s=>s.x===nx&&s.y===ny))return false;
return true;
});
if(!validDirs.length)return null;
// Richtung Futter bewegen
const best=validDirs.reduce((a,d)=>{
const nx=(head.x+d.x+COLS)%COLS, ny=(head.y+d.y+ROWS)%ROWS;
const dist=Math.abs(nx-food.x)+Math.abs(ny-food.y);
return dist<a.dist?{d,dist}:a;
},{d:validDirs[0],dist:999});
const nx=(head.x+best.d.x+COLS)%COLS, ny=(head.y+best.d.y+ROWS)%ROWS;
return{x:nx,y:ny};
}

(function _snakeRAF(ts){
if(!currentGame||!currentGame._rafActive)return;
requestAnimationFrame(_snakeRAF);
if(!opts.isOnline)draw();
if(ts-_lastTick2>=speed){
_lastTick2=ts;
if(paused)return;
if(dead){draw();return;}
dir=nextDir;
const head={x:(snake[0].x+dir.x+COLS)%COLS,y:(snake[0].y+dir.y+ROWS)%ROWS};
const s2cells=[...(snake2||[]),...(aiSnake||[])];
if(snake.some(s=>s.x===head.x&&s.y===head.y)||
WALLS.some(w=>w.x===head.x&&w.y===head.y)||
s2cells.some(s=>s.x===head.x&&s.y===head.y)){
dead=true;
if(isLocal2P&&!dead2){
const p1n=opts.players?.[0]?.name||'Spieler 1';
const p2n=opts.players?.[1]?.name||'Spieler 2';
document.getElementById('g-status').textContent=p1n+t('snake.p.lose')+p2n+t('snake.p.wins');
sndWin();
} else {
document.getElementById('g-status').textContent='GAME OVER! Score: '+score;
fbSaveScore('snake',score);
const ca=document.getElementById('canvas-area');
if(ca){
let godiv=document.getElementById('snake-gameover');
if(!godiv){
godiv=document.createElement('div');
godiv.id='snake-gameover';
godiv.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;z-index:5;';
godiv.innerHTML='<div style="font-size:28px;color:#ff4444">GAME OVER</div><div style="color:#fff">Score: '+score+'</div>';
ca.appendChild(godiv);
showLocalRematch('');
}
}
}
draw();return;
}
// Schlange bewegen
snake.unshift(head);
if(head.x===food.x&&head.y===food.y){
score+=10;document.getElementById('s1').textContent=score;
sndScore();food=placeFood();
} else { snake.pop(); }
// Bewegung der KI-Schlange
if(aiSnake&&aiSnake.length){
const aiHead=aiStep();
if(!aiHead){}
else{
aiSnake.unshift(aiHead);
if(aiHead.x===food.x&&aiHead.y===food.y){aiScore+=10;document.getElementById('s2').textContent=aiScore;food=placeFood();}
else{aiSnake.pop();}
}

}
// P2 lokal
if(isLocal2P&&snake2&&snake2.length&&!dead2){
dir2=nextDir2;
const h2={x:(snake2[0].x+dir2.x+COLS)%COLS,y:(snake2[0].y+dir2.y+ROWS)%ROWS};
const s2block=[...snake,[...snake2]].flat();
if(WALLS.some(w=>w.x===h2.x&&w.y===h2.y)||snake2.some(s=>s.x===h2.x&&s.y===h2.y)||snake.some(s=>s.x===h2.x&&s.y===h2.y)){
dead2=true;
document.getElementById('g-status').textContent='💀 '+(opts.players?.[1]?.name||'P2')+t('snake.p.lose')+(opts.players?.[0]?.name||'P1')+' gewinnt! 🏆';
sndWin();
} else {
snake2.unshift(h2);
if(h2.x===food.x&&h2.y===food.y){score2+=10;document.getElementById('s2').textContent=score2;food=placeFood();}
else{snake2.pop();}
}
}

} // Ende der Geschwindigkeitsprüfung
})(0); // Ende der RAF-IIFE

currentGame._cleanup=()=>{
currentGame._rafActive=false;
document.removeEventListener('keydown',onKey);
const gd=document.getElementById('snake-gameover');if(gd)gd.remove();
if(currentGame._ws)try{currentGame._ws.close();}catch(ex){}
};
draw();
} 
} 
