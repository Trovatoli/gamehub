function initVier(opts){
const C=document.getElementById('gc');
const area=document.getElementById('canvas-area');
const CW=area?Math.max(area.clientWidth,400):700;
const CH=area?Math.max(area.clientHeight,360):540;
C.width=CW; C.height=CH;
const ctx=C.getContext('2d');

const COLS=7,ROWS=6;
// Calculate radius so grid fills ~85% of canvas
const R=Math.floor(Math.min((CW*0.88)/(COLS*2+COLS-1),(CH*0.78)/(ROWS*2+ROWS-1))/1);
const GAP=Math.floor(R*0.28);
const gridW=COLS*(R*2+GAP)-GAP;
const gridH=ROWS*(R*2+GAP)-GAP;
const OX=Math.floor((CW-gridW)/2); // center horizontally
const OY=Math.floor((CH-gridH)/2)+10; // center vertically

const depth={easy:2,medium:5,hard:8}[opts.diff||'medium']||5;
document.getElementById('g-status').textContent=t('vier.status.local');
const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(opts.players?.[1]?.type==='human'?(opts.players?.[1]?.name||'Spieler 2'):'KI');
document.getElementById('s2lbl').textContent=p2name;

let board=Array.from({length:ROWS},()=>Array(COLS).fill(0));
let hovCol=-1,over=false,turn=1,wins1=0,wins2=0;

function cx(c){return OX+c*(R*2+GAP)+R;}
function cy(r){return OY+r*(R*2+GAP)+R;}
function landRow(col){for(let r=ROWS-1;r>=0;r--)if(board[r][col]===0)return r;return -1;}
function drop(b,col,p){const r=landRow(col);if(r>=0)b[r][col]=p;return r;}

function checkWin(b){
const dirs=[[0,1],[1,0],[1,1],[1,-1]];
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
const v=b[r][c];if(!v)continue;
for(const[dr,dc]of dirs){
const line=[[r,c]];
for(let i=1;i<4;i++){
const nr=r+dr*i,nc=c+dc*i;
if(nr<0||nr>=ROWS||nc<0||nc>=COLS||b[nr][nc]!==v)break;
line.push([nr,nc]);
}
if(line.length===4)return{p:v,line};
}
}
return null;
}

function scoreWindow(window,p){
const opp=p===1?2:1;
const mine=window.filter(x=>x===p).length;
const empty=window.filter(x=>x===0).length;
const oppC=window.filter(x=>x===opp).length;
if(mine===4)return 10000;
if(mine===3&&empty===1)return 200;
if(mine===2&&empty===2)return 20;
if(oppC===3&&empty===1)return -180; // block opponent 3
if(oppC===2&&empty===2)return -10;
return 0;
}

function score(b,p){
let sc=0;
// Centre column preference (strong positional advantage)
const centre=[3,2,4,1,5,0,6];
const centreWeights=[10,6,6,3,3,1,1];
for(let r=0;r<ROWS;r++)
centre.forEach((c,i)=>{if(b[r][c]===p)sc+=centreWeights[i];});
// Bottom row bonus (control base)
for(let c=0;c<COLS;c++)if(b[ROWS-1][c]===p)sc+=4;

const dirs=[[0,1],[1,0],[1,1],[1,-1]];
for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
for(const[dr,dc]of dirs){
const win=[];
let valid=true;
for(let i=0;i<4;i++){
const nr=r+dr*i,nc=c+dc*i;
if(nr<0||nr>=ROWS||nc<0||nc>=COLS){valid=false;break;}
win.push(b[nr][nc]);
}
if(valid)sc+=scoreWindow(win,p);
}
}
return sc;
}

function minimax(b,d,alpha,beta,isMax){
const w=checkWin(b);
if(w)return w.p===2?10000+d:-10000-d;
if(d===0)return score(b,2)-score(b,1);
const cols=[];for(let c=0;c<COLS;c++)if(b[0][c]===0)cols.push(c);
if(!cols.length)return 0;
cols.sort((a,b2)=>Math.abs(a-3)-Math.abs(b2-3));
if(isMax){
let best=-Infinity;
for(const c of cols){const nb=b.map(r=>[...r]);drop(nb,c,2);best=Math.max(best,minimax(nb,d-1,alpha,beta,false));alpha=Math.max(alpha,best);if(beta<=alpha)break;}
return best;
}else{
let best=Infinity;
for(const c of cols){const nb=b.map(r=>[...r]);drop(nb,c,1);best=Math.min(best,minimax(nb,d-1,alpha,beta,true));beta=Math.min(beta,best);if(beta<=alpha)break;}
return best;
}
}

