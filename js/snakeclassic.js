function initSnakeClassic(opts){
// Solo mode: hide KI score chip
const _chip=document.getElementById('s2-chip');
if(_chip)_chip.style.display='none';
const C=document.getElementById('gc');
const area=document.getElementById('canvas-area');
const AW=area?area.clientWidth:500;
const AH=area?area.clientHeight:500;
const S=22; // cell size - bigger
const COLS=Math.floor((AW-4)/S);
const ROWS=Math.floor((AH-40)/S); // 40px for score bar at top
const OX=Math.floor((AW-COLS*S)/2); // center horizontally
const OY=40; // start below score bar
C.width=AW; C.height=ROWS*S+OY;

const ctx=C.getContext('2d');

// Nokia-style palette
const COL_BG='#1a2a12';        // dark green background
const COL_BOARD='#4a7c3f';     // lighter green board
const COL_SNAKE='#1a2a12';     // dark snake (contrasts with board)
const COL_FOOD='#e8001c';      // red apple
const COL_SCORE_BG='#2a3d1c';
const COL_SCORE_TXT='#8fbc5a';
const COL_BORDER='#2d4d1e';

let snake=[
{x:Math.floor(COLS/2),y:Math.floor(ROWS/2)},
{x:Math.floor(COLS/2)-1,y:Math.floor(ROWS/2)},
{x:Math.floor(COLS/2)-2,y:Math.floor(ROWS/2)}
];
let dir={x:1,y:0};
let nextDir={x:1,y:0};
let food=placeFood();
let score=0;
let highScore=parseInt(localStorage.getItem('sc_snakeclassic')||'0');
let dead=false;
let started=false;
let speed=160;
let frameCount=0;

function placeFood(){
let f;
do{f={x:Math.floor(Math.random()*COLS),y:Math.floor(Math.random()*ROWS)};}
while(snake.some(s=>s.x===f.x&&s.y===f.y));
return f;
}

function drawCell(x,y,color,r=3){
const px=OX+x*S,py=OY+y*S;
ctx.fillStyle=color;
ctx.beginPath();
ctx.roundRect(px+1,py+1,S-2,S-2,r);
ctx.fill();
}

function draw(){
// Score bar
ctx.fillStyle=COL_SCORE_BG;
ctx.fillRect(0,0,C.width,OY);
ctx.fillStyle=COL_SCORE_TXT;
ctx.font='bold 13px monospace';
ctx.textAlign='left';
ctx.fillText('SCORE '+String(score).padStart(4,'0'),8,26);
ctx.textAlign='right';
ctx.fillText('BEST  '+String(highScore).padStart(4,'0'),C.width-8,26);

// Board background
ctx.fillStyle=COL_BOARD;
ctx.fillRect(OX,OY,COLS*S,ROWS*S);

// Grid dots (Nokia style)
ctx.fillStyle='rgba(0,0,0,0.12)';
for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
ctx.beginPath();
ctx.arc(OX+c*S+S/2,OY+r*S+S/2,1,0,Math.PI*2);
ctx.fill();
}

// Food - red apple with stem and highlight
if(true){
const fx=OX+food.x*S+S/2, fy=OY+food.y*S+S/2, fr=S/2-2;
// Apple body
ctx.fillStyle=COL_FOOD;
ctx.beginPath();ctx.arc(fx,fy+1,fr,0,Math.PI*2);ctx.fill();
// Shine
ctx.fillStyle='rgba(255,255,255,0.35)';
ctx.beginPath();ctx.ellipse(fx-fr*0.3,fy-fr*0.25,fr*0.3,fr*0.2,-0.5,0,Math.PI*2);ctx.fill();
// Stem
ctx.strokeStyle='#3a2000';ctx.lineWidth=1.5;
ctx.beginPath();ctx.moveTo(fx,fy-fr);ctx.quadraticCurveTo(fx+3,fy-fr-4,fx+4,fy-fr-6);ctx.stroke();
// Leaf
ctx.fillStyle='#22a030';
ctx.beginPath();ctx.ellipse(fx+5,fy-fr-4,4,2,0.8,0,Math.PI*2);ctx.fill();
}

// Snake - dark squares on green board
snake.forEach((seg,i)=>{
const isHead=i===0;
ctx.fillStyle=COL_SNAKE;
ctx.beginPath();
ctx.roundRect(OX+seg.x*S+1,OY+seg.y*S+1,S-2,S-2,isHead?4:2);
ctx.fill();
// Eyes on head
if(isHead){
ctx.fillStyle=COL_BOARD;
const ex=dir.x,ey=dir.y;
const cx2=OX+seg.x*S+S/2,cy2=OY+seg.y*S+S/2;
const eyeOff=3;
if(ex!==0){
ctx.beginPath();ctx.arc(cx2+ex*3,cy2-eyeOff,2,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(cx2+ex*3,cy2+eyeOff,2,0,Math.PI*2);ctx.fill();
} else {
ctx.beginPath();ctx.arc(cx2-eyeOff,cy2+ey*3,2,0,Math.PI*2);ctx.fill();
ctx.beginPath();ctx.arc(cx2+eyeOff,cy2+ey*3,2,0,Math.PI*2);ctx.fill();
}
}
});

// Start hint
if(!started){
ctx.fillStyle='rgba(26,42,18,0.7)';
ctx.fillRect(OX,OY+ROWS*S/2-20,COLS*S,40);
ctx.fillStyle=COL_SCORE_TXT;
ctx.font='bold 13px monospace';
ctx.textAlign='center';
ctx.fillText('PRESS ARROW TO START',OX+COLS*S/2,OY+ROWS*S/2+5);
}
}

function update(){
if(dead||!started||paused)return;
dir={...nextDir};
const head={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
if(head.x<0||head.x>=COLS||head.y<0||head.y>=ROWS){gameOver();return;}
if(snake.some(s=>s.x===head.x&&s.y===head.y)){gameOver();return;}
snake.unshift(head);
if(head.x===food.x&&head.y===food.y){
score+=10;
if(score>highScore){highScore=score;localStorage.setItem('sc_snakeclassic',highScore);}
food=placeFood();
sndPlace();
if(score%50===0&&speed>80)speed=Math.max(80,speed-10);
} else {
snake.pop();
}
draw();
}

function gameOver(){
dead=true;
sndFail();
// Flash the snake
let f=0;
const fl=setInterval(()=>{
f++;
snake.forEach(seg=>{
ctx.fillStyle=f%2===0?COL_BOARD:'rgba(80,20,20,0.8)';
ctx.fillRect(OX+seg.x*S,OY+seg.y*S,S,S);
});
if(f>=6){
clearInterval(fl);
draw();
// Game over overlay
ctx.fillStyle='rgba(26,42,18,0.82)';
ctx.fillRect(OX+8,OY+ROWS*S/2-36,COLS*S-16,78);
ctx.strokeStyle=COL_SCORE_TXT;ctx.lineWidth=2;
ctx.strokeRect(OX+8,OY+ROWS*S/2-36,COLS*S-16,78);
ctx.fillStyle=COL_SCORE_TXT;
ctx.font='bold 16px monospace';ctx.textAlign='center';
ctx.fillText(t('snake.game.over'),OX+COLS*S/2,OY+ROWS*S/2-12);
ctx.font='12px monospace';
ctx.fillText('SCORE: '+String(score).padStart(4,'0'),OX+COLS*S/2,OY+ROWS*S/2+10);
ctx.fillText('BEST:  '+String(highScore).padStart(4,'0'),OX+COLS*S/2,OY+ROWS*S/2+28);
document.getElementById('g-status').textContent='GAME OVER — Score: '+score;
fbSaveScore('snakeclassic',score);
// Show global leaderboard
setTimeout(()=>showSnakeClassicLeaderboard(score,C,ctx,OX,OY,COLS,ROWS,S,COL_BOARD,COL_SCORE_TXT),400);
}
},80);
}

const useWASD=opts.ctrl==='WASD';
function onKey(e){
const arrowMap={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0}};
const wasdMap={w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}};
const map=useWASD?wasdMap:arrowMap;
const nd=map[e.key];
if(!nd)return;
if(nd.x===-dir.x&&nd.y===-dir.y)return;
nextDir=nd;
if(!started)started=true;
e.preventDefault();
}

