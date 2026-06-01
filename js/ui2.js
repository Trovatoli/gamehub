function applyTranslations(){
// Update hardcoded elements
const _gbb=document.getElementById('game-back-btn');if(_gbb)_gbb.textContent=t('nav.back');
const _sbb=document.getElementById('settings-back-btn');if(_sbb)_sbb.textContent=t('nav.back');
const _sbn=document.getElementById('sb-name');if(_sbn&&!currentUser)_sbn.textContent=t('auth.not.logged.in');
const _sbp=document.getElementById('sb-pts');if(_sbp&&!currentUser)_sbp.textContent='';
// data-i18n text content
document.querySelectorAll('[data-i18n]').forEach(el=>{
const key=el.getAttribute('data-i18n');
const val=t(key);
if(val)el.textContent=val;
});
// data-i18n-ph placeholders
document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
const key=el.getAttribute('data-i18n-ph');
const val=t(key);
if(val)el.placeholder=val;
});
// data-i18n-title attributes
document.querySelectorAll('[data-i18n-title]').forEach(el=>{
const key=el.getAttribute('data-i18n-title');
const val=t(key);
if(val)el.title=val;
});

// Nav items (by content matching)
const navMap=[
['⊞','nav.games'],['🎮','nav.lobby'],['💬','nav.chat'],
['📊','nav.stats'],['⚙','nav.settings'],['📄','nav.impressum']
];
document.querySelectorAll('.nav-item').forEach(el=>{
const icon=el.querySelector('.nav-icon');
if(!icon)return;
const match=navMap.find(([ic])=>icon.textContent.trim()===ic);
if(!match)return;
const translated=t(match[1]);
// Try text nodes first
for(const node of el.childNodes){
if(node.nodeType===3&&node.textContent.trim()){
node.textContent=translated; return;
}
}
// Try spans that aren't icon or badge
const spans=[...el.querySelectorAll('span')];
const textSpan=spans.find(sp=>!sp.classList.contains('nav-icon')&&!sp.classList.contains('nav-badge'));
if(textSpan){textSpan.textContent=translated;return;}
// Fallback: rebuild content keeping icon and badge
const badge=el.querySelector('.nav-badge');
el.innerHTML='';
el.appendChild(icon);
el.appendChild(document.createTextNode(translated));
if(badge)el.appendChild(badge);
});

// Nav group labels
const groupMap={'Spielen':'navg.play','Play':'navg.play','Community':'navg.community','Einstellungen':'navg.settings','Settings':'navg.settings','EINSTELLUNGEN':'navg.settings'};
document.querySelectorAll('.nav-group').forEach(el=>{
const txt=(el.textContent||el.innerText||'').trim();
const key=Object.keys(groupMap).find(k=>txt.toLowerCase().includes(k.toLowerCase()));
if(key)el.textContent=t(groupMap[key]);
});

// Page title (stitle)
const stitle=document.querySelector('#page-home .stitle');
if(stitle)stitle.textContent=t('home.title');
const ssettings=document.querySelector('#page-settings .stitle');
if(ssettings)ssettings.textContent=t('set.pagetitle');

// Game card subtitles
const cardSubMap={
'snake':'card.snake.sub','pong':'card.pong.sub','vier':'card.vier.sub',
'battle':'card.battle.sub','kniffel':'card.kniffel.sub','pacman':'card.pacman.sub'
};
document.querySelectorAll('.gcard').forEach(card=>{
const onclick=card.getAttribute('onclick')||'';
const m=onclick.match(/launch\('(\w+)'\)/);
if(!m)return;
const sub=card.querySelector('.gcard-sub');
if(sub)sub.textContent=t(cardSubMap[m[1]])||sub.textContent;
// Translate game name
const nameKey='game.'+m[1];
const nameEl=card.querySelector('.gcard-name');
if(nameEl&&t(nameKey)!==nameKey)nameEl.textContent=t(nameKey);
const badge=card.querySelector('.gcard-badge');
if(badge){
const cls=badge.className;
if(cls.includes('badge-hot'))badge.textContent=t('badge.hot');
else if(cls.includes('badge-new'))badge.textContent=t('badge.new');
}
});

