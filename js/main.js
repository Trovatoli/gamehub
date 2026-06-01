async function updateStats(){
if(currentUser){
// Load avatar from localStorage
try{const u=JSON.parse(localStorage.getItem('ghUser')||'{}');if(u.avatar)currentUser.avatar=u.avatar;}catch(e){}
if(currentUser.scores&&Object.keys(currentUser.scores).length>0){
currentUser.total=Object.values(currentUser.scores).reduce((a,b)=>a+b,0);
}
// Read from dedicated keys
try{
const saved=JSON.parse(localStorage.getItem('gh_scores')||'{}');
const total=parseInt(localStorage.getItem('gh_total')||'0');
if(Object.keys(saved).length>0){currentUser.scores=saved;}
if(total>0){currentUser.total=total;}
}catch(ex){}
const _sp=document.getElementById('stat-pts');if(_sp)_sp.textContent=(currentUser.total||0).toLocaleString();
// Update avatar everywhere
const ava2=currentUser.avatar||currentUser.name.slice(0,2).toUpperCase();
const isEmoji2=currentUser.avatar&&currentUser.avatar.length<=2;
['sb-av','top-av'].forEach(id=>{const el=document.getElementById(id);if(el){el.textContent=ava2;el.style.fontSize=isEmoji2?'16px':'10px';}});
const pav=document.getElementById('profile-av-display');if(pav){pav.textContent=ava2;pav.style.fontSize=isEmoji2?'24px':'20px';}
// Best game
const scores=currentUser.scores||{};
const gameNames=({snake:'🐍 '+t('game.snake'),pong:'🏓 '+t('game.pong'),vier:'🔴 '+t('game.vier'),battle:'🚢 '+t('game.battle'),kniffel:'🎲 '+t('game.kniffel')});
const best=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
if(best){
const _sbg=document.getElementById('stat-best-game');if(_sbg)_sbg.textContent=gameNames[best[0]]||best[0];
const _sbp=document.getElementById('stat-best-pts');if(_sbp)_sbp.textContent=best[1]+' Pts';
}
// Friends count
const fEl=document.getElementById('stat-friends');
if(fEl)fEl.textContent=friendsList.filter(f=>f.online).length+'/'+friendsList.length;
}
// Load leaderboard
try{
const res=await apiCall('leaderboard','GET');
if(res&&res.leaderboard&&Array.isArray(res.leaderboard)){
const el=document.getElementById('leaderboard-rows');
if(!el)return;
const rankColors=['#f0c030','#aaaaaa','#cd7f32'];
const myGhTotal=parseInt(localStorage.getItem('gh_total')||'0');
el.innerHTML=res.leaderboard.map((u,i)=>{
const isMe=u.uid===fbUser?.uid;
const isFriend=friendsList.find(f=>f.uid===u.uid);
const isOnline=res.online?.includes(u.uid);
const gameLabel=u.bestGame?`<span class="lb-game">${u.bestGame[0]}</span>`:'';
const displayTotal=isMe&&myGhTotal>0?myGhTotal:(u.total||0);
return `<div class="lb-row${isMe?' me':''}">
<div class="lb-rank" style="color:${rankColors[i]||'var(--muted)'}">${i+1}</div>
<div class="av av-c" style="width:22px;height:22px;font-size:${(isMe&&currentUser?.avatar)||u.avatar?'14px':'8px'};flex-shrink:0">${isMe?(currentUser?.avatar||u.name.slice(0,2).toUpperCase()):(u.avatar||u.name.slice(0,2).toUpperCase())}</div>
<div class="lb-name">${u.name}${gameLabel}</div>
${isOnline?'<div class="dot dot-on" style="margin-right:4px"></div>':''}
<div class="lb-pts">${isMe?(parseInt(localStorage.getItem('gh_total')||'0')||u.total||0).toLocaleString():(u.total||0).toLocaleString()}</div>
${!isMe&&!isFriend&&fbUser?`<button onclick="sendFriendRequest('${u.uid}','${u.name}')" style="padding:2px 7px;background:var(--c1);color:#000;border:none;border-radius:4px;font-size:9px;font-weight:700;cursor:pointer;font-family:inherit;margin-left:4px">+ Freund</button>`:''}
</div>`;
}).join('')||'<div style="padding:14px;color:var(--muted);font-size:12px;text-align:center">Noch keine Einträge</div>';
// My rank
const myRank=res.leaderboard.findIndex(u=>u.uid===fbUser?.uid);
const rankEl=document.getElementById('stat-rank');
if(rankEl)rankEl.textContent=myRank>=0?'#'+(myRank+1):'#—';
}
}catch(e){}
}
let authMode='login';
async function loadFriendRequests(){
if(!fbUser)return;
try{
const res=await apiCall('friends/requests','GET');
if(res){
if(Array.isArray(res.requests))pendingRequests=res.requests;
if(Array.isArray(res.friends)&&res.friends.length){
const seen2=new Set();
friendsList=res.friends.filter(f=>{if(seen2.has(f.uid))return false;seen2.add(f.uid);return true;});
}
renderFriendRequests();
renderFriendsSidebar();
}
}catch(e){}
}