function bestMove(){
const cols=[];for(let c=0;c<COLS;c++)if(board[0][c]===0)cols.push(c);
if(!cols.length)return 3;
cols.sort((a,b)=>Math.abs(a-3)-Math.abs(b-3));
// 1. Immediate win
for(const c of cols){
const nb=board.map(r=>[...r]);drop(nb,c,2);
if(checkWin(nb))return c;
}
// 2. Block opponent immediate win
for(const c of cols){
const nb=board.map(r=>[...r]);drop(nb,c,1);
if(checkWin(nb))return c;
}
// 3. Minimax
let best=-Infinity,col=cols[0];
for(const c of cols){
const nb=board.map(r=>[...r]);drop(nb,c,2);
const sc=minimax(nb,depth,-Infinity,Infinity,false);
if(sc>best){best=sc;col=c;}
}
return col;
}

function draw(winLine){
// Background
ctx.fillStyle='#06060f';ctx.fillRect(0,0,CW,CH);

// Board background panel
const pad=R+GAP;
ctx.fillStyle='#0c1428';
ctx.beginPath();ctx.roundRect(OX-pad,OY-pad,gridW+pad*2,gridH+pad*2,14);ctx.fill();
ctx.strokeStyle='rgba(0,245,255,.12)';ctx.lineWidth=1.5;ctx.stroke();

// Column numbers
ctx.fillStyle='rgba(255,255,255,.22)';ctx.font=`bold ${Math.max(11,R*.55)}px monospace`;ctx.textAlign='center';
for(let c=0;c<COLS;c++)ctx.fillText(c+1,cx(c),OY-pad+R*.7);

// Cells
for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
const x=cx(c),y=cy(r),v=board[r][c];
// Hole shadow
ctx.fillStyle='rgba(0,0,0,.5)';ctx.beginPath();ctx.arc(x,y+2,R,0,Math.PI*2);ctx.fill();
// Hole
ctx.fillStyle='#050910';ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);ctx.fill();

// Hover preview — only landing row
// Hover: only when human is playing (not during AI turn)
const isHumanTurn=turn===1||(opts.players?.[1]?.type==='human'&&turn===2);
if(!over&&isHumanTurn&&c===hovCol&&r===landRow(c)){
ctx.globalAlpha=.28;ctx.fillStyle=turn===1?'#00f5ff':'#ffcc00';
ctx.beginPath();ctx.arc(x,y,R-2,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
}

// Piece
if(v===1){
const g=ctx.createLinearGradient(x-R,y-R,x+R,y+R);
g.addColorStop(0,'#33ffff');g.addColorStop(1,'#0099cc');
ctx.shadowColor='#00f5ff';ctx.shadowBlur=R*.6;
ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R-2,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
}else if(v===2){
const g=ctx.createLinearGradient(x-R,y-R,x+R,y+R);
g.addColorStop(0,'#ffe566');g.addColorStop(1,'#cc8800');
ctx.shadowColor='#ffcc00';ctx.shadowBlur=R*.5;
ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R-2,0,Math.PI*2);ctx.fill();
ctx.shadowBlur=0;
}

// Win ring
if(winLine&&winLine.some(([wr,wc])=>wr===r&&wc===c)){
ctx.strokeStyle='#fff';ctx.lineWidth=3;
ctx.shadowColor='#fff';ctx.shadowBlur=12;
ctx.beginPath();ctx.arc(x,y,R+1,0,Math.PI*2);ctx.stroke();
ctx.shadowBlur=0;
}
}