// Settings page labels
const setLabelMap={
'Spielsounds':'set.sounds','Game Sounds':'set.sounds',
'Musik':'set.music','Music':'set.music',
'Benachrichtigungen':'set.notify','Notifications':'set.notify',
'Animationen':'set.anim','Animations':'set.anim',
'Hinweise':'set.hints','Hints':'set.hints',
};
document.querySelectorAll('.set-label').forEach(el=>{
const key=setLabelMap[el.textContent.trim()];
if(key)el.textContent=t(key);
});
document.querySelectorAll('.set-title').forEach(el=>{
const txt=el.textContent.trim();
if(txt==='Design Theme'||txt==='Design Theme')el.textContent=t('set.theme');
else if(txt==='Sprache'||txt==='Language')el.textContent=t('set.lang');
else if(txt==='Audio')el.textContent=t('set.audio');
else if(txt==='Spiel'||txt==='Game')el.textContent=t('set.game');
});

// Pause button
const pb=document.getElementById('pause-btn');
if(pb)pb.textContent=paused?t('game.resume'):t('game.pause');

// Page title in topbar
const pt=document.getElementById('page-title');
if(pt)pt.textContent=getPageTitle(pt.textContent)||pt.textContent;
}

function setLang(l,btn){
currentLang=l;
try{localStorage.setItem('ghlang',l);}catch(e){}
document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
if(btn)btn.classList.add('active');
applyTranslations();
if(document.getElementById('page-lobby-select')?.classList.contains('active'))renderLobbySelect();
}

// ── IN-GAME SETTINGS ─────────────────────────────
let _igSettingsOpen = false;
let _igWasPaused = false;

function handleGearClick(){
if(currentGame) openInGameSettings();
else nav('settings');
}

function openInGameSettings(){
if(_igSettingsOpen) return;
_igSettingsOpen = true;
// Pause game
_igWasPaused = paused;
if(!paused){ paused=true; }

// Build modal
const modal = document.createElement('div');
modal.id = 'ig-settings-modal';
modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.82)';
modal.innerHTML = `
<div style="background:#0d0d18;border:1px solid #1e1e38;border-radius:16px;padding:28px;min-width:320px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.8)">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:22px">
<span style="font-size:16px;font-weight:800;color:#fff">⚙ ${currentLang==='en'?'Settings':'Einstellungen'}</span>
<button id="ig-close-btn" style="background:transparent;border:none;color:#6060a0;font-size:22px;cursor:pointer;line-height:1;padding:0 4px">×</button>
</div>

<div style="margin-bottom:16px">
<div style="font-size:9px;font-weight:800;color:#6060a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Design Theme</div>
<div style="display:flex;flex-direction:column;gap:6px">
<button class="ig-theme-btn" data-theme="neon" style="padding:8px 12px;border-radius:8px;border:1.5px solid #1e1e38;background:#111125;color:#ccc;cursor:pointer;font-family:inherit;font-size:13px;text-align:left">🌟 Dark Neon</button>
<button class="ig-theme-btn" data-theme="light" style="padding:8px 12px;border-radius:8px;border:1.5px solid #1e1e38;background:#111125;color:#ccc;cursor:pointer;font-family:inherit;font-size:13px;text-align:left">☀ Hell & Clean</button>
<button class="ig-theme-btn" data-theme="retro" style="padding:8px 12px;border-radius:8px;border:1.5px solid #1e1e38;background:#111125;color:#ccc;cursor:pointer;font-family:inherit;font-size:13px;text-align:left">💾 Retro Terminal</button>
</div>
</div>

<div style="margin-bottom:16px">
<div style="font-size:9px;font-weight:800;color:#6060a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Sprache</div>
<div style="display:flex;gap:8px">
<button class="ig-lang-btn" data-lang="de" style="flex:1;padding:8px;border-radius:8px;border:1.5px solid #1e1e38;background:#111125;color:#ccc;cursor:pointer;font-family:inherit;font-size:13px">🇩🇪 Deutsch</button>
<button class="ig-lang-btn" data-lang="en" style="flex:1;padding:8px;border-radius:8px;border:1.5px solid #1e1e38;background:#111125;color:#ccc;cursor:pointer;font-family:inherit;font-size:13px">🇬🇧 English</button>
</div>
</div>

<div style="margin-bottom:22px">
<div style="font-size:9px;font-weight:800;color:#6060a0;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Sound</div>
<div style="display:flex;align-items:center;justify-content:space-between">
<span style="font-size:13px;color:#ccc">${currentLang==='en'?'Game Sounds':'Spielsounds'}</span>
<div id="ig-sound-toggle" style="width:40px;height:22px;border-radius:11px;cursor:pointer;transition:background .2s;position:relative"></div>
</div>
</div>

<div style="display:flex;flex-direction:column;gap:8px">
<button id="ig-resume-btn" style="width:100%;padding:13px;background:#00f5ff;color:#000;border:none;border-radius:10px;font-size:15px;font-weight:900;cursor:pointer;font-family:inherit">▶ ${t('game.back.short')}</button>
<button id="ig-menu-btn" style="width:100%;padding:10px;background:transparent;color:#6060a0;border:1px solid #1e1e38;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">← ${currentLang==='en'?'Main Menu':'Hauptmenü'}</button>
</div>
</div>
`;