function renderAccount(){
initFirebase();
if(fbUser)loadFriendRequests();
const el=document.getElementById('account-content');
if(!el)return;

if(fbUser&&currentUser){
// Logged in view
const scores=Object.entries(currentUser.scores||{}).map(([g,sc])=>{
const n=({snake:'🐍 '+t('game.snake'),pong:'🏓 '+t('game.pong'),vier:'🔴 '+t('game.vier'),battle:'🚢 '+t('game.battle'),kniffel:'🎲 '+t('game.kniffel')});
return '<div class="score-row"><span class="score-game">'+(n[g]||g)+'</span><span class="score-val">'+sc+'</span></div>';
}).join('')||'<div style="color:var(--muted);font-size:12px">Noch keine Spielstände</div>';

el.innerHTML=
'<div class="profile-card">'+
(()=>{const av=currentUser?.avatar||(()=>{try{return JSON.parse(localStorage.getItem('ghUser')||'{}').avatar||'';}catch(e){return '';}})();return '<div class="profile-av" id="profile-av-display" onclick="openAvatarPicker()" title="Avatar ändern" style="cursor:pointer;font-size:'+(av?'28px':'18px')+'">'+(av||currentUser.name.slice(0,2).toUpperCase())+'</div>';})()+
'<div>'+
'<div class="profile-name">'+currentUser.name+'</div>'+
'<div class="profile-pts">'+(currentUser.total||0).toLocaleString()+t('points.suffix')+'</div>'+
'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+currentUser.email+'</div>'+
'<div style="font-size:10px;color:#3a3a5a;margin-top:2px">☁ Online gespeichert</div>'+
'</div>'+
'<div style="display:flex;gap:6px;margin-top:4px">'+
'<button onclick="openPasswordChange()" style="flex:1;padding:8px;background:transparent;border:1px solid var(--border);border-radius:8px;color:var(--muted);cursor:pointer;font-family:inherit;font-size:11px;font-weight:600">🔒 Passwort ändern</button>'+
'<button class="logout-btn" id="logout-btn" style="flex:1">'+t('auth.logout')+'</button>'+
'<button onclick="fbDeleteAccount()" style="padding:8px 10px;background:transparent;border:1px solid #ff4444;border-radius:8px;color:#ff4444;cursor:pointer;font-family:inherit;font-size:11px" title="Account löschen">🗑</button>'+
'</div>'+
'</div>'+
'<div class="scores-card"><div class="scores-hdr">🏆 Meine Highscores</div>'+scores+'</div>'+
(pendingRequests.length?`<div class="scores-card" style="margin-top:12px">
<div class="scores-hdr">👥 Freundschaftsanfragen (${pendingRequests.length})</div>
${pendingRequests.map(r=>`<div class="score-row" style="align-items:center">
<span class="score-game">${r.name}</span>
<div style="display:flex;gap:6px">
<button onclick="acceptFriendRequest('${r.uid}')" style="padding:3px 10px;background:var(--c4);color:#000;border:none;border-radius:4px;font-size:11px;font-weight:700;cursor:pointer;font-family:inherit">✓ Annehmen</button>
<button onclick="declineFriendRequest('${r.uid}')" style="padding:3px 8px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:4px;font-size:11px;cursor:pointer;font-family:inherit">✗</button>
</div>
</div>`).join('')}
</div>`:'');

document.getElementById('logout-btn').addEventListener('click', doLogout);
return;
}

// Logged out view
el.innerHTML=
'<div class="auth-card">'+
'<div class="auth-title">🎮 GameHub</div>'+
'<div class="auth-sub">'+t('auth.subtitle')+'</div>'+
'<div id="auth-msg" style="display:none;padding:8px 12px;border-radius:8px;font-size:12px;margin-bottom:10px"></div>'+
'<div style="display:flex;gap:6px;margin-bottom:16px">'+
'<button id="tab-login" style="flex:1;padding:9px;border-radius:8px;border:1.5px solid var(--c1);background:rgba(0,245,255,.1);color:var(--c1);font-weight:700;cursor:pointer;font-family:inherit;font-size:13px">'+t('auth.login')+'</button>'+
'<button id="tab-register" style="flex:1;padding:9px;border-radius:8px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-weight:700;cursor:pointer;font-family:inherit;font-size:13px">'+t('auth.register')+'</button>'+
'</div>'+
'<div id="form-login">'+
'<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">E-Mail</div>'+
'<input id="inp-email" type="email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-family:inherit;outline:none"></div>'+
'<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Passwort</div>'+
'<input id="inp-pass" type="password" placeholder="Password..." style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-family:inherit;outline:none"></div>'+
'<button id="btn-login" style="width:100%;padding:12px;background:var(--c1);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit">'+t('auth.login')+'</button>'+
'</div>'+
'<div id="form-register" style="display:none">'+
'<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Name</div>'+
'<input id="inp-name" type="text" placeholder="Dein Name..." maxlength="20" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-family:inherit;outline:none"></div>'+
'<div style="margin-bottom:10px"><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">E-Mail</div>'+
'<input id="inp-email2" type="email" placeholder="your@email.com" style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-family:inherit;outline:none"></div>'+
'<div style="margin-bottom:14px"><div style="font-size:10px;color:var(--muted);font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Passwort</div>'+
'<input id="inp-pass2" type="password" placeholder="Min. 6 Zeichen..." style="width:100%;box-sizing:border-box;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 12px;color:var(--text);font-size:14px;font-family:inherit;outline:none"></div>'+
'<button id="btn-register" style="width:100%;padding:12px;background:var(--c1);color:#000;border:none;border-radius:10px;font-size:14px;font-weight:900;cursor:pointer;font-family:inherit">'+t('auth.btn.register')+'</button>'+
'</div>'+
'<div style="margin-top:12px;font-size:10px;color:#3a3a5a;text-align:center">☁ '+t('auth.firebase.hint')+'</div>'+
'</div>';

// Wire up events with addEventListener (reliable, no onclick in HTML)
const tabL=document.getElementById('tab-login');
const tabR=document.getElementById('tab-register');
if(tabL)tabL.addEventListener('click',()=>switchTab('login'));
if(tabR)tabR.addEventListener('click',()=>switchTab('register'));
document.getElementById('btn-login').addEventListener('click', doLogin);
document.getElementById('btn-register').addEventListener('click', doRegister);
// Enter key support
['inp-email','inp-pass'].forEach(id=>{
const el=document.getElementById(id);
if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
});
['inp-name','inp-email2','inp-pass2'].forEach(id=>{
const el=document.getElementById(id);
if(el)el.addEventListener('keydown',e=>{if(e.key==='Enter')doRegister();});
});
}

