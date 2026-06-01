function initKniffel(opts){
// Support multi-player from lobby opts
const allPlayers=opts.players||(opts.mode==='Solo'||opts.mode==='solo'
?[{name:currentUser?.name||'Du',type:'human',color:0}]
:[{name:'Du',type:'human',color:0},{name:'Computer',type:'ai',color:5}]);
const isOnlineKniffel=opts.isOnline&&opts.onlineRoomId;
// My player index in online mode
const myUid=window._fbUser?.uid||fbUser?.uid;
const myPlayerIdx=isOnlineKniffel
? Math.max(0, allPlayers.findIndex(p=>p.uid===myUid))
: 0;
const humanPlayers=allPlayers.filter(p=>p.type==='human');
const aiPlayers=allPlayers.filter(p=>p.type==='ai');
const vsAI=aiPlayers.length>0;
const numPlayers=allPlayers.length;
const PCOLORS=['#00f5ff','#ff44ff','#ffcc00','#00e676','#ff6b35','#a78bfa'];
document.getElementById('gc').style.display='none';
const wrap=document.getElementById('kniffel-ui');
wrap.style.display='flex';
wrap.style.flexDirection='column';
wrap.style.background='#08080f';
wrap.style.height='100%';
wrap.style.width='100%';
wrap.style.overflow='hidden';
document.getElementById('g-title').textContent='Kniffel';
// Set score chip labels based on players
document.getElementById('s2lbl').textContent=allPlayers.length>1?allPlayers[1].name.slice(0,8):'—';
// Hide P2 chip entirely when solo
const _kS2chip=document.getElementById('s2-chip');
if(_kS2chip)_kS2chip.style.display=allPlayers.length>1?'':'none';
document.getElementById('g-status').textContent=t('kniffel.start');

const CATS=[
{id:'ones',  name:'Einser',      group:'oben', tip:'Summe aller 1er Würfel'},
{id:'twos',  name:'Zweier',      group:'oben', tip:'Summe aller 2er Würfel'},
{id:'threes',name:'Dreier',      group:'oben', tip:'Summe aller 3er Würfel'},
{id:'fours', name:'Vierer',      group:'oben', tip:'Summe aller 4er Würfel'},
{id:'fives', name:'Fünfer',      group:'oben', tip:'Summe aller 5er Würfel'},
{id:'sixes', name:'Sechser',     group:'oben', tip:'Summe aller 6er Würfel. Bonus: +35 Punkte wenn Summe ≥ 63'},
{id:'threeK',name:'Dreierpasch', group:'unten', tip:'Mindestens 3 gleiche Würfel → Summe aller Würfel'},
{id:'fourK', name:'Viererpasch', group:'unten', tip:'Mindestens 4 gleiche Würfel → Summe aller Würfel'},
{id:'fhouse',name:'Full House',  group:'unten', tip:'3 gleiche + 2 gleiche Würfel → 25 Punkte'},
{id:'sstr',  name:'Kl. Straße',  group:'unten', tip:'4 aufeinanderfolgende Zahlen (z.B. 1-2-3-4) → 30 Punkte'},
{id:'lstr',  name:'Gr. Straße',  group:'unten', tip:'5 aufeinanderfolgende Zahlen (1-2-3-4-5 oder 2-3-4-5-6) → 40 Punkte'},
{id:'kniffl',name:'KNIFFEL',     group:'unten', tip:'Alle 5 Würfel gleich → 50 Punkte! Der Jackpot!'},
{id:'chance',name:'Chance',      group:'unten', tip:'Summe aller Würfel – immer eintragbar als Notausgang'},
];

function calcCat(id,d){
const c={};d.forEach(v=>{c[v]=(c[v]||0)+1;});
const sum=d.reduce((a,b)=>a+b,0);
const vals=Object.values(c).sort((a,b)=>b-a);
if(id==='ones')  return d.filter(x=>x===1).reduce((a,b)=>a+b,0);
if(id==='twos')  return d.filter(x=>x===2).reduce((a,b)=>a+b,0);
if(id==='threes')return d.filter(x=>x===3).reduce((a,b)=>a+b,0);
if(id==='fours') return d.filter(x=>x===4).reduce((a,b)=>a+b,0);
if(id==='fives') return d.filter(x=>x===5).reduce((a,b)=>a+b,0);
if(id==='sixes') return d.filter(x=>x===6).reduce((a,b)=>a+b,0);
if(id==='threeK')return vals[0]>=3?sum:0;
if(id==='fourK') return vals[0]>=4?sum:0;
if(id==='fhouse')return(vals[0]===3&&vals[1]===2)||vals[0]===5?25:0;
if(id==='sstr'){
const u=[...new Set(d)].sort();
return([1,2,3,4].every(v=>u.includes(v))||[2,3,4,5].every(v=>u.includes(v))||[3,4,5,6].every(v=>u.includes(v)))?30:0;
}
if(id==='lstr'){const u=[...new Set(d)].sort().join('');return(u==='12345'||u==='23456')?40:0;}
if(id==='kniffl')return vals[0]===5?50:0;
if(id==='chance')return sum;
return 0;
}

function upSum(sc){
return['ones','twos','threes','fours','fives','sixes'].reduce((a,k)=>a+(sc[k]||0),0);
}
function total(sc){
const u=upSum(sc);
return Object.entries(sc).filter(([k])=>k!=='__done').reduce((a,[,v])=>a+v,0)+(u>=63?35:0);
}

let dice=[1,2,3,4,5],held=[false,false,false,false,false];
let rolls=0,rolling=false;
let currentPlayerIdx=0; // whose turn it is
// scores[i] for each player (allPlayers[i])
const scores=allPlayers.map(()=>({}));
// Aliases for backward compat
let pSc=scores[0];
let aiSc=scores.length>1?scores[1]:{};
const turn_=()=>allPlayers[currentPlayerIdx];

// Dot positions per face value
const DOTS={
1:[[.5,.5]],
2:[[.28,.28],[.72,.72]],
3:[[.28,.28],[.5,.5],[.72,.72]],
4:[[.28,.28],[.72,.28],[.28,.72],[.72,.72]],
5:[[.28,.28],[.72,.28],[.5,.5],[.28,.72],[.72,.72]],
6:[[.28,.22],[.72,.22],[.28,.5],[.72,.5],[.28,.78],[.72,.78]],
};

function drawDie(ctx,x,y,sz,val,isHeld){
const r=sz*0.13;
// Drop shadow
ctx.shadowColor='rgba(0,0,0,0.5)';
ctx.shadowBlur=sz*0.18;
ctx.shadowOffsetY=sz*0.08;
// Face gradient (white die, warm tint if held)
const g=ctx.createLinearGradient(x,y,x+sz,y+sz);
if(isHeld){
g.addColorStop(0,'#ffe9a0');g.addColorStop(1,'#ffbe2e');
}else{
g.addColorStop(0,'#ffffff');g.addColorStop(1,'#d8d8d8');
}
ctx.fillStyle=g;
ctx.beginPath();ctx.roundRect(x,y,sz,sz,r);ctx.fill();
ctx.shadowBlur=0;ctx.shadowOffsetY=0;
// Border
ctx.strokeStyle=isHeld?'#cc8800':'rgba(0,0,0,0.18)';
ctx.lineWidth=isHeld?sz*0.05:sz*0.025;
ctx.stroke();
// Dots
const dr=sz*0.085;
(DOTS[val]||[]).forEach(([px,py])=>{
ctx.fillStyle='#1c1c1c';
ctx.shadowColor='rgba(0,0,0,0.4)';ctx.shadowBlur=2;
ctx.beginPath();ctx.arc(x+px*sz,y+py*sz,dr,0,Math.PI*2);ctx.fill();
});
ctx.shadowBlur=0;
}

function doRoll(){
const myTurnNow=isOnlineKniffel?(currentPlayerIdx===myPlayerIdx):allPlayers[currentPlayerIdx].type==='human';
if(rolls>=3||rolling||!myTurnNow)return;
rolling=true;let n=0;
const iv=setInterval(()=>{
dice=dice.map((v,i)=>held[i]?v:Math.ceil(Math.random()*6));
render();n++;
if(n>=8){
clearInterval(iv);rolling=false;rolls++;sndHit();render();
// Sync dice to other players
if(isOnlineKniffel){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{
type:'kniffel_dice',
playerIdx:myPlayerIdx,
dice:[...dice],held:[...held],rolls,
scores,currentPlayerIdx,
ts:Date.now()
}).catch(()=>{});
}
}
},70);
}