// Touch swipe
let tx=0,ty=0;
C.addEventListener('touchstart',ev=>{tx=ev.touches[0].clientX;ty=ev.touches[0].clientY;ev.preventDefault();},{passive:false});
C.addEventListener('touchend',ev=>{
const dx=ev.changedTouches[0].clientX-tx,dy=ev.changedTouches[0].clientY-ty;
if(Math.abs(dx)<15&&Math.abs(dy)<15)return;
if(Math.abs(dx)>Math.abs(dy)){onKey({key:dx>0?'ArrowRight':'ArrowLeft',preventDefault:()=>{}});}
else{onKey({key:dy>0?'ArrowDown':'ArrowUp',preventDefault:()=>{}});}
ev.preventDefault();
},{passive:false});

document.addEventListener('keydown',onKey);
draw();

// Render loop (draw food blink)
const renderLoop=setInterval(()=>{if(!dead&&!paused)draw();},400);
// Game tick
const gameLoop=setInterval(()=>{if(!dead)update();},speed);
currentGame._gameLoop=gameLoop;
currentGame._renderLoop=renderLoop;

currentGame._cleanup=()=>{
document.removeEventListener('keydown',onKey);
clearInterval(gameLoop);clearInterval(renderLoop);
};

async function showSnakeClassicLeaderboard(myScore,C,ctx,OX,OY,COLS,ROWS,S,COL_BOARD,COL_SCORE_TXT){
// Save score first then fetch leaderboard
let lb=[];
try{
const r=await fetch('/api/leaderboard/snakeclassic');
const d=await r.json();
lb=d?.leaderboard||[];
}catch(ex){lb=[];}
// Draw leaderboard on canvas
const W=COLS*S,H=ROWS*S;
ctx.fillStyle='rgba(10,20,8,0.92)';
ctx.fillRect(OX,OY,W,H);
ctx.strokeStyle=COL_SCORE_TXT;ctx.lineWidth=2;
ctx.strokeRect(OX+4,OY+4,W-8,H-8);
// Title
ctx.fillStyle=COL_SCORE_TXT;
ctx.font='bold 15px monospace';ctx.textAlign='center';
ctx.fillText('🏆 HIGHSCORES',OX+W/2,OY+24);
ctx.fillStyle='rgba(143,188,90,0.4)';
ctx.fillRect(OX+8,OY+30,W-16,1);
// Entries
ctx.font='12px monospace';
const medals=['🥇','🥈','🥉'];
lb.slice(0,8).forEach((entry,i)=>{
const y=OY+50+i*26;
const isMe=entry.uid===fbUser?.uid;
ctx.fillStyle=isMe?'#ffffff':COL_SCORE_TXT;
if(isMe){ctx.fillStyle='rgba(143,188,90,0.15)';ctx.fillRect(OX+8,y-14,W-16,20);ctx.fillStyle='#ffffff';}
const medal=medals[i]||(i+1)+'.';
ctx.textAlign='left';
ctx.fillText(medal+' '+(entry.avatar||'')+entry.name.slice(0,12),OX+14,y);
ctx.textAlign='right';
ctx.fillText(String(entry.score).padStart(5,'0'),OX+W-14,y);
});
// My score if not in top 8
const myRank=lb.findIndex(e=>e.uid===fbUser?.uid);
const myName=currentUser?.name||fbUser?.name||'Du';
// Show my entry if not in top 8 OR if not in leaderboard at all
const inTop8=myRank>=0&&myRank<8;
if(!inTop8&&fbUser){
const rankLabel=myRank>=0?(myRank+1)+'.':'—';
ctx.fillStyle='rgba(143,188,90,0.2)';ctx.fillRect(OX+8,OY+H-50,W-16,22);
ctx.strokeStyle=COL_SCORE_TXT;ctx.lineWidth=1;ctx.strokeRect(OX+8,OY+H-50,W-16,22);
ctx.fillStyle='#ffffff';ctx.font='bold 11px monospace';ctx.textAlign='left';
ctx.fillText(rankLabel+' '+myName.slice(0,14)+' (Du)',OX+14,OY+H-35);
ctx.textAlign='right';
ctx.fillText(String(myScore).padStart(5,'0'),OX+W-14,OY+H-35);
}
showLocalRematch('');
}
}