function switchTab(mode){
// Update tab buttons
['tab-login','tab-register'].forEach(id=>{
const btn=document.getElementById(id);
if(!btn)return;
const active=(id==='tab-login'&&mode==='login')||(id==='tab-register'&&mode==='register');
btn.style.borderColor=active?'var(--c1)':'var(--border)';
btn.style.background=active?'rgba(0,245,255,.1)':'transparent';
btn.style.color=active?'var(--c1)':'var(--muted)';
});
// Show/hide forms
const fl=document.getElementById('form-login');
const fr=document.getElementById('form-register');
if(fl)fl.style.display=mode==='login'?'block':'none';
if(fr)fr.style.display=mode==='register'?'block':'none';
// Clear message
const msg=document.getElementById('auth-msg');
if(msg)msg.style.display='none';
}

function showAuthMsg(msg,ok){
const el=document.getElementById('auth-msg');
if(!el){showToast(msg);return;}
el.style.display='block';
el.style.padding='8px 12px';
el.style.borderRadius='8px';
el.style.fontSize='12px';
el.style.marginBottom='10px';
el.style.background=ok?'rgba(0,230,118,.15)':'rgba(255,80,80,.15)';
el.style.border=ok?'1px solid rgba(0,230,118,.3)':'1px solid rgba(255,80,80,.3)';
el.style.color=ok?'#4ade80':'#f87171';
el.textContent=msg;
}

