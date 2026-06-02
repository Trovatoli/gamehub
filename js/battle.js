function initBattle(opts){
const N=10;
// Read container size and compute CS to fill it
const _area=document.getElementById('canvas-area');
const _aw=_area?Math.max(_area.clientWidth,400):700;
const _ah=_area?Math.max(_area.clientHeight,320):500;
const LBL=22,GAP=Math.floor(_aw*0.04),PAD=10;
const TITLE_H=28;
// CS: fit two grids + gap + labels into available width/height
const CS=Math.max(20,Math.floor(Math.min(
(_aw-LBL*4-GAP-PAD*2)/(N*2),
(_ah-TITLE_H-LBL-PAD*2)/N
)));
const GW=N*CS,GH=N*CS;
const LX=PAD+LBL;
const RX=LX+GW+GAP+LBL;
const GY=TITLE_H+LBL+4;
// Canvas with DPR scaling for sharp rendering on HiDPI screens
const C=document.getElementById('gc');
C.width=_aw; C.height=_ah;
C.style.width=_aw+'px'; C.style.height=_ah+'px';
const TW=_aw, TH=_ah;
const ctx=C.getContext('2d');

// Ships: [length, name]
const SHIP_DEFS_DE=[[5,'Träger'],[4,'Schlachtschiff'],[3,'Kreuzer'],[3,'Zerstörer'],[2,'U-Boot']];
const SHIP_DEFS_EN=[[5,'Carrier'],[4,'Battleship'],[3,'Cruiser'],[3,'Destroyer'],[2,'Submarine']];
const SHIP_DEFS=currentLang==='en'?SHIP_DEFS_EN:SHIP_DEFS_DE;
const TOTAL_SHIPS=SHIP_DEFS.length;
const COL_LABELS=['A','B','C','D','E','F','G','H','I','J'];

const isLocal2P=!opts.isOnline&&opts.players?.[1]?.type==='human';
const vsAI=!opts.isOnline&&opts.players?.[1]?.type==='ai';
// Initialize phase tracking on currentGame
// Simple local variable - always in scope, no closure issues
let _activePhase=(isLocal2P||vsAI||opts.isOnline)?'p1_placing':'p1_shooting'; window._battlePhase='p1';
let _activeShooter=1;
let pidx=0,phoriz=true;
let pShips=[],aiShips=[];
// Local 2P: p2Ships is player2's ships, p2Hits/p2Miss are shots by player1 on player2
let p2Ships=[];
let oppShips=[]; // Online: opponent's ships (revealed on game end)
// Online hit tracking sets (declared here so draw() can always access them)
let pHitsOnline=new Set(),eMissOnline=new Set();
let aHitsOnline=new Set(),aMissOnline=new Set();
// P1 shoots at P2: p1ShotsOnP2=hits, p1MissOnP2=misses
let p1ShotsOnP2=new Set(),p1MissOnP2=new Set();
// P2 shoots at P1: p2ShotsOnP1=hits, p2MissOnP1=misses
let p2ShotsOnP1=new Set(),p2MissOnP1=new Set();
// Hits received by each player (shown on their own left grid)
let p1HitsOnMe=new Set(),p1MissOnMe=new Set();
let p2HitsOnMe=new Set(),p2MissOnMe=new Set();
// Legacy (used by AI mode)
let p2Hits=new Set(),p2Miss=new Set();
let pHits=new Set(),pMiss=new Set();
let aHits=new Set(),aMiss=new Set();
let placing=true,pTurn=true,dead=false,over=false;
let hr=-1,hc=-1;
let pSunk=0,aSunk=0,eSunk=0;

const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.type==='human'?(opts.players?.[1]?.name||'Spieler 2'):'KI');
document.getElementById('s2lbl').textContent=p2name;
document.getElementById('g-status').textContent=currentLang==='en'
?`🚢 Place: ${SHIP_DEFS[0][1]} (${SHIP_DEFS[0][0]} cells) | R=Rotate`
:`🚢 ${t('battle.place')}: ${SHIP_DEFS[0][1]} (${SHIP_DEFS[0][0]} ${t('battle.place.ships')}${t('battle.place.hint')}`;

// ── AI ship placement ──
function placeAI(){
aiShips=[];
const used=Array.from({length:N},()=>Array(N).fill(false));
for(const[len,name]of SHIP_DEFS){
let placed=false,tries=0;
while(!placed&&tries<2000){
tries++;
const h=Math.random()>.5;
const r=Math.floor(Math.random()*(h?N:N-len+1));
const c=Math.floor(Math.random()*(h?N-len+1:N));
let ok=true;
const cells=[];
for(let i=0;i<len;i++){
const nr=h?r:r+i,nc=h?c+i:c;
if(nr>=N||nc>=N||used[nr][nc]){ok=false;break;}
cells.push({r:nr,c:nc});
}
if(ok){cells.forEach(({r,c})=>used[r][c]=true);aiShips.push({cells,sunk:false});placed=true;}
}
}
}

