/* Local visual preferences only; fullscreen starts from an explicit tap. */
(()=>{
'use strict';
const key='joi-office-v1',body=document.body,el=id=>document.getElementById(id);
const prefs={palette:'cyan',light:45,fade:true,delay:8};
try{const saved=JSON.parse(localStorage.getItem(key)||'{}');if(['cyan','violet','amber'].includes(saved.palette))prefs.palette=saved.palette;if(Number.isFinite(saved.light))prefs.light=Math.max(0,Math.min(100,saved.light));if(typeof saved.fade==='boolean')prefs.fade=saved.fade;if([5,8,15,30].includes(saved.delay))prefs.delay=saved.delay;}catch{}
let active=false,timer=0,ownsFullscreen=false,returnFocus=null;
const layer=document.createElement('div');layer.className='office-atmosphere';layer.setAttribute('aria-hidden','true');body.prepend(layer);
const toggle=document.createElement('button');toggle.id='office-toggle';toggle.type='button';toggle.className='quiet';toggle.textContent='Office mode';toggle.setAttribute('aria-pressed','false');el('fullscreen').before(toggle);
const settingsButton=document.createElement('button');settingsButton.type='button';settingsButton.textContent='Office atmosphere';settingsButton.style.cssText='width:100%;margin-top:12px';el('brightness').after(settingsButton);
const wake=document.createElement('button');wake.type='button';wake.className='office-wake';wake.hidden=true;wake.setAttribute('aria-label','Show Joi controls');body.append(wake);
const panel=document.createElement('dialog');panel.id='office-panel';panel.setAttribute('aria-labelledby','office-title');
panel.innerHTML=`<div class="panel-head"><div><div class="eyebrow">Set the room</div><h1 id="office-title">Cyberpunk office</h1></div><button type="button" class="quiet close" aria-label="Close office settings">×</button></div>
<p>Give Joi the screen. Controls fade when you leave her idle; tap anywhere to bring them back.</p>
<div class="office-palette" role="group" aria-label="Lighting color"><button type="button" data-office-palette="cyan" style="--swatch:#7feaff">Cyan</button><button type="button" data-office-palette="violet" style="--swatch:#c99aff">Violet</button><button type="button" data-office-palette="amber" style="--swatch:#ffc278">Amber</button></div>
<label for="office-light">Ambient light <output id="office-light-value"></output></label><input id="office-light" type="range" min="0" max="100" step="1">
<label class="check"><input id="office-fade" type="checkbox">Fade controls while idle</label><label for="office-delay">Fade after</label><select id="office-delay"><option value="5">5 seconds</option><option value="8">8 seconds</option><option value="15">15 seconds</option><option value="30">30 seconds</option></select>
<div class="office-actions"><button type="button" class="primary" id="office-start">Enter office mode</button><button type="button" id="office-fullscreen">Enter office + fullscreen</button><button type="button" id="office-exit">Leave office mode</button></div>
<p id="office-status" role="status" class="inline-help"></p><p class="hint">Lighting preferences stay on this device. Escape leaves office mode. For a stationary display, enable Keep screen awake in Settings.</p>`;
body.append(panel);
function persist(){try{localStorage.setItem(key,JSON.stringify(prefs));}catch{el('office-status').textContent='Lighting changed for this session; this browser could not save your preferences.';}}
function draw(){document.documentElement.style.setProperty('--office-hue',String({cyan:190,violet:275,amber:35}[prefs.palette]));document.documentElement.style.setProperty('--office-light',String(prefs.light/100));el('office-light').value=prefs.light;el('office-light-value').textContent=prefs.light+'%';el('office-fade').checked=prefs.fade;el('office-delay').value=prefs.delay;panel.querySelectorAll('[data-office-palette]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.officePalette===prefs.palette)));el('office-exit').hidden=!active;}
function reveal(){clearTimeout(timer);body.classList.remove('office-idle');wake.hidden=true;if(active&&prefs.fade&&!document.hidden)timer=setTimeout(hide,prefs.delay*1000);}
function hide(){if(!active||!prefs.fade||document.hidden||document.querySelector('dialog[open]')||document.querySelector('.dock :focus-visible,header :focus-visible'))return;body.classList.add('office-idle');wake.hidden=false;}
function setActive(value){active=value;body.classList.toggle('office-mode',active);toggle.setAttribute('aria-pressed',String(active));toggle.textContent=active?'Office settings':'Office mode';if(active){document.querySelectorAll('.sidebar.revealed').forEach(node=>node.classList.remove('revealed'));for(const id of ['toggle-left','toggle-right'])el(id).setAttribute('aria-expanded','false');}else if(ownsFullscreen&&document.fullscreenElement){ownsFullscreen=false;document.exitFullscreen().catch(()=>{});}draw();reveal();}
function openPanel(){returnFocus=document.activeElement;if(el('settings-panel').open)el('settings-panel').close();reveal();el('office-status').textContent='';draw();panel.showModal();}
toggle.onclick=openPanel;settingsButton.onclick=openPanel;
panel.querySelector('.close').onclick=()=>panel.close();
panel.addEventListener('close',()=>{returnFocus?.focus({preventScroll:true});reveal();});
panel.querySelectorAll('[data-office-palette]').forEach(button=>button.onclick=()=>{prefs.palette=button.dataset.officePalette;draw();persist();});
el('office-light').oninput=event=>{prefs.light=Number(event.target.value);draw();persist();};
el('office-fade').onchange=event=>{prefs.fade=event.target.checked;persist();reveal();};
el('office-delay').onchange=event=>{prefs.delay=Number(event.target.value);persist();reveal();};
function enter(){panel.close();setActive(true);if(document.activeElement instanceof HTMLElement)document.activeElement.blur();}
el('office-start').onclick=enter;
el('office-fullscreen').onclick=async()=>{
if(!document.fullscreenElement){if(!document.documentElement.requestFullscreen){el('office-status').textContent='Fullscreen is unavailable here. Use Enter office mode instead.';return;}try{await document.documentElement.requestFullscreen();ownsFullscreen=true;}catch{el('office-status').textContent='Fullscreen was declined. Use Enter office mode, or try again in Chrome.';return;}}
enter();};
el('office-exit').onclick=()=>{panel.close();setActive(false);};
wake.onclick=()=>{reveal();};
document.addEventListener('pointerdown',()=>{if(!wake.hidden)return;reveal();},true);
document.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'&&wake.hidden)reveal();},{passive:true});
document.addEventListener('focusin',reveal);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&active&&!document.querySelector('dialog[open]'))setActive(false);else reveal();});
document.addEventListener('close',reveal,true);
document.addEventListener('click',event=>{if(active&&event.target.closest('#toggle-left,#toggle-right,#focus-view,#open-music'))setActive(false);else reveal();},true);
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearTimeout(timer);else reveal();});
document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement){const wasOwned=ownsFullscreen;ownsFullscreen=false;if(wasOwned&&active)setActive(false);reveal();}});
window.addEventListener('pagehide',()=>clearTimeout(timer));window.addEventListener('pageshow',reveal);
draw();
})();