async function doLogin(){
initFirebase();
const email=(document.getElementById('inp-email')?.value||'').trim();
const pass=document.getElementById('inp-pass')?.value||'';
if(!email||!pass){showAuthMsg(t('auth.fill.all'));return;}
const btn=document.getElementById('btn-login');
if(btn){btn.disabled=true;btn.textContent='...';}
const res=await fbLogin(email,pass);
if(btn){btn.disabled=false;btn.textContent=t('auth.btn.login');}
if(res&&res.ok){showAuthMsg(t('auth.welcome.back')+'! 👋',true);setTimeout(renderAccount,800);}
else showAuthMsg(res?.msg||t('auth.login.error'));
}

async function doRegister(){
initFirebase();
const name=(document.getElementById('inp-name')?.value||'').trim();
const email=(document.getElementById('inp-email2')?.value||'').trim();
const pass=document.getElementById('inp-pass2')?.value||'';
if(!name||!email||!pass){showAuthMsg(t('auth.fill.all'));return;}
const btn=document.getElementById('btn-register');
if(btn){btn.disabled=true;btn.textContent='...';}
const res=await fbRegister(email,pass,name);
if(btn){btn.disabled=false;btn.textContent=t('auth.btn.register');}
if(res&&res.ok){showAuthMsg(t('auth.welcome.new')+'! 🎉',true);setTimeout(renderAccount,800);}
else showAuthMsg(res?.msg||t('auth.register.error'));
}

function doLogout(){
fbLogout();
currentUser=null;
updateUserUI();
renderAccount();
}
function showAuthMsg(msg,ok){
const el=document.getElementById('auth-msg');if(!el)return;
el.textContent=msg;el.className='auth-msg '+(ok?'ok':'err');el.style.display='block';
}
function submitAuth(){
const name=(document.getElementById('a-name')?.value||'').trim();
const pass=document.getElementById('a-pass')?.value||'';
const r=authMode==='login'?login(name,pass):register(name,pass);
if(r.ok){showAuthMsg(authMode==='login'?t('auth.welcome.back')+name+'! 👋':t('auth.welcome.new')+name+'! 🎉',true);setTimeout(renderAccount,800);}
else showAuthMsg(r.msg,false);
}
// Auto-restore session
(()=>{
try{
const ghScores=JSON.parse(localStorage.getItem('gh_scores')||'{}');
const total=parseInt(localStorage.getItem('gh_total')||'0');
const ghUser=JSON.parse(localStorage.getItem('ghUser')||'null');
if(ghUser&&ghUser.name){
currentUser={name:ghUser.name,email:ghUser.email||'',uid:ghUser.uid||'',scores:ghScores,total};
updateUserUI();
} else {
const sess=JSON.parse(localStorage.getItem('ghsess')||'null');
if(sess?.name){
currentUser={name:sess.name,scores:ghScores,total};
updateUserUI();
}
}
}catch(e){}
})();

// Initialize Firebase on load - wait for DOM+scripts to be ready
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',()=>{try{initFirebase();}catch(e){console.warn('Firebase init:',e);}});
}else{
try{initFirebase();}catch(e){console.warn('Firebase init:',e);}
}

// Restore language preference on load

(()=>{try{const th=localStorage.getItem('ghtheme');if(th)document.body.className='theme-'+th;}catch(e){}try{const l=localStorage.getItem('ghlang');var isEn=l&&l!=='de';{currentLang=l;applyTranslations();document.querySelectorAll('.lang-btn').forEach(b=>{const oc=b.getAttribute('onclick')||'';b.classList.toggle('active',oc.includes("'"+l+"'"));});}}catch(e){}})();

// ── AUTH GATE ──────────────────────────────────────────────────────────────
function gateShowMsg(msg, ok) {
const el = document.getElementById('gate-msg');
if (!el) return;
el.textContent = msg;
el.className = 'auth-gate-msg ' + (ok ? 'ok' : 'err');
el.style.display = 'block';
}