document.body.appendChild(modal);

// Highlight current theme
const curTheme = document.body.className.replace('theme-','');
modal.querySelectorAll('.ig-theme-btn').forEach(btn=>{
if(btn.dataset.theme===curTheme) btn.style.borderColor='#00f5ff';
btn.addEventListener('click',()=>{
setTheme(btn.dataset.theme);
modal.querySelectorAll('.ig-theme-btn').forEach(b=>b.style.borderColor='#1e1e38');
btn.style.borderColor='#00f5ff';
});
});

// Highlight current lang
modal.querySelectorAll('.ig-lang-btn').forEach(btn=>{
btn.style.borderColor=btn.dataset.lang===currentLang?'#00f5ff':'#1e1e38';
btn.addEventListener('click',()=>{
currentLang=btn.dataset.lang;
try{localStorage.setItem('ghlang',currentLang);}catch(e){}
applyTranslations();
if(document.getElementById('page-lobby-select')?.classList.contains('active'))renderLobbySelect();
modal.querySelectorAll('.ig-lang-btn').forEach(b=>b.style.borderColor='#1e1e38');
btn.style.borderColor='#00f5ff';
});
});

// Sound toggle
const tog = modal.querySelector('#ig-sound-toggle');
function updateTog(){ tog.style.background=settings.sound?'#00f5ff':'#1e1e38'; tog.style.setProperty('--x',settings.sound?'18px':'2px'); }
updateTog();
tog.innerHTML='<div style="position:absolute;top:3px;left:var(--x,2px);width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s"></div>';
updateTog();
tog.addEventListener('click',()=>{ settings.sound=!settings.sound; try{localStorage.setItem('ghsettings',JSON.stringify(settings));}catch(e){} updateTog(); });

// Buttons
modal.querySelector('#ig-close-btn').addEventListener('click', closeInGameSettings);
modal.querySelector('#ig-resume-btn').addEventListener('click', closeInGameSettings);
modal.querySelector('#ig-menu-btn').addEventListener('click', ()=>{ closeInGameSettings(); stopAndHome(); });
}

function closeInGameSettings(){
const modal = document.getElementById('ig-settings-modal');
if(modal) modal.remove();
_igSettingsOpen = false;
// Resume if we paused it
if(!_igWasPaused){ paused=false; }
document.getElementById('pause-btn').textContent=paused?t('game.resume'):t('game.pause');
}

const GAME_META={
snake: {icon:'🐍',
name:{de:'Snake',en:'Snake'},
desc:{de:'Steuere deine Schlange, sammle Früchte, weiche Hindernissen aus.',en:'Control your snake, collect fruits, avoid obstacles.'},
maxLocal:2,maxPlayers:2,hasAI:true,ctrl:{de:['Pfeiltasten','WASD'],en:['Arrow Keys','WASD']}},
pong:  {icon:'🏓',
name:{de:'Pong',en:'Pong'},
desc:{de:'Klassisches Ping-Pong — reagiere schnell und schlag zurück!',en:'Classic Ping-Pong — react fast and hit back!'},
maxLocal:2,maxPlayers:2,hasAI:true,ctrl:{de:['Maus','W/S Tasten','Pfeiltasten'],en:['Mouse','W/S Keys','Arrow Keys']}},
vier:  {icon:'🔴',
name:{de:t('game.vier'),en:'Connect Four'},
desc:{de:'Verbinde 4 Scheiben in einer Reihe vor der KI.',en:'Connect 4 discs in a row before the AI.'},
maxLocal:1,maxPlayers:2,hasAI:true,ctrl:{de:[],en:[]}},
battle:{icon:'🚢',
name:{de:t('game.battle'),en:'Battleship'},
desc:{de:'Platziere deine Flotte und versenke die des Gegners.',en:"Place your fleet and sink the enemy’s ships."},
maxLocal:1,maxPlayers:2,hasAI:true,ctrl:{de:[],en:[]}},
kniffel:{icon:'🎲',
name:{de:'Kniffel',en:'Yahtzee'},
desc:{de:'Würfle und kombiniere — klassisches Kniffelvergnügen.',en:'Roll and combine — classic Yahtzee fun.'},
maxLocal:6,maxPlayers:6,hasAI:true,ctrl:{de:[],en:[]}},
pacman:{icon:'👾',
name:{de:'Pac-Man',en:'Pac-Man'},
desc:{de:'Fresse alle Punkte, weiche den Geistern aus!',en:'Eat all dots, avoid the ghosts!'},
maxLocal:1,maxPlayers:1,hasAI:false,ctrl:{de:['Pfeiltasten','WASD'],en:['Arrow Keys','WASD']}},
snakeclassic:{icon:'🟩',
name:{de:'Snake Classic',en:'Snake Classic'},
desc:{de:'Das originale Snake-Erlebnis – werde immer länger!',en:'The original Snake experience!'},
maxLocal:1,maxPlayers:1,hasAI:false,ctrl:{de:['Pfeiltasten','WASD'],en:['Arrow Keys','WASD']}},
};
function metaL(val){return typeof val==='object'?(val[currentLang]||val.de):val;}

