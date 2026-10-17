/* Additive editor. All durable writes are restricted to the selected course content. */
(function() {
  'use strict';
  const C=ACESCourse, E=C.escape;
  let state=null, overlay=null, busy=false;
  function allowed(wsId,publish=false){return _role==='admin'||(!publish&&_role==='trainer'&&_wsId===wsId);}
  function requireAccess(publish=false){if(!state||!allowed(state.wsId,publish))throw new Error('هذه العملية غير مسموحة لحسابك');}
  async function read(path){const f=window.FB2;if(!f)throw new Error('Firebase غير متصل');const s=await f.get(f.ref(f.db,path));return s.exists()?s.val():null;}
  function cache(ws){if(_allWs?.[state.wsId])_allWs[state.wsId]=ws;if(_wsId===state.wsId)_ws=ws;}
  async function transaction(mutator){
    requireAccess();const f=window.FB2;if(!f?.runTransaction)throw new Error('تعذر بدء الحفظ — أعد تحميل الصفحة');
    let reason='تغير المحتوى من جهاز آخر. أغلق المحرر وافتحه من جديد.';
    const result=await f.runTransaction(f.ref(f.db,'workshops/'+state.wsId+'/courseContent'),current=>{
      current=current===null?C.clone(state.content):current;
      if((current.revision||0)!==state.baseRevision)return;
      try{return mutator(C.clone(current));}catch(e){reason=e.message;return;}
    },{applyLocally:false});
    if(!result.committed)throw new Error(reason);
    state.content=result.snapshot.val();state.baseRevision=state.content.revision||0;
    state.ws.courseContent=state.content;cache(state.ws);state.dirty=false;
  }
  function ensureOverlay(){
    if(overlay)return;
    overlay=document.createElement('div');overlay.className='overlay';overlay.id='course-content-overlay';
    overlay.innerHTML='<section class="modal" style="max-width:1000px" role="dialog" aria-modal="true" aria-labelledby="cc-title"><div class="modal-h"><h2 id="cc-title"></h2><button class="x-btn" type="button" data-cc-action="close" aria-label="إغلاق">✕</button></div><div id="cc-body"></div></section>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',e=>{const btn=e.target.closest('[data-cc-action]');if(btn)dispatch(btn.dataset.ccAction,btn.dataset);});
    overlay.addEventListener('input',()=>{if(state)state.dirty=true;});
    overlay.addEventListener('change',e=>{if(e.target.id==='cc-file')importFile(e.target.files[0]).catch(fail);});
    window.addEventListener('beforeunload',e=>{if(state?.dirty){e.preventDefault();e.returnValue='';}});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay?.classList.contains('open'))close();});
  }
  function capture(){
    if(!state||!document.getElementById('cc-day-title'))return;
    const day=state.draft.days[state.day];
    day.title=document.getElementById('cc-day-title').value.trim();
    day.materialUrl=document.getElementById('cc-material').value.trim();
    overlay.querySelectorAll('[data-question]').forEach(el=>{
      const i=Number(el.dataset.question),q=day.questions[i];if(!q)return;
      q.q=el.querySelector('[data-field="q"]').value.trim();
      q.exp=el.querySelector('[data-field="exp"]').value.trim();
      q.type=el.querySelector('[data-field="type"]').value;
      q.opts=Array.from(el.querySelectorAll('[data-field="option"]')).map(v=>v.value.trim());
      if(q.type==='tf')q.opts=q.opts.slice(0,2);else while(q.opts.length>2&&!q.opts[q.opts.length-1])q.opts.pop();
      const answer=el.querySelector('[data-field="ans"]').value;
      q.ans=answer===''?null:Number(answer);q.marks=Number(el.querySelector('[data-field="marks"]').value);
    });
  }
  function fail(e){console.error('Course content:',e.message);toast('❌ '+e.message,7000);const box=document.getElementById('cc-errors');if(box){box.textContent=e.message;box.hidden=false;}}
  function status(d){const day=state.draft.days[d],pub=state.content.published?.[d];return day.questions.length+' سؤال · '+(pub?'منشور':'مسودة');}
  function render(){
    const s=state,day=s.draft.days[s.day],lang=s.draft.language;
    document.getElementById('cc-title').textContent='📚 المحتوى والأسئلة — '+s.ws.name;
    document.getElementById('cc-body').innerHTML=`
      <p style="font-size:.8rem;color:var(--muted);margin-bottom:14px">${_role==='admin'?'يمكنك حفظ المسودات واعتماد النشر.':'يمكنك إعداد مسودات دورتك؛ النشر واعتماد الإجابات للمشرف فقط.'} لغة المتدرب: <strong>${lang==='en'?'English':'العربية'}</strong>. قالب الشهادات وتسلسلها وشروط الأحقية الحالية لا تتغير.</p>
      <div class="subnav">${C.DAYS.map(d=>`<button type="button" class="snbtn ${d===s.day?'active':''}" data-cc-action="day" data-day="${d}">Day ${d}<br><small>${status(d)}</small></button>`).join('')}</div>
      <div class="form-row"><div><label class="inp-label" for="cc-day-title">عنوان اليوم</label><input class="inp" id="cc-day-title" dir="auto" maxlength="250" value="${E(day.title)}"></div><div><label class="inp-label" for="cc-material">رابط المادة التدريبية لليوم — HTTPS</label><input class="inp" id="cc-material" type="url" dir="ltr" value="${E(day.materialUrl)}" placeholder="https://drive.google.com/file/d/.../view"></div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0">
        <button class="btn btn-s" data-cc-action="template">⬇️ نموذج Excel للأيام الخمسة</button>
        <label class="btn btn-s">📥 استيراد Excel / CSV / JSON<input id="cc-file" type="file" accept=".xlsx,.csv,.json" style="display:none"></label>
        <select id="cc-import-mode" class="inp" style="width:auto" aria-label="طريقة الاستيراد"><option value="replace">استبدال مسودة الأيام الموجودة بالملف</option><option value="append">إضافة إلى الأسئلة الحالية</option></select>
        <button class="btn btn-s" data-cc-action="starter">أسئلة المرفقات للأيام 2 و3 و4</button>
        <button class="btn btn-s" data-cc-action="export">تصدير المسودة JSON</button>
      </div>
      <p style="font-size:.75rem;color:var(--muted);margin-bottom:12px">Excel: أسماء التبويبات Day 1 … Day 5. CSV يخص اليوم المحدد. الإجابة A/B/C/D أو True/False. الملفات الفارغة لا تمس الأيام الأخرى. المعاينة قبل الحفظ، ولا نشر تلقائياً.</p>
      <pre id="cc-errors" hidden style="white-space:pre-wrap;background:var(--red2);color:var(--red);padding:12px;border-radius:10px;font:inherit;font-size:.8rem"></pre>
      <div id="cc-import-preview"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0"><button class="btn btn-s" data-cc-action="add">＋ سؤال اختيار متعدد</button><button class="btn btn-s" data-cc-action="add-tf">＋ صح/خطأ</button><button class="btn btn-b" data-cc-action="preview">👁 معاينة كمتدرب</button></div>
      <div id="cc-question-list">${day.questions.length?day.questions.map((q,i)=>questionHTML(q,i)).join(''):'<p style="padding:20px;text-align:center;color:var(--muted)">لا أسئلة لهذا اليوم. أضف سؤالاً أو استورد ملفاً.</p>'}</div>
      <div style="position:sticky;bottom:-24px;background:#fff;padding:14px 0;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-p" data-cc-action="save">💾 حفظ مسودة الدورة</button>
        ${_role==='admin'?`<button class="btn btn-g" data-cc-action="publish">✅ اعتماد ونشر اليوم ${s.day}</button>`:''}
        ${_role==='admin'?'<button class="btn btn-b" data-cc-action="publish-material">📚 نشر رابط المادة فقط</button>':''}
        <span style="font-size:.75rem;color:var(--muted);align-self:center">${s.content.published?.[s.day]?'آخر إصدار: '+E(s.content.published[s.day].contentVersion):'غير منشور — لا يظهر للمتدرب'}</span>
      </div>`;
  }
  function questionHTML(q,i){
    const options=Array.from({length:q.type==='tf'?2:4},(_,n)=>q.opts[n]||'');
    return `<details class="card" data-question="${i}" style="margin-bottom:12px;padding:14px" ${i===state.draft.days[state.day].questions.length-1?'open':''}>
      <summary dir="auto" style="cursor:pointer;font-weight:800">${i+1}. ${E(q.q.slice(0,95)||'سؤال جديد')} ${q.ans==null?'— ⚠️ لم تحدد الإجابة':''}</summary>
      <div class="form-row" style="margin-top:12px"><div><label class="inp-label">النوع<select class="inp" data-field="type"><option value="mc" ${q.type==='mc'?'selected':''}>MC — اختيار متعدد</option><option value="tf" ${q.type==='tf'?'selected':''}>TF — صح/خطأ</option></select></label></div><div><label class="inp-label">الدرجة<input class="inp" data-field="marks" type="number" min="0.1" max="100" step="0.1" value="${q.marks}"></label></div></div>
      <label class="inp-label">نص السؤال<textarea class="inp" data-field="q" dir="auto" rows="3">${E(q.q)}</textarea></label>
      <div class="form-row">${options.map((opt,n)=>`<label class="inp-label">Option ${String.fromCharCode(65+n)}<input class="inp" dir="auto" data-field="option" value="${E(opt)}"></label>`).join('')}</div>
      <label class="inp-label">الإجابة الصحيحة<select class="inp" data-field="ans"><option value="">غير محددة — مسودة فقط</option>${options.map((_,n)=>`<option value="${n}" ${q.ans===n?'selected':''}>${String.fromCharCode(65+n)}</option>`).join('')}</select></label>
      <label class="inp-label">تفسير الإجابة — اختياري<textarea class="inp" data-field="exp" dir="auto" rows="2">${E(q.exp||'')}</textarea></label>
      <div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-s" data-cc-action="up" data-index="${i}">↑</button><button class="btn btn-s" data-cc-action="down" data-index="${i}">↓</button><button class="btn btn-r" data-cc-action="delete" data-index="${i}">حذف السؤال من المسودة</button></div>
      </details>`;
  }
  async function open(wsId){
    if(!allowed(wsId)){toast('⚠️ غير مسموح');return;}
    if(state?.dirty&&!confirm('هناك مسودة غير محفوظة. هل تريد تركها؟'))return;
    try{
      const ws=await read('workshops/'+wsId);if(!ws)throw new Error('الدورة غير موجودة');
      if(!C.managed(ws)){toast('هذه دورة بالنظام السابق. استخدم إنشاء دورة بمحتوى مخصص؛ لم يتم تغيير المحتوى القديم.',6000);return;}
      const content=ws.courseContent||{};
      state={wsId,ws,content,baseRevision:content.revision||0,draft:C.normalizeDraft(content.draft,ws.courseLanguage||'en'),day:1,dirty:false,pending:null};
      ensureOverlay();render();overlay.classList.add('open');overlay.querySelector('button').focus();
    }catch(e){fail(e);}
  }
  function close(){if(busy)return;if(state?.dirty&&!confirm('هل تريد إغلاق المحرر دون حفظ التغييرات؟'))return;overlay.classList.remove('open');state=null;}
  async function save(){
    requireAccess();capture();const errors=C.validateDraft(state.draft);if(errors.length)throw new Error(errors.slice(0,15).join('\n'));
    const draft=C.clone(state.draft);
    await transaction(current=>({...current,schemaVersion:1,draft,revision:(current.revision||0)+1,updatedAt:new Date().toISOString(),updatedByRole:_role}));
    toast('✅ حُفظت المسودة فقط — لم تُنشر');render();
  }
  async function publish(){
    requireAccess(true);capture();const d=state.day,errors=C.validateDay(state.draft.days[d],true);if(errors.length)throw new Error(errors.slice(0,15).join('\n'));
    if(state.pending)throw new Error('اعتمد معاينة الاستيراد أو ارفضها أولاً');
    const current=await read('workshops/'+state.wsId);
    if(C.dayStarted(current,d))throw new Error('لا يمكن استبدال الاختبار بعد فتحه أو بدء الإجابات. أنشئ دورة جديدة للمجموعة الجديدة.');
    if(!confirm('نشر أسئلة وإجابات اليوم '+d+' للمتدربين؟ لن يمكن تغييرها بعد فتح الاختبار.'))return;
    const draft=C.clone(state.draft),version='v_'+Date.now().toString(36)+'_'+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    await transaction(content=>{
      const next=C.release(content,draft,d,version,new Date().toISOString());
      next.draft=draft;next.materials=next.materials||{};next.materials[d]={url:draft.days[d].materialUrl||'',updatedAt:new Date().toISOString()};next.updatedByRole='admin';return next;
    });
    toast('✅ تم نشر اليوم '+d);render();
  }
  async function publishMaterial(){
    requireAccess(true);capture();const errors=C.validateDraft(state.draft);if(errors.length)throw new Error(errors.slice(0,15).join('\n'));
    if(!confirm('نشر رابط مادة اليوم '+state.day+' فقط؟ سيُحفظ باقي المحتوى كمسودة دون تغيير الأسئلة المنشورة.'))return;
    const draft=C.clone(state.draft),d=state.day;
    await transaction(content=>({...content,draft,materials:{...(content.materials||{}),[d]:{url:draft.days[d].materialUrl||'',updatedAt:new Date().toISOString()}},revision:(content.revision||0)+1,updatedByRole:'admin'}));
    toast('✅ تم نشر رابط المادة — لم تتغير الأسئلة المنشورة');render();
  }
  function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
  function template(){
    const sheets=C.DAYS.map(d=>({name:'Day '+d,rows:[C.HEADERS]}));
    sheets.push({name:'Instructions',rows:[['ACES question import template'],['One sheet per day: Day 1 to Day 5. Do not rename columns.'],['Question / Option A-D / Correct Answer / Explanation / Marks / Type'],['Type: MC or TF. For TF, Option A=True and Option B=False.'],['Correct Answer: A, B, C, D, or True / False. Never use numeric answer indexes.'],['Blank answer keys are allowed as DRAFT only; publishing requires all keys.'],['Max 250 questions/day; 5 MB/file. No formulas, macros, or password protection.'],['Blank sheets are ignored and do not delete existing days.'],['CSV imports into the selected day. Save as UTF-8, comma-separated.']]});
    download(ACESXLSX.workbook(sheets),'ACES_Questions_Template_5_Days.xlsx');
  }
  async function importFile(file){
    if(!file)return;requireAccess();capture();if(file.size>5*1024*1024)throw new Error('الحد الأقصى للملف 5 MB');
    const ext=file.name.split('.').pop().toLowerCase();let incoming={schemaVersion:1,days:{}};
    if(ext==='xlsx'){
      const sheets=await ACESXLSX.read(await file.arrayBuffer());
      for(const [d,rows]of Object.entries(sheets))incoming.days[d]={...state.draft.days[d],questions:C.fromRows(rows,d,state.draft.language)};
    }else if(ext==='csv')incoming.days[state.day]={...state.draft.days[state.day],questions:C.fromRows(C.parseCSV(await file.text()),state.day,state.draft.language)};
    else if(ext==='json')incoming=JSON.parse(await file.text());
    else throw new Error('الملفات المدعومة XLSX أو CSV أو JSON فقط');
    stage(incoming);
  }
  function stage(incoming){
    const replace=document.getElementById('cc-import-mode').value==='replace';
    state.pending=C.mergeImport(state.draft,incoming,replace);
    const days=Object.keys(incoming.days).filter(d=>incoming.days[d]?.questions?.length);
    if(!days.length){state.pending=null;throw new Error('لا أسئلة في الملف');}
    document.getElementById('cc-import-preview').innerHTML=`<div class="card" style="background:var(--gold2)"><strong>معاينة الاستيراد — لم يُحفظ شيء بعد</strong><ul style="margin:10px 20px">${days.map(d=>`<li>Day ${d}: ${incoming.days[d].questions.length} سؤال · ${incoming.days[d].questions.filter(q=>q.ans==null).length} بلا إجابة صحيحة</li>`).join('')}</ul><p style="font-size:.8rem">${replace?'سيستبدل محتوى مسودة هذه الأيام فقط.':'ستُضاف الأسئلة إلى مسودات هذه الأيام.'} لا تغيير على المنشور أو النتائج.</p><button class="btn btn-p" data-cc-action="accept-import">اعتماد في المحرر</button> <button class="btn btn-s" data-cc-action="cancel-import">إلغاء</button></div>`;
    document.getElementById('cc-import-preview').scrollIntoView?.({block:'nearest'});
  }
  function preview(){
    capture();const day=state.draft.days[state.day],dir=state.draft.language==='en'?'ltr':'rtl';
    document.getElementById('cc-body').innerHTML=`<button class="btn btn-s" data-cc-action="back">رجوع إلى المحرر</button><div dir="${dir}" style="margin-top:16px"><h3>${E(day.title)}</h3><p>${state.draft.language==='en'?'Preview only — answers are not submitted.':'معاينة فقط — لا تُسجل إجابات.'}</p>${day.questions.map((q,i)=>`<div class="card" style="margin-top:12px"><strong>${i+1}. ${E(q.q)}</strong>${q.opts.map(o=>`<label style="display:block;padding:8px"><input type="radio" name="cc-preview-${i}"> ${E(o)}</label>`).join('')}</div>`).join('')}</div>`;
  }
  async function dispatch(action,data){
    if(busy)return;
    try{
      if(action==='close'){close();return;}
      requireAccess();
      if(action==='preview'){preview();return;}
      if(action==='back'){render();return;}
      if(action==='template'){template();return;}
      if(action==='export'){capture();download(new Blob([JSON.stringify(state.draft,null,2)],{type:'application/json'}),'ACES_Course_Draft.json');return;}
      if(action==='starter'){
        capture();const r=await fetch('course-starter-days-2-3-4.json',{cache:'no-cache'});if(!r.ok)throw new Error('ارفع ملف أسئلة المرفقات JSON بجانب index.html');stage(await r.json());return;
      }
      if(action==='accept-import'){state.draft=state.pending;state.pending=null;state.dirty=true;render();return;}
      if(action==='cancel-import'){state.pending=null;render();return;}
      if(state.pending)throw new Error('اعتمد الاستيراد أو ألغِه قبل الانتقال أو الحفظ');
      capture();
      if(action==='save'||action==='publish'||action==='publish-material'){busy=true;await(action==='save'?save():action==='publish'?publish():publishMaterial());return;}
      if(action==='day'){state.day=Number(data.day);render();return;}
      const qs=state.draft.days[state.day].questions,i=Number(data.index);
      if(action==='add'||action==='add-tf'){
        if(qs.length>=C.MAX_QUESTIONS)throw new Error('الحد الأقصى 250 سؤالاً');
        const tf=action==='add-tf';qs.push({id:'q_'+Date.now().toString(36)+'_'+qs.length,type:tf?'tf':'mc',q:'',opts:tf?(state.draft.language==='en'?['True','False']:['صح','خطأ']):['','','',''],ans:null,exp:'',marks:1});
      }else if(action==='delete'){if(confirm('حذف السؤال من المسودة؟'))qs.splice(i,1);}
      else if(action==='up'&&i>0)[qs[i-1],qs[i]]=[qs[i],qs[i-1]];
      else if(action==='down'&&i<qs.length-1)[qs[i+1],qs[i]]=[qs[i],qs[i+1]];
      state.dirty=true;render();
    }catch(e){fail(e);}finally{busy=false;}
  }
  // Locks share the same transaction location as publication: no concurrent re-publish after opening.
  async function lockForExam(wsId,day){
    const ws=await read('workshops/'+wsId);if(!C.managed(ws))return true;
    if(!allowed(wsId))throw new Error('غير مسموح');
    const f=window.FB2;
    const result=await f.runTransaction(f.ref(f.db,'workshops/'+wsId+'/courseContent'),content=>{
      if(content===null)content=C.clone(ws.courseContent||{});
      if(!C.getDay({contentMode:'custom-v1',courseContent:content||{}},day).questions.length)return;
      const next=C.clone(content);next.locked=next.locked||{};next.locked[day]=true;next.revision=(next.revision||0)+1;return next;
    },{applyLocally:false});
    if(!result.committed)throw new Error('انشر اختبار هذا اليوم من المشرف أولاً');return true;
  }
  window.CourseManager={open,lockForExam,template};
})();
