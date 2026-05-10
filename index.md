# تعديلات index.html — دليل التطبيق

## التغييرات المطلوبة (4 تغييرات فقط)

---

## 1️⃣ رأس جدول المتدربين — أضف عمود "تعديل"

**ابحث عن:**
```html
<th>#</th><th>الاسم</th><th>الرقم</th><th>الجهة</th><th>الحضور</th><th>المتوسط</th><th>QR</th><th>حذف</th>
```

**استبدل بـ:**
```html
<th>#</th><th>الاسم</th><th>الرقم</th><th>الجهة</th><th>الحضور</th><th>المتوسط</th><th>QR</th><th>تعديل</th><th>حذف</th>
```

---

## 2️⃣ أزرار الجدول — أضف زر تعديل قبل زر الحذف

**ابحث عن:**
```html
      <td>
        <button onclick="delTrainee('${t.id}')"
          style="background:var(--red2);border:1.5px solid #fca5a5;color:var(--red);border-radius:8px;padding:5px 10px;font-family:Tajawal,sans-serif;font-size:.76rem;font-weight:700;cursor:pointer">
          🗑️ حذف
        </button>
      </td>
    </tr>`;
```

**استبدل بـ:**
```html
      <td>
        <button onclick="editTrainee('${t.id}')"
          style="background:var(--blue2);border:1.5px solid #bfdbfe;color:var(--blue);border-radius:8px;padding:5px 10px;font-family:Tajawal,sans-serif;font-size:.76rem;font-weight:700;cursor:pointer">
          ✏️ تعديل
        </button>
      </td>
      <td>
        <button onclick="delTrainee('${t.id}')"
          style="background:var(--red2);border:1.5px solid #fca5a5;color:var(--red);border-radius:8px;padding:5px 10px;font-family:Tajawal,sans-serif;font-size:.76rem;font-weight:700;cursor:pointer">
          🗑️ حذف
        </button>
      </td>
    </tr>`;
```

---

## 3️⃣ فورم إضافة متدرب — أضف حقول جديدة

**ابحث عن:**
```html
      <button class="btn btn-p" style="margin-bottom:0" onclick="addTrainee()">+ إضافة متدرب</button>
```

**استبدل بـ:**
```html
      <div class="form-row" style="margin-bottom:11px">
        <div class="form-g"><label class="inp-label">📱 رقم الجوال</label><input class="inp" id="add-phone" type="tel" placeholder="+974 XXXX XXXX"></div>
        <div class="form-g"><label class="inp-label">✉️ البريد الإلكتروني</label><input class="inp" id="add-email" type="email" placeholder="example@email.com"></div>
      </div>
      <div class="form-g" style="margin-bottom:11px"><label class="inp-label">💼 المسمى الوظيفي</label><input class="inp" id="add-jobtitle" placeholder="مثال: مفتش غذاء أول"></div>
      <button class="btn btn-p" style="margin-bottom:0" onclick="addTrainee()">+ إضافة متدرب</button>
```

---

## 4️⃣ دالة addTrainee — أضف الحقول الجديدة للكائن

**ابحث عن:**
```javascript
  const t={id:genId(),name,sid:document.getElementById('add-sid').value.trim()||'—',dept:document.getElementById('add-dept').value.trim()||'—',spec:document.getElementById('add-spec').value.trim()||'—',createdAt:new Date().toISOString()};
```

**استبدل بـ:**
```javascript
  const t={id:genId(),name,sid:document.getElementById('add-sid').value.trim()||'—',dept:document.getElementById('add-dept').value.trim()||'—',spec:document.getElementById('add-spec').value.trim()||'—',phone:document.getElementById('add-phone')?.value.trim()||'',email:document.getElementById('add-email')?.value.trim()||'',jobTitle:document.getElementById('add-jobtitle')?.value.trim()||'',createdAt:new Date().toISOString()};
```

**كذلك ابحث عن سطر مسح الحقول:**
```javascript
  ['add-name','add-sid','add-dept','add-spec'].forEach(id=>document.getElementById(id).value='');
```

**استبدل بـ:**
```javascript
  ['add-name','add-sid','add-dept','add-spec','add-phone','add-email','add-jobtitle'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
```

---

## 5️⃣ أضف دالتي التعديل — قبل `async function addTrainee()`

**ابحث عن:**
```javascript
async function addTrainee(){
```

**أضف قبلها مباشرة:**