function canPlace(r,c,h,len){
const used=Array.from({length:N},()=>Array(N).fill(false));
pShips.forEach(s=>s.cells.forEach(({r:sr,c:sc})=>used[sr][sc]=true));
for(let i=0;i<len;i++){
const nr=h?r:r+i,nc=h?c+i:c;
if(nr<0||nr>=N||nc<0||nc>=N||used[nr][nc])return false;
}
return true;
}

function checkSunk(ships,hits){
let newly=0;
ships.forEach(s=>{
if(!s.sunk&&s.cells.every(({r,c})=>hits.has(r+','+c))){s.sunk=true;newly++;}
});
return newly;
}

function checkEnd(){
const aiAllSunk=p2Ships.every(s=>s.sunk); // P1 wins when P2's ships all sunk
const pAllSunk=pShips.every(s=>s.sunk);   // P2 wins when P1's ships all sunk
const p1name=opts.players?.[0]?.name||'Spieler 1';
const p2name=opts.players?.[1]?.name||'Spieler 2';
if(aiAllSunk){
over=true;pSunk=TOTAL_SHIPS;
document.getElementById('s1').textContent=pSunk;
const _battleWinner=isLocal2P?(_activeShooter===1?p1name:(p2name||'P2')):(opts.players?.[0]?.name||'Du'); const winMsg=_battleWinner+' '+t('game.win')+' 🎉 '+t('battle.all.sunk');
document.getElementById('g-status').textContent=winMsg;
sndWin();
if(currentGame._rematch)setTimeout(()=>currentGame._rematch.show(true),400);
else if(isLocal2P)setTimeout(()=>showLocalRematch(currentGame._shooter===1?(opts.players?.[0]?.name||'P1'):(opts.players?.[1]?.name||'P2')),400);
}else if(pAllSunk){
over=true;aSunk=TOTAL_SHIPS;
document.getElementById('s2').textContent=aSunk;
const loseMsg=isLocal2P?(_activeShooter===2?p2name+t('snake.p.wins'):t('battle.lose.ai')):t('battle.lose.fleet');
document.getElementById('g-status').textContent=loseMsg;
sndFail();
if(currentGame._rematch)setTimeout(()=>currentGame._rematch.show(false),400);
else if(isLocal2P)setTimeout(()=>showLocalRematch(currentGame._shooter===2?(opts.players?.[1]?.name||'P2'):(opts.players?.[0]?.name||'P1')),400);
}
}

// Smart AI targeting
let aiTargets=[];
let aiHitStack=[];
let aiHitDir=null;
function aiShoot(){
if(over||dead)return;
let r,c,key;
if(aiTargets.length){
// Hunt mode: shoot adjacent to known hits
const t=aiTargets.shift();
r=t.r;c=t.c;
} else if(aiHitStack&&aiHitStack.length>0){
// Try to sink a ship we've hit - shoot in same direction
const last=aiHitStack[aiHitStack.length-1];
const dirs=aiHitDir?[aiHitDir]:[[0,1],[0,-1],[1,0],[-1,0]];
let found=false;
for(const [dr,dc] of dirs){
const nr=last.r+dr,nc=last.c+dc;
const nk=nr+','+nc;
if(nr>=0&&nr<N&&nc>=0&&nc<N&&!pHits.has(nk)&&!pMiss.has(nk)){
r=nr;c=nc;found=true;aiHitDir=[dr,dc];break;
}
}
if(!found){aiHitStack=[];aiHitDir=null;r=aiRandCell();c=aiRandCell2(r);}
} else {
// Hunt mode: checkerboard pattern
let tries=0;
do{
r=Math.floor(Math.random()*N);
c=Math.floor(Math.random()*N);
key=r+','+c;tries++;
// Prefer checkerboard pattern
if(tries<50&&(r+c)%2!==0)continue;
}while((pHits.has(key)||pMiss.has(key))&&tries<200);
}
key=r+','+c;
if(pHits.has(key)||pMiss.has(key)){pTurn=true;draw();return;}
const hit=pShips.some(s=>s.cells.some(({r:sr,c:sc})=>sr===r&&sc===c));
if(hit){
pHits.add(key);sndHit();
aiHitStack.push({r,c});
// Add adjacent cells to targets
[[0,1],[0,-1],[1,0],[-1,0]].forEach(([dr,dc])=>{
const nr=r+dr,nc=c+dc,nk=nr+','+nc;
if(nr>=0&&nr<N&&nc>=0&&nc<N&&!pHits.has(nk)&&!pMiss.has(nk))
aiTargets.push({r:nr,c:nc});
});
const sunkShip=pShips.find(s=>s.cells.every(({r:sr,c:sc})=>pHits.has(sr+','+sc)));
if(sunkShip){sunkShip.sunk=true;eSunk++;aiHitStack=[];aiHitDir=null;aiTargets=[];document.getElementById('s2').textContent=eSunk;}
} else {
pMiss.add(key);sndPlace();
if(aiHitDir)aiHitDir=null; // try other direction
}
draw();
const totalPlayerCells=pShips.reduce((a,sh)=>a+sh.cells.length,0);
if(pHits.size>=totalPlayerCells){
over=true;draw();
if(currentGame._rematch)setTimeout(()=>currentGame._rematch.show(false),400);
else if(isLocal2P)setTimeout(()=>showLocalRematch(currentGame._shooter===2?opts.players?.[1]?.name||'P2':opts.players?.[0]?.name||'P1'),400);
return;
}
if(!isLocal2P){if(hit){setTimeout(()=>aiShoot(),600);}else{setTimeout(()=>{pTurn=true;draw();},600);}}
}
function aiRandCell(){let v;do{v=Math.floor(Math.random()*N);}while(false);return v;}
function aiRandCell2(r){let c,k;do{c=Math.floor(Math.random()*N);k=r+','+c;}while(pHits.has(k)||pMiss.has(k));return c;}