function doHold(i){
const myTurn2=isOnlineKniffel?(currentPlayerIdx===myPlayerIdx):allPlayers[currentPlayerIdx].type==='human';
if(rolls===0||rolling||!myTurn2)return;
held[i]=!held[i];sndPlace();render();
if(isOnlineKniffel){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{
type:'kniffel_dice',playerIdx:myPlayerIdx,
dice,held,rolls,currentPlayerIdx,ts:Date.now()
}).catch(()=>{});
}
}

function doChoose(id){
const curSc=scores[currentPlayerIdx];
const myTurn=isOnlineKniffel?(currentPlayerIdx===myPlayerIdx):allPlayers[currentPlayerIdx].type==='human';
if(curSc[id]!==undefined||rolls===0||!myTurn||rolling)return;
pSc=scores[0];aiSc=scores.length>1?scores[1]:{};
curSc[id]=calcCat(id,dice);
document.getElementById('s1').textContent=total(scores[0]);
sndScore();
dice=[1,2,3,4,5];held=[false,false,false,false,false];rolls=0;
// Advance to next player
currentPlayerIdx=(currentPlayerIdx+1)%numPlayers;
pSc=scores[0];aiSc=scores.length>1?scores[1]:{};
// Online sync: save my move to server
if(isOnlineKniffel){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{
type:'kniffel_move',
playerIdx:myPlayerIdx,
scores:scores,
currentPlayerIdx,
ts:Date.now()
}).catch(()=>{});
}
if(allPlayers[currentPlayerIdx].type==='ai'){render();setTimeout(doAITurn,500);}
else render();
}