```javascript
// ══════════════════════════════════════════════
//  EDIT TRAINEE — تعديل بيانات المتدرب
// ══════════════════════════════════════════════
function editTrainee(id){
  const t = _trainees.find(x=>x.id===id); if(!t) return;
  openModal('✏️ تعديل بيانات المتدرب', `
    <div style="background:linear-gradient(135deg,var(--g4),#f0fdf8);border:1.5px solid var(--border);border-radius:14px;padding:13px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
      <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--g1),var(--g2));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:1.15rem;flex-shrink:0">${t.name.charAt(0)}</div>
      <div>
        <div style="font-weight:900;color:var(--g1);font-size:.93rem">${t.name}</div>
        <div style="font-size:.74rem;color:var(--muted)">${t.dept} · ${t.spec||''}</div>
      </div>
    </div>

    <div style="font-size:.76rem;font-weight:800;color:var(--g1);margin-bottom:8px;display:flex;align-items:center;gap:6px">
      <div style="width:3px;height:14px;background:var(--g1);border-radius:2px"></div> البيانات الأساسية
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label class="inp-label">👤 الاسم الكامل *</label>
        <input class="inp" id="edit-name" value="${t.name}" placeholder="الاسم الكامل">
      </div>
      <div>
        <label class="inp-label">🔢 الرقم الوظيفي</label>
        <input class="inp" id="edit-sid" value="${t.sid==='—'?'':t.sid}" placeholder="EMP-001">
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div>
        <label class="inp-label">🏢 الجهة / القسم</label>
        <input class="inp" id="edit-dept" value="${t.dept==='—'?'':t.dept}" placeholder="وزارة الصحة">
      </div>
      <div>
        <label class="inp-label">🎓 التخصص</label>
        <input class="inp" id="edit-spec" value="${t.spec==='—'?'':t.spec}" placeholder="مفتش غذاء">
      </div>
    </div>

    <div style="border-top:2px dashed var(--border);margin:14px 0 10px;padding-top:12px">
      <div style="font-size:.76rem;font-weight:800;color:var(--blue);margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <div style="width:3px;height:14px;background:var(--blue);border-radius:2px"></div> معلومات التواصل
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label class="inp-label">📱 رقم الجوال</label>
          <input class="inp" id="edit-phone" type="tel" value="${t.phone||''}" placeholder="+974 XXXX XXXX">
        </div>
        <div>
          <label class="inp-label">✉️ البريد الإلكتروني</label>
          <input class="inp" id="edit-email" type="email" value="${t.email||''}" placeholder="example@email.com">
        </div>
      </div>
      <div>
        <label class="inp-label">💼 المسمى الوظيفي</label>
        <input class="inp" id="edit-jobtitle" value="${t.jobTitle||''}" placeholder="مثال: مفتش غذاء أول">
      </div>
    </div>

    <div id="edit-err" style="display:none;color:var(--red);font-size:.8rem;text-align:center;margin-bottom:8px;background:var(--red2);border-radius:8px;padding:8px;border:1.5px solid #fca5a5"></div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button onclick="closeModal()" class="btn btn-s" style="flex:1">إلغاء</button>
      <button onclick="saveTraineeEdit('${id}')" class="btn btn-p" style="flex:2">💾 حفظ التعديلات</button>
    </div>
  `);
  setTimeout(()=>document.getElementById('edit-name')?.focus(),120);
}

async function saveTraineeEdit(id){
  const name  = document.getElementById('edit-name')?.value.trim();
  const err   = document.getElementById('edit-err');
  if(!name){ err.style.display='block'; err.textContent='⚠️ الاسم الكامل مطلوب'; return; }

  const idx = _trainees.findIndex(x=>x.id===id);
  if(idx===-1){ toast('❌ المتدرب غير موجود'); closeModal(); return; }

  const btn = document.querySelector('#modal .btn-p');
  if(btn){ btn.disabled=true; btn.innerHTML='<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite"></span> جارٍ الحفظ...'; }

  const updated = {
    ..._trainees[idx],
    name,
    sid:      document.getElementById('edit-sid')?.value.trim()      || '—',
    dept:     document.getElementById('edit-dept')?.value.trim()     || '—',
    spec:     document.getElementById('edit-spec')?.value.trim()     || '—',
    phone:    document.getElementById('edit-phone')?.value.trim()    || '',
    email:    document.getElementById('edit-email')?.value.trim()    || '',
    jobTitle: document.getElementById('edit-jobtitle')?.value.trim() || '',
    updatedAt: new Date().toISOString()
  };

  _trainees[idx] = updated;
  await fbSet(`workshops/${_wsId}/trainees/${id}`, updated);

  closeModal();
  renderTrTable();
  renderInlineQR();
  toast('✅ تم تحديث بيانات ' + name);
}

```