function drawGrid(ox,oy,ships,hits,miss,showShips,isEnemy){
// Title
ctx.font='bold 11px sans-serif';ctx.textAlign='center';
ctx.fillStyle=isEnemy?'rgba(185,79,255,.8)':'rgba(0,245,255,.8)';
ctx.fillText(isEnemy?(currentLang==='en'?'ENEMY':'GEGNER'):(currentLang==='en'?'YOUR FIELD':'DEIN FELD'),ox+GW/2,oy-LBL+4);
// Col labels
ctx.font='10px monospace';ctx.fillStyle='rgba(255,255,255,.4)';
for(let c=0;c<N;c++){ctx.textAlign='center';ctx.fillText(COL_LABELS[c],ox+c*CS+CS/2,oy-4);}
// Row labels
for(let r=0;r<N;r++){ctx.textAlign='right';ctx.fillText(r+1,ox-4,oy+r*CS+CS/2+4);}
ctx.textAlign='left';
// Cells
for(let r=0;r<N;r++) for(let c=0;c<N;c++){
const px=ox+c*CS,py=oy+r*CS,key=r+','+c;
ctx.fillStyle='#050a18';ctx.fillRect(px,py,CS,CS);
ctx.strokeStyle='rgba(0,150,255,.15)';ctx.lineWidth=.5;ctx.strokeRect(px,py,CS,CS);
// own ships - use passed ships/hits params
if(showShips&&!isEnemy){
const inShip=ships.some(s=>s.cells.some(({r:sr,c:sc})=>sr===r&&sc===c)&&!s.sunk);
const inSunk=ships.some(s=>s.cells.some(({r:sr,c:sc})=>sr===r&&sc===c)&&s.sunk);
if(inShip&&!hits.has(key)){ctx.fillStyle='#1a4a7a';ctx.fillRect(px+1,py+1,CS-2,CS-2);}
if(inSunk){
ctx.fillStyle='rgba(255,0,40,.6)';ctx.fillRect(px,py,CS,CS);
ctx.strokeStyle='#ff0028';ctx.lineWidth=2;ctx.strokeRect(px+1,py+1,CS-2,CS-2);
}
}
// enemy sunk ships - use passed ships param
if(isEnemy){
const sunkShip=ships.find(s=>s.sunk&&s.cells.some(({r:sr,c:sc})=>sr===r&&sc===c));
if(sunkShip){
ctx.fillStyle='rgba(255,0,40,.7)';ctx.fillRect(px,py,CS,CS);
ctx.strokeStyle='#ff0028';ctx.lineWidth=2;ctx.shadowColor='#ff0028';ctx.shadowBlur=6;
ctx.strokeRect(px+1,py+1,CS-2,CS-2);ctx.shadowBlur=0;
}
}
// hits
if(hits.has(key)){
ctx.fillStyle='rgba(255,40,80,.35)';ctx.fillRect(px,py,CS,CS);
ctx.strokeStyle='#ff2850';ctx.lineWidth=2;ctx.shadowColor='#ff2850';ctx.shadowBlur=4;
ctx.beginPath();ctx.moveTo(px+4,py+4);ctx.lineTo(px+CS-4,py+CS-4);ctx.stroke();
ctx.beginPath();ctx.moveTo(px+CS-4,py+4);ctx.lineTo(px+4,py+CS-4);ctx.stroke();
ctx.shadowBlur=0;
}else if(miss.has(key)){
ctx.fillStyle='rgba(200,200,255,.12)';ctx.fillRect(px,py,CS,CS);
ctx.fillStyle='rgba(150,150,200,.5)';
ctx.beginPath();ctx.arc(px+CS/2,py+CS/2,3,0,Math.PI*2);ctx.fill();
}
// hover: enemy grid for shooting
if(isEnemy&&!placing&&pTurn&&!over&&r===hr&&c===hc&&!hits.has(key)&&!miss.has(key)){
ctx.strokeStyle='rgba(185,79,255,.8)';ctx.lineWidth=2;
ctx.shadowColor='#b94fff';ctx.shadowBlur=5;
ctx.strokeRect(px+1,py+1,CS-2,CS-2);ctx.shadowBlur=0;
}
// hover: own grid for placement
}

// Placement hover - drawn AFTER cell loop so cells don't overwrite it
if(!isEnemy&&placing&&pidx<TOTAL_SHIPS&&hr>=0&&hc>=0){
const len=SHIP_DEFS[pidx][0];
const ok=canPlace(hr,hc,phoriz,len);
for(let i=0;i<len;i++){
const nr=phoriz?hr:hr+i,nc=phoriz?hc+i:hc;
if(nr<0||nr>=N||nc<0||nc>=N)continue;
ctx.fillStyle=ok?'rgba(0,245,255,.45)':'rgba(255,40,80,.45)';
ctx.strokeStyle=ok?'rgba(0,245,255,.9)':'rgba(255,40,80,.9)';
ctx.lineWidth=2;
ctx.fillRect(ox+nc*CS+1,oy+nr*CS+1,CS-2,CS-2);
ctx.strokeRect(ox+nc*CS+2,oy+nr*CS+2,CS-4,CS-4);
}
}

}
function draw(){
if(dead)return;
ctx.fillStyle='#05050f';ctx.fillRect(0,0,C.width,C.height);
const phase=window._battlePhase||'p1';
if(phase==='p2_placing'){
// P2 placing their ships on left grid
drawGrid(LX,GY,pShips,new Set(),new Set(),true,false);
drawGrid(RX,GY,[],new Set(),new Set(),false,true);
} else if(phase==='p2_shooting'){
// P2's view: left=P2's own ships+hits on them, right=P1's ships to shoot at
drawGrid(LX,GY,p2Ships,p2HitsOnMe,p2MissOnMe,true,false);
drawGrid(RX,GY,pShips,p2ShotsOnP1,p2MissOnP1,false,true);
} else {
// P1's view: left=P1's own ships+hits on them, right=P2/AI ships to shoot at
// vs AI: pHits/pMiss are AI's shots on player; aHits/aMiss are player's shots on AI
// vsAI uses same sets as local: p1ShotsOnP2 for player shots, pHits for AI shots on player
let leftHits,leftMiss,rightHits,rightMiss;
if(opts.isOnline){
leftHits=pHitsOnline;leftMiss=eMissOnline;
rightHits=aHitsOnline;rightMiss=aMissOnline;
} else if(vsAI){
leftHits=pHits;leftMiss=pMiss;
rightHits=aHits;rightMiss=aMiss;
} else {
leftHits=p1HitsOnMe;leftMiss=p1MissOnMe;
rightHits=p1ShotsOnP2;rightMiss=p1MissOnP2;
}
drawGrid(LX,GY,pShips,leftHits,leftMiss,true,false);
drawGrid(RX,GY,p2Ships,rightHits,rightMiss,false,true);
// Player name labels
const myName=opts.players?.[0]?.name||currentUser?.name||'Du';
const oppName=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.name||( vsAI?'KI':'Spieler 2'));
ctx.font='bold 11px monospace';ctx.textAlign='center';
ctx.fillStyle='rgba(0,245,255,0.7)';
ctx.fillText(myName,LX+N*CS/2,GY-8);
ctx.fillStyle='rgba(255,100,100,0.7)';
ctx.fillText(oppName,RX+N*CS/2,GY-8);
ctx.textAlign='left';
}    // Bottom status bar
ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,C.height-26,C.width,26);
ctx.fillStyle='#aaa';ctx.font='11px sans-serif';ctx.textAlign='center';
if(placing&&pidx<TOTAL_SHIPS){
const[len,name]=SHIP_DEFS[pidx];
ctx.fillStyle='#00f5ff';
ctx.fillText(currentLang==='en'
?`▸ ${name} (${len} cells) | R=Rotate | ${pidx}/${TOTAL_SHIPS} placed`
:`▸ ${name} (${len} ${t('battle.place.ships')}${t('battle.place.hint')} | ${pidx}/${TOTAL_SHIPS} ${t('battle.place')}`
,C.width/2,C.height-9);
}else if(!over){
ctx.fillStyle=pTurn?'#00f5ff':'#b94fff';
ctx.fillText(pTurn?currentLang==="en"?'🎯 Click ENEMY grid to shoot | Hit = shoot again!':t('battle.your.shot'):currentLang==="en"?'⏳ AI is shooting...':t(opts.isOnline?'game.opp.turn':'vier.ai.turn'),C.width/2,C.height-9);
}else{
ctx.fillStyle='#ffcc00';ctx.font='bold 11px sans-serif';
const _bwMsg=pShips.every(s=>s.sunk)?(opts.aiName||'KI')+' '+t('game.win'):(opts.players?.[0]?.name||'Du')+' '+t('game.win'); ctx.fillText(_bwMsg,C.width/2,C.height-9);
}
ctx.textAlign='left';
}

