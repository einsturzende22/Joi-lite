/* A small tablet drawer backed by Joi's existing organizer. */
(() => {
  'use strict';
  const api=window.JoiOrganizer;
  if(!api)return;
  const el=id=>document.getElementById(id),groups={personal:'Personal',walters:'Walters Plumbing',pipeline:'The Pipeline'};
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const style=document.createElement('style');
  style.textContent=`
    #quick-panel-tab{position:fixed;right:6px;top:42%;z-index:8;writing-mode:vertical-rl;letter-spacing:.08em;
      min-width:44px;min-height:116px;padding:15px 9px;border-radius:16px 5px 5px 16px;
      background:#071825ed;box-shadow:0 0 24px #55dcff25;touch-action:pan-y;font-size:12px;}
    #quick-panel{position:fixed;inset:0 0 0 auto;margin:0;width:min(430px,100%);height:100dvh;
      max-width:100%;max-height:100dvh;border-radius:22px 0 0 22px;padding:calc(20px + env(safe-area-inset-top)) 20px calc(24px + env(safe-area-inset-bottom));
      overflow:auto;overscroll-behavior:contain;animation:quick-enter .2s ease-out;}
    #quick-panel::backdrop{background:#02071150;backdrop-filter:blur(3px);}
    @keyframes quick-enter{from{transform:translateX(32px);opacity:.3}to{transform:none;opacity:1}}
    #quick-panel h2{font-size:16px;font-weight:500;letter-spacing:.02em;margin:0;}
    #quick-panel .panel-head{margin-bottom:6px;}#quick-panel .quick-date{margin:0 0 18px;font-size:12px;}
    #quick-panel .quick-section{border-top:1px solid var(--line);padding-top:18px;margin-top:18px;}
    #quick-priorities{padding:0;list-style:none;display:grid;gap:8px;margin:12px 0;}
    .quick-task{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:13px;padding:8px;background:#0b2031;}
    .quick-task input{flex:none;min-width:24px;min-height:24px;margin:8px;}
    .quick-task .quick-task-title{flex:1;min-width:0;text-align:left;background:transparent;border:0;padding:4px;line-height:1.45;font-size:14px;overflow-wrap:anywhere;}
    .quick-task-title small{display:block;color:var(--muted);font-size:11px;margin-top:5px;}
    .quick-star{flex:none;width:44px;min-height:44px;padding:4px;font-size:21px;background:transparent;}
    .quick-star[aria-pressed=true]{color:var(--pink);border-color:#e5a6e766;}
    #quick-panel label{margin-top:12px;}#quick-panel textarea{min-height:100px;}
    #quick-panel .quick-options{display:flex;flex-wrap:wrap;gap:10px 18px;}#quick-panel .quick-options label{margin:8px 0;}
    #quick-save{width:100%;margin-top:10px;}#quick-feedback{min-height:24px;margin-bottom:0;}
    #quick-panel .quick-kind{display:flex;gap:8px;margin-top:14px;}#quick-panel .quick-kind button{flex:1;}
    #quick-panel [aria-pressed=true]{border-color:var(--cyan);}
    #quick-open-notes{width:100%;margin-top:10px;}#quick-panel .quick-empty{color:var(--muted);font-size:13px;line-height:1.6;}
    @media(max-width:480px){#quick-panel-tab{right:3px;min-width:44px;}}
    @media(prefers-reduced-motion:reduce){#quick-panel{animation:none;}}
  `;
  document.head.append(style);
  const tab=document.createElement('button');tab.type='button';tab.id='quick-panel-tab';tab.textContent='Today + capture';
  tab.setAttribute('aria-label','Open today and quick capture');tab.setAttribute('aria-haspopup','dialog');tab.setAttribute('aria-controls','quick-panel');tab.setAttribute('aria-expanded','false');
  const panel=document.createElement('dialog');panel.id='quick-panel';panel.setAttribute('aria-labelledby','quick-panel-title');
  panel.innerHTML=`<div class="panel-head"><div><div class="eyebrow">A little direction</div><h1 id="quick-panel-title">Today, within reach.</h1></div><button type="button" class="quiet close" id="quick-close" aria-label="Close quick panel">×</button></div>
    <p id="quick-date" class="quick-date"></p>
    <section class="quick-section" aria-labelledby="quick-priorities-title"><h2 id="quick-priorities-title">Today’s priorities</h2>
      <p class="inline-help">Priority tasks first, then due dates. Up to three due or undated tasks.</p><ul id="quick-priorities"></ul>
      <button type="button" id="quick-all-tasks" class="quiet" style="width:100%">Open daily briefing</button></section>
    <section class="quick-section" aria-labelledby="quick-capture-title"><h2 id="quick-capture-title">Capture a thought</h2>
      <div class="quick-kind" role="group" aria-label="Capture type"><button type="button" id="quick-kind-task" aria-pressed="true">Task</button><button type="button" id="quick-kind-note" aria-pressed="false">Note</button></div>
      <form id="quick-form"><label for="quick-group">Workspace</label><select id="quick-group"><option value="personal">Personal</option><option value="walters">Walters Plumbing</option><option value="pipeline">The Pipeline</option></select>
      <label for="quick-text" id="quick-text-label">One task per line</label><textarea id="quick-text" maxlength="10000" required placeholder="What needs doing?"></textarea>
      <div class="quick-options" id="quick-task-options"><label class="check"><input type="checkbox" id="quick-due-today">Due today</label><label class="check"><input type="checkbox" id="quick-priority">Make a priority</label></div>
      <button type="submit" class="primary" id="quick-save">Save task</button><p id="quick-feedback" class="inline-help" role="status" aria-live="polite"></p></form>
      <button type="button" class="quiet" id="quick-open-notes">Open workspace notes</button>
      <p class="inline-help">Saved in this browser’s Joi organizer. Separate from Todoist and ChatGPT.</p></section>`;
  document.body.append(tab,panel);
  let kind='task',returnFocus=null,busy=false,lastDay=today();
  const drafts={task:{text:'',group:'personal',due:false,priority:false},note:{text:'',group:'personal'}};
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  function render(){
    el('quick-date').textContent=new Date().toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})+' · this tablet';
    const list=el('quick-priorities');list.replaceChildren();
    const tasks=api.snapshot().tasks.filter(task=>!task.done&&(!task.due||task.due<=today())).sort((a,b)=>Number(b.priority===true)-Number(a.priority===true)||(a.due||'9999').localeCompare(b.due||'9999')).slice(0,3);
    if(!tasks.length){const empty=make('li','No tasks due or undated. Capture one small next step below.');empty.className='quick-empty';list.append(empty);}
    for(const task of tasks){
      const row=make('li');row.className='quick-task';
      const check=make('input');check.type='checkbox';check.setAttribute('aria-label','Complete '+task.text);
      check.onchange=()=>{if(!api.complete(task.id,check.checked)){check.checked=false;el('quick-feedback').textContent='Completion was not saved. Try again.';}else el('quick-feedback').textContent='Completed '+task.text+'.';};
      const title=make('button',task.text);title.className='quick-task-title';title.type='button';
      title.append(make('small',[groups[task.group],task.due?(task.due<today()?'Overdue · ':'Due ')+task.due:'No due date'].join(' · ')));
      title.onclick=()=>{panel.close();api.openTask(task.id);};
      const star=make('button',task.priority?'★':'☆');star.type='button';star.className='quick-star';star.setAttribute('aria-pressed',String(task.priority===true));star.setAttribute('aria-label',(task.priority?'Remove priority from ':'Prioritize ')+task.text);
      star.onclick=()=>{if(!api.priority(task.id,!task.priority))el('quick-feedback').textContent='Priority was not saved. Try again.';};
      row.append(check,title,star);list.append(row);
    }
  }
  function rememberDraft(){drafts[kind]={text:el('quick-text').value,group:el('quick-group').value,due:el('quick-due-today').checked,priority:el('quick-priority').checked};}
  function switchKind(next){
    rememberDraft();kind=next;const draft=drafts[kind];
    el('quick-text').value=draft.text;el('quick-group').value=draft.group;
    el('quick-due-today').checked=Boolean(draft.due);el('quick-priority').checked=Boolean(draft.priority);
    el('quick-task-options').hidden=kind==='note';
    el('quick-kind-task').setAttribute('aria-pressed',String(kind==='task'));el('quick-kind-note').setAttribute('aria-pressed',String(kind==='note'));
    el('quick-text-label').textContent=kind==='task'?'One task per line':'Append to workspace notes';
    el('quick-text').placeholder=kind==='task'?'What needs doing?':'Something worth remembering…';
    el('quick-save').textContent=kind==='task'?'Save task':'Save note';el('quick-feedback').textContent='';
  }
  function open(){
    if(panel.open)return;
    if(document.querySelector('dialog[open]'))return;
    returnFocus=document.activeElement;render();panel.showModal();tab.setAttribute('aria-expanded','true');
    // Focus Close first so opening the drawer does not summon the tablet keyboard.
    el('quick-close').focus({preventScroll:true});
  }
  tab.onclick=open;el('quick-close').onclick=()=>panel.close();
  panel.addEventListener('close',()=>{tab.setAttribute('aria-expanded','false');if(!document.querySelector('dialog[open]'))returnFocus?.focus({preventScroll:true});});
  panel.addEventListener('click',event=>{if(event.target!==panel)return;const box=panel.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)panel.close();});
  el('quick-kind-task').onclick=()=>switchKind('task');el('quick-kind-note').onclick=()=>switchKind('note');
  el('quick-form').onsubmit=event=>{
    event.preventDefault();if(busy)return;busy=true;
    try{
      const text=el('quick-text').value,group=el('quick-group').value;
      const result=kind==='task'?api.addTasks({text,group,due:el('quick-due-today').checked?today():'',priority:el('quick-priority').checked}):api.appendNote({text,group});
      el('quick-feedback').textContent=result.message;
      if(result.ok){el('quick-text').value='';rememberDraft();render();}
    }finally{busy=false;}
  };
  el('quick-all-tasks').onclick=()=>{panel.close();el('open-briefing').click();};
  el('quick-open-notes').onclick=()=>{const group=el('quick-group').value;panel.close();api.openWorkspace(group);};
  let gesture=null;
  tab.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'||!event.isPrimary)return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};tab.setPointerCapture(event.pointerId);});
  tab.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(dx < -45&&Math.abs(dy)<60)open();});
  tab.addEventListener('pointercancel',()=>{gesture=null;});
  panel.addEventListener('pointerdown',event=>{if(event.target.closest('button,input,textarea,select'))return;gesture={id:event.pointerId,x:event.clientX,y:event.clientY};});
  panel.addEventListener('pointerup',event=>{if(!gesture||gesture.id!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(dx>90&&Math.abs(dy)<45)panel.close();});
  panel.addEventListener('pointercancel',()=>{gesture=null;});
  document.addEventListener('joi-organizer-changed',()=>{if(panel.open)render();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&panel.open)render();});
  setInterval(()=>{if(lastDay!==today()){lastDay=today();if(panel.open)render();}},30000);
})();
