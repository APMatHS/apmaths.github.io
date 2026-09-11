/* AI-CLO PTITHCM V12.6.50 — course AI guidance subpage + prompt composition. */
(()=>{
'use strict';

const TABLE='question_bank_ai_guides';
const MAX_LENGTH=12000;
const subpageKind='course-ai-guide';

async function resolveBank(){
 const subject=activeSubject?.();
 if(subject?.question_bank_id)return {subject,bankId:subject.question_bank_id};
 const {data,error}=await db.from('subjects').select('id,name,semester,academic_year,question_bank_id').eq('id',state.subjectId).single();
 if(error)throw error;
 if(!data?.question_bank_id)throw new Error('Học phần chưa được gán ngân hàng câu hỏi.');
 return {subject:data,bankId:data.question_bank_id};
}

async function loadGuide(bankId){
 const {data,error}=await db.from(TABLE).select('instruction,updated_at,updated_by').eq('question_bank_id',bankId).maybeSingle();
 if(error)throw error;
 return data||{instruction:'',updated_at:null,updated_by:null};
}

async function getInstruction(){
 const {bankId}=await resolveBank();
 const guide=await loadGuide(bankId);
 return String(guide.instruction||'').trim();
}

async function buildRequirements(userRequirements=''){
 const instruction=await getInstruction();
 const extra=String(userRequirements||'').trim();
 const blocks=[];
 if(instruction)blocks.push(`HƯỚNG DẪN AI CỦA HỌC PHẦN — PHẢI TUÂN THỦ:\n${instruction}`);
 if(extra)blocks.push(`YÊU CẦU BỔ SUNG CHO LẦN SINH NÀY:\n${extra}`);
 return blocks.join('\n\n');
}

function setPageHeading(subject){
 const title=$('#pageTitle'),sub=$('#pageSub');
 if(title)title.textContent='Hướng dẫn AI học phần';
 if(sub)sub.textContent=`${subject?.name||'Học phần'} · ${subject?.semester||''} · ${subject?.academic_year||''}`;
}

function restoreStructureHeading(){
 const subject=activeSubject?.();
 const title=$('#pageTitle'),sub=$('#pageSub');
 if(title)title.textContent=titles?.structure?.[0]||'Chương · CLO';
 if(sub)sub.textContent=titles?.structure?.[1]||`${subject?.name||'Học phần'} · Cấu trúc chương, chủ đề và CLO`;
}

function backToStructure(){
 window.AICLO_SUBPAGE_STATE?.clear?.();
 restoreStructureHeading();
 if(typeof render==='function')return render();
}

function updateCount(textarea,count){
 if(count)count.textContent=`${textarea.value.length.toLocaleString('vi-VN')} / ${MAX_LENGTH.toLocaleString('vi-VN')} ký tự`;
}

async function open(){
 if(!state.subjectId)return toast('Hãy chọn học phần trước.',true);
 if(!canTeach?.())return toast('Bạn không có quyền chỉnh hướng dẫn AI của học phần này.',true);
 const host=$('#content');if(!host)return;
 host.innerHTML='<section class="panel"><p class="hint">Đang tải hướng dẫn AI của học phần…</p></section>';
 try{
  const {subject,bankId}=await resolveBank();
  const guide=await loadGuide(bankId);
  setPageHeading(subject);
  host.innerHTML=`<div class="course-ai-guide-page" data-aiclo-subpage-kind="${subpageKind}" data-aiclo-entity-type="question-bank" data-aiclo-entity-id="${esc(bankId)}">
   <div class="toolbar"><button id="courseAiGuideBack" class="secondary" type="button" data-aiclo-subpage-back>← Quay lại Chương · CLO</button></div>
   <section class="panel">
    <div class="panel-head"><div><h3>Hướng dẫn AI của học phần</h3><p class="hint">Nội dung này được dùng làm quy tắc chung khi AI sinh mới hoặc nhân bản câu hỏi trong ngân hàng của học phần.</p></div></div>
    <form id="courseAiGuideForm" class="form-grid">
     <label class="field wide">Nội dung hướng dẫn
      <textarea id="courseAiInstruction" name="instruction" rows="18" maxlength="${MAX_LENGTH}" placeholder="Ví dụ: phạm vi kiến thức được phép; dạng câu hỏi; mức độ khó; quy tắc ký hiệu; cách tạo phương án nhiễu; các nội dung AI không được sinh…">${esc(guide.instruction||'')}</textarea>
      <small id="courseAiGuideCount" class="hint"></small>
     </label>
     <div class="ai-note wide"><b>Phạm vi áp dụng</b><span>Chương, chủ đề, CLO và yêu cầu cụ thể vẫn được truyền riêng cho từng lần sinh câu. Hướng dẫn tại đây là lớp quy tắc chung của học phần.</span></div>
     <div class="form-actions"><button id="courseAiGuideCancel" type="button" class="secondary">Quay lại</button><button id="courseAiGuideSave" type="submit" class="primary">Lưu hướng dẫn AI</button></div>
    </form>
   </section>
  </div>`;
  const form=$('#courseAiGuideForm',host),textarea=$('#courseAiInstruction',host),count=$('#courseAiGuideCount',host),save=$('#courseAiGuideSave',host);
  updateCount(textarea,count);
  textarea.addEventListener('input',()=>updateCount(textarea,count));
  $('#courseAiGuideBack',host).onclick=backToStructure;
  $('#courseAiGuideCancel',host).onclick=backToStructure;
  form.onsubmit=async event=>{
   event.preventDefault();
   const instruction=textarea.value.trim();
   save.disabled=true;save.textContent='Đang lưu…';
   try{
    const payload={question_bank_id:bankId,instruction,updated_by:state.user?.id||null,updated_at:new Date().toISOString()};
    const {error}=await db.from(TABLE).upsert(payload,{onConflict:'question_bank_id'});
    if(error)throw error;
    window.logActivity?.('update','question_bank_ai_guide',bankId,'Cập nhật hướng dẫn AI học phần');
    toast('Đã lưu hướng dẫn AI của học phần');
    save.textContent='Đã lưu';
    setTimeout(()=>{if(save.isConnected){save.disabled=false;save.textContent='Lưu hướng dẫn AI'}},700);
   }catch(error){err(error);save.disabled=false;save.textContent='Lưu hướng dẫn AI'}
  };
  window.AICLO_SUBPAGE_STATE?.remember?.(subpageKind,{entityType:'question-bank',entityId:bankId});
 }catch(error){err(error);host.innerHTML=`<section class="panel"><div class="panel-head"><h3>Không mở được hướng dẫn AI</h3></div><p class="hint">${esc(error?.message||'Có lỗi khi tải dữ liệu.')}</p><button id="courseAiGuideErrorBack" class="secondary" type="button">← Quay lại</button></section>`;$('#courseAiGuideErrorBack',host).onclick=backToStructure}
}

function installStructureEntry(){
 const base=window.structure;
 if(typeof base!=='function'||base.__aicloCourseAiGuideEntry)return;
 const wrapped=async function(c){
  await base.call(this,c);
  if(!canTeach?.()||!c||$('#courseAiGuideOpen',c))return;
  const head=$('.panel-head',c);if(!head)return;
  const button=document.createElement('button');
  button.id='courseAiGuideOpen';
  button.type='button';
  button.className='secondary';
  button.textContent='✦ Hướng dẫn AI học phần';
  button.onclick=()=>open();
  head.append(button);
 };
 wrapped.__aicloCourseAiGuideEntry=true;
 wrapped.__aicloBaseStructure=base;
 window.structure=wrapped;
}

function registerSubpage(){
 const api=window.AICLO_SUBPAGE_STATE;
 if(api?.register){
  api.register(subpageKind,{
   detect(){return document.querySelector('.course-ai-guide-page')?{entityType:'question-bank',entityId:document.querySelector('.course-ai-guide-page')?.dataset.aicloEntityId||null}:null},
   isActive:()=>!!document.querySelector('.course-ai-guide-page'),
   async restore(){await open();return !!document.querySelector('.course-ai-guide-page')}
  });
 }
 installStructureEntry();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',registerSubpage,{once:true});else registerSubpage();
window.AICLO_COURSE_AI_GUIDE=Object.freeze({open,getInstruction,buildRequirements});
})();
