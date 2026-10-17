/* Static trainee UI strings only. Question content is never machine-translated. */
(function(){
  'use strict';
  const dictionary={
    'ACES Academy — اختبار المتدرب':'ACES Academy — Trainee Assessment',
    'ACES — نظام إدارة الورش التدريبية':'ACES — Training Workshop Management',
    'جاري التحميل...':'Loading…','جاري التحقق...':'Checking…','جاري جلب البيانات...':'Loading course information…',
    'امسح كيو آر اليوم':'Scan today’s QR code','لم يتم تسجيل حضورك لهذا اليوم بعد':'Your attendance has not been registered for this day.',
    'تم رفض طلبك':'Your request was declined','تواصل مع المدرب':'Please contact your trainer.',
    'في انتظار موافقة المدرب':'Waiting for trainer approval','لا تغلق الصفحة':'Please keep this page open.',
    'تم قبول حضورك':'Your attendance was approved','في انتظار فتح الاختبار...':'Waiting for the assessment to open…',
    'الاختبار مفتوح الآن!':'The assessment is now open!','ابدأ الاختبار الآن':'Start assessment now',
    '→ السابق':'← Previous','التالي ←':'Next →','تسليم الاختبار':'Submit assessment',
    'تقييم المدرب':'Trainer Evaluation','قيّم المدرب للحصول على المادة العلمية':'Evaluate the trainer to access the training material.',
    'شكراً! تم تسجيل تقييمك':'Thank you! Your evaluation has been recorded.',
    'اضغط على المادة العلمية ←':'Select Training Material to continue.',
    'تعليق (اختياري)':'Comment (optional)','أضف تعليقك هنا...':'Add your comment here…','إرسال التقييم':'Submit evaluation',
    'المادة العلمية':'Training Material','المادة التعليمية':'Training Material','تصفح وحمّل المادة':'View and download the material',
    'تحميل':'Download','جاري تحميل المادة...':'Loading training material…','لم يتم رفع المادة بعد':'No training material has been uploaded yet.',
    'تأكيد التسليم':'Confirm submission','إلغاء':'Cancel','تسليم':'Submit',
    'رمز QR غير صالح':'Invalid QR code','لم يتم العثور على بيانات. تواصل مع المدرب.':'No matching information found. Please contact your trainer.',
    'أدخل بيانات التواصل':'Enter your contact information','رقم الهاتف':'Phone number','البريد الإلكتروني':'Email address',
    'سيُستخدم للتواصل الرسمي':'Used for official communication','يرجى إدخال رقم هاتف صحيح':'Please enter a valid phone number.',
    'ستصلك المواد التعليمية والشهادة':'Used for training material and certificate communication',
    'يرجى إدخال بريد إلكتروني صحيح':'Please enter a valid email address.',
    'تسجيل الحضور':'Register attendance','بياناتك محمية وتُستخدم فقط لأغراض الورشة':'Your information is used for workshop administration only.',
    'تم إرسال طلبك!':'Your request has been sent!','لا تغلق الصفحة — ستُنقَل للاختبار تلقائياً.':'Keep this page open — you will be redirected automatically.',
    'تم إرسال طلب الحضور':'Attendance request sent','في انتظار موافقة المدرب...':'Waiting for trainer approval…',
    'فتح الاختبار من المدرب':'Trainer opens the assessment','الانتقال للاختبار':'Continue to assessment',
    'مراقبة مستمرة — لا تغلق الصفحة':'Checking for updates — keep this page open',
    'تم قبول حضورك!':'Your attendance was approved!','في انتظار فتح الاختبار من المدرب':'Waiting for the trainer to open the assessment',
    'المادة التعليمية للورشة':'Workshop Training Material','فتح في نافذة جديدة':'Open in a new window',
    'لم يتم رفع مادة علمية بعد':'No training material has been uploaded yet.',
    'في انتظار فتح الاختبار — مراقبة مستمرة':'Waiting for the assessment to open — checking for updates',
    'جاري الانتقال تلقائياً...':'Redirecting automatically…',
    'أكملت الاختبارات!':'You have completed the assessments!',
    'خطوة أخيرة — قيّم المدرب لإكمال الورشة.':'One final step — evaluate the trainer to complete the workshop.',
    'رأيك يساعدنا على تحسين البرنامج':'Your feedback helps us improve the program.',
    'تقييم المدرب الآن':'Evaluate the trainer now',
    'أتممت جميع أيام الورشة!':'You have completed all workshop days!',
    'تهانينا — لقد أكملت اختبارات الأيام الخمسة وقيّمت المدرب بنجاح.':'Congratulations — you have completed the five daily assessments and the trainer evaluation.',
    'في انتظار فتح الاختبار من المدرب.':'Waiting for the trainer to open the assessment.',
    'في انتظار موافقة المدرب — ستُنقَل للاختبار تلقائياً.':'Waiting for trainer approval — you will be redirected automatically.',
    'في انتظار فتح الاختبار':'Waiting for the assessment to open',
    'الاختبار مفتوح ✅':'Assessment open ✅','جاري الانتقال...':'Redirecting…',
    'تم قبول حضورك ✅':'Attendance approved ✅',
    'تم رفض طلبك — تواصل مع المدرب':'Request declined — please contact the trainer',
    'المادة العلمية ستظهر بعد إكمال تقييم المدرب':'Training material is available after completing the trainer evaluation.',
    'المادة العلمية متاحة — في انتظار فتح الاختبار':'Training material is available — waiting for the assessment to open',
    'جاري الإرسال...':'Sending…'
  };
  let language='ar';
  function translate(text){
    const value=text.trim();if(!value)return text;
    if(dictionary[value])return text.replace(value,dictionary[value]);
    // Preserve leading/trailing decorative symbols while translating the full label.
    for(const [ar,en] of Object.entries(dictionary)){
      const idx=value.indexOf(ar);
      if(idx>=0&&!/[\u0600-\u06ff]/.test(value.replace(ar,'')))return text.replace(ar,en);
    }
    const patterns=[[/^تم قبول حضورك — اليوم (\d+)$/, 'Attendance approved — Day $1'],[/^حضورك مسجّل — اليوم (\d+)$/, 'Attendance registered — Day $1'],[/^طلبك قيد المراجعة — اليوم (\d+)$/, 'Request pending — Day $1'],[/^اليوم (\d+)$/, 'Day $1']];
    for(const [pattern,replacement]of patterns)if(pattern.test(value))return text.replace(value,value.replace(pattern,replacement));
    return text;
  }
  function protectedNode(node){return node.parentElement?.closest('script,style,#q-area,#quiz-day-title,#quiz-trainee,#wait-name,#waitexam-name,#nav-sub,#t-name,#t-dept,#t-day');}
  function refresh(node=document.body){
    if(language!=='en'||!node)return;
    if(node.nodeType===3){if(!protectedNode(node)){const next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}return;}
    const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);let n;const nodes=[];while((n=walker.nextNode()))nodes.push(n);nodes.forEach(refresh);
  }
  let observer=null;
  function init(lang){
    language=lang==='en'?'en':'ar';if(language!=='en')return;
    document.documentElement.lang='en';document.documentElement.dir='ltr';
    const style=document.createElement('style');style.textContent='html[lang=en] .opt-btn,html[lang=en] .step-row{text-align:left}html[lang=en] input,html[lang=en] textarea{direction:ltr}html[lang=en] body{direction:ltr}';document.head.appendChild(style);
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const nodes=[];let n;
    while((n=walker.nextNode()))if(!['SCRIPT','STYLE'].includes(n.parentElement?.tagName))nodes.push(n);
    for(const node of nodes)if(!protectedNode(node))node.nodeValue=translate(node.nodeValue);
    for(const el of document.querySelectorAll('[placeholder]'))el.placeholder=translate(el.placeholder);
    document.title='ACES — Training Assessment';
    if(!observer){observer=new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')refresh(r.target);else for(const child of r.addedNodes)refresh(child);}});observer.observe(document.body,{childList:true,subtree:true,characterData:true});}
  }
  function t(ar,en){return language==='en'?en:ar;}
  window.CourseUI={init,t,refresh,isEnglish:()=>language==='en'};
})();