function doAITurn(){
if(allPlayers[currentPlayerIdx]?.type!=='ai')return;
held=[false,false,false,false,false];
rolls=0;
const aiIdx=currentPlayerIdx;
const aiSc2=scores[aiIdx];

function scoreCategory(id,d){return calcCat(id,d);}

function bestHold(d){
const cnt={};d.forEach(v=>{cnt[v]=(cnt[v]||0)+1;});
const vals=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
const top=parseInt(vals[0][0]),topCount=vals[0][1];
const avail=CATS.filter(c=>aiSc2[c.id]===undefined);
const unique=[...new Set(d)].sort((a,b)=>a-b);

// Kniffel: hold all if 4+ same
if(topCount>=4&&avail.find(c=>c.id==='kniffl'))return d.map(v=>v===top);
// Full house: hold both groups
if(vals.length===2&&(vals[0][1]===3||vals[0][1]===2)&&avail.find(c=>c.id==='fhouse'))
return d.map(v=>v===top||v===parseInt(vals[1][0]));
// Large straight: hold unique sequence
const seqs=[[1,2,3,4,5],[2,3,4,5,6]];
for(const seq of seqs){
const have=seq.filter(v=>unique.includes(v));
if(have.length>=4&&avail.find(c=>c.id==='lstr')){
const used=new Set();
return d.map(v=>{if(seq.includes(v)&&!used.has(v)){used.add(v);return true;}return false;});
}
}
// Small straight
const smSeqs=[[1,2,3,4],[2,3,4,5],[3,4,5,6]];
for(const seq of smSeqs){
const have=seq.filter(v=>unique.includes(v));
if(have.length>=3&&avail.find(c=>c.id==='sstr')){
const used=new Set();
return d.map(v=>{if(seq.includes(v)&&!used.has(v)){used.add(v);return true;}return false;});
}
}
// Four of a kind
if(topCount>=3&&avail.find(c=>c.id==='fourK'))return d.map(v=>v===top);
// Three of a kind
if(topCount>=2&&avail.find(c=>c.id==='threeK'))return d.map(v=>v===top);
// Upper section: target highest available with most dice
const upperMap={ones:1,twos:2,threes:3,fours:4,fives:5,sixes:6};
let bestUpper=null,bestCount=0;
Object.entries(upperMap).forEach(([id,num])=>{
if(aiSc2[id]!==undefined)return;
const count=d.filter(v=>v===num).length;
const bonus=num>=4?1.5:1; // prefer high numbers
if(count*bonus>bestCount*1){bestCount=count;bestUpper=num;}
});
if(bestUpper&&bestCount>=2)return d.map(v=>v===bestUpper);
// Default: hold most common
return d.map(v=>v===top);
}

function pickBestCategory(){
// Calculate expected value for each available category
let best=-Infinity,bestId=null;
const upSum_=()=>['ones','twos','threes','fours','fives','sixes'].reduce((a,k)=>a+(aiSc2[k]||0),0);
const needsBonus=upSum_()<63;
CATS.forEach(c=>{
if(aiSc2[c.id]!==undefined)return;
const sc=calcCat(c.id,dice);
let weight=sc;
if(c.id==='kniffl')weight=sc>0?sc*6:0;
else if(c.id==='lstr')weight=sc>0?sc*2.5:0;
else if(c.id==='sstr')weight=sc>0?sc*2:0;
else if(c.id==='fhouse')weight=sc>0?sc*1.8:0;
else if(c.id==='fourK')weight=sc*1.3;
else if(c.id==='threeK')weight=sc*1.1;
else if(c.id==='chance')weight=sc*0.7; // save chance for later
// Bonus target: upper section values worth more if needed
if(needsBonus&&['ones','twos','threes','fours','fives','sixes'].includes(c.id))weight*=1.2;
// Never waste high-value categories on 0
if(sc===0&&['kniffl','lstr','sstr','fhouse'].includes(c.id))weight=-50;
else if(sc===0)weight=-1;
if(weight>best){best=weight;bestId=c.id;}
});
if(!bestId){
// Last resort: pick chance or lowest category
const rem=CATS.filter(c=>aiSc2[c.id]===undefined);
bestId=rem.find(c=>c.id==='chance')?.id||rem[rem.length-1]?.id;
}
return bestId;
}

function aiStep(rollsLeft){
if(rollsLeft<=0){
const id=pickBestCategory();
if(id)aiSc2[id]=calcCat(id,dice);
if(aiIdx===0)document.getElementById('s1').textContent=total(scores[0]);
else document.getElementById('s2').textContent=total(scores[aiIdx]);
dice=[1,2,3,4,5];held=[false,false,false,false,false];rolls=0;
currentPlayerIdx=(currentPlayerIdx+1)%numPlayers;
render();
if(allPlayers[currentPlayerIdx]?.type==='ai')setTimeout(doAITurn,600);
return;
}
// Roll
dice=dice.map((v,i)=>held[i]?v:Math.ceil(Math.random()*6));
rolls++;
// Decide what to hold
held=bestHold(dice);
render();
setTimeout(()=>aiStep(rollsLeft-1),400);
}

render();
setTimeout(()=>aiStep(3),400);
}

