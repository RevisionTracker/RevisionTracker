(() => {
  'use strict';

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const SUBJECTS = ['German', 'English Language', 'English Literature', 'Maths', 'Biology', 'Chemistry', 'Physics', 'Computer Science', 'Product Design'];
  const STATUSES = ['Not planned', 'Planned', 'Completed'];
  const STORAGE_KEY = 'revision-tracker-data-v1';
  const $ = id => document.getElementById(id);
  let selectedMonday = weekStart(new Date());
  let selectedSessionId = null;
  let state = loadState();
  let toastTimer = null;

  function localDate(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function weekStart(d) { const x = localDate(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  function parseDateKey(k) { const [y,m,d] = k.split('-').map(Number); return new Date(y,m-1,d); }
  function weekKey(d = selectedMonday) { return dateKey(d); }
  function prettyDate(d, opts={day:'numeric', month:'short'}) { return d.toLocaleDateString('en-GB', opts); }
  function weekTitle(d) { return `${prettyDate(d, {day:'numeric',month:'short',year:'numeric'})} – ${prettyDate(addDays(d,6), {day:'numeric',month:'short',year:'numeric'})}`; }
  function uid() { return (globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }

  function emptyWeek() {
    const days = {}, minutes = {};
    for (const day of DAYS) { days[day] = 'Not planned'; minutes[day] = Object.fromEntries(SUBJECTS.map(s => [s, 0])); }
    return {days, minutes, slots: []};
  }
  function normalizeWeek(raw) {
    const out = emptyWeek();
    if (!raw || typeof raw !== 'object') return out;
    if (raw.days && typeof raw.days === 'object') for (const d of DAYS) if (STATUSES.includes(raw.days[d])) out.days[d] = raw.days[d];
    if (raw.minutes && typeof raw.minutes === 'object') for (const d of DAYS) {
      const row = raw.minutes[d]; if (!row || typeof row !== 'object') continue;
      if (row.English !== undefined && row['English Language'] === undefined) row['English Language'] = row.English;
      for (const s of SUBJECTS) { const v = Number(row[s] ?? 0); out.minutes[d][s] = Number.isFinite(v) ? Math.max(0, Math.min(1440, Math.floor(v))) : 0; }
    }
    if (Array.isArray(raw.slots)) for (const old of raw.slots) {
      if (!old || !DAYS.includes(old.day) || !SUBJECTS.includes(old.subject) || !String(old.task || '').trim()) continue;
      const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(old.time || '')) ? old.time : '17:00';
      out.slots.push({id: typeof old.id === 'string' ? old.id : uid(), day: old.day, time, subject: old.subject, task: String(old.task).slice(0,180), minutes: Math.max(1, Math.min(720, Number.parseInt(old.minutes ?? old.planned_minutes ?? 25,10) || 25)), completed: old.completed === true, notes: typeof old.notes === 'string' ? old.notes.slice(0,3000) : ''});
    }
    return out;
  }
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const weeks = {};
      if (parsed && parsed.weeks && typeof parsed.weeks === 'object') for (const [key, val] of Object.entries(parsed.weeks)) if (/^\d{4}-\d{2}-\d{2}$/.test(key)) weeks[key] = normalizeWeek(val);
      return {version:1, weeks};
    } catch { return {version:1, weeks:{}}; }
  }
  function getWeek(key = weekKey()) { if (!state.weeks[key]) state.weeks[key] = emptyWeek(); return state.weeks[key]; }
  function persist(message = false) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      $('saveIndicator').textContent = 'Saved on this device';
      if (message) showToast('Saved on this device.');
      return true;
    } catch (e) {
      $('saveIndicator').textContent = 'Could not save';
      showToast('The browser could not save your data. Export a backup and check available storage.');
      return false;
    }
  }
  function showToast(message) {
    const node = $('toast'); node.textContent = message; node.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => node.classList.add('hidden'), 3300);
  }
  function setMessage(id, text, isError = false) { const el = $(id); el.textContent = text; el.style.color = isError ? '#b42318' : ''; }

  function render() {
    const wk = getWeek();
    const nowWeek = weekStart(new Date());
    $('weekRange').textContent = weekTitle(selectedMonday);
    $('weekTag').textContent = dateKey(selectedMonday) === dateKey(nowWeek) ? 'CURRENT WEEK' : selectedMonday < nowWeek ? 'PREVIOUS WEEK' : 'FUTURE WEEK';
    $('weekSub').textContent = 'Week beginning Monday';
    renderDays(wk); renderSubjectSummary(wk); renderSessions(wk); renderStats(wk); renderDaySelects(); renderMinuteLog(wk);
  }
  function renderDays(wk) {
    const box = $('dayList'); box.replaceChildren();
    DAYS.forEach((day, i) => {
      const d = addDays(selectedMonday, i); const row = document.createElement('div'); row.className = 'day-row' + (dateKey(d) === dateKey(new Date()) ? ' today' : '');
      const nam = document.createElement('div'); const title = document.createElement('div'); title.className='day-name'; title.textContent = day + (dateKey(d) === dateKey(new Date()) ? ' · Today' : ''); const dt = document.createElement('div'); dt.className='day-date'; dt.textContent = prettyDate(d); nam.append(title,dt);
      const sel = document.createElement('select'); sel.setAttribute('aria-label', `${day} revision status`);
      STATUSES.forEach(s => { const op = document.createElement('option'); op.value=s; op.textContent=s; sel.append(op); }); sel.value = wk.days[day];
      sel.addEventListener('change', () => { wk.days[day]=sel.value; persist(); renderStats(wk); });
      const count = document.createElement('span'); count.className='day-date'; const daySlots = wk.slots.filter(s=>s.day===day); count.textContent = `${daySlots.filter(s=>s.completed).length}/${daySlots.length} done`;
      row.append(nam,sel,count); box.append(row);
    });
  }
  function renderSubjectSummary(wk) {
    const box = $('subjectSummary'); box.replaceChildren();
    const totals = Object.fromEntries(SUBJECTS.map(s=>[s, DAYS.reduce((n,d)=>n+(Number(wk.minutes[d][s])||0),0)]));
    const max = Math.max(1, ...Object.values(totals));
    const active = SUBJECTS.filter(s=>totals[s]>0);
    if (!active.length) { const p=document.createElement('p'); p.className='muted'; p.textContent='No revision time logged yet. Add actual minutes in the revision log or complete a session.'; box.append(p); return; }
    active.sort((a,b)=>totals[b]-totals[a]).forEach(s=>{
      const row=document.createElement('div');row.className='subject-line';const name=document.createElement('span');name.textContent=s;const track=document.createElement('div');track.className='bar-track';const fill=document.createElement('div');fill.className='bar-fill';fill.style.width=`${totals[s]/max*100}%`;track.append(fill);const value=document.createElement('span');value.className='subject-minutes';value.textContent=formatDuration(totals[s]);row.append(name,track,value);box.append(row);
    });
  }
  function formatDuration(mins) { const h=Math.floor(mins/60), m=mins%60; return h ? `${h}h ${m}m` : `${m} min`; }
  function renderStats(wk) {
    const all = wk.slots.length, done = wk.slots.filter(s=>s.completed).length;
    const minutes = DAYS.reduce((sum,d)=>sum+SUBJECTS.reduce((s,sub)=>s+(Number(wk.minutes[d][sub])||0),0),0);
    const completedDays = DAYS.filter(d=>wk.days[d]==='Completed').length;
    $('statDone').textContent = `${done} / ${all}`; $('statMinutes').textContent=formatDuration(minutes); $('statDays').textContent=`${completedDays} / 7`;
    // A completed slot is counted at its planned duration if no actual time was logged for that subject/day.
    const logged = new Set();
    for(const day of DAYS) for(const s of SUBJECTS) if(wk.minutes[day][s]>0) logged.add(`${day}|${s}`);
    let inferred=0; for(const slot of wk.slots) if(slot.completed && !logged.has(`${slot.day}|${slot.subject}`)) inferred += slot.minutes;
    if(inferred) $('statMinutes').title = `Logged time plus ${formatDuration(inferred)} from completed sessions without separately logged minutes.`;
  }
  function renderDaySelects() {
    for (const id of ['slotDay','logDay']) { const sel=$(id); const old=sel.value; sel.replaceChildren(); DAYS.forEach(d=>{const o=document.createElement('option');o.value=d;o.textContent=d;sel.append(o);}); if(DAYS.includes(old))sel.value=old; }
    const sub=$('slotSubject'); const oldSub=sub.value; sub.replaceChildren(); SUBJECTS.forEach(s=>{const o=document.createElement('option');o.value=s;o.textContent=s;sub.append(o);}); if(SUBJECTS.includes(oldSub))sub.value=oldSub;
  }
  function renderMinuteLog(wk) {
    const day = DAYS.includes($('logDay').value) ? $('logDay').value : DAYS[Math.max(0, Math.min(6, new Date().getDay() === 0 ? 6 : new Date().getDay()-1))];
    $('logDay').value = day;
    const box = $('minuteLog'); box.replaceChildren();
    SUBJECTS.forEach(subject => {
      const label = document.createElement('label'); label.textContent = subject; label.htmlFor = `minutes-${subject.replace(/[^a-z0-9]/gi,'-')}`;
      const input = document.createElement('input'); input.type='number'; input.min='0'; input.max='1440'; input.step='5'; input.inputMode='numeric'; input.id=label.htmlFor; input.value=String(wk.minutes[day][subject] || 0); input.setAttribute('aria-label', `${subject} minutes on ${day}`);
      input.addEventListener('change', () => {
        const raw = input.value.trim(); const val = raw === '' ? 0 : Number(raw);
        if (!Number.isInteger(val) || val < 0 || val > 1440) { showToast('Enter a whole number from 0 to 1440 minutes.'); input.value=String(wk.minutes[day][subject]||0); return; }
        wk.minutes[day][subject] = val; persist(); renderSubjectSummary(wk); renderStats(wk);
      });
      box.append(label,input);
    });
  }
  function sortedSlots(wk) { return [...wk.slots].sort((a,b)=>DAYS.indexOf(a.day)-DAYS.indexOf(b.day)||a.time.localeCompare(b.time)); }
  function renderSessions(wk) {
    const box=$('sessionList');box.replaceChildren();const slots=sortedSlots(wk);$('sessionCount').textContent=`${slots.length} session${slots.length===1?'':'s'}`;
    if (!slots.length) { const p=document.createElement('div');p.className='empty-state';p.textContent='No sessions planned for this week yet. Add one above or use the AI planner.';box.append(p); }
    slots.forEach(s=>{
      const b=document.createElement('button');b.type='button';b.className='session-card'+(s.completed?' done':'')+(s.id===selectedSessionId?' selected':'');b.setAttribute('aria-label',`${s.day} ${s.time}, ${s.subject}: ${s.task}`);
      const top=document.createElement('div');top.className='session-top';const subject=document.createElement('span');subject.className='session-subject';subject.textContent=s.subject;const time=document.createElement('span');time.className='session-time';time.textContent=`${s.day} · ${s.time}`;top.append(subject,time);
      const task=document.createElement('p');task.className='session-task';task.textContent=s.task;
      const bottom=document.createElement('div');bottom.className='session-bottom';const duration=document.createElement('span');duration.textContent=`${s.minutes} min`;const badge=document.createElement('span');badge.className='status-badge '+(s.completed?'done':'todo');badge.textContent=s.completed?'✓ Completed':'○ Planned';bottom.append(duration,badge);if(s.notes){const note=document.createElement('span');note.textContent='📝 Notes added';bottom.append(note);}b.append(top,task,bottom);b.addEventListener('click',()=>selectSession(s.id));box.append(b);
    });
    if(selectedSessionId && !wk.slots.some(s=>s.id===selectedSessionId)){selectedSessionId=null;$('sessionEditor').classList.add('hidden');}
  }
  function selectSession(id) {
    const s=getWeek().slots.find(x=>x.id===id);if(!s)return; selectedSessionId=id;
    $('sessionEditor').classList.remove('hidden');$('selectedSessionTitle').textContent=`${s.day}, ${s.time} · ${s.subject} · ${s.task}`;$('sessionCompleted').checked=s.completed;$('sessionNotes').value=s.notes||'';renderSessions(getWeek());
    if (window.matchMedia('(max-width: 600px)').matches) $('sessionEditor').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function saveSessionEdit() {
    const s=getWeek().slots.find(x=>x.id===selectedSessionId);if(!s)return;
    s.completed=$('sessionCompleted').checked;s.notes=$('sessionNotes').value.slice(0,3000);
    persist();render();selectSession(s.id);showToast('Session saved.');
  }
  function addSlot({day,time,subject,task,minutes,completed=false,notes=''}) {
    const wk=getWeek();wk.slots.push({id:uid(),day,time,subject,task,minutes,completed,notes});
    if(!wk.days[day]||wk.days[day]==='Not planned')wk.days[day]='Planned';
    return wk.slots[wk.slots.length-1];
  }
  $('sessionForm').addEventListener('submit',e=>{
    e.preventDefault();const day=$('slotDay').value,time=$('slotTime').value,subject=$('slotSubject').value,task=$('slotTask').value.trim(),minutes=Number($('slotMinutes').value);
    if(!DAYS.includes(day)||!SUBJECTS.includes(subject)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!task||!Number.isInteger(minutes)||minutes<1||minutes>720){showToast('Check the session details and duration.');return;}
    const slot=addSlot({day,time,subject,task,minutes});if(!persist())return;$('slotTask').value='';render();selectSession(slot.id);showToast('Revision session added.');
  });
  $('saveSessionEdit').addEventListener('click',saveSessionEdit);
  $('logDay').addEventListener('change',()=>renderMinuteLog(getWeek()));
  $('saveMinuteLog').addEventListener('click',()=>{persist();renderSubjectSummary(getWeek());renderStats(getWeek());showToast('Revision times saved on this device.');});
  $('deleteSession').addEventListener('click',()=>{
    const wk=getWeek();const s=wk.slots.find(x=>x.id===selectedSessionId);if(!s)return;if(!confirm(`Delete “${s.task}”?`))return;
    wk.slots=wk.slots.filter(x=>x.id!==selectedSessionId);selectedSessionId=null;$('sessionEditor').classList.add('hidden');persist();render();showToast('Session deleted.');
  });
  function changeWeek(n) { selectedMonday=addDays(selectedMonday,n*7);selectedSessionId=null;$('sessionEditor').classList.add('hidden');render(); }
  $('prevWeek').addEventListener('click',()=>changeWeek(-1));$('nextWeek').addEventListener('click',()=>changeWeek(1));
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.tab-page').forEach(p=>p.classList.toggle('active',p.id===`tab-${btn.dataset.tab}`));
  }));
  $('installHelp').addEventListener('click',()=>alert('To install: publish the files to an HTTPS website, open the address in Safari on your iPhone, tap Share → Add to Home Screen, then open the new icon.'));

  // AI-assisted planning uses a copy/paste flow with ChatGPT, not an embedded or automatic AI service.
  $('makePrompt').addEventListener('click',()=>{
    const wk=getWeek();
    const summary={weekBeginning:weekKey(),availableTime:$('aiAvailability').value.trim(),assessments:$('aiAssessments').value.trim(),priorities:$('aiPriorities').value.trim(),subjects:SUBJECTS.map(subject=>({subject,minutesThisWeek:DAYS.reduce((n,d)=>n+wk.minutes[d][subject],0),sessions:sortedSlots(wk).filter(s=>s.subject===subject).map(s=>({day:s.day,time:s.time,task:s.task,minutes:s.minutes,completed:s.completed,notes:s.notes}))})),existingSessions:sortedSlots(wk).map(s=>({day:s.day,time:s.time,subject:s.subject,task:s.task,minutes:s.minutes,completed:s.completed}))};
    $('aiPrompt').value=`You are helping me plan GCSE revision. Create a realistic, balanced plan for the week beginning ${weekKey()}. Respect the availability and assessments below. Prioritise upcoming assessments and topics I have struggled with. Include active recall and exam practice; avoid scheduling conflicting sessions or overloading school nights. Do not assume I studied something unless my records say so. Suggest short focused sessions and leave sensible breaks. Use only these subjects: ${SUBJECTS.join(', ')}. Return ONLY valid JSON, with no markdown fences and no text outside it, in this exact format: {"sessions":[{"day":"Monday","time":"17:00","subject":"German","task":"Practise speaking answers from memory","minutes":20}]}. Valid day names are ${DAYS.join(', ')}. Times must be 24-hour HH:MM; minutes must be an integer from 5 to 120. Keep each task specific. Do not include sessions outside my stated availability. Do not repeat a session already completed. Ask for clarification instead of inventing important assessment dates.

MY PLANNING INFO (JSON):
${JSON.stringify(summary,null,2)}`;
    $('aiPrompt').focus();$('aiPrompt').select();setMessage('aiMessage','');showToast('Prompt created. Copy it into ChatGPT.');
  });
  $('copyPrompt').addEventListener('click',async()=>{
    const txt=$('aiPrompt').value;if(!txt){showToast('Create the prompt first.');return;}
    try{await navigator.clipboard.writeText(txt);showToast('Prompt copied. Paste it into ChatGPT.');}catch{$('aiPrompt').focus();$('aiPrompt').select();showToast('Text selected. Use Copy from the menu.');}
  });
  function parseAIJson(text) {
    let clean=text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    const first=clean.indexOf('{'),last=clean.lastIndexOf('}');if(first>=0&&last>first)clean=clean.slice(first,last+1);
    return JSON.parse(clean);
  }
  $('importAi').addEventListener('click',()=>{
    setMessage('aiMessage','');let obj;try{obj=parseAIJson($('aiJson').value);}catch{setMessage('aiMessage','Could not read JSON. Ask ChatGPT to return only valid JSON, without commentary.',true);return;}
    if(!obj||!Array.isArray(obj.sessions)||obj.sessions.length>50){setMessage('aiMessage','Expected a JSON object with a sessions array (maximum 50 sessions).',true);return;}
    const valid=[];const problems=[];
    obj.sessions.forEach((s,i)=>{
      if(!s||!DAYS.includes(s.day)||!SUBJECTS.includes(s.subject)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(s.time))||typeof s.task!=='string'||!s.task.trim()||!Number.isInteger(Number(s.minutes))||Number(s.minutes)<5||Number(s.minutes)>120){problems.push(`Session ${i+1} has invalid fields.`);return;}
      valid.push({day:s.day,time:s.time,subject:s.subject,task:s.task.trim().slice(0,180),minutes:Number(s.minutes)});
    });
    if(problems.length){setMessage('aiMessage',`${problems.slice(0,3).join(' ')} Nothing imported. Check day, time, subject, task and 5–120 minute duration.`,true);return;}
    if(!valid.length){setMessage('aiMessage','No sessions found to import.',true);return;}
    if(!confirm(`Import ${valid.length} new sessions into the week beginning ${weekKey()}? Review them after importing.`))return;
    valid.forEach(s=>addSlot(s));persist();render();setMessage('aiMessage',`Imported ${valid.length} sessions. Review them in the Sessions tab.`);showToast('AI suggestions imported.');
  });

  // Backup and import. Supports this app's backup format and the user's earlier Python revision_data.json format.
  function downloadFile(name,content,type) { const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  $('exportData').addEventListener('click',()=>{downloadFile(`revision-backup-${dateKey(new Date())}.json`,JSON.stringify({app:'GCSE Revision Tracker',version:1,exportedAt:new Date().toISOString(),weeks:state.weeks},null,2),'application/json');setMessage('dataMessage','Backup exported. Store it somewhere safe.');});
  $('importData').addEventListener('change',async e=>{
    const file=e.target.files && e.target.files[0];if(!file)return;
    try{
      const obj=JSON.parse(await file.text());const incoming=(obj&&obj.weeks&&typeof obj.weeks==='object')?obj.weeks:obj;
      if(!incoming||typeof incoming!=='object'||Array.isArray(incoming))throw new Error('File does not contain a valid weeks object.');
      const converted={};let count=0;
      for(const [k,v] of Object.entries(incoming)){if(/^\d{4}-\d{2}-\d{2}$/.test(k)){converted[k]=normalizeWeek(v);count++;}}
      if(!count)throw new Error('No dated weeks found in this file.');
      if(!confirm(`Import ${count} week records? If dates already exist, they will be replaced.`))return;
      state.weeks={...state.weeks,...converted};persist();render();setMessage('dataMessage',`Imported ${count} weeks successfully.`);
    }catch(err){setMessage('dataMessage',`Import failed: ${err.message}`,true);}finally{e.target.value='';}
  });
  function icsEscape(s) { return String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'); }
  function icsDate(d) { return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }
  $('exportCalendar').addEventListener('click',()=>{
    const slots=sortedSlots(getWeek());if(!slots.length){setMessage('dataMessage','No sessions to export for this week.',true);return;}
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//GCSE Revision Tracker//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
    for(const s of slots){const dayIndex=DAYS.indexOf(s.day);const d=addDays(selectedMonday,dayIndex);const [h,m]=s.time.split(':').map(Number);const start=new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,m);const end=new Date(start.getTime()+s.minutes*60000);const localIcs=dt=>`${icsDate(dt)}T${String(dt.getHours()).padStart(2,'0')}${String(dt.getMinutes()).padStart(2,'0')}00`;
      lines.push('BEGIN:VEVENT',`UID:${s.id}@revision-tracker.local`,`DTSTAMP:${stamp}`,`DTSTART:${localIcs(start)}`,`DTEND:${localIcs(end)}`,`SUMMARY:${icsEscape(`Revision: ${s.subject} - ${s.task}`)}`,`DESCRIPTION:${icsEscape(`Subject: ${s.subject}\\nTask: ${s.task}\\nNotes: ${s.notes||'Add notes in Revision Tracker.'}`)}`,'BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY',`DESCRIPTION:${icsEscape(`Revision reminder: ${s.subject}`)}`,'END:VALARM','END:VEVENT');
    }
    lines.push('END:VCALENDAR');downloadFile(`revision-week-${weekKey()}.ics`,lines.join('\r\n'),'text/calendar;charset=utf-8');setMessage('dataMessage','Calendar file exported. Open it on your iPhone and add the events to Apple Calendar; check that alerts are enabled.');
  });

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { $('saveIndicator').textContent='Offline caching unavailable'; });
  }
  render();
})();