function gateSwitchTab(mode) {
document.getElementById('gate-form-login').style.display = mode === 'login' ? 'block' : 'none';
document.getElementById('gate-form-register').style.display = mode === 'register' ? 'block' : 'none';
['login','register'].forEach(m => {
const btn = document.getElementById('gate-tab-' + m);
if (!btn) return;
btn.classList.toggle('active', m === mode);
});
const msg = document.getElementById('gate-msg');
if (msg) msg.style.display = 'none';
}

function gateHide() {
const gate = document.getElementById('auth-gate');
if (gate) gate.classList.add('hidden');
const _app=document.getElementById('app-root');if(_app)_app.style.display='';
applyTranslations();
}

async function gateDoLogin() {
const email = (document.getElementById('gate-email')?.value || '').trim();
const pass = document.getElementById('gate-pass')?.value || '';
if (!email || !pass) { gateShowMsg(t('auth.fill.all')); return; }
const btn = document.getElementById('gate-btn-login');
if (btn) { btn.disabled = true; btn.textContent = '...'; }
const res = await fbLogin(email, pass);
if (btn) { btn.disabled = false; btn.textContent = t('auth.btn.login'); }
if (res && res.ok) {
gateShowMsg((t('auth.welcome.back') || 'Willkommen zurück, ') + (currentUser?.name || '') + '! 👋', true);
setTimeout(() => { gateHide(); renderAccount(); }, 800);
} else {
gateShowMsg(res?.msg || t('auth.login.error'));
}
}

async function gateDoRegister() {
const name = (document.getElementById('gate-name')?.value || '').trim();
const email = (document.getElementById('gate-email2')?.value || '').trim();
const pass = document.getElementById('gate-pass2')?.value || '';
if (!name || !email || !pass) { gateShowMsg(t('auth.fill.all')); return; }
const btn = document.getElementById('gate-btn-register');
if (btn) { btn.disabled = true; btn.textContent = '...'; }
const res = await fbRegister(email, pass, name);
if (btn) { btn.disabled = false; btn.textContent = t('auth.btn.register'); }
if (res && res.ok) {
gateShowMsg((t('auth.welcome.new') || 'Willkommen, ') + name + '! 🎉', true);
setTimeout(() => { gateHide(); renderAccount(); }, 800);
} else {
gateShowMsg(res?.msg || t('auth.register.error'));
}
}

// Enter key support for gate inputs
document.addEventListener('DOMContentLoaded', () => {
['gate-email','gate-pass'].forEach(id => {
const el = document.getElementById(id);
if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') gateDoLogin(); });
});
['gate-name','gate-email2','gate-pass2'].forEach(id => {
const el = document.getElementById(id);
if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') gateDoRegister(); });
});

// Apply language to gate
const lang = (() => { try { return localStorage.getItem('ghlang') || 'de'; } catch(e) { return 'de'; } })();
const isEn = lang !== 'de';
const subtitle = document.getElementById('gate-subtitle');
if (subtitle) subtitle.textContent = isEn ? 'Log in or create an account' : 'Einloggen oder Account erstellen';
const tabLogin = document.getElementById('gate-tab-login');
if (tabLogin) tabLogin.textContent = isEn ? 'Log in' : 'Einloggen';
const tabReg = document.getElementById('gate-tab-register');
if (tabReg) tabReg.textContent = isEn ? 'Register' : 'Registrieren';
const btnLogin = document.getElementById('gate-btn-login');
if (btnLogin) btnLogin.textContent = isEn ? 'Log in' : 'Einloggen';
const btnReg = document.getElementById('gate-btn-register');
if (btnReg) btnReg.textContent = isEn ? 'Create Account' : 'Account erstellen';
const emailIn = document.getElementById('gate-email');
if (emailIn) emailIn.placeholder = isEn ? 'your@email.com' : 'deine@email.de';
const emailIn2 = document.getElementById('gate-email2');
if (emailIn2) emailIn2.placeholder = isEn ? 'your@email.com' : 'deine@email.de';

// Show or hide gate: only if valid saved session exists
initFirebase();
const _hasToken = !!(localStorage.getItem('ghToken') && localStorage.getItem('ghUser'));
if (_hasToken && currentUser) {
gateHide();
}
});
