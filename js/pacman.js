function initPacman(opts){
const modern  = opts.mode==='Modern';
const useWASD = opts.ctrl==='WASD';

// ── AUTHENTIC PAC-MAN MAP 28×31 ─────────────────
// # wall  . dot  o power  ' ' empty  H house  D door
const RAW=[
'############################',  // 0
'#............##............#',  // 1
'#.####.#####.##.#####.####.#',  // 2
'#o####.#####.##.#####.####o#',  // 3
'#.####.#####.##.#####.####.#',  // 4
'#..........................#',  // 5
'#.####.##.########.##.####.#',  // 6
'#.####.##.########.##.####.#',  // 7
'#......##....##....##......#',  // 8
'######.#####    #####.######',  // 9
'######.#####    #####.######',  // 10
'######.##          ##.######',  // 11
'######.## ###DD### ##.######',  // 12
'######.## #HHHHHH# ##.######',  // 13
'       .  #HHHHHH#  .       ',  // 14  tunnel row
'######.## #HHHHHH# ##.######',  // 15
'######.## ######## ##.######',  // 16
'######.##          ##.######',  // 17
'######.## ######## ##.######',  // 18
'######.## ######## ##.######',  // 19
'#............##............#',  // 20
'#.####.#####.##.#####.####.#',  // 21
'#.####.#####.##.#####.####.#',  // 22
'#o..##................##..o#',  // 23
'###.##.##.########.##.##.###',  // 24
'###.##.##.########.##.##.###',  // 25
'#......##....##....##......#',  // 26
'#.##########.##.##########.#',  // 27
'#.##########.##.##########.#',  // 28
'#..........................#',  // 29
'############################',  // 30
];

// Normalize all rows to exactly 28 chars
const COLS=28, ROWS=RAW.length;
const norm=RAW.map(r=>r.length===COLS?r:r.padEnd(COLS,' ').slice(0,COLS));

// Parse to numbers: 1=wall 0=dot 2=empty 3=power 4=house 5=door
function parseMap(){
return norm.map(row=>row.split('').map(ch=>{
if(ch==='#')return 1;
if(ch==='.')return 0;
if(ch==='o')return 3;
if(ch==='H')return 4;
if(ch==='D')return 5;
return 2;
}));
}
let map=parseMap();

// ── CANVAS ──────────────────────────────────────
const C=document.getElementById('gc');
// Compute tile size to fit container while keeping square tiles
const _pac_area=document.getElementById('canvas-area');
const _pac_w=_pac_area?Math.max(_pac_area.clientWidth,400):560;
const _pac_h=_pac_area?Math.max(_pac_area.clientHeight,400):660;
// TS must be integer and same for both dims (square tiles)
const TS=Math.max(14,Math.floor(Math.min(_pac_w/COLS,(_pac_h-20)/ROWS)));
C.width=COLS*TS; C.height=ROWS*TS+20;
// Center canvas in container via CSS
C.style.display='block';
C.style.margin='auto';
const ctx=C.getContext('2d');
ctx.imageSmoothingEnabled=false;

document.getElementById('g-title').textContent='Pac-Man';
document.getElementById('g-status').textContent=(useWASD?'WASD':t('pacman.ctrl'))+' | '+t('pacman.pause');
document.getElementById('g-status').textContent=t('pacman.pellet.hint');

// Key coordinates from map
const DOOR_ROW=12, DOOR_COL_L=13, DOOR_COL_R=14;
const EXIT_TX=13, EXIT_TY=11; // just above door, ghosts aim here when leaving
const HOUSE_CX=13, HOUSE_CY=14;
const PAC_START_TX=13, PAC_START_TY=23;

function countDots(){return map.flat().filter(v=>v===0||v===3).length;}
let dotsLeft=countDots();

// ── GAME STATE ───────────────────────────────────
let phase='play',phaseTimer=0;
let score=0,lives=3,level=1;
let frightTimer=0,eatCombo=0;
let floats=[];
let modeTimer=0,modeStep=0;
const MODE_DUR=[420,1200,420,1200,300,1200,300,Infinity];
let globalMode='scatter';

// ── PAC ─────────────────────────────────────────
const PAC_SPEED=7;
let pac={tx:PAC_START_TX,ty:PAC_START_TY,dx:0,dy:0,wx:0,wy:0,tmr:0,mouth:0.08,mdir:1};

// ── GHOSTS ──────────────────────────────────────
const GDEFS=[
{name:'Blinky',col:'#FF0000',hx:13,hy:11,exitDelay:0,  outside:true, scx:25,scy:0 },
{name:'Pinky', col:'#FFB8FF',hx:13,hy:14,exitDelay:60, outside:false,scx:2, scy:0 },
{name:'Inky',  col:'#00CCFF',hx:11,hy:14,exitDelay:240,outside:false,scx:27,scy:30},
{name:'Clyde', col:'#FFB852',hx:15,hy:14,exitDelay:420,outside:false,scx:0, scy:30},
];
if(modern)GDEFS.push({name:'Sue',col:'#FF6600',hx:13,hy:13,exitDelay:600,outside:false,scx:13,scy:30});

function makeGhosts(){
return GDEFS.map(d=>({
tx:d.hx,ty:d.hy,dx:0,dy:-1,tmr:0,
fright:false,eaten:false,blink:false,
inHouse:!d.outside,exitTimer:d.exitDelay,
col:d.col, name:d.name, def:d,
}));
}
let ghosts=makeGhosts();

// ── TILE HELPERS ─────────────────────────────────
function tileAt(tx,ty){
if(ty<0||ty>=ROWS)return 1;
return map[ty][(tx+COLS)%COLS]??1;
}
function wrapX(tx){return((tx%COLS)+COLS)%COLS;}
function pacCanWalk(tx,ty){const v=tileAt(tx,ty);return v!==1&&v!==4&&v!==5;}
function ghostCanWalk(tx,ty,eaten){
const v=tileAt(tx,ty);
if(v===1)return false;
if(eaten)return true; // eaten ghosts go anywhere to reach house
if(v===4)return false; // normal ghosts can't enter house interior
if(v===5)return true;  // ghosts CAN pass through door tile (entering or exiting)
return true;
}

// ── PAC MOVEMENT ────────────────────────────────
function stepPac(){
pac.tmr++;
if(pac.tmr<PAC_SPEED)return;
pac.tmr=0;
// Try queued direction
const wtx=wrapX(pac.tx+pac.wx),wty=pac.ty+pac.wy;
if((pac.wx||pac.wy)&&pacCanWalk(wtx,wty)){pac.dx=pac.wx;pac.dy=pac.wy;}
const nx=wrapX(pac.tx+pac.dx),ny=pac.ty+pac.dy;
if(pacCanWalk(nx,ny)){
pac.tx=nx;pac.ty=ny;
const v=map[pac.ty][pac.tx];
if(v===0){map[pac.ty][pac.tx]=2;score+=10;dotsLeft--;document.getElementById('s1').textContent=score;sndHit();}
else if(v===3){
map[pac.ty][pac.tx]=2;score+=50;dotsLeft--;document.getElementById('s1').textContent=score;
frightTimer=Math.max(180,360-level*40);eatCombo=0;
ghosts.forEach(g=>{if(!g.eaten){g.fright=true;g.blink=false;if(!g.inHouse){g.dx=-g.dx;g.dy=-g.dy;}}});
sndScore();
}
if(dotsLeft<=0){phase='levelwin';phaseTimer=0;}
}
}

// ── GHOST MOVEMENT ───────────────────────────────
function ghostTarget(g,idx){
if(g.eaten)return{tx:HOUSE_CX,ty:HOUSE_CY};
if(g.fright)return{tx:(Math.random()*COLS)|0,ty:(Math.random()*ROWS)|0};
if(globalMode==='scatter')return{tx:g.def.scx,ty:g.def.scy};
switch(idx){
case 0:return{tx:pac.tx,ty:pac.ty};
case 1:return{tx:wrapX(pac.tx+pac.dx*4),ty:Math.max(0,Math.min(ROWS-1,pac.ty+pac.dy*4))};
case 2:return{tx:wrapX(pac.tx+pac.dx*2),ty:Math.max(0,Math.min(ROWS-1,pac.ty+pac.dy*2))};
case 3:{const d=Math.abs(g.tx-pac.tx)+Math.abs(g.ty-pac.ty);return d>8?{tx:pac.tx,ty:pac.ty}:{tx:g.def.scx,ty:g.def.scy};}
default:return{tx:pac.tx,ty:pac.ty};
}
}

function stepGhost(g,idx){
if(g.dead)return;
// ── INSIDE HOUSE: bounce while waiting, then exit ──
if(g.inHouse&&!g.eaten){
g.exitTimer--;
// Bounce up/down inside house while waiting
g.tmr++;
if(g.tmr%16===0){
const ny=g.ty+g.dy;
const v=tileAt(g.tx,ny);
if(v===4){g.ty=ny;}else{g.dy*=-1;}
}
if(g.exitTimer>0)return;
// EXIT PHASE: use separate exitStep counter
if(g.exitStep===undefined)g.exitStep=0;
g.exitStep++;
if(g.exitStep%8!==0)return; // move every 8 frames
// Step 1: move horizontally to EXIT_TX
if(g.tx!==EXIT_TX){
const step=g.tx<EXIT_TX?1:-1;
const nx=g.tx+step;
const v=tileAt(nx,g.ty);
if(v===4||v===2||v===5||v===0||v===3)g.tx=nx;
return;
}
// Step 2: move up through door and out
const ny=g.ty-1;
const v=tileAt(g.tx,ny);
if(v!==undefined&&v!==1){g.ty=ny;}
if(g.ty<=EXIT_TY){
g.inHouse=false;g.exitStep=undefined;
g.dx=0;g.dy=-1;g.tmr=0;
}
return;
}

// ── NORMAL / FRIGHTENED / EATEN MOVEMENT ─────
g.tmr++;
let spd=9+Math.floor(level*0.5);
if(g.fright)spd+=6;
if(g.eaten)spd=3;
spd=Math.max(3,spd);
if(g.tmr<spd)return;
g.tmr=0;

const tgt=ghostTarget(g,idx);
const DIRS=[{dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0}];

let cands=DIRS.filter(d=>{
if(d.dx===-g.dx&&d.dy===-g.dy)return false; // no 180
return ghostCanWalk(wrapX(g.tx+d.dx),g.ty+d.dy,g.eaten);
});
// Fallback: allow reversal if stuck
if(!cands.length){
cands=DIRS.filter(d=>ghostCanWalk(wrapX(g.tx+d.dx),g.ty+d.dy,g.eaten));
}
if(!cands.length)return;

const chosen=g.fright
?cands[Math.floor(Math.random()*cands.length)]
:cands.reduce((best,d)=>{
const nx=wrapX(g.tx+d.dx),ny=g.ty+d.dy;
const bx=wrapX(g.tx+best.dx),by=g.ty+best.dy;
return(Math.abs(nx-tgt.tx)+Math.abs(ny-tgt.ty))<(Math.abs(bx-tgt.tx)+Math.abs(by-tgt.ty))?d:best;
},cands[0]);

g.dx=chosen.dx;g.dy=chosen.dy;
g.tx=wrapX(g.tx+g.dx);g.ty=g.ty+g.dy;

if(g.eaten&&g.tx===HOUSE_CX&&g.ty===HOUSE_CY){
g.dead=true;g.eaten=false;g.fright=false;g.blink=false;
}
}

// ── COLLISION ────────────────────────────────────
function checkColl(){
if(phase!=='play')return;
ghosts.forEach(g=>{
if(g.dead||g.inHouse||g.tx!==pac.tx||g.ty!==pac.ty)return;
if(g.fright&&!g.eaten){
g.fright=false;g.eaten=true;eatCombo++;
const pts=200*(1<<Math.min(eatCombo-1,3));
score+=pts;document.getElementById('s1').textContent=score;
floats.push({x:g.tx*TS+TS/2,y:g.ty*TS,txt:'+'+pts,life:50});sndScore();
}else if(!g.eaten){
phase='dying';phaseTimer=0;sndFail();
}
});
}

function updateMode(){
if(frightTimer>0)return;
modeTimer++;
if(modeStep<MODE_DUR.length&&modeTimer>=MODE_DUR[modeStep]){
modeTimer=0;modeStep++;
globalMode=(modeStep%2===0)?'scatter':'chase';
if(modeStep>=MODE_DUR.length)globalMode='chase';
}
}

// ── DRAW MAP ─────────────────────────────────────
function drawMap(){
const t=Date.now();
const flash=phase==='levelwin'&&Math.floor(phaseTimer/6)%2===1;
for(let ty=0;ty<ROWS;ty++)for(let tx=0;tx<COLS;tx++){
const v=map[ty][tx];
const px=tx*TS,py=ty*TS;
// Background
ctx.fillStyle='#000';ctx.fillRect(px,py,TS,TS);
if(v===1){
ctx.fillStyle=flash?'#ffffff':'#1f1fff';
ctx.fillRect(px,py,TS,TS);
// Inner dark border to look like arcade walls
ctx.fillStyle=flash?'#aaaaff':'#0000aa';
ctx.fillRect(px+2,py+2,TS-4,TS-4);
}else if(v===0){
ctx.fillStyle='#ffcc88';
ctx.beginPath();ctx.arc(px+TS/2,py+TS/2,2,0,Math.PI*2);ctx.fill();
}else if(v===3){
// Blinking power pellet
if(Math.floor(t/400)%2===0){
ctx.fillStyle='#ffcc88';ctx.shadowColor='#ffaa44';ctx.shadowBlur=6;
ctx.beginPath();ctx.arc(px+TS/2,py+TS/2,TS/2-2,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
}
}else if(v===4){
ctx.fillStyle='#1a0030';ctx.fillRect(px,py,TS,TS);
}else if(v===5){
// Door: dark bg with pink horizontal bar
ctx.fillStyle='#100015';ctx.fillRect(px,py,TS,TS);
ctx.fillStyle='#ee88ee';ctx.fillRect(px,py+TS/2-1,TS,3);
}
}
}

// ── DRAW GHOST (clean pixel-art style) ──────────
function drawGhost(g){
if(g.dead)return;
const px=g.tx*TS, py=g.ty*TS;
const w=TS, h=TS;
const cx=px+w/2, cy=py+h/2;

if(g.eaten){
// Just two white eyes with blue pupils
ctx.fillStyle='#ffffff';
ctx.beginPath();ctx.ellipse(cx-w*0.2,cy-h*0.05,w*0.13,h*0.17,0,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.ellipse(cx+w*0.2,cy-h*0.05,w*0.13,h*0.17,0,0,Math.PI*2);ctx.fill();
ctx.fillStyle='#4488ff';
ctx.beginPath();ctx.arc(cx-w*0.2+g.dx*2,cy-h*0.05+g.dy*2,w*0.07,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(cx+w*0.2+g.dx*2,cy-h*0.05+g.dy*2,w*0.07,0,Math.PI*2);ctx.fill();
return;
}

const blink=g.blink&&Math.floor(Date.now()/160)%2===0;
const bodyCol=g.fright?(blink?'#dddddd':'#2233dd'):g.col;

// Body with glow
ctx.shadowColor=g.fright?(blink?'#aaa':'#0055ff'):g.col;
ctx.shadowBlur=6;
ctx.fillStyle=bodyCol;
// Top dome
ctx.beginPath();
ctx.arc(cx,py+h*0.48,w*0.46,Math.PI,0,false);
// Right side down
ctx.lineTo(px+w-1,py+h-1);
// Wavy bottom: 3 bumps
const bw=w/3;
ctx.quadraticCurveTo(px+bw*2.7,py+h-h*0.3, px+bw*2.35,py+h-1);
ctx.quadraticCurveTo(px+bw*2.0,py+h-h*0.3, px+bw*1.65,py+h-1);
ctx.quadraticCurveTo(px+bw*1.3,py+h-h*0.3, px+bw*0.95,py+h-1);
ctx.quadraticCurveTo(px+bw*0.6,py+h-h*0.3, px+bw*0.35,py+h-1);
ctx.lineTo(px+1,py+h-1);
ctx.closePath();ctx.fill();
ctx.shadowBlur=0;

if(!g.fright){
// White eye whites
ctx.fillStyle='#ffffff';
ctx.beginPath();ctx.ellipse(cx-w*0.18,py+h*0.36,w*0.13,h*0.15,0,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.ellipse(cx+w*0.18,py+h*0.36,w*0.13,h*0.15,0,0,Math.PI*2);ctx.fill();
// Blue pupils that follow movement direction
ctx.fillStyle='#2244ff';
ctx.beginPath();ctx.arc(cx-w*0.18+g.dx*2,py+h*0.36+g.dy*2,w*0.08,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(cx+w*0.18+g.dx*2,py+h*0.36+g.dy*2,w*0.08,0,Math.PI*2);ctx.fill();
}else{
// Frightened face: two dots for eyes, wavy mouth
ctx.fillStyle='rgba(180,200,255,0.9)';
ctx.beginPath();ctx.arc(cx-w*0.18,py+h*0.33,w*0.07,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(cx+w*0.18,py+h*0.33,w*0.07,0,Math.PI*2);ctx.fill();
ctx.strokeStyle='rgba(180,200,255,0.8)';ctx.lineWidth=1.5;ctx.lineCap='round';
ctx.beginPath();
const mx=px+w*0.18,my=py+h*0.6;
ctx.moveTo(mx,my);
ctx.lineTo(mx+w*0.12,my-h*0.1);
ctx.lineTo(mx+w*0.24,my);
ctx.lineTo(mx+w*0.36,my-h*0.1);
ctx.lineTo(mx+w*0.48,my);
ctx.stroke();
}
}

// ── DRAW PAC ─────────────────────────────────────
function drawPac(deathFrac){
const cx=pac.tx*TS+TS/2,cy=pac.ty*TS+TS/2,r=TS/2-1;
ctx.shadowColor='#ffdd00';ctx.shadowBlur=6;ctx.fillStyle='#ffdd00';
if(deathFrac!==undefined){
if(deathFrac>=1){ctx.shadowBlur=0;return;}
const a=deathFrac*Math.PI;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,Math.PI*2-a,false);ctx.closePath();ctx.fill();
}else{
const facing=Math.atan2(pac.dy,pac.dx||(pac.wx||1));
const m=pac.mouth*Math.PI;
ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,facing+m,facing+Math.PI*2-m,false);ctx.closePath();ctx.fill();
}
ctx.shadowBlur=0;
}

// ── HUD ──────────────────────────────────────────
function drawHUD(){
const hy=ROWS*TS;
ctx.fillStyle='#000';ctx.fillRect(0,hy,C.width,20);
ctx.fillStyle='#ffdd00';ctx.font='bold 11px monospace';ctx.textAlign='left';
ctx.fillText('SCORE:'+score,3,hy+14);
ctx.textAlign='center';ctx.fillText('LV.'+level,C.width/2,hy+14);ctx.textAlign='left';
for(let i=0;i<Math.min(lives,5);i++){
const lx=C.width-6-(i*13),ly=hy+10;
ctx.fillStyle='#ffdd00';ctx.beginPath();ctx.moveTo(lx,ly);ctx.arc(lx,ly,5,0.28,Math.PI*2-0.28);ctx.closePath();ctx.fill();
}
if(frightTimer>0){
const maxF=Math.max(180,360-level*40);
ctx.fillStyle='rgba(80,80,255,0.8)';ctx.fillRect(0,hy-2,C.width*(frightTimer/maxF),2);
}
}

function drawFloats(){
floats=floats.filter(f=>{
f.y-=0.5;f.life--;
ctx.globalAlpha=f.life/50;ctx.fillStyle='#ffcc00';ctx.font='bold 10px monospace';ctx.textAlign='center';
ctx.fillText(f.txt,f.x,f.y);ctx.globalAlpha=1;ctx.textAlign='left';
return f.life>0;
});
}

function drawOverlay(title,sub,col){
ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(0,0,C.width,ROWS*TS);
ctx.fillStyle=col||'#ffdd00';ctx.font='bold 17px monospace';ctx.textAlign='center';
ctx.fillText(title,C.width/2,ROWS*TS/2-6);
if(sub){ctx.fillStyle='#aaa';ctx.font='10px monospace';ctx.fillText(sub,C.width/2,ROWS*TS/2+12);}
ctx.textAlign='left';
}

function resetPositions(){
pac.tx=PAC_START_TX;pac.ty=PAC_START_TY;pac.dx=0;pac.dy=0;pac.wx=0;pac.wy=0;pac.tmr=0;
ghosts=makeGhosts();frightTimer=0;eatCombo=0;
}

// ── MAIN LOOP ────────────────────────────────────
let rafId=null,lastT=0,acc=0;
const FT=1000/60;
function loop(now){
if(!currentGame)return;
rafId=requestAnimationFrame(loop);
if(currentGame)currentGame.raf=rafId;
if(paused)return;
const dt=Math.min(now-lastT,100);lastT=now;acc+=dt;
while(acc>=FT){
acc-=FT;
if(phase==='play'){
pac.mouth+=0.09*pac.mdir;
if(pac.mouth>=0.40||pac.mouth<=0.03)pac.mdir*=-1;
if(frightTimer>0){
frightTimer--;
if(frightTimer<120)ghosts.forEach(g=>{if(g.fright)g.blink=true;});
if(frightTimer<=0)ghosts.forEach(g=>{g.fright=false;g.blink=false;eatCombo=0;});
}
updateMode();
stepPac();
ghosts.forEach((g,i)=>stepGhost(g,i));
checkColl();
}else if(phase==='dying'){
phaseTimer++;
if(phaseTimer>90){lives--;if(lives<=0)phase='gameover';else{phase='play';resetPositions();}}
}else if(phase==='levelwin'){
phaseTimer++;
if(phaseTimer>140){
level++;score+=500;map=parseMap();dotsLeft=countDots();
resetPositions();modeStep=0;modeTimer=0;globalMode='scatter';
phase='play';phaseTimer=0;document.getElementById('s1').textContent=score;sndWin();fbSaveScore('pacman',score);
}
}
}
ctx.fillStyle='#000';ctx.fillRect(0,0,C.width,C.height);
drawMap();
ghosts.forEach(g=>drawGhost(g));
if(phase==='dying'){drawPac(phaseTimer/90);}
else if(phase!=='gameover')drawPac();
drawFloats();drawHUD();
if(phase==='levelwin'&&phaseTimer>30)drawOverlay('LEVEL '+(level+1)+' CLEAR!','Score: '+score,'#00ff88');
if(phase==='gameover')drawOverlay(t('snake.game.over'),'Score: '+score+' — Neustart drücken','#ff3333');
}

// ── INPUT ────────────────────────────────────────
function onKey(e){
if(e.key==='p'||e.key==='P'){togglePause();return;}
const useWASD=opts.ctrl==='WASD';
const d=(useWASD
?{w:[0,-1],W:[0,-1],s:[0,1],S:[0,1],a:[-1,0],A:[-1,0],d:[1,0],D:[1,0]}
:{ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]})[e.key];
if(d){pac.wx=d[0];pac.wy=d[1];e.preventDefault();}
}
document.addEventListener('keydown',onKey);
currentGame._cleanup=()=>{document.removeEventListener('keydown',onKey);if(rafId)cancelAnimationFrame(rafId);};
lastT=performance.now();
rafId=requestAnimationFrame(loop);
currentGame.raf=rafId;
}

// ════════════════════════════════════════════════
// ACCOUNT
// ════════════════════════════════════════════════
var currentUser=null;
function getDB(){try{return JSON.parse(localStorage.getItem('ghdb')||'{}')}catch(e){return{}}}
function setDB(db){try{localStorage.setItem('ghdb',JSON.stringify(db))}catch(e){}}
function hash(p){let h=0;for(let i=0;i<p.length;i++)h=(Math.imul(31,h)+p.charCodeAt(i))|0;return h.toString(16)}
function login(name,pass){
const db=getDB();
if(!db[name])return{ok:false,msg:'Account nicht gefunden.'};
if(db[name].pass!==hash(pass))return{ok:false,msg:'Falsches Passwort.'};
currentUser={name,scores:db[name].scores||{},total:db[name].total||0};
try{localStorage.setItem('ghsess',JSON.stringify(currentUser))}catch(e){}
updateUserUI();return{ok:true};
}
function register(name,pass){
if(!name||name.length<2)return{ok:false,msg:'Name mind. 2 Zeichen.'};
if(!pass||pass.length<4)return{ok:false,msg:'Passwort mind. 4 Zeichen.'};
const db=getDB();
if(db[name])return{ok:false,msg:'Name bereits vergeben.'};
db[name]={pass:hash(pass),scores:{},total:0};setDB(db);
currentUser={name,scores:{},total:0};
try{localStorage.setItem('ghsess',JSON.stringify(currentUser))}catch(e){}
updateUserUI();return{ok:true};
}
function logout(){
currentUser=null;try{localStorage.removeItem('ghsess')}catch(e){}
updateUserUI();renderAccount();
}
function saveScore(game,pts){
if(!currentUser)return;
const db=getDB();if(!db[currentUser.name])return;
const prev=db[currentUser.name].scores[game]||0;
if(pts>prev)db[currentUser.name].scores[game]=pts;
db[currentUser.name].total=(db[currentUser.name].total||0)+pts;
currentUser.scores=db[currentUser.name].scores;currentUser.total=db[currentUser.name].total;
setDB(db);try{localStorage.setItem('ghsess',JSON.stringify(currentUser))}catch(e){}
updateUserUI();
}
function updateUserUI(){
const av=document.getElementById('sb-av'),nm=document.getElementById('sb-name'),pts=document.getElementById('sb-pts');
const tav=document.getElementById('top-av'),tpts=document.getElementById('top-pts');
const mpts=document.getElementById('my-lb-pts'),spts=document.getElementById('stat-pts');
if(currentUser){
// Load avatar from localStorage every time
try{const _u=JSON.parse(localStorage.getItem('ghUser')||'{}');if(_u.avatar)currentUser.avatar=_u.avatar;}catch(e){}
const ghTotal=parseInt(localStorage.getItem('gh_total')||'0');
const displayTotal=ghTotal>0?ghTotal:(currentUser.total||0);
const ini=currentUser.name.slice(0,2).toUpperCase();
const ava=currentUser.avatar||'';
const avaDisp=ava||ini;
const avaSize=ava?'16px':'10px';
if(av){av.textContent=avaDisp;av.style.fontSize=avaSize;}
if(nm)nm.textContent=currentUser.name;
if(pts)pts.textContent=displayTotal.toLocaleString()+t('points.suffix');
if(tav){tav.textContent=avaDisp;tav.style.fontSize=avaSize;}
if(tpts)tpts.textContent=displayTotal.toLocaleString()+t('points.suffix');
if(mpts)mpts.textContent=displayTotal.toLocaleString();
if(spts)spts.textContent=displayTotal.toLocaleString();
// Update stats profile avatar if visible
const profAv=document.getElementById('profile-av-display');
if(profAv){profAv.textContent=ava||ini;profAv.style.fontSize=ava?'28px':'18px';}
// Update leaderboard own row
const myLbAv=document.getElementById('my-lb-av');
if(myLbAv){myLbAv.textContent=avaDisp;myLbAv.style.fontSize=avaSize;}
}else{
if(av)av.textContent='?';if(nm)nm.textContent=t('auth.not.logged.in');if(pts)pts.textContent='';
if(tav)tav.textContent='?';if(tpts)tpts.textContent='0 '+t('ui.points');
}
}