const PLAYER_COLORS=['#00f5ff','#ff44ff','#ffcc00','#00e676','#ff6b35','#a78bfa'];
const PLAYER_BG=['rgba(0,245,255,.15)','rgba(255,68,255,.15)','rgba(255,204,0,.15)','rgba(0,230,118,.15)','rgba(255,107,53,.15)','rgba(167,139,250,.15)'];
var lsGameType='',lsPlayers=[],lsDiff='medium',lsMode='local',lsCtrl='Pfeiltasten';

// ── ONLINE REMATCH HELPER ─────────────────────────
function showOnlineRematch(opts,won){
// Remove existing overlay
const existing=document.getElementById('rematch-overlay');
if(existing)existing.remove();

const overlay=document.createElement('div');
overlay.id='rematch-overlay';
overlay.style.cssText='position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px;pointer-events:none;z-index:50';
overlay.innerHTML=
'<div style="pointer-events:all;background:#0d0d18;border:1px solid #1e1e38;border-radius:12px;padding:14px 20px;display:flex;gap:10px;align-items:center">'+
'<span style="font-size:12px;color:#6060a0" id="rematch-status">Rematch anfragen?</span>'+
'<button id="rematch-btn" style="padding:7px 18px;background:#00f5ff;color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px;font-family:inherit">↺ Rematch</button>'+
'<button id="quit-btn" style="padding:7px 14px;background:transparent;border:1px solid #1e1e38;color:#6060a0;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit">Verlassen</button>'+
'</div>';
document.getElementById('canvas-area').appendChild(overlay);

let pollTimer=null;

overlay.querySelector('#rematch-btn').addEventListener('click',async()=>{
const btn=document.getElementById('rematch-btn');
const status=document.getElementById('rematch-status');
if(btn){btn.disabled=true;btn.textContent=t('game.wait');}
if(status)status.textContent=t('game.waiting');

const myKey=opts.isHost?'rematchHost':'rematchGuest';
const oppKey=opts.isHost?'rematchGuest':'rematchHost';
const myRole=opts.isHost?'host':'guest';

let vierVotedReady=false;
async function vierVote(){
const res=await apiCall('rooms/'+opts.onlineRoomId+'/rematch','POST',{player:myRole});
if(!res||res.error)return;
if(res.bothReady&&!vierVotedReady){
vierVotedReady=true;
clearInterval(pollTimer);
const ov=document.getElementById('rematch-overlay');
if(ov)ov.remove();
setTimeout(()=>startGame(lastGameType,opts||lastGameOpts),200);
}
}

vierVote();
if(pollTimer)clearInterval(pollTimer);
pollTimer=setInterval(vierVote,600);
});

overlay.querySelector('#quit-btn').addEventListener('click',()=>{
if(pollTimer)clearInterval(pollTimer);
overlay.remove();
stopAndHome();
});
}