// Turn indicator
if(!over){
ctx.font=`${Math.max(11,R*.5)}px sans-serif`;ctx.textAlign='center';
const isLocal2P=!opts.isOnline&&opts.players?.[1]?.type==='human';
const myT2=opts.isOnline?(opts.isHost?1:2):(isLocal2P?turn:1);
const oppName=opts.isOnline?(opts.opponentName||'Gegner'):(isLocal2P?(opts.players?.[1]?.name||'Spieler 2'):'KI');
const lbl=isLocal2P?(turn===1?(opts.players?.[0]?.name||'P1')+(currentLang==='en'?"'s turn 🔵":' ist dran 🔵'):(opts.players?.[1]?.name||'P2')+(currentLang==='en'?"'s turn 🟡":' ist dran 🟡')):(turn===myT2?t('vier.your.turn'):(opts.isOnline?`⏳ ${oppName} ${currentLang==='en'?"'s turn":' ist dran'}`:(t('vier.ai.thinking'))));
ctx.fillStyle=turn===myT2?'rgba(0,245,255,.6)':'rgba(255,204,0,.6)';
ctx.fillText(lbl,CW/2,CH-12);
}
ctx.textAlign='left';
}

function showEndScreen(won){
// Dark overlay
ctx.fillStyle='rgba(0,0,0,.82)';ctx.fillRect(0,0,CW,CH);
// Big emoji
ctx.font=`${Math.round(CH*.12)}px serif`;ctx.textAlign='center';
ctx.fillText(won?'🎉':'😢',CW/2,CH*.28);
// Result text
ctx.fillStyle=won?'#00f5ff':'#ff4444';
ctx.font=`bold ${Math.round(CH*.075)}px sans-serif`;
const isLocal2P=!opts.isOnline&&opts.players?.[1]?.type==='human';
const p1name=opts.players?.[0]?.name||'Spieler 1';
const p2name=opts.isOnline?(opts.opponentName||'Gegner'):(isLocal2P?(opts.players?.[1]?.name||'Spieler 2'):'KI');
const winText=isLocal2P?(won?p1name+t('vier.p.win'):p2name+t('vier.p.win')):(opts.isOnline?(won?t('vier.you.win'):t('vier.opp.win2')):(won?'DU GEWINNST!':'KI GEWINNT!'));
ctx.fillText(winText,CW/2,CH*.46);
// Score
ctx.fillStyle='rgba(255,255,255,.7)';
ctx.font=`${Math.round(CH*.038)}px sans-serif`;
ctx.fillText(`${wins1} Siege · ${wins2} ${p2name}-Siege`,CW/2,CH*.57);
// Instruction
ctx.fillStyle='rgba(255,255,255,.35)';
ctx.font=`${Math.round(CH*.032)}px sans-serif`;
const hint=opts.isOnline?'Klicke "↺ Neu" für Rematch-Anfrage':'↺  Neustart drücken';
ctx.fillText(hint,CW/2,CH*.70);
ctx.textAlign='left';
if(opts.isOnline) showRematchOverlay(won);
else showLocalRematch(won?(opts.players?.[0]?.name||'Spieler 1'):(opts.players?.[1]?.name||'KI'));
}

function doAI(){
if(opts.isOnline)return; // No AI in online mode
if(over||!currentGame)return;
const col=bestMove();
drop(board,col,2);sndPlace();
const w=checkWin(board);
if(w){
wins2++;document.getElementById('s2').textContent=wins2;over=true;
draw(w.line);showEndScreen(false);
document.getElementById('g-status').textContent=t('vier.lose');sndFail();
}else{turn=1;draw();}
}

