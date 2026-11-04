/* Tablet display preferences. All effects and controls stay on this device. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const root = document.documentElement;
  const settings = el('settings-panel');
  const awake = el('keep-awake'), awakeStatus = el('awake-status');
  const fullscreen = el('fullscreen');
  if (!settings || !awake || !fullscreen) return;
  const style = document.createElement('style');
  style.textContent = `
    html { min-height:100%; scroll-padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom); }
    body { min-height:100dvh; }
    .tablet-display { margin:18px 0; padding:16px; border:1px solid var(--line); border-radius:16px; }
    .tablet-display h2 { margin:0 0 8px; font-size:16px; font-weight:500; }
    .tablet-display p { margin:8px 0; }
    .tablet-display button { width:100%; margin-top:8px; }
    .tablet-display select,.tablet-display input { min-height:44px; }
    #tablet-dimmer { position:fixed; inset:0; z-index:2147483647; background:#000;
      opacity:var(--tablet-dim,0); pointer-events:none; transition:opacity .5s; }
    .tablet-display .tablet-recovery { min-height:44px; }
    @media(prefers-reduced-motion:reduce) { #tablet-dimmer { transition:none; } }
    @media(max-height:500px) { #settings-panel { max-height:calc(100dvh - 16px); } }
  `;
  document.head.append(style);
  const shade = document.createElement('div');
  shade.id = 'tablet-dimmer'; shade.setAttribute('aria-hidden', 'true');
  document.body.append(shade);
  // Popovers and dialogs use the browser's top layer, above the page dimmer.
  // Give each dialog a matching overlay so night mode also dims open controls.
  const dialogStyle = document.createElement('style');
  dialogStyle.textContent = 'dialog::after { content:""; position:fixed; inset:0; pointer-events:none; background:#000; opacity:var(--tablet-dim,0); z-index:2147483647; }';
  document.head.append(dialogStyle);
  const panel = document.createElement('section'); panel.className = 'tablet-display';
  panel.setAttribute('aria-labelledby', 'tablet-display-title');
  panel.innerHTML = `<h2 id="tablet-display-title">Tablet display</h2>
    <label for="tablet-night-mode">Night mode</label>
    <select id="tablet-night-mode"><option value="off">Off</option><option value="auto">Automatic · 9 PM–7 AM</option><option value="on">Always on</option></select>
    <label for="tablet-night-level">Night brightness <output id="tablet-night-value"></output></label>
    <input id="tablet-night-level" type="range" min="35" max="85" step="5" value="60">
    <p id="tablet-night-status" class="inline-help" role="status"></p>
    <p class="inline-help">Dims Joi and her controls within this page. Automatic mode uses this tablet’s local clock. Device brightness stays under your control.</p>
    <button type="button" id="tablet-fullscreen" class="quiet">Enter full screen</button>
    <p id="tablet-fullscreen-status" class="inline-help" role="status"></p>
    <button type="button" id="tablet-retry-awake" class="quiet tablet-recovery">Retry keep-awake</button>
    <p class="inline-help">After switching apps, return here to resume. A locked tablet must be unlocked by you; fullscreen may need another tap.</p>`;
  settings.querySelector('.panel-head').after(panel);
  const key = 'joi-tablet-display-v1';
  const prefs = { night:'off', level:60 };
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    if (['off','auto','on'].includes(saved.night)) prefs.night = saved.night;
    if (Number.isFinite(saved.level)) prefs.level = Math.max(35, Math.min(85, saved.level));
  } catch {}
  function save() {
    try { localStorage.setItem(key, JSON.stringify(prefs)); }
    catch { el('tablet-night-status').textContent += ' Preferences apply for this session only.'; }
  }
  function night() {
    const hour = new Date().getHours();
    const active = prefs.night === 'on' || (prefs.night === 'auto' && (hour >= 21 || hour < 7));
    root.style.setProperty('--tablet-dim', active ? String(1-prefs.level/100) : '0');
    el('tablet-night-mode').value = prefs.night;
    el('tablet-night-level').value = prefs.level;
    el('tablet-night-value').textContent = prefs.level + '%';
    el('tablet-night-status').textContent = active ? 'Night mode active · page brightness '+prefs.level+'%.' : prefs.night === 'auto' ? 'Automatic night mode scheduled for 9 PM–7 AM on this tablet.' : 'Night mode off.';
  }
  el('tablet-night-mode').onchange = event => { prefs.night=event.target.value; night(); save(); };
  el('tablet-night-level').oninput = event => { prefs.level=Number(event.target.value); night(); save(); };
  const fullButton = el('tablet-fullscreen'), fullStatus = el('tablet-fullscreen-status');
  let fullBusy = false, hadFullscreen = false;
  function fullState() {
    const active = Boolean(document.fullscreenElement);
    fullscreen.textContent = fullButton.textContent = active ? 'Exit full screen' : 'Full screen';
    fullscreen.setAttribute('aria-pressed', String(active));
    fullButton.setAttribute('aria-pressed', String(active));
    const supported = Boolean(root.requestFullscreen);
    fullscreen.disabled = fullButton.disabled = fullBusy || (!active && !supported);
    fullStatus.textContent = active ? 'Fullscreen active. Use Back or Exit full screen to leave.' : !supported ? 'Fullscreen is unavailable here. Open Joi in Chrome, or use your home-screen shortcut.' : hadFullscreen ? 'Fullscreen ended. Tap Full screen to return.' : 'Tap Full screen to hide the browser bars.';
    if (active) hadFullscreen = true;
  }
  async function toggleFull() {
    if (fullBusy) return;
    fullBusy = true;
    try {
      // Request synchronously from this tap; never attempt fullscreen on resume.
      const request = document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen();
      fullState();
      await request; fullState();
    } catch {
      fullState(); fullStatus.textContent = 'Fullscreen could not start. Try again in Chrome using the Full screen button.';
    } finally { fullBusy = false; fullscreen.disabled = fullButton.disabled = !document.fullscreenElement && !root.requestFullscreen; }
  }
  fullscreen.onclick = fullButton.onclick = toggleFull;
  document.addEventListener('fullscreenchange', fullState);
  let wanted = false, lock = null, pending = false, suspended = false, revision = 0;
  let retryTimer = 0, retryBudget = 1;
  try { wanted = localStorage.getItem('joi-keep-awake-v1') === 'on'; } catch {}
  awake.checked = wanted;
  const retry = el('tablet-retry-awake');
  const supported = Boolean(navigator.wakeLock?.request);
  awake.disabled = retry.disabled = !supported;
  const allowed = () => wanted && !document.hidden && !suspended;
  function state(message) {
    awakeStatus.textContent = message;
    retry.disabled = !supported || !wanted || pending || Boolean(lock);
  }
  async function syncAwake() {
    if (!supported) { state('Keep-awake is unavailable here. Try Chrome or adjust your device’s screen timeout.'); return; }
    if (!allowed()) {
      clearTimeout(retryTimer);
      if (lock) { const previous=lock; lock=null; try { await previous.release(); } catch {} }
      state(wanted ? 'Paused while Joi is in the background.' : 'Off. Screen behavior follows your device settings.');
      return;
    }
    if (lock || pending) return;
    const requestedAt = revision;
    pending = true; state('Requesting keep-awake…');
    try {
      const next = await navigator.wakeLock.request('screen');
      if (!allowed() || requestedAt !== revision) { await next.release(); return; }
      lock = next;
      next.addEventListener('release', () => {
        if (lock !== next) return;
        lock = null;
        state(wanted ? 'Keep-awake released by this device. Tap Retry keep-awake if needed.' : 'Off. Screen behavior follows your device settings.');
        // One recovery attempt per return/tap; respect persistent OS rejection.
        if (allowed() && retryBudget > 0) { retryBudget--; clearTimeout(retryTimer); retryTimer=setTimeout(syncAwake,1500); }
      });
      state('Active · the screen stays awake while Joi is visible.');
    } catch {
      state('Keep-awake was declined. Tap Retry keep-awake, or check battery saver and screen timeout.');
    } finally {
      pending = false;
      retry.disabled = !supported || !wanted || Boolean(lock);
      if (requestedAt !== revision && allowed() && !lock) syncAwake();
    }
  }
  function resume() { revision++; retryBudget=1; night(); fullState(); syncAwake(); }
  awake.onchange = () => {
    wanted=awake.checked; revision++; retryBudget=1;
    try { localStorage.setItem('joi-keep-awake-v1', wanted ? 'on' : 'off'); } catch {}
    syncAwake();
  };
  retry.onclick = () => { revision++; retryBudget=1; syncAwake(); };
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', () => { suspended=false; resume(); });
  window.addEventListener('pagehide', () => { suspended=true; revision++; syncAwake(); });
  window.addEventListener('focus', resume);
  setInterval(() => { if (!document.hidden && !suspended) night(); }, 30000);
  night(); fullState(); syncAwake();
})();