function getCell(mx,my,ox,oy){
const c=Math.floor((mx-ox)/CS),r=Math.floor((my-oy)/CS);
return(r>=0&&r<N&&c>=0&&c<N)?{r,c}:null;
}

const onMM=e=>{
const rect=C.getBoundingClientRect();
const mx=(e.clientX-rect.left);
const my=(e.clientY-rect.top);
const ox=placing?LX:RX;
const cell=getCell(mx,my,ox,GY);
if(cell){hr=cell.r;hc=cell.c;}else{hr=-1;hc=-1;}
draw();
};
const onML=()=>{hr=-1;hc=-1;draw();};

let _blockClicks=false;
const onCL=e=>{
if(over)return;
if(_blockClicks)return;
const rect=C.getBoundingClientRect();
const mx=(e.clientX-rect.left);
const my=(e.clientY-rect.top);
if(placing){
const cell=getCell(mx,my,LX,GY);
if(!cell)return;
const[len,name]=SHIP_DEFS[pidx];
if(!canPlace(cell.r,cell.c,phoriz,len))return;
const cells=[];
for(let i=0;i<len;i++) cells.push({r:phoriz?cell.r:cell.r+i,c:phoriz?cell.c+i:cell.c});
pShips.push({cells,sunk:false,size:len,horiz:phoriz});sndPlace();pidx++;
if(pidx>=TOTAL_SHIPS){
if(opts.isOnline&&opts.onlineRoomId&&_activePhase==='p1_placing'){
placing=false;
const myShipsData=pShips.map(s=>({cells:s.cells,size:s.size,horiz:s.horiz}));
const shipKey=opts.isHost?'hostShips':'guestShips';
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{[shipKey]:myShipsData,ts:Date.now()});
document.getElementById('g-status').textContent=t('battle.waiting.ships');
const readyPoll=_safeInterval(async()=>{
if(over)return;
const res=await apiCall('rooms/'+opts.onlineRoomId+'/sync','GET');
const d=res?.sync||res;
const oppKey=opts.isHost?'guestShips':'hostShips';
if(!d||!d[oppKey]||!d[shipKey])return;
clearInterval(readyPoll);
const oppShips=d[oppKey].map(s=>({...s,sunk:false}));
if(opts.isHost){
aiShips=oppShips;p2Ships=aiShips; // same reference so sunk syncs
} else {
aiShips=oppShips;p2Ships=aiShips; // same reference so sunk syncs
}
window._battlePhase='p1';_activePhase='p1_shooting';
_activeShooter=1;pTurn=!!opts.isHost;
showToast(t('battle.start.toast')+(opts.isHost?t('battle.your.turn2'):t('battle.host.first')));
document.getElementById('g-status').textContent=
opts.isHost?(currentLang==='en'?'🎯 Your turn! Click the right field!':t('game.your.turn')):(currentLang==='en'?'⏳ Waiting for host...':t('game.wait.host'));
setTimeout(draw,100);
},1500);
} else if(vsAI&&_activePhase==='p1_placing'){
// vs AI: P1 done - AI places ships randomly, then start
placing=false;
currentGame._p1Ships=[...pShips];
// Place AI ships randomly
aiShips.length=0;
const SIZES=[5,4,3,3,2];
const grid=Array(N).fill(null).map(()=>Array(N).fill(false));
SIZES.forEach(size=>{
let placed=false;
while(!placed){
const horiz=Math.random()<.5;
const r=Math.floor(Math.random()*(N-(horiz?0:size)));
const c=Math.floor(Math.random()*(N-(horiz?size:0)));
const cells=[];
let ok=true;
for(let i=0;i<size;i++){
const nr=horiz?r:r+i,nc=horiz?c+i:c;
if(grid[nr]?.[nc]){ok=false;break;}
cells.push({r:nr,c:nc});
}
if(ok){cells.forEach(({r,c})=>grid[r][c]=true);aiShips.push({cells,size,horiz});placed=true;}
}
});
p2Ships=aiShips; // same reference: sunk state syncs to draw
window._battlePhase='p1';_activePhase='p1_shooting';
_activeShooter=1;pTurn=true;
document.getElementById('g-status').textContent=t('battle.your.shot');
draw();
} else if(isLocal2P){
if(_activePhase==='p2_placing'){
// P2 done placing - save P2 ships, restore P1, start game
p2Ships=[...pShips];
pShips.length=0;
if(currentGame._p1Ships)(currentGame._p1Ships).forEach(s=>pShips.push(s));
// aiShips = P1's ships (P2 shoots at these)
aiShips.length=0;
pShips.forEach(s=>aiShips.push(s));
placing=false;
showHandoff(opts.players?.[1]?.name||'Spieler 2', opts.players?.[0]?.name||'Spieler 1', 'shoot', ()=>{
window._battlePhase='p1'; _activePhase='p1_shooting';
_activeShooter=1;
pTurn=true;
document.getElementById('g-status').textContent=(opts.players?.[0]?.name||t('lobby.players')+' 1')+t('battle.p1.shoot');
draw();
});
} else {
// P1 done placing - show handoff screen for P2
placing=false;
// Save and clear P1 ships NOW so draw() shows empty grid during handoff
currentGame._p1Ships=[...pShips];
pShips.length=0;
window._battlePhase='p2_placing'; _activePhase='p2_placing';
showHandoff(opts.players?.[0]?.name||'Spieler 1', opts.players?.[1]?.name||'Spieler 2', 'place', ()=>{
// P2 now places ships
pidx=0; phoriz=true;
placing=true; // re-enable placing for P2
document.getElementById('g-status').textContent=(opts.players?.[1]?.name||t('lobby.players')+' 2')+t('battle.p2.place');
draw();
});
}
} else {
placing=false;placeAI();
document.getElementById('g-status').textContent=t('battle.shoot.hint');                                                                                                                                                                                                                                            }
}else{
const[nl,nn]=SHIP_DEFS[pidx];
document.getElementById('g-status').textContent=`🚢 ${t('battle.place')}: ${nn} (${nl} ${t('battle.place.ships')}${t('battle.place.hint')} | ${pidx}/${TOTAL_SHIPS};`;
}
draw();
}else if(pTurn){
const cell=getCell(mx,my,RX,GY);if(!cell)return;
const key=cell.r+','+cell.c;
if(opts.isOnline?(aHitsOnline.has(key)||aMissOnline.has(key)):(aHits.has(key)||aMiss.has(key)))return;

if(opts.isOnline&&opts.onlineRoomId&&currentGame._battleWs){
// Online: send shot via WebSocket
pTurn=false;
const myR=currentGame._battleMyRole||myRole;
currentGame._battleWs.send(JSON.stringify({type:'battle_shot',from:myR,r:cell.r,c:cell.c}));
document.getElementById('g-status').textContent=t('game.waiting');
draw();
} else {
// Determine which sets to use based on who is shooting
const isP2Shooting=window._battlePhase==='p2_shooting';
const targetShips=isP2Shooting?pShips:(vsAI?aiShips:p2Ships);
const hitsSet=isP2Shooting?p2ShotsOnP1:(vsAI?aHits:p1ShotsOnP2);
const missSet=isP2Shooting?p2MissOnP1:(vsAI?aMiss:p1MissOnP2);
const hitsOnTarget=isP2Shooting?p1HitsOnMe:p2HitsOnMe;
const missOnTarget=isP2Shooting?p1MissOnMe:p2MissOnMe;

const hit=targetShips.some(s=>s.cells.some(({r,c})=>r===cell.r&&c===cell.c));
if(hit){
hitsSet.add(key);hitsOnTarget.add(key);sndHit();
const n=checkSunk(targetShips,hitsSet);
if(n>0){
if(isP2Shooting){aSunk+=n;document.getElementById('s2').textContent=aSunk;}
else{pSunk+=n;document.getElementById('s1').textContent=pSunk;}
}
draw();checkEnd();
}else{
missSet.add(key);missOnTarget.add(key);sndPlace();pTurn=false;draw();
if(!over){
if(vsAI&&_activePhase==='p1_placing'){
// vs AI: P1 done - AI places ships randomly, then start
placing=false;
currentGame._p1Ships=[...pShips];
// Place AI ships randomly
aiShips.length=0;
const SIZES=[5,4,3,3,2];
const grid=Array(N).fill(null).map(()=>Array(N).fill(false));
SIZES.forEach(size=>{
let placed=false;
while(!placed){
const horiz=Math.random()<.5;
const r=Math.floor(Math.random()*(N-(horiz?0:size)));
const c=Math.floor(Math.random()*(N-(horiz?size:0)));
const cells=[];
let ok=true;
for(let i=0;i<size;i++){
const nr=horiz?r:r+i,nc=horiz?c+i:c;
if(grid[nr]?.[nc]){ok=false;break;}
cells.push({r:nr,c:nc});
}
if(ok){cells.forEach(({r,c})=>grid[r][c]=true);aiShips.push({cells,size,horiz});placed=true;}
}
});
p2Ships=aiShips // same reference: sunk state syncs;
window._battlePhase='p1';_activePhase='p1_shooting';
_activeShooter=1;pTurn=true;
document.getElementById('g-status').textContent=t('battle.your.shot');
draw();
} else if(isLocal2P){
const p1name=opts.players?.[0]?.name||'Spieler 1';
const p2name=opts.players?.[1]?.name||'Spieler 2';
if(_activeShooter===2){
// P2 missed - switch back to P1
showHandoff(p2name, p1name, 'shoot', ()=>{
window._battlePhase='p1'; _activePhase='p1_shooting';
_activeShooter=1;
pTurn=true;
// Save P2's shots on P1 as p2Hits
p2Hits=new Set(aHits); p2Miss=new Set(aMiss);
// pHits = damage ON P1 from P2's shots
pHits=new Set(aHits); pMiss=new Set(aMiss);
// Restore P1's shots on P2
aHits=currentGame._savedAiHits||new Set();
aMiss=currentGame._savedAiMiss||new Set();
pSunk=currentGame._savedPSunk||0;
aiShips.length=0; p2Ships.forEach(s=>aiShips.push(s));
document.getElementById('g-status').textContent=p1name+t('battle.p1.shoot');
draw();
});
} else {
// P1 missed - switch to P2
showHandoff(p1name, p2name, 'shoot', ()=>{
window._battlePhase='p2_shooting'; _activePhase='p2_shooting';
_activeShooter=2;
pTurn=true;
// Save P1's shots on P2 for display on P2's left grid
currentGame._savedAiHits=new Set(aHits);
currentGame._savedAiMiss=new Set(aMiss);
currentGame._savedPSunk=pSunk;
// pHits/pMiss = P1's shots ON P2 (shown on P2's left grid as damage)
pHits=new Set(aHits); pMiss=new Set(aMiss);
// aHits/aMiss = P2's shots on P1 (right grid for P2)
aHits=p2Hits; aMiss=p2Miss;
aiShips.length=0; pShips.forEach(s=>aiShips.push(s));
document.getElementById('g-status').textContent=p2name+t('battle.p1.shoot');
draw();
});
}
} else {
setTimeout(aiShoot,700);
}
}
}
}
}
};

