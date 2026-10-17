/* Small dependency-free XLSX template writer/reader for ACES question imports. */
(function(root) {
  'use strict';
  const enc = new TextEncoder(), dec = new TextDecoder();
  const xml = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const u16=(v,n)=>v.getUint16(n,true), u32=(v,n)=>v.getUint32(n,true);
  function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
  function zip(files) {
    const chunks=[], directory=[];let offset=0;
    for(const [path,text] of Object.entries(files)){
      const name=enc.encode(path),data=enc.encode(text),crc=crc32(data);
      const h=new Uint8Array(30+name.length),v=new DataView(h.buffer);
      v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
      v.setUint32(14,crc,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,name.length,true);h.set(name,30);
      const c=new Uint8Array(46+name.length),w=new DataView(c.buffer);
      w.setUint32(0,0x02014b50,true);w.setUint16(4,20,true);w.setUint16(6,20,true);w.setUint16(8,0x800,true);
      w.setUint32(16,crc,true);w.setUint32(20,data.length,true);w.setUint32(24,data.length,true);w.setUint16(28,name.length,true);w.setUint32(42,offset,true);c.set(name,46);
      chunks.push(h,data);directory.push(c);offset+=h.length+data.length;
    }
    const length=directory.reduce((a,b)=>a+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);
    v.setUint32(0,0x06054b50,true);v.setUint16(8,directory.length,true);v.setUint16(10,directory.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);
    return new Blob([...chunks,...directory,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function sheetXML(rows){return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="1" width="70" customWidth="1"/><col min="2" max="9" width="25" customWidth="1"/></cols><sheetData>'+rows.map((row,ri)=>'<row r="'+(ri+1)+'">'+row.map((value,ci)=>'<c r="'+String.fromCharCode(65+ci)+(ri+1)+'" t="inlineStr"><is><t xml:space="preserve">'+xml(value)+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>';}
  function workbook(sheets) {
    const files={};
    files['[Content_Types].xml']='<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+sheets.map((_,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')+'</Types>';
    files['_rels/.rels']='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
    files['xl/workbook.xml']='<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sheets.map((s,i)=>'<sheet name="'+xml(s.name)+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')+'</sheets></workbook>';
    files['xl/_rels/workbook.xml.rels']='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+sheets.map((_,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')+'</Relationships>';
    sheets.forEach((s,i)=>files['xl/worksheets/sheet'+(i+1)+'.xml']=sheetXML(s.rows));
    return zip(files);
  }
  async function unzip(buffer) {
    const bytes=new Uint8Array(buffer),v=new DataView(buffer),entries={};
    if(bytes.length>5*1024*1024)throw new Error('الحد الأقصى للملف 5 MB');
    let end=-1;
    for(let n=bytes.length-22;n>=Math.max(0,bytes.length-65557);n--)if(u32(v,n)===0x06054b50){end=n;break;}
    if(end<0)throw new Error('ملف XLSX غير صالح');
    if(u16(v,end+4)||u16(v,end+6))throw new Error('أرشيف متعدد الأقراص غير مدعوم');
    const count=u16(v,end+10);let pos=u32(v,end+16),total=0;
    if(count>200)throw new Error('ملف Excel يحتوي على عناصر أكثر من الحد المسموح');
    for(let n=0;n<count;n++){
      if(pos+46>bytes.length||u32(v,pos)!==0x02014b50)throw new Error('فهرس Excel تالف');
      const flags=u16(v,pos+8),method=u16(v,pos+10),crc=u32(v,pos+16),packed=u32(v,pos+20),size=u32(v,pos+24),nl=u16(v,pos+28),extra=u16(v,pos+30),comment=u16(v,pos+32),off=u32(v,pos+42);
      const name=dec.decode(bytes.slice(pos+46,pos+46+nl));pos+=46+nl+extra+comment;total+=size;
      if(flags&1)throw new Error('ملفات Excel المشفرة بكلمة مرور غير مدعومة');
      if(size>8*1024*1024||total>25*1024*1024||packed>5*1024*1024)throw new Error('حجم محتوى Excel أكبر من الحد المسموح');
      if(name.includes('..')||name.startsWith('/')||Object.prototype.hasOwnProperty.call(entries,name))throw new Error('مسار غير آمن أو مكرر في Excel');
      if(off+30>bytes.length||u32(v,off)!==0x04034b50)throw new Error('ملف Excel تالف');
      const start=off+30+u16(v,off+26)+u16(v,off+28);
      if(start+packed>bytes.length)throw new Error('بيانات Excel غير مكتملة');
      if(!/\.xml$|\.rels$/.test(name))continue;
      const data=bytes.slice(start,start+packed);let out;
      if(method===0)out=data;
      else if(method===8){
        try {
          const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
          const parts=[];let sizeRead=0;
          while(true){const r=await reader.read();if(r.done)break;sizeRead+=r.value.length;if(sizeRead>size||sizeRead>8*1024*1024){await reader.cancel();throw new Error('limit');}parts.push(r.value);}
          out=new Uint8Array(sizeRead);let p=0;for(const part of parts){out.set(part,p);p+=part.length;}
        }catch(_){throw new Error('تعذر فك ملف Excel. استخدم Chrome أو Edge محدثاً، أو استورد CSV/JSON.');}
      }else throw new Error('ضغط ملف Excel غير مدعوم');
      if(out.length!==size||crc32(out)!==crc)throw new Error('فشل التحقق من سلامة Excel');
      entries[name]=dec.decode(out);
    }
    return entries;
  }
  const elements=(node,name)=>Array.from(node.getElementsByTagNameNS('*',name));
  function parse(text) {
    if(!text||/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('XML غير صالح');
    const doc=new DOMParser().parseFromString(text,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)throw new Error('XML غير صالح');
    return doc;
  }
  async function read(buffer) {
    const files=await unzip(buffer),book=parse(files['xl/workbook.xml']),rels=parse(files['xl/_rels/workbook.xml.rels']);
    const links=Object.fromEntries(elements(rels,'Relationship').filter(r=>(r.getAttribute('TargetMode')||'')!=='External').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
    const strings=files['xl/sharedStrings.xml']?elements(parse(files['xl/sharedStrings.xml']),'si').map(s=>elements(s,'t').map(t=>t.textContent).join('')):[];
    const sheets={};
    for(const sheet of elements(book,'sheet')){
      const name=sheet.getAttribute('name');if(!/^Day\s*[1-5]$/i.test(name))continue;
      const target=links[sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')];
      if(!target)throw new Error('تعذر العثور على تبويب '+name);
      const path=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'');
      if(path.includes('..')||!files[path])throw new Error('مسار تبويب غير صالح');
      const rows=elements(parse(files[path]),'row');
      if(rows.length>251)throw new Error('الحد الأقصى 250 سؤالاً لكل يوم');
      const values=rows.map(row=>{
        const cells=[];
        for(const c of elements(row,'c')){
          const ref=c.getAttribute('r')||'',letters=(ref.match(/^[A-Z]+/)||[])[0];
          if(!letters)throw new Error('مرجع خلية غير صالح');
          let col=0;for(const ch of letters)col=col*26+ch.charCodeAt(0)-64;col--;
          if(col>30)throw new Error('عدد الأعمدة أكبر من الحد المسموح');
          if(elements(c,'f').length)throw new Error('استبدل صيغ Excel بقيم نصية قبل الاستيراد');
          const type=c.getAttribute('t'),raw=elements(c,'v')[0]?.textContent||'';
          cells[col]=type==='s'?(strings[Number(raw)]??''):type==='inlineStr'?elements(c,'t').map(t=>t.textContent).join(''):type==='b'?(raw==='1'?'True':'False'):raw;
        }
        return cells;
      }).filter(row=>row.some(v=>String(v).trim()));
      const headers=values.shift()||[];
      if(!headers.some(h=>String(h).trim().toLowerCase()==='question'))throw new Error('عمود Question مطلوب في '+name);
      const day=Number(name.match(/[1-5]/)[0]);if(sheets[day])throw new Error('تبويبات مكررة لليوم '+day);
      sheets[day]=values.map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])));
    }
    if(!Object.keys(sheets).length)throw new Error('يجب تسمية التبويبات Day 1 إلى Day 5');
    return sheets;
  }
  root.ACESXLSX={workbook,read,unzip,crc32};
})(typeof globalThis!=='undefined'?globalThis:this);
