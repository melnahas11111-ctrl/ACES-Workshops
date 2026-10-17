/* ACES Course Content v1. Pure, shared rules. No network or legacy data writes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ACESCourse = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAYS = [1, 2, 3, 4, 5];
  const MAX_QUESTIONS = 250;
  const HEADERS = ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Explanation', 'Marks', 'Type'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value) {
    if (!value) return '';
    try { const u = new URL(String(value)); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; }
    catch (_) { return ''; }
  }
  function emptyDraft(language = 'en') {
    return {schemaVersion: 1, language: language === 'ar' ? 'ar' : 'en', days: Object.fromEntries(DAYS.map(d => [d, {title: language === 'ar' ? 'اليوم '+d : 'Day '+d, materialUrl: '', questions: []}]))};
  }
  // Realtime Database drops empty arrays/objects and null fields, and may return
  // numeric-keyed collections as objects. Normalize only at the read boundary.
  function listFromFirebase(value,limit){
    if(value===null||value===undefined)return [];
    if(Array.isArray(value)){if(value.length>limit)throw new Error('قائمة أكبر من الحد المسموح');return Array.from(value);}
    if(typeof value!=='object')throw new Error('قائمة بيانات غير صالحة');
    const keys=Object.keys(value);if(!keys.length)return [];
    if(keys.some(k=>!/^(0|[1-9][0-9]*)$/.test(k)))throw new Error('ترقيم عناصر القائمة غير صالح');
    const length=Math.max(...keys.map(Number))+1;
    if(length>limit)throw new Error('قائمة أكبر من الحد المسموح');
    return Array.from({length},(_,i)=>value[i]??null);
  }
  function normalizeDay(value,fallbackTitle=''){
    const day=value&&typeof value==='object'?value:{};
    return {...day,title:day.title??fallbackTitle,materialUrl:day.materialUrl??'',questions:listFromFirebase(day.questions,MAX_QUESTIONS).map(item=>{
      const q=item&&typeof item==='object'?item:{};
      return {...q,id:q.id??'',q:typeof q.q==='string'?q.q:'',type:q.type??'mc',opts:listFromFirebase(q.opts,4).map(o=>typeof o==='string'?o:''),ans:q.ans??null,exp:q.exp??'',marks:q.marks??1};
    })};
  }
  function normalizeDraft(value,language='en'){
    const input=value&&typeof value==='object'?value:{};
    const base=emptyDraft(input.language||language);
    return {...base,...input,language:base.language,days:Object.fromEntries(DAYS.map(d=>[d,normalizeDay(input.days?.[d],base.days[d].title)]))};
  }
  function managed(ws) { return ws?.contentMode === 'custom-v1'; }
  function getDay(ws, day, legacy = {}, attempt = null) {
    if (!managed(ws)) return legacy[day] || {title: '', questions: []};
    const content = ws.courseContent || {};
    const version = attempt?.contentVersion;
    // Never grade a saved attempt against a different release, or Arabic defaults.
    if (version) return content.releases?.[day]?.[version] ? normalizeDay(content.releases[day][version]) : {title: '', questions: [], missingVersion: true};
    return content.published?.[day] ? normalizeDay(content.published[day]) : {title: '', questions: [], unpublished: true};
  }
  function getMaterial(ws,day){return safeUrl(ws?.courseContent?.materials?.[day]?.url ?? getDay(ws,day).materialUrl);}
  function questionErrors(q, index, published = false) {
    const errors = [], prefix = 'سؤال '+(index+1)+': ';
    if (!q || typeof q !== 'object') return [prefix+'سجل غير صالح'];
    if (typeof q.q!=='string'||!q.q.trim()) errors.push(prefix+'نص السؤال مطلوب ويجب أن يكون نصاً');
    if (String(q.q || '').length > 6000) errors.push(prefix+'النص أطول من الحد المسموح');
    if (!['tf', 'mc'].includes(q.type)) errors.push(prefix+'النوع يجب أن يكون TF أو MC');
    const opts = q.opts;
    if (!Array.isArray(opts) || opts.length < 2 || opts.length > 4 || (q.type === 'tf' && opts.length !== 2)) errors.push(prefix+'عدد الاختيارات غير صالح');
    else {
      if (opts.some(v => typeof v !== 'string' || !v.trim() || v.length > 3000)) errors.push(prefix+'الاختيارات يجب أن تكون نصوصاً غير فارغة');
      if (new Set(opts.map(v=>String(v??'').trim())).size !== opts.length) errors.push(prefix+'اختيارات مكررة');
      if(q.type==='tf' && (!/^(true|t|صح|صحيح)$/i.test(String(opts[0]??'').trim()) || !/^(false|f|خطأ|خاطئ)$/i.test(String(opts[1]??'').trim()))) errors.push(prefix+'في TF يجب أن يكون A=True أو صح، وB=False أو خطأ');
    }
    if (q.ans !== null && q.ans !== undefined && (!Number.isInteger(q.ans) || q.ans < 0 || q.ans >= (opts?.length || 0))) errors.push(prefix+'الإجابة الصحيحة غير صالحة');
    if (published && (q.ans === null || q.ans === undefined)) errors.push(prefix+'حدد الإجابة الصحيحة قبل النشر');
    if (!Number.isFinite(q.marks) || q.marks <= 0 || q.marks > 100) errors.push(prefix+'الدرجة يجب أن تكون أكبر من صفر وحتى 100');
    if (String(q.exp || '').length > 6000) errors.push(prefix+'تفسير الإجابة طويل جداً');
    return errors;
  }
  function validateDay(day, published = false) {
    if (!day || !Array.isArray(day.questions)) return ['بيانات اليوم غير صالحة'];
    let errors = [];
    if (!String(day.title || '').trim()) errors.push('عنوان اليوم مطلوب');
    if (String(day.title || '').length > 250) errors.push('عنوان اليوم طويل جداً');
    if (day.materialUrl && !safeUrl(day.materialUrl)) errors.push('المادة التدريبية تحتاج رابط HTTPS صالحاً');
    if (published && !day.questions.length) errors.push('أضف أسئلة قبل النشر');
    if (day.questions.length > MAX_QUESTIONS) errors.push('الحد الأقصى 250 سؤالاً لكل يوم');
    const ids = new Set(), texts = new Set();
    day.questions.forEach((q, i) => {
      errors.push(...questionErrors(q, i, published));
      if (!q) return;
      const text = String(q.q || '').trim().replace(/\s+/g, ' ');
      if (texts.has(text)) errors.push('سؤال '+(i+1)+': نص مكرر في اليوم نفسه');
      texts.add(text);
      if (!q.id || !/^[a-zA-Z0-9_-]{1,100}$/.test(q.id) || ids.has(q.id)) errors.push('سؤال '+(i+1)+': معرف السؤال غير صالح أو مكرر');
      ids.add(q.id);
    });
    return errors;
  }
  function validateDraft(draft) {
    if (!draft || draft.schemaVersion !== 1 || !['ar', 'en'].includes(draft.language)) return ['صيغة ملف الأسئلة أو لغة الدورة غير صالحة'];
    return DAYS.flatMap(d => validateDay(draft.days?.[d]).map(e=>'اليوم '+d+' — '+e));
  }
  function answerIndex(value, opts, type) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const s = String(value).trim();
    if (/^[A-D]$/i.test(s)) return s.toUpperCase().charCodeAt(0)-65;
    if (type === 'tf' && /^(true|t|صح|صحيح)$/i.test(s)) return 0;
    if (type === 'tf' && /^(false|f|خطأ|خاطئ)$/i.test(s)) return 1;
    // Numeric keys are intentionally rejected: 1 can mean index 1 or option A.
    const exact = opts.findIndex(o => o.trim() === s);
    if (exact !== -1) return exact;
    const matches=opts.map((o,i)=>o.trim().toLowerCase()===s.toLowerCase()?i:-1).filter(i=>i!==-1);
    if(matches.length===1)return matches[0];
    throw new Error('الإجابة يجب أن تكون A/B/C/D أو True/False أو نص الاختيار المطابق');
  }
  function fromRows(rows, day, language) {
    return rows.map((row, i) => {
      const norm = Object.fromEntries(Object.entries(row).map(([k,v])=>[k.trim().toLowerCase(),v]));
      const cell = k => String(norm[k] ?? '').trim();
      if(cell('type')&&!/^(mc|multiple choice|tf|true\/?false|صح\/خطأ)$/i.test(cell('type')))throw new Error('اليوم '+day+'، صف '+(i+2)+': Type يجب أن يكون MC أو TF');
      const type = /^(tf|true\/?false|صح\/خطأ)$/i.test(cell('type')) ? 'tf' : 'mc';
      let opts = ['option a','option b','option c','option d'].map(cell);
      if (type === 'tf' && !opts.some(Boolean)) opts = language === 'ar' ? ['صح','خطأ'] : ['True','False'];
      else { while (opts.length && !opts[opts.length-1]) opts.pop(); }
      let ans;
      try { ans = answerIndex(norm['correct answer'], opts, type); }
      catch(e) { throw new Error('اليوم '+day+'، صف '+(i+2)+': '+e.message); }
      return {id:'d'+day+'_q'+(i+1),type,q:cell('question'),opts,ans,exp:cell('explanation'),marks:cell('marks') === '' ? 1 : Number(cell('marks'))};
    });
  }
  function mergeImport(current, incoming, replace = true) {
    const draft = clone(current);
    if (incoming.schemaVersion !== 1 || !incoming.days || typeof incoming.days !== 'object') throw new Error('ملف JSON غير صالح');
    for (const d of Object.keys(incoming.days)) {
      if (!DAYS.includes(Number(d))) throw new Error('رقم يوم غير صالح في الملف');
      const day = clone(incoming.days[d]);
      if (!day.questions?.length) continue; // Blank sheets never erase another day.
      if (!replace) {
        const existing = draft.days[d].questions;
        const stamp = Date.now().toString(36);
        day.questions.forEach((q,i)=>q.id='d'+d+'_import_'+stamp+'_'+i);
        day.questions = existing.concat(day.questions);
      }
      draft.days[d] = {...draft.days[d], ...day};
    }
    const errors = validateDraft(draft);
    if (errors.length) throw new Error(errors.slice(0,15).join('\n'));
    return draft;
  }
  function dayStarted(ws, d) {
    return ws.exam_approvals?.[d] === 'open' || !!ws.courseContent?.locked?.[d] ||
      Object.values(ws.quiz_progress || {}).some(t => !!t?.[d]) ||
      Object.values(ws.results || {}).some(t => t?.[d] && !t[d].absent);
  }
  function release(content, draft, d, version, at) {
    const errors = validateDay(draft.days[d], true);
    if (errors.length) throw new Error(errors.join('\n'));
    const next = clone(content || {});
    if (next.locked?.[d]) throw new Error('هذا اليوم مقفل بعد بدء الاختبار');
    if (next.releases?.[d]?.[version]) throw new Error('معرف الإصدار مستخدم بالفعل');
    const snapshot = {...clone(draft.days[d]),language:draft.language,contentVersion:version,publishedAt:at};
    next.releases = next.releases || {}; next.releases[d] = next.releases[d] || {};
    next.releases[d][version] = snapshot;
    next.published = next.published || {}; next.published[d] = snapshot;
    next.revision = (next.revision || 0)+1;
    return next;
  }
  function normalizeAnswers(answers, total) {
    return Array.from({length:total}, (_,i)=>Number.isInteger(answers?.[i]) ? answers[i] : null);
  }
  function grade(questions, answers) {
    const errors = questions.flatMap((q,i)=>questionErrors(q,i,true));
    if (!questions.length || errors.length) throw new Error('الاختبار غير جاهز للتصحيح');
    let correct=0, earned=0, possible=0;
    questions.forEach((q,i)=>{const marks=q.marks || 1; possible+=marks;if(answers?.[i]===q.ans){correct++;earned+=marks;}});
    return {correct,total:questions.length,earnedMarks:earned,totalMarks:possible,quizScore:Math.round(earned/possible*100)};
  }
  function parseCSV(text) {
    if (text.length > 5000000) throw new Error('الملف أكبر من الحد المسموح');
    const rows = []; let row=[], cell='', quoted=false;
    text=String(text).replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
      else if(c===','&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v.trim()))rows.push(row);row=[];cell='';}
      else cell+=c;
    }
    if(quoted)throw new Error('علامات تنصيص غير مغلقة في CSV');
    row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
    const headers=rows.shift()||[];
    if(!headers.some(h=>h.trim().toLowerCase()==='question'))throw new Error('عمود Question مطلوب');
    return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]||''])));
  }
  return {DAYS,HEADERS,MAX_QUESTIONS,clone,escape,safeUrl,emptyDraft,normalizeDraft,normalizeDay,managed,getDay,getMaterial,validateDay,validateDraft,fromRows,mergeImport,dayStarted,release,normalizeAnswers,grade,parseCSV};
});