function onClick(e){
if(over)return;
// Online: host=player1(turn1), guest=player2(turn2)
// Local 2P: both players use same screen, allow current turn to click
const isLocal2P=!opts.isOnline&&opts.players?.[1]?.type==='human';
const myTurn=opts.isOnline?(opts.isHost?1:2):(isLocal2P?turn:1);
if(turn!==myTurn)return;
const rect=C.getBoundingClientRect();
const mx=(e.clientX-rect.left);
let col=-1;
for(let c=0;c<COLS;c++)if(Math.abs(mx-cx(c))<=R+GAP/2){col=c;break;}
if(col<0||landRow(col)<0)return;
drop(board,col,myTurn);sndPlace();
const w=checkWin(board);
if(w){
const p1won=myTurn===1;
if(p1won)wins1++;else wins2++;
document.getElementById(p1won?'s1':'s2').textContent=p1won?wins1:wins2;
syncLobbyScore(wins1,wins2);
over=true;draw(w.line);showEndScreen(p1won);
if(p1won)fbSaveScore('vier',200);
const winnerName=p1won?(opts.players?.[0]?.name||'Spieler 1'):(opts.players?.[1]?.name||'Spieler 2');
const _vierWinner=isLocal2P?winnerName:(p1won?(opts.players?.[0]?.name||'P1'):(opts.players?.[1]?.name||opts.aiName||'KI')); document.getElementById('g-status').textContent=_vierWinner+' '+t('game.win')+' 🎉 '+t('vier.restart.hint');
sndWin();
// Tell opponent they lost
if(opts.isOnline&&opts.onlineRoomId){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{col,uid:fbUser?.uid,turn:myTurn,ts:Date.now(),won:fbUser?.uid});
}
return;
}
// Switch to opponent's turn
turn=opts.isOnline?(opts.isHost?2:1):(turn===1?2:1);
draw();
// In online mode: write move to Firebase
if(opts.isOnline&&opts.onlineRoomId){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{col,uid:fbUser?.uid,turn:myTurn,ts:Date.now()});
} else if(opts.players?.[1]?.type!=='human'){
setTimeout(doAI,380);
} // local 2P: turn already switched above, draw() already called
}

function onMove(e){
const rect=C.getBoundingClientRect();
const mx=(e.clientX-rect.left);
let col=-1;
for(let c=0;c<COLS;c++)if(Math.abs(mx-cx(c))<=R+GAP/2){col=c;break;}
const isHumanTurn=turn===1||(opts.players?.[1]?.type==='human'&&turn===2);
if(col!==hovCol){hovCol=col;if(!over&&isHumanTurn)draw();}
}

function onKey(e){if(e.key==='p'||e.key==='P')togglePause();}
// Use pointerdown to avoid ghost clicks from restart button
let _pointerDownOnCanvas=false;
C.addEventListener('pointerdown',()=>{_pointerDownOnCanvas=true;});
C.addEventListener('click',(e)=>{
if(!_pointerDownOnCanvas)return;
_pointerDownOnCanvas=false;
onClick(e);
});
// Reset on any outside click
document.addEventListener('pointerdown',(e)=>{
if(e.target!==C)_pointerDownOnCanvas=false;
},{capture:true});
C.addEventListener('mousemove',onMove);
C.addEventListener('mouseleave',()=>{hovCol=-1;if(!over)draw();});
document.addEventListener('keydown',onKey);
// ── Online sync for 4 Gewinnt ──
if(opts.isOnline&&opts.onlineRoomId){
let lastMoveTs=Date.now()-5000; // ignore moves older than 5s on init
_safeInterval(async()=>{
if(paused||over)return;
const sync=await apiCall('rooms/'+opts.onlineRoomId+'/sync','GET');
if(!sync||sync.error)return;
// Handle both cases: server returns {sync:{...}} or just {...}
const moveSync=sync.sync||sync;
if(!moveSync||moveSync.col===undefined||!moveSync.ts)return;
if(moveSync.ts<=lastMoveTs)return;
if(moveSync.uid===fbUser?.uid)return;
lastMoveTs=moveSync.ts;

// Apply opponent's move
const col=moveSync.col;
const oppColor=opts.isHost?2:1;
const row=landRow(col);
if(row<0)return;
drop(board,col,oppColor);
sndPlace();
draw();
const w=checkWin(board);
if(w){
over=true;
draw(w.line);
showEndScreen(false);
document.getElementById('g-status').textContent=t('vier.opp.win');
sndFail();
} else {
turn=opts.isHost?1:2; // back to my turn
draw();
}
},300);
}

// ── Rematch system ───────────────────────────
// ── Rematch (shared helper) ─────────────────
const rematchSys=opts.isOnline&&opts.onlineRoomId
?createRematchSystem(opts.onlineRoomId,opts.isHost,()=>startGame(lastGameType,lastGameOpts))
:null;
function showRematchOverlay(won){if(rematchSys)rematchSys.show(won);}

currentGame._cleanup=()=>{
C.removeEventListener('click',onClick);
C.removeEventListener('mousemove',onMove);
document.removeEventListener('keydown',onKey);
};
draw();
}

// ════════════════════════════════════════════════
// SCHIFFE VERSENKEN
// ════════════════════════════════════════════════