function onKey(e){
if(e.key==='p'||e.key==='P'){togglePause();return;}
if(placing&&(e.key==='r'||e.key==='R')){phoriz=!phoriz;draw();}
}
document.addEventListener('keydown',onKey);
C.addEventListener('mousemove',onMM);
// Touch support
C.addEventListener('touchstart',e=>{e.preventDefault();const t=e.touches[0];const rect=C.getBoundingClientRect();onMM({clientX:t.clientX,clientY:t.clientY});},{passive:false});
C.addEventListener('touchend',e=>{e.preventDefault();const t=e.changedTouches[0];onCL({clientX:t.clientX,clientY:t.clientY,stopPropagation:()=>{}});},{passive:false});
C.addEventListener('mouseleave',onML);
C.addEventListener('click',onCL);

// ── Online sync for Schiffe versenken ────────────
if(opts.isOnline&&opts.onlineRoomId){
const myRole=opts.isHost?'host':'guest';
const oppRole=opts.isHost?'guest':'host';
// Connect via WebSocket for real-time battle
const proto=location.protocol==='https:'?'wss:':'ws:';
const bWs=new WebSocket(proto+'//'+location.host);
bWs.onclose=()=>{if(!over){showToast(t('conn.lost'));document.getElementById('g-status').textContent=t('conn.lost');}};
bWs.onopen=()=>{
bWs.send(JSON.stringify({type:'join',roomId:opts.onlineRoomId,role:myRole,name:currentUser?.name||'Spieler'}));
};
bWs.onmessage=(ev)=>{
try{
const msg=JSON.parse(ev.data);
// Opponent shot at me
if(msg.type==='battle_shot'&&msg.from===oppRole){
const {r,c}=msg;
const key=r+','+c;
const hit=pShips.some(ship=>ship.cells.some(sc=>sc.r===r&&sc.c===c));
// Update visuals
if(hit){
pHitsOnline.add(key);
pShips.forEach(ship=>{if(ship.cells.every(sc=>pHitsOnline.has(sc.r+','+sc.c)))ship.sunk=true;});
eSunk=pShips.filter(s=>s.sunk).length;
sndHit();
} else {
eMissOnline.add(key);
sndPlace();
}
draw();
// Send result back - ALWAYS exactly once
bWs.send(JSON.stringify({type:'battle_result',from:myRole,r,c,hit}));
// Check if I lost
if(hit){
const totalCells=pShips.reduce((a,sh)=>a+sh.cells.length,0);
if(pHitsOnline.size>=totalCells){
over=true;
document.getElementById('g-status').textContent=t('battle.you.lose');
sndFail();if(currentGame&&!currentGame._battleData){currentGame._battleData=opts.isOnline?{
// aHitsOnline = MY hits on opp, aMissOnline = MY misses on opp
// pHitsOnline = OPP hits on ME, eMissOnline = OPP misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHitsOnline||new Set(),myMissesOnOpp:aMissOnline||new Set(),
oppHitsOnMe:pHitsOnline||new Set(),oppMissesOnMe:eMissOnline||new Set()
}:{
// VS AI: aHits=my hits on AI, aMiss=my misses on AI
// pHits=AI hits on me, pMiss=AI misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHits||new Set(),myMissesOnOpp:aMiss||new Set(),
oppHitsOnMe:pHits||new Set(),oppMissesOnMe:pMiss||new Set()
};}
showBattleEndScreen(false);return;
}
}
// Give me a turn if opponent missed
if(!hit){pTurn=true;document.getElementById('g-status').textContent=t('game.your.turn');}
draw();
}
// Result of my shot
if(msg.type==='battle_result'&&msg.from===oppRole){
const {r,c,hit}=msg;
const key=r+','+c;
if(hit){
aHitsOnline.add(key);sndHit();
const n=checkSunk(aiShips,aHitsOnline);
if(n>0){
pSunk+=n;document.getElementById('s1').textContent=pSunk;
aiShips.forEach(ship=>{if(ship.cells.every(sc=>aHitsOnline.has(sc.r+','+sc.c)))ship.sunk=true;});
}
draw(); // draw hit first
// Check win - only when aiShips are loaded and all cells hit
const totalOpp=aiShips.reduce((a,sh)=>a+sh.cells.length,0);
if(totalOpp>0&&aHitsOnline.size>=totalOpp){
over=true;
document.getElementById('g-status').textContent=(opts.players?.[0]?.name||'Du')+' '+t('game.win');
sndWin();fbSaveScore('battle',500);
if(currentGame._battleWs&&currentGame._battleWs.readyState===1)
currentGame._battleWs.send(JSON.stringify({type:'battle_over',winner:myRole}));
if(currentGame&&!currentGame._battleData){currentGame._battleData=opts.isOnline?{
// aHitsOnline = MY hits on opp, aMissOnline = MY misses on opp
// pHitsOnline = OPP hits on ME, eMissOnline = OPP misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHitsOnline||new Set(),myMissesOnOpp:aMissOnline||new Set(),
oppHitsOnMe:pHitsOnline||new Set(),oppMissesOnMe:eMissOnline||new Set()
}:{
// VS AI: aHits=my hits on AI, aMiss=my misses on AI
// pHits=AI hits on me, pMiss=AI misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHits||new Set(),myMissesOnOpp:aMiss||new Set(),
oppHitsOnMe:pHits||new Set(),oppMissesOnMe:pMiss||new Set()
};}
showBattleEndScreen(true);
return;
}
// Hit but not winning yet - shoot again
pTurn=true;
document.getElementById('g-status').textContent=t('battle.hit');
draw();
} else {
aMissOnline.add(key);sndPlace();
pTurn=false;
document.getElementById('g-status').textContent=t('game.opp.turn');
}
draw();
}
if(msg.type==='opponent_left'){showToast(t('opp.quit'));over=true;showLocalRematch('');}
if(msg.type==='battle_rematch'){
// Winner sent new room - join it
const newRoomId=msg.roomId;
apiCall('rooms/'+newRoomId+'/join','POST',{}).then(()=>{
document.getElementById('battle-end')?.remove();
stopAll();
startGame('battle',{
...opts,
onlineRoomId:newRoomId,
isHost:false,
opponentName:opts.isHost?opts.opponentName:opts.players?.[0]?.name||'Host'
});
});
}
if(msg.type==='battle_over'){
over=true;draw();
document.getElementById('g-status').textContent=t('battle.you.lose');
sndFail();if(currentGame&&!currentGame._battleData){currentGame._battleData=opts.isOnline?{
// aHitsOnline = MY hits on opp, aMissOnline = MY misses on opp
// pHitsOnline = OPP hits on ME, eMissOnline = OPP misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHitsOnline||new Set(),myMissesOnOpp:aMissOnline||new Set(),
oppHitsOnMe:pHitsOnline||new Set(),oppMissesOnMe:eMissOnline||new Set()
}:{
// VS AI: aHits=my hits on AI, aMiss=my misses on AI
// pHits=AI hits on me, pMiss=AI misses on me
myShips:pShips||[],oppShips:aiShips||[],
myHitsOnOpp:aHits||new Set(),myMissesOnOpp:aMiss||new Set(),
oppHitsOnMe:pHits||new Set(),oppMissesOnMe:pMiss||new Set()
};}
showBattleEndScreen(false);
}
}catch(ex){console.error('battle ws error:',ex);}
};
// Override click handler to use WS
currentGame._battleWs=bWs;
currentGame._battleMyRole=myRole;
}