function openLobbySelect(type){
lsGameType=type;
const meta=GAME_META[type];
if(!meta){launch_legacy(type);return;}

// Default players
lsPlayers=[];
const savedName=currentUser?currentUser.name:t('player.1');
const defaultCtrl=metaL(meta.ctrl)[0]||'';
lsPlayers.push({name:savedName,type:'human',color:0,ctrl:defaultCtrl});
// Add p2 slot for all 2-player games
if(meta.maxPlayers>=2){
lsPlayers.push({name:'Computer',type:'ai',color:5,ctrl:''});
}

lsMode='local';lsDiff='medium';lsCtrl=metaL(meta.ctrl)[0]||t('lobby.ctrl.default');
nav('lobby-select',null);
renderLobbySelect();
}

function renderLobbySelect(){
const meta=GAME_META[lsGameType];
if(!meta)return;
const card=document.getElementById('ls-card');
if(!card)return;

const humanCount=lsPlayers.filter(p=>p.type==='human').length;
const aiCount=lsPlayers.filter(p=>p.type==='ai').length;
const canAddHuman=humanCount<meta.maxLocal;  // only show if more humans allowed
const canAddAI=meta.hasAI&&aiCount===0&&lsMode==='local';
const canStart=lsPlayers.length>=1;

const ctrlOpts=metaL(meta.ctrl)||[];
// Collect all ctrl choices made by other human players (for conflict detection)
const usedCtrls=lsPlayers.filter(p=>p.type==='human').map(p=>p.ctrl).filter(Boolean);

const playersHTML=lsPlayers.map((p,i)=>{
const playerCtrl=p.ctrl||(ctrlOpts[0]||'');
// Block a ctrl only if another human player already uses it
// AND that player has no alternative (i.e. only one ctrl option available)
const otherHumans=lsPlayers.filter((op,oi)=>oi!==i&&op.type==='human'&&op.ctrl);
const otherCtrls=otherHumans.map(op=>op.ctrl);

const ctrlRow=p.type==='human'&&ctrlOpts.length>1?`
<div style="display:flex;gap:5px;padding-left:36px;margin-top:5px;flex-wrap:wrap">
<span style="font-size:10px;color:var(--muted);align-self:center;margin-right:2px;white-space:nowrap">${t('lobby.control')}:</span>
${ctrlOpts.map(c=>{
const blocked=otherCtrls.includes(c);
return `<button class="ls-diff-btn${playerCtrl===c?' active':''}${blocked?' disabled':''}"
style="padding:3px 10px;font-size:11px${blocked?';opacity:.35;cursor:not-allowed':''}"
data-ctrl-btn data-pidx="${i}" data-ctrl="${c}" ${blocked?'disabled':''}>
${c}${blocked?' 🚫':''}
</button>`;
}).join('')}
</div>`:'';

// P2 type switcher (only for slot 1+)
const typeSwitcher=i>0?`
<div style="display:flex;gap:5px;margin-left:auto">
<button class="ls-diff-btn${p.type==='human'?' active':''}" style="padding:3px 10px;font-size:11px" data-type-btn data-pidx="${i}" data-type="human">👤 ${t('lobby.human')}</button>
<button class="ls-diff-btn${p.type==='ai'?' active':''}${!meta.hasAI?';opacity:.35;cursor:not-allowed':''}" style="padding:3px 10px;font-size:11px;${p.type==='ai'?'background:rgba(185,79,255,.1);color:#b94fff':''}" data-type-btn data-pidx="${i}" data-type="ai" ${!meta.hasAI?'disabled':''}>🤖 ${t('lobby.ai')}</button>
</div>`:'';

return `<div class="ls-player-row" style="flex-direction:column;align-items:stretch;gap:0">
<div style="display:flex;align-items:center;gap:8px">
<div class="ls-player-av" style="background:${PLAYER_BG[p.color]};color:${PLAYER_COLORS[p.color]};border:1.5px solid ${PLAYER_COLORS[p.color]}">
${p.type==='ai'?'🤖':p.name.slice(0,2).toUpperCase()}
</div>
${p.type==='ai'
?`<span style="flex:1;font-size:13px;color:var(--muted);font-style:italic">${'Computer ('+t('lobby.ai')+')'}</span>`
:`<input class="ls-player-input" value="${p.name}" placeholder="Name..." data-pidx="${i}" maxlength="16">`
}
${typeSwitcher}
${lsPlayers.length>1&&i>0?`<button class="ls-player-remove" data-remove="${i}" style="margin-left:4px">×</button>`:''}
</div>
${ctrlRow}
</div>`;
}).join('')

const addBtnsHTML=meta.maxPlayers===2?'':`
<div class="ls-add-btns">
${canAddHuman?`<button class="ls-add-btn" data-add="human">${t('lobby.add.human')}</button>`:''}
${canAddAI?`<button class="ls-add-btn" data-add="ai" style="border-color:rgba(185,79,255,.4);color:#b94fff">${t('lobby.add.ai')}</button>`:''}
</div>`;

const ctrlHTML=''

card.innerHTML=`
<span class="ls-icon" style="--gc:${PLAYER_COLORS[0]}">${meta.icon}</span>
<div class="ls-title">${metaL(meta.name)}</div>
<div class="ls-desc">${metaL(meta.desc)}</div>

<!-- Mode Selection -->
<div class="ls-section">
<div class="ls-label">${t('lobby.mode.title')}</div>
<div class="ls-modes">
<div class="ls-mode${lsMode==='local'?' active':''}" onclick="lsMode='local';renderLobbySelect()">
<span class="ls-mode-icon">🏠</span>
<div class="ls-mode-name">${t('lobby.mode.local')}</div>
<div class="ls-mode-sub">${t('lobby.mode.local.sub')}</div>
</div>
${meta.maxPlayers>1?`<div class="ls-mode${lsMode==='online'?' active':''}" onclick="lsMode='online';renderLobbySelect()">
<span class="ls-mode-icon">🌐</span>
<div class="ls-mode-name">${t('lobby.mode.online')}</div>
<div class="ls-mode-sub">${t('lobby.mode.online.sub')}</div>
</div>`:''}
</div>
</div>

${lsMode!=='online'?`
<!-- Players -->
<div class="ls-section">
<div class="ls-label">${t('lobby.players')} (${lsPlayers.length})</div>
<div class="ls-players">${playersHTML}</div>
${addBtnsHTML}
</div>

<!-- Difficulty -->
${lsMode!=='online'&&lsPlayers.some(p=>p.type==='ai')?`<div class="ls-section">
<div class="ls-label">${t('lobby.difficulty')}</div>
<div class="ls-diff-btns">
<button class="ls-diff-btn${lsDiff==='easy'?' active':''}">${t('lobby.diff.easy')}</button>
<button class="ls-diff-btn${lsDiff==='medium'?' active':''}">${t('lobby.diff.medium')}</button>
<button class="ls-diff-btn${lsDiff==='hard'?' active':''}">${t('lobby.diff.hard')}</button>
</div>
</div>`:''}`:''}

${ctrlHTML}

${lsMode==='online'?`
<div style="margin-bottom:16px;background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px">
<div style="font-size:11px;font-weight:700;color:var(--muted);letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">🔑 ${t('lobby.join')}</div>
<div style="display:flex;gap:8px">
<input id="ls-room-code" placeholder="" data-i18n-ph='lobby.enter.code' maxlength="6"
style="flex:1;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:10px 14px;color:var(--text);font-size:16px;font-family:monospace;text-transform:uppercase;letter-spacing:4px;outline:none">
<button id="ls-join-btn" style="padding:10px 18px;background:var(--c2);color:#fff;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-weight:800;font-size:14px;white-space:nowrap">Beitreten →</button>
</div>
</div>
<div style="text-align:center;font-size:12px;color:var(--muted);margin-bottom:12px" data-i18n='lobby.or.create'>— oder neuen Raum erstellen —</div>`:''}
<button class="ls-start-btn" id="ls-create-btn" ${canStart?'':'disabled'}>${lsMode==='online'?t('lobby.create'):t('lobby.start')}</button>
<span class="ls-back" onclick="nav('home',document.querySelectorAll('.nav-item')[0])">${t('lobby.back')}</span>
`;

// Wire up buttons via addEventListener (reliable)
const lsCard=document.getElementById('ls-card');
if(lsMode==='online'){
const joinBtn=lsCard?.querySelector('#ls-join-btn');
const createBtn=lsCard?.querySelector('#ls-create-btn');
const codeInput=lsCard?.querySelector('#ls-room-code');
if(joinBtn)joinBtn.addEventListener('click',()=>{
const code=(codeInput?.value||'').trim().toUpperCase();
if(code.length>=4)joinOnlineRoom(code);
else showToast(t('error.code.format'));
});
if(createBtn)createBtn.addEventListener('click',lsStartGame);
if(codeInput)codeInput.addEventListener('keydown',e=>{
if(e.key==='Enter'){const code=codeInput.value.trim().toUpperCase();if(code.length>=4)joinOnlineRoom(code);}
});
} else {
const startBtn=lsCard?.querySelector('#ls-create-btn')||lsCard?.querySelector('.ls-start-btn');
if(startBtn)startBtn.addEventListener('click',lsStartGame);
// Wire add player buttons
lsCard?.querySelectorAll('[data-add]').forEach(btn=>{
btn.addEventListener('click',()=>{
const type=btn.dataset.add;
const idx=lsPlayers.length;
const names=[t('player.1'),t('player.2'),t('player.3'),t('player.4')];
const colors=[0,1,2,3,4,5];
const usedColors=lsPlayers.map(p=>p.color);
const color=colors.find(c=>!usedColors.includes(c))||idx;
if(type==='human')lsPlayers.push({name:names[idx]||'Spieler '+(idx+1),type:'human',color,ctrl:lsCtrl});
else lsPlayers.push({name:'Computer',type:'ai',color:5});
renderLobbySelect();
});
});
// Wire per-player ctrl buttons
lsCard?.querySelectorAll('[data-ctrl-btn]').forEach(btn=>{
btn.addEventListener('click',()=>{
if(btn.disabled)return;
const pidx=parseInt(btn.dataset.pidx);
const newCtrl=btn.dataset.ctrl;
const oldCtrl=lsPlayers[pidx]?.ctrl;
// If another player has this ctrl, swap with them
const conflict=lsPlayers.findIndex((p,i)=>i!==pidx&&p.type==='human'&&p.ctrl===newCtrl);
if(conflict>=0){
lsPlayers[conflict].ctrl=oldCtrl; // give them our old ctrl
}
if(lsPlayers[pidx])lsPlayers[pidx].ctrl=newCtrl;
if(pidx===0)lsCtrl=newCtrl;
renderLobbySelect();
});
});
// Wire type switcher buttons (Human/KI)
lsCard?.querySelectorAll('[data-type-btn]').forEach(btn=>{
btn.addEventListener('click',()=>{
const pidx=parseInt(btn.dataset.pidx);
const newType=btn.dataset.type;
if(!lsPlayers[pidx])return;
const oldType=lsPlayers[pidx].type;
if(oldType===newType)return; // no change needed
lsPlayers[pidx].type=newType;
if(newType==='ai'){
lsPlayers[pidx].name='Computer';
lsPlayers[pidx].ctrl='';
} else {
// Keep name if already set, otherwise set default
if(!lsPlayers[pidx].name||lsPlayers[pidx].name==='Computer'){
lsPlayers[pidx].name='Spieler '+(pidx+1);
}
// Give default ctrl (different from p1)
const meta=GAME_META[lsGameType];
const ctrlOpts=metaL(meta.ctrl)||[];
const p1ctrl=lsPlayers[0]?.ctrl||ctrlOpts[0];
lsPlayers[pidx].ctrl=ctrlOpts.find(c=>c!==p1ctrl)||ctrlOpts[1]||ctrlOpts[0]||'';
}
renderLobbySelect();
});
});
// Wire old [data-ctrl] buttons (fallback for global ctrl)
lsCard?.querySelectorAll('[data-ctrl]:not([data-ctrl-btn])').forEach(btn=>{
btn.addEventListener('click',()=>{lsCtrl=btn.dataset.ctrl;renderLobbySelect();});
});
// Wire diff buttons
lsCard?.querySelectorAll('.ls-diff-btn:not([data-ctrl-btn])').forEach(btn=>{
btn.addEventListener('click',()=>{
const t=btn.textContent;
if(t.includes(t('lobby.diff.easy'))||t.includes('Easy'))lsDiff='easy';
else if(t.includes(t('lobby.diff.hard'))||t.includes('Hard'))lsDiff='hard';
else lsDiff='medium';
renderLobbySelect();
});
});
// Wire player name inputs
lsCard?.querySelectorAll('.ls-player-input[data-pidx]').forEach(inp=>{
inp.addEventListener('input',()=>{
const i=parseInt(inp.dataset.pidx);
if(lsPlayers[i])lsPlayers[i].name=inp.value;
});
});
// Wire remove buttons
lsCard?.querySelectorAll('[data-remove]').forEach(btn=>{
btn.addEventListener('click',()=>{
const i=parseInt(btn.dataset.remove);
lsPlayers.splice(i,1);
renderLobbySelect();
});
});
}
}

