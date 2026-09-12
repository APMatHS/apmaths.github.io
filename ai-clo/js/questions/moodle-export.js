/* AI-CLO PTITHCM V12.6.52 — unified Admin question-bank download workspace (Excel + Moodle XML). */
(()=>{
'use strict';

const keys=['A','B','C','D'];
let patchQueued=false;

const safeFileName=value=>String(value||'Ngan-hang').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'Ngan-hang';
const viTime=value=>value?new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'medium'}).format(new Date(value)):'';
const xmlText=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cdata=value=>`<![CDATA[${String(value??'').replace(/]]>/g,']]]]><![CDATA[>')}]]>`;
const htmlText=value=>{
 let text=String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 text=text.replace(/\$\$([\s\S]+?)\$\$/g,(_,m)=>`\\[${m}\\]`);
 text=text.replace(/\$([^$\n]+?)\$/g,(_,m)=>`\\(${m}\\)`);
 return text.replace(/\r?\n/g,'<br>');
};
const categoryPart=value=>String(value||'Chua-phan-loai').replace(/[\\/]+/g,' - ').trim()||'Chua-phan-loai';
const optionMap=item=>Object.fromEntries((item.question_options||[]).map(x=>[String(x.option_key||'').toUpperCase(),String(x.content||'').trim()]));
const validQuestion=item=>{const options=optionMap(item);return keys.every(k=>options[k])&&keys.includes(String(item.correct_answer||'').toUpperCase())};
const profileName=(map,id)=>id?(map.get(id)?.full_name||map.get(id)?.email||id):'';
const originLabel=value=>({lecturer:'Giảng viên biên soạn',gemini:'Gemini hỗ trợ',academy:'Câu hỏi Học viện'}[value]||value||'');
const scopeLabel=value=>({practice:'Luyện tập - kiểm tra',secure_exam:'Đề thi - bảo mật',both:'Cả hai ngân hàng'}[value]||value||'');
const approvalLabel=value=>({draft:'Bản nháp',pending:'Chờ duyệt',approved:'Đã duyệt',archived:'Lưu trữ'}[value]||value||'');
const statusLabel=value=>({active:'Hoạt động',draft:'Bản nháp',archived:'Lưu trữ'}[value]||value||'');

async function optionalQuery(table,columns,build){
 try{return await q(table,columns,build)}catch(error){console.warn(`Không tải được ${table} khi xuất ngân hàng:`,error);return[]}
}
function filterBuilder(bankId,chapterId,topicId,extra){
 return x=>{
  let query=x.eq('question_bank_id',bankId);
  if(chapterId&&chapterId!=='all')query=query.eq('chapter_id',chapterId);
  if(topicId&&topicId!=='all')query=query.eq('topic_id',topicId);
  return extra?extra(query):query;
 };
}
function selectionLabel(chapters,topics,chapterId,topicId){
 const chapter=chapters.find(x=>String(x.id)===String(chapterId));
 const topic=topics.find(x=>String(x.id)===String(topicId));
 return {chapter:chapter?.name||'Tất cả chương',topic:topic?.name||'Tất cả mục / chủ đề'};
}
function setSheetLayout(XLSXLib,sheet,widths){
 sheet['!cols']=widths.map(w=>({wch:w}));
 const range=XLSXLib.utils.decode_range(sheet['!ref']||'A1');
 if(range.e.r>=0)sheet['!autofilter']={ref:XLSXLib.utils.encode_range({s:{r:0,c:0},e:{r:range.e.r,c:range.e.c}})};
}