function render(){
const pT=total(scores[0]);
const pU=upSum(scores[0]),bonusPct=Math.min(100,Math.round(pU/63*100));
const allDone=scores.every(sc=>CATS.every(c=>sc[c.id]!==undefined));
document.getElementById('s1').textContent=pT;
if(scores.length>1)document.getElementById('s2').textContent=total(scores[1]);

if(allDone&&!scores[0].__done){
scores[0].__done=true;
const totals=allPlayers.map((p,i)=>({name:p.name,pts:total(scores[i])}));
totals.sort((a,b)=>b.pts-a.pts);
const msg=numPlayers>1
?`🎉 ${totals[0].name}${t('kniffel.wins')} ${totals.map(p=>p.name+': '+p.pts).join(' · ')}`
:`Fertig! Score: ${pT} Punkte`;
document.getElementById('g-status').textContent=msg;
fbSaveScore('kniffel',pT);
// Close room so lobby removes it
if(opts.onlineRoomId){
apiCall('rooms/'+opts.onlineRoomId+'/sync','POST',{state:'closed',ts:Date.now()}).catch(()=>{});
removeActiveLobby(opts.onlineRoomId);
}
// Show winner screen
setTimeout(()=>{
const ca=document.getElementById('canvas-area');
if(!ca||document.getElementById('kniffel-end'))return;
const winner=totals[0];
const iWon=allPlayers.length>1&&winner?.name===allPlayers.find(p=>p.type==='human'&&p.uid===fbUser?.uid||p.type==='human')?.name;
const div=document.createElement('div');
div.id='kniffel-end';
div.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.88);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:20;padding:20px;box-sizing:border-box';
const titleColor=allPlayers.length===1?'#00f5ff':iWon?'#00f5ff':'#ff4444';
const titleText=allPlayers.length===1?`${t('kniffel.finish.solo')}${pT}`:(iWon?t('kniffel.finish.mp.win'):`${t('kniffel.finish.mp.lose')}${winner?.name}${t('kniffel.wins')}`);
div.innerHTML=`<div style="font-size:32px;font-weight:900;color:${titleColor};text-shadow:0 0 20px ${titleColor};text-align:center">${titleText}</div>`
+`<div style="display:flex;flex-direction:column;gap:6px;width:100%;max-width:280px">`
+totals.map((t,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 14px;background:rgba(255,255,255,0.05);border-radius:8px;${i===0?'border:1px solid '+titleColor:''}">
<span style="font-size:14px;color:var(--text)">${['🥇','🥈','🥉','4.','5.'][i]||''} ${t.name}</span>
<span style="font-size:16px;font-weight:800;color:${i===0?titleColor:'var(--muted)'}">${t.pts}</span>
</div>`).join('')
+`</div>`
+`<div style="display:flex;gap:10px;margin-top:4px">`
+`<button onclick="document.getElementById('kniffel-end').remove();restartGame()" style="padding:10px 24px;background:var(--c1);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit">↺ Nochmal</button>`
+`<button onclick="document.getElementById('kniffel-end').remove();stopAndHome()" style="padding:10px 16px;background:transparent;border:1px solid var(--border);border-radius:10px;font-size:13px;color:var(--muted);cursor:pointer;font-family:inherit">${t('game.menu')}</button>`
+`</div>`;
ca.appendChild(div);
if(iWon||allPlayers.length===1)sndWin(); else sndFail();
},300);
}

const isHumanTurn=allPlayers[currentPlayerIdx]?.type==='human';
const canRoll=rolls<3&&!rolling&&isHumanTurn&&!allDone;
const btnLabel=['🎲 Würfeln','🎲 Nochmal (2/3)','🎲 Nochmal (3/3)','↓ Kategorie wählen'][Math.min(rolls,3)];
const RING=['#00f5ff','#ff44ff','#ffcc00','#00e676','#ff6b35','#a78bfa'];

// ── Layout logic ─────────────────────────────────────────
// 1-2 players: scorecard LEFT, dice RIGHT
// 3+ players:  scorecard TOP (compact), dice BOTTOM
const stacked = numPlayers >= 3;

// Fixed, sensible column widths - never stretch to fill
const CAT_W = stacked ? 130 : 150;
const COL_W = stacked ? 60 : 90;   // compact for many players
const becherSize = stacked ? 170 : 300;
const rowPad = stacked ? 3 : 8;
const fontSize = stacked ? 12 : 13;
const valSize = stacked ? 13 : 15;
const avSize = stacked ? 26 : 36;
const avFont = stacked ? 13 : 18;

// ── Builders ────────────────────────────────────────────
function scoreRow(cat){
const curSc=scores[currentPlayerIdx];
const curDone=curSc[cat.id]!==undefined;
const isHuman=allPlayers[currentPlayerIdx]?.type==='human';
const prev=(!curDone&&rolls>0&&isHuman&&!rolling)?calcCat(cat.id,dice):null;
const canPick=!curDone&&rolls>0&&isHuman&&!rolling&&!allDone;
const highlight=canPick&&prev>0;
const cells=allPlayers.map((p,i)=>{
const sc=scores[i];const done=sc[cat.id]!==undefined;const isActive=i===currentPlayerIdx;
const val=done?sc[cat.id]:(isActive&&prev!==null?prev:'');
const col=RING[p.color%RING.length];
const textCol=done?col:isActive&&prev>0?'#4ade80':isActive&&prev===0&&rolls>0?'rgba(248,113,113,.7)':'';
const bg=isActive&&!done&&rolls>0?'rgba(255,255,255,.025)':'';
return `<td style="width:${COL_W}px;text-align:center;font-size:${valSize}px;font-weight:700;color:${textCol};background:${bg};border-left:1px solid #151528;padding:${rowPad}px 0">${val}</td>`;
}).join('');
return `<tr onclick="window.__kChoose('${cat.id}')" style="border-bottom:1px solid #111122;cursor:${canPick?'pointer':'default'};background:${highlight?'rgba(0,245,255,.05)':'transparent'}"
onmouseover="${canPick?`this.style.background='rgba(0,245,255,.1)'`:''}"
onmouseout="${canPick?`this.style.background='${highlight?'rgba(0,245,255,.05)':'transparent'}'`:''}">
<td style="padding:${rowPad}px 14px;font-size:${fontSize}px;color:${curDone?'#32324a':'#c0c0d0'};white-space:nowrap" title="${cat.tip||''}">${cat.name} <span style="color:#3a3a5a;font-size:9px">ℹ</span></td>
${cells}
</tr>`;
}

function groupHdr(label){
return `<tr style="background:#0e0e1e"><td colspan="${1+numPlayers}" style="padding:${stacked?3:5}px 14px;font-size:9px;font-weight:800;color:#38385a;letter-spacing:2.5px;text-transform:uppercase">${label}</td></tr>`;
}

const avatarCols=allPlayers.map((p,i)=>{
const active=i===currentPlayerIdx;const col=RING[p.color%RING.length];
return `<th style="width:${COL_W}px;text-align:center;padding:${stacked?6:12}px 4px ${stacked?4:8}px;border-left:1px solid #151528;border-bottom:2px solid ${active?col:'#151528'}">
<div style="display:inline-flex;flex-direction:column;align-items:center;gap:3px">
<div style="width:${avSize}px;height:${avSize}px;border-radius:50%;background:#111128;border:2.5px solid ${active?col:'#252540'};display:flex;align-items:center;justify-content:center;font-size:${avFont}px;box-shadow:${active?`0 0 10px ${col}50`:''}">${p.type==='ai'?'🤖':'👤'}</div>
<span style="font-size:9px;font-weight:700;color:${active?col:'#38385a'};max-width:${COL_W-6}px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.name.slice(0,stacked?5:8)}</span>
</div>
</th>`;
}).join('');

const summeCells=allPlayers.map((p,i)=>`<td style="width:${COL_W}px;text-align:center;font-size:13px;font-weight:700;color:${RING[p.color%RING.length]};border-left:1px solid #151528;padding:5px 0">${upSum(scores[i])}</td>`).join('');
const gesamtCells=allPlayers.map((p,i)=>`<td style="width:${COL_W}px;text-align:center;font-size:${stacked?14:18}px;font-weight:900;color:${RING[p.color%RING.length]};border-left:1px solid #151528;padding:${stacked?5:8}px 0">${total(scores[i])}</td>`).join('');

const scoreTable=`<table style="width:100%;border-collapse:collapse;table-layout:fixed">
<thead><tr style="background:#0a0a18">
<th style="width:${CAT_W}px;padding:${stacked?6:12}px 14px ${stacked?4:8}px;text-align:left;font-size:9px;font-weight:800;color:#38385a;letter-spacing:2px;text-transform:uppercase;border-bottom:2px solid #151528">Kategorie</th>
${avatarCols}
</tr></thead>
<tbody>
${groupHdr('Oben')}
${CATS.filter(c=>c.group==='oben').map(scoreRow).join('')}
<tr style="background:#0e0e1e;border-top:1px solid #151528">
<td style="padding:5px 14px;font-size:11px;font-weight:700;color:#38385a">Summe</td>${summeCells}
</tr>
<tr style="background:#0a0a18"><td colspan="${1+numPlayers}" style="padding:3px 14px 5px">
<div style="display:flex;justify-content:space-between;margin-bottom:3px">
<span style="font-size:9px;color:#252540">Bonus +35 (ab 63)</span>
<span style="font-size:9px;font-weight:700;color:${pU>=63?'#4ade80':'#f87171'}">${pU>=63?'+35 ✓':'noch '+(63-pU)}</span>
</div>
<div style="height:3px;background:#151528;border-radius:2px">
<div style="width:${bonusPct}%;height:100%;background:${pU>=63?'#4ade80':'#00b4d8'};border-radius:2px;transition:width .5s"></div>
</div>
</td></tr>
${groupHdr('Unten')}
${CATS.filter(c=>c.group==='unten').map(scoreRow).join('')}
</tbody>
<tfoot><tr style="background:#0e0e1e;border-top:2px solid #00b4d8">
<td style="padding:${stacked?5:8}px 14px;font-size:9px;font-weight:800;color:#38385a;letter-spacing:2px;text-transform:uppercase">Gesamt</td>
${gesamtCells}
</tr></tfoot>
</table>`;

const dicePanel=`<div style="display:flex;flex-direction:${stacked?'row':'column'};align-items:center;justify-content:center;gap:${stacked?'32px':'14px'};padding:${stacked?'12px 32px':'24px'};width:100%;height:100%">
<div style="position:relative;width:${becherSize}px;height:${becherSize}px;flex-shrink:0">
<div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7a4020,#2d1506);box-shadow:0 12px 40px rgba(0,0,0,.7),inset 0 2px 6px rgba(255,200,120,.1)"></div>
<div style="position:absolute;inset:10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#8B4513,#3d1a00)"></div>
<div style="position:absolute;inset:18px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#2e7d32,#1b5e20);box-shadow:inset 0 4px 20px rgba(0,0,0,.6)">
<canvas id="k-canvas" style="position:absolute;inset:0;width:100%;height:100%;border-radius:50%;cursor:pointer"></canvas>
</div>
</div>
<div style="display:flex;flex-direction:column;align-items:center;gap:10px;flex-shrink:0">
<div style="font-size:${stacked?12:14}px;color:${isHumanTurn?'#8ab4c4':'#3a4a5a'};text-align:center;white-space:nowrap">
${rolling?'🎲 Würfelt...':`${allPlayers[currentPlayerIdx]?.name} ist dran — Wurf ${rolls}/3${rolls>0?' · '+held.filter(Boolean).length+' gehalten':''}`}
</div>
${rolls>0&&!rolling&&isHumanTurn?`<div style="background:rgba(0,180,216,.05);border:1px solid rgba(0,180,216,.15);border-radius:8px;padding:6px 14px;font-size:11px;color:#3a5a6a;text-align:center">Würfel anklicken zum Festhalten</div>`:''}
<button onclick="window.__kRoll()" ${canRoll?'':'disabled'} style="padding:11px 32px;border-radius:10px;font-size:${stacked?13:14}px;font-weight:800;font-family:inherit;border:none;cursor:${canRoll?'pointer':'not-allowed'};background:${canRoll?'linear-gradient(135deg,#00b4d8,#006d8f)':'#0e0e20'};color:${canRoll?'white':'#252540'};box-shadow:${canRoll?'0 4px 20px rgba(0,180,216,.35)':'none'};transition:all .18s;min-width:${stacked?160:200}px">
${btnLabel}
</button>
${allPlayers[currentPlayerIdx]?.type==='ai'?`<div style="background:rgba(185,79,255,.06);border:1px solid rgba(185,79,255,.18);border-radius:8px;padding:6px 14px;font-size:11px;color:#8840cc;font-weight:600">⏳ ${allPlayers[currentPlayerIdx].name} denkt...</div>`:''}
</div>
</div>`;

// ── Final layout ────────────────────────────────────────
if(stacked){
// TOP: scorecard full width | BOTTOM: dice panel
wrap.innerHTML=`<div style="display:flex;flex-direction:column;height:100%;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;background:#06060f">
<div style="flex-shrink:0;background:#0a0a18;border-bottom:2px solid #151528;overflow-x:auto">${scoreTable}</div>
<div style="flex:1;min-height:0;background:radial-gradient(ellipse at center,#0d0d22,#05050f)">${dicePanel}</div>
</div>`;
} else {
const scW=CAT_W+numPlayers*COL_W;
wrap.innerHTML=`<div style="display:flex;height:100%;font-family:'Segoe UI',system-ui,sans-serif;overflow:hidden;background:#06060f">
<div style="width:${scW}px;flex-shrink:0;background:#0a0a18;border-right:2px solid #151528;overflow-y:auto">${scoreTable}</div>
<div style="flex:1;background:radial-gradient(ellipse at 60% 50%,#0d0d22,#05050f)">${dicePanel}</div>
</div>`;
}

requestAnimationFrame(()=>{
const cv=document.getElementById('k-canvas');if(!cv)return;
const dim=cv.offsetWidth||160;cv.width=dim;cv.height=dim;
const ctx=cv.getContext('2d');ctx.clearRect(0,0,dim,dim);
const sz=Math.round(dim*0.27),cx=dim/2,cy=dim/2,rad=dim*0.29;
const pos=[0,1,2,3,4].map(i=>[cx+rad*Math.cos(-Math.PI/2+i*2*Math.PI/5),cy+rad*Math.sin(-Math.PI/2+i*2*Math.PI/5)]);
dice.forEach((val,i)=>drawDie(ctx,pos[i][0]-sz/2,pos[i][1]-sz/2,sz,val,held[i]));
cv.onclick=(e)=>{
if(rolls===0||rolling||!isHumanTurn)return;
const rect=cv.getBoundingClientRect();
const mx=(e.clientX-rect.left)*(dim/rect.width),my=(e.clientY-rect.top)*(dim/rect.height);
pos.forEach(([dx,dy],i)=>{if(mx>=dx-sz/2&&mx<=dx+sz/2&&my>=dy-sz/2&&my<=dy+sz/2)doHold(i);});
};
});
}

window.__kRoll=doRoll;
window.__kChoose=doChoose;
// Spectator update hook
if(opts.isSpectator){
window.__kSpectatorUpdate=(newScores,newDice,newHeld,newPlayerIdx)=>{
if(newScores)newScores.forEach((sc,i)=>{scores[i]=sc;});
if(newDice&&newDice.length)dice=[...newDice];
if(newHeld&&newHeld.length)held=[...newHeld];
if(newPlayerIdx!==undefined)currentPlayerIdx=newPlayerIdx;
render();
};
}
currentGame._cleanup=()=>{
const gc=document.getElementById('gc');if(gc)gc.style.display='block';
const ku=document.getElementById('kniffel-ui');if(ku){ku.style.display='none';ku.innerHTML='';}
delete window.__kRoll;delete window.__kChoose;
};

// Online: poll for other players' moves
if(isOnlineKniffel){
let lastTs=0;
_safeInterval(async()=>{
if(!currentGame)return;
const res=await apiCall('rooms/'+opts.onlineRoomId+'/sync','GET');
if(!res)return;
const d=res.sync||res;
if(!d.type||(d.type!=='kniffel_move'&&d.type!=='kniffel_dice'))return;
if(!d.ts||d.ts<=lastTs)return;
if(d.playerIdx===myPlayerIdx)return; // own move, skip
lastTs=d.ts;

if(d.type==='kniffel_dice'){
// Show what other player rolled
if(d.dice)dice=[...d.dice];
if(d.held)held=[...d.held];
if(d.rolls!==undefined)rolls=d.rolls;
if(d.currentPlayerIdx!==undefined)currentPlayerIdx=d.currentPlayerIdx;
render();
return;
}

// kniffel_move: apply scores
if(d.scores){
d.scores.forEach((sc,i)=>{
if(i!==myPlayerIdx)scores[i]=sc;
});
}
if(d.currentPlayerIdx!==undefined)currentPlayerIdx=d.currentPlayerIdx;
rolls=0;dice=[1,2,3,4,5];held=[false,false,false,false,false];
render();
},1500);
}

render();
}