function lsAddPlayer(type){
const meta=GAME_META[lsGameType];
const idx=lsPlayers.length;
const colorIdx=idx%PLAYER_COLORS.length;
if(type==='human'){
lsPlayers.push({name:'Spieler '+(idx+1),type:'human',color:colorIdx});
}else{
lsPlayers.push({name:'Computer',type:'ai',color:5});
}
renderLobbySelect();
}

function lsRemovePlayer(i){
lsPlayers.splice(i,1);
renderLobbySelect();
}

function lsStartGame(){
const meta=GAME_META[lsGameType];
const humanPlayers=lsPlayers.filter(p=>p.type==='human');
const hasAI=lsPlayers.some(p=>p.type==='ai');

if(lsMode==='online'){
initFirebase();
if(!fbUser){showToast(t('auth.need.login'));return;}
createOnlineRoom(lsGameType);
return;
}

// Assign ctrl to each player if not set
lsPlayers.forEach((p,i)=>{
if(!p.ctrl) p.ctrl=lsCtrl||(i===0?lsCtrl:'');
});
const opts={
diff:lsDiff,
ctrl:lsPlayers[0]?.ctrl||lsCtrl,
p2ctrl:lsPlayers[1]?.ctrl||lsCtrl,
mode:hasAI?'Gegen KI':(humanPlayers.length>1?'Lokal 2P':'Solo'),
players:JSON.parse(JSON.stringify(lsPlayers)), // deep copy
playerNames:humanPlayers.map(p=>p.name),
};

lastGameType=lsGameType;
lastGameOpts=opts;
startGame(lsGameType,opts);
}