async function exportExcel({bank,chapterId='all',topicId='all',button=null}={}){
 if(role()!=='admin')return toast('Chỉ Admin được tải ngân hàng câu hỏi.',true);
 if(!bank?.id)return toast('Không xác định được ngân hàng câu hỏi.',true);
 const original=button?.textContent||'↓ Tải Excel';
 try{
  if(button){button.disabled=true;button.textContent='Đang chuẩn bị Excel…'}
  const XLSXLib=window.XLSX||(window.AICLO_OFFICE_LIBS?.xlsx?await window.AICLO_OFFICE_LIBS.xlsx():null);
  if(!XLSXLib)throw new Error('Không tải được thư viện Excel.');
  const [questions,chapters,clos]=await Promise.all([
   q('questions','*, question_options(*)',filterBuilder(bank.id,chapterId,topicId,x=>x.order('created_at',{ascending:true}))),
   q('chapters','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),
   q('clos','*',x=>x.eq('question_bank_id',bank.id).order('code'))
  ]);
  const topics=await q('topics','*',x=>x.eq('question_bank_id',bank.id).order('order_index'));
  if(!questions.length)return toast('Không có câu hỏi trong Chương/Mục đã chọn.',true);
  const revisions=await optionalQuery('question_revisions','*',x=>x.in('question_id',questions.map(item=>item.id)).order('changed_at',{ascending:true}));
  const profileIds=[...new Set([...questions.flatMap(x=>[x.created_by,x.approved_by,x.verified_by]),...revisions.map(x=>x.changed_by)].filter(Boolean))];
  const profiles=profileIds.length?await optionalQuery('profiles','id,full_name,email',x=>x.in('id',profileIds)):[];
  const profileMap=new Map(profiles.map(x=>[x.id,x]));
  const chapterMap=new Map(chapters.map(x=>[x.id,x])),topicMap=new Map(topics.map(x=>[x.id,x])),cloMap=new Map(clos.map(x=>[x.id,x]));
  const rows=questions.map((item,index)=>{
   const options=Object.fromEntries((item.question_options||[]).map(x=>[String(x.option_key||'').toUpperCase(),x.content]));
   return {
    'STT':index+1,'Mã câu hỏi':item.display_code||(typeof questionCode==='function'?questionCode(item):item.id),'UUID nội bộ':item.id,'Nội dung câu hỏi':item.content||'',
    'Phương án A':options.A||'','Phương án B':options.B||'','Phương án C':options.C||'','Phương án D':options.D||'','Đáp án đúng':item.correct_answer||'','Lời giải / Giải thích':item.explanation||'',
    'Chương':chapterMap.get(item.chapter_id)?.name||'','Thứ tự chương':chapterMap.get(item.chapter_id)?.order_index??'','Chủ đề':topicMap.get(item.topic_id)?.name||'','Thứ tự chủ đề':topicMap.get(item.topic_id)?.order_index??'',
    'CLO':cloMap.get(item.clo_id)?.code||'','Mô tả CLO':cloMap.get(item.clo_id)?.description||'','Ngân hàng':scopeLabel(item.question_scope),'Trạng thái duyệt':approvalLabel(item.approval_status),'Trạng thái sử dụng':statusLabel(item.status),
    'Nguồn câu hỏi':originLabel(item.origin_type),'Câu Học viện chính thức':item.is_official?'Có':'Không','Người nhập':profileName(profileMap,item.created_by),'Email người nhập':profileMap.get(item.created_by)?.email||'',
    'Người duyệt':profileName(profileMap,item.approved_by),'Ngày duyệt':viTime(item.approved_at),'Admin xác minh':profileName(profileMap,item.verified_by),'Ngày xác minh':viTime(item.verified_at),'Mã phiên AI':item.ai_batch_id||'',
    'Ngày tạo':viTime(item.created_at),'Ngày cập nhật':viTime(item.updated_at||item.created_at)
   };
  });
  const revisionRows=revisions.map((revision,index)=>({'STT':index+1,'Mã câu hỏi':questions.find(x=>x.id===revision.question_id)?.display_code||revision.question_id,'UUID câu hỏi':revision.question_id,'Lần chỉnh sửa':revision.revision_no,'Người chỉnh sửa':profileName(profileMap,revision.changed_by),'Thời điểm':viTime(revision.changed_at),'Bản chụp đầy đủ (JSON)':JSON.stringify(revision.snapshot||{})}));
  const selected=selectionLabel(chapters,topics,chapterId,topicId);
  const practice=questions.filter(x=>['practice','both'].includes(x.question_scope)).length,secure=questions.filter(x=>['secure_exam','both'].includes(x.question_scope)).length;
  const confirmMessage=[`Tải ${questions.length} câu ở “${selected.chapter} · ${selected.topic}” ra Excel.`,secure?`Có ${secure} câu thuộc ngân hàng đề thi - bảo mật. Hãy lưu file ở nơi an toàn.`:''].filter(Boolean).join(' ');
  if(!await confirmAction('Tải Excel?',confirmMessage,{confirmLabel:'Tải Excel'}))return;
  const info=[
   {'Thông tin':'Ngân hàng câu hỏi','Giá trị':bank.name||''},{'Thông tin':'Mã ngân hàng','Giá trị':bank.code||''},{'Thông tin':'Chương đã chọn','Giá trị':selected.chapter},{'Thông tin':'Mục / chủ đề đã chọn','Giá trị':selected.topic},
   {'Thông tin':'Thời điểm xuất','Giá trị':viTime(new Date())},{'Thông tin':'Người xuất','Giá trị':state.profile?.full_name||state.profile?.email||state.user?.email||''},{'Thông tin':'Tổng số câu','Giá trị':questions.length},
   {'Thông tin':'Xuất hiện trong ngân hàng luyện tập','Giá trị':practice},{'Thông tin':'Xuất hiện trong ngân hàng đề thi bảo mật','Giá trị':secure},{'Thông tin':'Số phiên bản lịch sử','Giá trị':revisions.length},
   {'Thông tin':'Cảnh báo bảo mật','Giá trị':'File có thể chứa câu hỏi và đáp án của Ngân hàng đề thi - bảo mật. Chỉ lưu hành nội bộ.'}
  ];
  const workbook=XLSXLib.utils.book_new();
  workbook.Props={Title:`Ngân hàng câu hỏi - ${bank.name}`,Subject:'Xuất ngân hàng câu hỏi AI-CLO PTITHCM',Author:state.profile?.full_name||state.user?.email||'Admin',CreatedDate:new Date()};
  const questionSheet=XLSXLib.utils.json_to_sheet(rows),revisionSheet=XLSXLib.utils.json_to_sheet(revisionRows),infoSheet=XLSXLib.utils.json_to_sheet(info);
  setSheetLayout(XLSXLib,questionSheet,[7,14,38,60,38,38,38,38,12,55,28,13,28,13,12,45,25,20,20,24,18,28,30,28,20,28,20,38,22,22]);
  setSheetLayout(XLSXLib,revisionSheet,[7,14,38,14,28,22,90]);setSheetLayout(XLSXLib,infoSheet,[38,85]);
  XLSXLib.utils.book_append_sheet(workbook,questionSheet,'Cau_hoi');XLSXLib.utils.book_append_sheet(workbook,revisionSheet,'Lich_su');XLSXLib.utils.book_append_sheet(workbook,infoSheet,'Thong_tin');
  const suffix=[chapterId!=='all'?safeFileName(selected.chapter):'',topicId!=='all'?safeFileName(selected.topic):''].filter(Boolean).join('-');
  XLSXLib.writeFile(workbook,`Ngan-hang-${safeFileName(bank.name)}${suffix?`-${suffix}`:''}_${new Date().toISOString().slice(0,10)}.xlsx`);
  window.logActivity?.('export','question_bank',bank.id,`Admin xuất Excel ${bank.name}: ${questions.length} câu · ${selected.chapter} · ${selected.topic}`,'success',null,{question_bank_id:bank.id,format:'xlsx',chapter_id:chapterId,topic_id:topicId,questions:questions.length});
  toast(`Đã tải ${questions.length} câu hỏi ra Excel`);
 }catch(error){err(error)}finally{if(button){button.disabled=false;button.textContent=original}}
}

function categoryXml(path){return `  <question type="category">\n    <category><text>${xmlText(path)}</text></category>\n  </question>`}
function questionXml(item,chapter,topic,clo,bank){
 const options=optionMap(item),correct=String(item.correct_answer||'').toUpperCase();
 const code=item.display_code||(typeof questionCode==='function'?questionCode(item):item.id);
 const tags=['AI-CLO',bank.code,clo?.code,item.question_scope==='secure_exam'?'De-thi-bao-mat':item.question_scope==='both'?'Ca-hai-ngan-hang':'Luyen-tap-kiem-tra'].filter(Boolean);
 const answers=keys.map(k=>`    <answer fraction="${k===correct?100:0}" format="html">\n      <text>${cdata(htmlText(options[k]))}</text>\n      <feedback format="html"><text>${cdata(k===correct?'Đúng.':'')}</text></feedback>\n    </answer>`).join('\n');
 const tagXml=tags.map(tag=>`      <tag><text>${xmlText(tag)}</text></tag>`).join('\n');
 return `  <question type="multichoice">\n    <name><text>${xmlText(code)}</text></name>\n    <questiontext format="html"><text>${cdata(`<p>${htmlText(item.content)}</p>`)}</text></questiontext>\n    <generalfeedback format="html"><text>${cdata(item.explanation?`<p>${htmlText(item.explanation)}</p>`:'')}</text></generalfeedback>\n    <defaultgrade>1.0000000</defaultgrade>\n    <penalty>0.3333333</penalty>\n    <hidden>0</hidden>\n    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>ABCD</answernumbering>\n${answers}\n    <tags>\n${tagXml}\n    </tags>\n  </question>`;
}
async function exportMoodle({bank,chapterId='all',topicId='all',button=null}={}){
 if(role()!=='admin')return toast('Chỉ Admin được xuất ngân hàng sang Moodle.',true);
 if(!bank?.id)return toast('Không xác định được ngân hàng câu hỏi.',true);
 const original=button?.textContent||'↓ Tải Moodle XML';
 try{
  if(button){button.disabled=true;button.textContent='Đang chuẩn bị Moodle…'}
  const [questions,chapters,topics,clos]=await Promise.all([
   q('questions','*,question_options(*)',filterBuilder(bank.id,chapterId,topicId,x=>x.eq('status','active').eq('approval_status','approved').order('created_at',{ascending:true}))),
   q('chapters','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),
   q('topics','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),
   q('clos','*',x=>x.eq('question_bank_id',bank.id).order('code'))
  ]);
  const valid=questions.filter(validQuestion),skipped=questions.length-valid.length;
  if(!valid.length)return toast(questions.length?'Không có câu trắc nghiệm hợp lệ để xuất Moodle.':'Không có câu đã duyệt trong Chương/Mục đã chọn.',true);
  const selected=selectionLabel(chapters,topics,chapterId,topicId),secure=valid.filter(x=>['secure_exam','both'].includes(x.question_scope)).length;
  const message=[`Xuất ${valid.length} câu đã duyệt, đang hoạt động ở “${selected.chapter} · ${selected.topic}” sang Moodle XML.`,skipped?`${skipped} câu thiếu đáp án hoặc phương án sẽ được bỏ qua.`:'',secure?`Có ${secure} câu thuộc phạm vi đề thi - bảo mật. Hãy lưu file ở nơi an toàn.`:''].filter(Boolean).join(' ');
  if(!await confirmAction('Tải Moodle XML?',message,{confirmLabel:'Tải Moodle XML'}))return;
  const chapterMap=new Map(chapters.map(x=>[x.id,x])),topicMap=new Map(topics.map(x=>[x.id,x])),cloMap=new Map(clos.map(x=>[x.id,x]));
  valid.sort((a,b)=>{const ac=chapterMap.get(a.chapter_id)?.order_index??9999,bc=chapterMap.get(b.chapter_id)?.order_index??9999;if(ac!==bc)return ac-bc;const at=topicMap.get(a.topic_id)?.order_index??9999,bt=topicMap.get(b.topic_id)?.order_index??9999;if(at!==bt)return at-bt;return String(a.display_code||a.id).localeCompare(String(b.display_code||b.id),'vi',{numeric:true})});
  const parts=['<?xml version="1.0" encoding="UTF-8"?>','<quiz>'];let lastCategory='';
  for(const item of valid){const chapter=chapterMap.get(item.chapter_id),topic=topicMap.get(item.topic_id),clo=cloMap.get(item.clo_id),category=`$course$/top/AI-CLO/${categoryPart(bank.name)}/${categoryPart(chapter?.name||'Khac')}/${categoryPart(topic?.name||'Chua phan loai')}`;if(category!==lastCategory){parts.push(categoryXml(category));lastCategory=category}parts.push(questionXml(item,chapter,topic,clo,bank))}
  parts.push('</quiz>');
  const blob=new Blob([parts.join('\n')],{type:'application/xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const suffix=[chapterId!=='all'?safeFileName(selected.chapter):'',topicId!=='all'?safeFileName(selected.topic):''].filter(Boolean).join('-');
  a.href=url;a.download=`Moodle-${safeFileName(bank.name)}${suffix?`-${suffix}`:''}_${new Date().toISOString().slice(0,10)}.xml`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  window.logActivity?.('export','question_bank',bank.id,`Xuất Moodle XML ${bank.name}: ${valid.length} câu · ${selected.chapter} · ${selected.topic}`,'success',null,{question_bank_id:bank.id,format:'moodle_xml',chapter_id:chapterId,topic_id:topicId,questions:valid.length,skipped});
  toast(`Đã tải ${valid.length} câu sang Moodle XML${skipped?` · bỏ qua ${skipped} câu chưa hợp lệ`:''}`);
 }catch(error){err(error)}finally{if(button){button.disabled=false;button.textContent=original}}
}

async function loadBank(bankId){
 const {data,error}=await db.from('question_banks').select('id,name,code').eq('id',bankId).single();
 if(error)throw error;
 return data;
}
function topicOptions(topics,chapterId,selected='all'){
 const allowed=chapterId==='all'?topics:topics.filter(x=>String(x.chapter_id)===String(chapterId));
 return '<option value="all">Tất cả mục / chủ đề</option>'+allowed.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.name)}</option>`).join('');
}
async function openDownload(bank){
 if(role()!=='admin'||!bank?.id)return;
 const content=document.querySelector('#content');if(!content)return;
 const [chapters,topics]=await Promise.all([q('chapters','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),q('topics','*',x=>x.eq('question_bank_id',bank.id).order('order_index'))]);
 const previous=document.createDocumentFragment();while(content.firstChild)previous.appendChild(content.firstChild);
 let format='excel',chapterId='all',topicId='all';
 const restore=()=>{content.replaceChildren(previous);queuePatch()};
 const render=()=>{
  content.innerHTML=`<div class="v113-bank-page"><div class="v109-workspace-head v114-compact-head"><button id="v126DownloadBack" class="secondary">← Quay lại ngân hàng</button><div><small>${esc(bank.code||'NGÂN HÀNG')}</small><h3>Tải xuống ngân hàng câu hỏi</h3><p>${esc(bank.name||'')}</p></div></div><div class="v109-tabs v113-tabs"><button data-v126-format="excel" class="${format==='excel'?'active':''}">Excel</button><button data-v126-format="moodle" class="${format==='moodle'?'active':''}">Moodle</button></div><section class="panel v114-bank-form"><div class="form-grid"><p class="hint wide">${format==='excel'?'Tải dữ liệu câu hỏi, đáp án và lịch sử chỉnh sửa ra Excel.':'Tải các câu đã duyệt, đang hoạt động ra Moodle XML để nhập vào ngân hàng câu hỏi Moodle.'}</p><label class="field"><span>Chương</span><select id="v126DownloadChapter"><option value="all">Tất cả chương</option>${chapters.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(chapterId)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="field"><span>Mục / Chủ đề</span><select id="v126DownloadTopic">${topicOptions(topics,chapterId,topicId)}</select></label><div class="form-actions wide"><button id="v126DownloadNow" class="primary" type="button">${format==='excel'?'↓ Tải Excel':'↓ Tải Moodle XML'}</button></div></div></section></div>`;
  const chapter=document.querySelector('#v126DownloadChapter'),topic=document.querySelector('#v126DownloadTopic');
  if(topic&&[...topic.options].some(o=>String(o.value)===String(topicId)))topic.value=topicId;else topicId='all';
  document.querySelector('#v126DownloadBack').onclick=restore;
  document.querySelectorAll('[data-v126-format]').forEach(btn=>btn.onclick=()=>{format=btn.dataset.v126Format;render()});
  chapter.onchange=()=>{chapterId=chapter.value;topicId='all';topic.innerHTML=topicOptions(topics,chapterId,'all');topic.value='all'};
  topic.onchange=()=>{topicId=topic.value};
  document.querySelector('#v126DownloadNow').onclick=e=>format==='excel'?exportExcel({bank,chapterId,topicId,button:e.currentTarget}):exportMoodle({bank,chapterId,topicId,button:e.currentTarget});
 };
 render();
}

async function openFromButton(button){
 try{
  let bank=null;
  if(button.dataset.v113Export)bank=await loadBank(button.dataset.v113Export);
  else{
   const code=document.querySelector('.v113-bank-page .v109-workspace-head div > small')?.textContent?.trim();
   if(code){const {data,error}=await db.from('question_banks').select('id,name,code').eq('code',code).single();if(error)throw error;bank=data}
  }
  if(!bank)throw new Error('Không xác định được ngân hàng câu hỏi.');
  await openDownload(bank);
 }catch(error){err(error)}
}
function patchButtons(){
 document.querySelector('#v126MoodleExport')?.remove();
 const detail=document.querySelector('#v113Export');
 if(detail&&detail.dataset.aicloUnifiedDownload!=='1'){
  detail.dataset.aicloUnifiedDownload='1';detail.textContent='↓ Tải xuống';detail.title='Mở trang tải xuống Excel hoặc Moodle';detail.onclick=e=>{e.preventDefault();openFromButton(detail)};
 }
 document.querySelectorAll('[data-v113-export]').forEach(button=>{
  if(button.dataset.aicloUnifiedDownload==='1')return;
  button.dataset.aicloUnifiedDownload='1';button.textContent='↓ Tải xuống';button.title='Mở trang tải xuống Excel hoặc Moodle';button.onclick=e=>{e.preventDefault();openFromButton(button)};
 });
}
function queuePatch(){if(patchQueued)return;patchQueued=true;requestAnimationFrame(()=>{patchQueued=false;patchButtons()})}
const observer=new MutationObserver(queuePatch);observer.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queuePatch,{once:true});else queuePatch();
window.AICLO_MOODLE_EXPORT=Object.freeze({exportCurrent:exportMoodle,exportBank:exportMoodle});
window.AICLO_ADMIN_BANK_DOWNLOAD=Object.freeze({open:openDownload,exportExcel,exportMoodle,patch:patchButtons});
})();
