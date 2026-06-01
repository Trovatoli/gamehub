// js/langfix.js
// Early language fix — runs before main scripts to prevent key-string flash

(function(){
try{
var l=localStorage.getItem('ghlang');
var isEn=l&&l!=='de';{
var map={
'nav.back':isEn?'← Back':'← Zurück',
'auth.not.logged.in':isEn?'Not logged in':'Nicht eingeloggt',
'auth.click.login':''
};
function _et(id,key){var el=document.getElementById(id);if(el)el.textContent=map[key]||'';}
function _ep(id,ph){var el=document.getElementById(id);if(el)el.placeholder=ph;}
// These run after DOM is ready - but we need them NOW
// Use a MutationObserver or just set on DOMContentLoaded
(function(){
_et('sb-name','auth.not.logged.in');
var gbb=document.getElementById('game-back-btn');if(gbb)gbb.textContent=map['nav.back'];
var sbb=document.getElementById('settings-back-btn');if(sbb)sbb.textContent=map['nav.back'];
})();
}
}catch(e){}
})();