// Legacy launch for games without meta
function launch_legacy(type){
lastGameType=type;
lastGameOpts={ctrl:'Pfeiltasten',diff:'medium',mode:'Solo'};
startGame(type,lastGameOpts);
}

// ════════════════════════════════════════════════
// SNAKE
// ════════════════════════════════════════════════

// ── Shared Online Rematch System ─────────────────
function createRematchSystem(onlineRoomId, isHost, onRestart){
let rematchOverlay=null;
let rematchPollTimer=null;

function show(won){
if(rematchOverlay)rematchOverlay.remove();
rematchOverlay=document.createElement('div');
rematchOverlay.id='rematch-overlay';
rematchOverlay.style.cssText='position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:center;padding-bottom:20px;pointer-events:none;z-index:50';
rematchOverlay.innerHTML=
'<div style="pointer-events:all;background:#0d0d18;border:1px solid #1e1e38;border-radius:12px;padding:14px 20px;display:flex;gap:10px;align-items:center">'+
'<span style="font-size:12px;color:#6060a0" id="rematch-status">Rematch anfragen?</span>'+
'<button id="rematch-btn" style="padding:7px 18px;background:#00f5ff;color:#000;border:none;border-radius:8px;font-weight:800;cursor:pointer;font-size:13px;font-family:inherit">↺ Rematch</button>'+
'<button id="quit-btn" style="padding:7px 14px;background:transparent;border:1px solid #1e1e38;color:#6060a0;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit">Verlassen</button>'+
'</div>';
const ca=document.getElementById('canvas-area');
if(ca)ca.appendChild(rematchOverlay);
rematchOverlay.querySelector('#rematch-btn').addEventListener('click', request);
rematchOverlay.querySelector('#quit-btn').addEventListener('click',()=>{
if(rematchOverlay){rematchOverlay.remove();rematchOverlay=null;}
stopAndHome();
});
}

async function request(){
const btn=document.getElementById('rematch-btn');
const status=document.getElementById('rematch-status');
if(btn){btn.disabled=true;btn.textContent=t('game.wait');}
if(status)status.textContent=t('game.waiting');

const myRole=isHost?'host':'guest';

// Use server-side rematch endpoint - atomic vote counting
if(rematchPollTimer)clearInterval(rematchPollTimer);

let votedReady=false;
async function vote(){
const res=await apiCall('rooms/'+onlineRoomId+'/rematch','POST',{player:myRole});
if(!res||res.error)return;
if(res.bothReady&&!votedReady){
votedReady=true;
clearInterval(rematchPollTimer);
if(rematchOverlay){rematchOverlay.remove();rematchOverlay=null;}
setTimeout(()=>onRestart(),200);
}
}

// Vote immediately and keep voting every 600ms until both ready
vote();
rematchPollTimer=setInterval(vote,600);
}

function destroy(){
if(rematchPollTimer)clearInterval(rematchPollTimer);
if(rematchOverlay){rematchOverlay.remove();rematchOverlay=null;}
}

return{show,destroy};
}