// ── Online rematch ───────────────────────────
if(opts.isOnline&&opts.onlineRoomId){
const rematch=createRematchSystem(opts.onlineRoomId,opts.isHost,()=>startGame(lastGameType,lastGameOpts));
currentGame._rematch=rematch;
}

// ── Hot-seat handoff screen ─────────────────
function showHandoff(donePlayer, nextPlayer, mode, onReady){
const ca=document.getElementById('canvas-area');
const div=document.createElement('div');
div.style.cssText='position:absolute;inset:0;background:#06060f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;z-index:20;';
const modeText=mode==='place'?t('battle.place.ships'):'play';
div.innerHTML=`
<div style="font-size:48px">🙈</div>
<div style="font-size:20px;font-weight:900;color:#00f5ff">${donePlayer} is done!</div>
<div style="font-size:14px;color:rgba(255,255,255,.6);text-align:center">Please look away or hand the device to<br><strong style="color:#ffcc00">${nextPlayer}</strong></div>
<button id="handoff-btn" style="margin-top:10px;padding:14px 40px;background:#00f5ff;color:#000;border:none;border-radius:12px;font-weight:900;font-size:16px;cursor:pointer;font-family:inherit">
✅ ${nextPlayer} is ready
</button>`;
ca.appendChild(div);
div.querySelector('#handoff-btn').addEventListener('click',(e)=>{
e.stopPropagation();
e.preventDefault();
_blockClicks=true;
div.remove();
setTimeout(()=>{
onReady();
setTimeout(()=>{_blockClicks=false;},300);
},100);
});
}

currentGame._cleanup=()=>{
dead=true;
document.removeEventListener('keydown',onKey);
C.removeEventListener('mousemove',onMM);
C.removeEventListener('click',onCL);
C.removeEventListener('mouseleave',onML);
};
draw();
}
