/* AI-CLO PTITHCM V12.7.1 — AI-assisted essay question drafting.
   Additive module: does not change the legacy MCQ workflow. */
(() => {
'use strict';

if (window.AICLO_ESSAY_AI_V1271) return;

const api = () => window.AICLO_ESSAY_BANK_V127;
const $q = (selector, root=document) => root?.querySelector?.(selector) || null;
const $$q = (selector, root=document) => [...(root?.querySelectorAll?.(selector) || [])];
const h = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const n = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const fmt = value => {
  const x=n(value);
  return Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
};
const isQuarter = value => {
  const x=n(value);
  return x>0 && Math.abs(x*4-Math.round(x*4))<1e-8;
};
const notify = (message,bad=false) => typeof toast==='function' ? toast(message,bad) : (bad ? console.error(message) : console.log(message));
let lastSpec = null;

function decorateQuarterInputs(root=document){
  $$q('[data-rubric-points]',root).forEach(input => {
    input.min='0.25';
    input.step='0.25';
    input.inputMode='decimal';
    input.title='Điểm phải là bội của 0,25';
  });
}

function validateEssayQuarterForm(form){
  for(const input of $$q('[data-rubric-points]',form)){
    if(!isQuarter(input.value)){
      input.focus();
      notify('Điểm mỗi tiêu chí phải là bội dương của 0,25.',true);
      return false;
    }
  }
  return true;
}

document.addEventListener('submit',event=>{
  const form=event.target;
  if(!(form instanceof HTMLFormElement) || form.id!=='essayForm') return;
  if(validateEssayQuarterForm(form)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
},true);

const observer = new MutationObserver(records=>{
  for(const record of records){
    for(const node of record.addedNodes){
      if(!(node instanceof Element)) continue;
      if(node.matches?.('#essayForm,[data-rubric-points]') || node.querySelector?.('[data-rubric-points]')) decorateQuarterInputs(node);
    }
  }
});
observer.observe(document.documentElement,{childList:true,subtree:true});

function injectAiButton(root){
  if(!root || api()?.getKind?.()!=='essay') return;
  const actions=$q('.essay-bank-actions',root);
  if(!actions || $q('#aiCreateEssayQuestion',actions)) return;
  const add=$q('#addEssayQuestion',actions);
  const button=document.createElement('button');
  button.id='aiCreateEssayQuestion';
  button.type='button';
  button.className='secondary essay-ai-create';
  button.innerHTML='✦ AI tạo câu hỏi';
  button.onclick=()=>openAiGenerator();
  if(add) actions.insertBefore(button,add); else actions.appendChild(button);
}

const priorQuestions=window.questions;
if(typeof priorQuestions==='function'){
  window.questions=async function(c){
    await priorQuestions(c);
    decorateQuarterInputs(c||document);
    injectAiButton(c);
  };
}

function cloTargetInputs(data,spec){
  const existing=new Map((spec?.clo_targets||[]).map(x=>[String(x.clo_id),n(x.points)]));
  const defaultTotal=n(spec?.max_points)||2;
  return data.clos.map((clo,index)=>{
    const value=existing.has(String(clo.id)) ? existing.get(String(clo.id)) : (index===0 ? defaultTotal : 0);
    return `<label class="essay-ai-clo-target"><span><b>${h(clo.code)}</b><small>${h(clo.short_description||clo.description||'')}</small></span><input type="number" min="0" step="0.25" inputmode="decimal" data-ai-clo="${h(clo.id)}" value="${h(fmt(value))}"><em>điểm</em></label>`;
  }).join('');
}

function topicsFor(data,chapterId,selected=''){
  return data.topics.filter(t=>String(t.chapter_id)===String(chapterId)).map(t=>`<option value="${h(t.id)}" ${String(t.id)===String(selected)?'selected':''}>${h(t.name)}</option>`).join('');
}

function aiSummary(form,data){
  const total=n(form.elements.max_points?.value);
  const rows=$$q('[data-ai-clo]',form).map(input=>({id:input.dataset.aiClo,points:n(input.value)}));
  const allocated=rows.reduce((sum,row)=>sum+row.points,0);
  const box=$q('#essayAiScoreSummary',form);
  if(!box) return;
  const ok=total>0 && isQuarter(total) && Math.abs(total-allocated)<1e-8 && rows.every(row=>row.points===0||isQuarter(row.points));
  box.classList.toggle('ok',ok);
  box.classList.toggle('bad',!ok);
  box.innerHTML=`<b>Phân bổ: ${fmt(allocated)} / ${fmt(total)} điểm</b><span>${ok?'Đã khớp tổng điểm; mỗi điểm CLO là bội 0,25.':'Tổng điểm CLO phải bằng điểm câu và mọi điểm dương phải là bội 0,25.'}</span>`;
}

async function openAiGenerator(seed=lastSpec){
  const essayApi=api();
  if(!essayApi?.load) return notify('Module ngân hàng tự luận chưa sẵn sàng.',true);
  let data;
  try{ data=await essayApi.load(); }
  catch(error){ return typeof err==='function' ? err(error) : notify(String(error?.message||error),true); }
  if(!data.ch.length || !data.topics.length || !data.clos.length) return notify('Cần có Chương, Chủ đề và CLO trước khi dùng AI tạo tự luận.',true);

  const chapterId=seed?.chapter_id && data.ch.some(x=>String(x.id)===String(seed.chapter_id)) ? String(seed.chapter_id) : String(data.ch[0].id);
  const availableTopics=data.topics.filter(t=>String(t.chapter_id)===chapterId);
  const topicId=seed?.topic_id && availableTopics.some(x=>String(x.id)===String(seed.topic_id)) ? String(seed.topic_id) : String(availableTopics[0]?.id||'');
  const maxPoints=isQuarter(seed?.max_points) ? n(seed.max_points) : 2;
  const workspace=typeof questionWorkspace==='function' ? questionWorkspace : (title,subtitle,html)=>{ const c=$q('#content'); if(c)c.innerHTML=html; };
  workspace('AI tạo câu tự luận','AI chỉ tạo bản nháp. Giảng viên duyệt, sửa rubric rồi mới lưu vào ngân hàng.',`<div class="essay-ai-page"><form id="essayAiForm" class="form-grid">
    <label class="field">Chương<select name="chapter_id" id="essayAiChapter" required>${data.ch.map(ch=>`<option value="${h(ch.id)}" ${String(ch.id)===chapterId?'selected':''}>${h(ch.name)}</option>`).join('')}</select></label>
    <label class="field">Chủ đề<select name="topic_id" id="essayAiTopic" required>${topicsFor(data,chapterId,topicId)}</select></label>
    <label class="field">Dạng câu<select name="essay_kind"><option value="theory" ${seed?.essay_kind==='theory'?'selected':''}>Lý thuyết</option><option value="exercise" ${!seed||seed?.essay_kind==='exercise'?'selected':''}>Bài tập</option><option value="mixed" ${seed?.essay_kind==='mixed'?'selected':''}>Hỗn hợp</option></select></label>
    <label class="field">Độ khó<select name="difficulty"><option value="easy" ${seed?.difficulty==='easy'?'selected':''}>Dễ</option><option value="medium" ${!seed||seed?.difficulty==='medium'?'selected':''}>Trung bình</option><option value="hard" ${seed?.difficulty==='hard'?'selected':''}>Khó</option></select></label>
    <label class="field">Tổng điểm câu<input name="max_points" type="number" min="0.25" step="0.25" inputmode="decimal" value="${h(fmt(maxPoints))}" required></label>
    <section class="wide essay-ai-clo-box"><div class="essay-ai-section-head"><div><h4>Phân bổ điểm CLO</h4><p>Nhập điểm thực tế, không nhập phần trăm. Điểm dương phải là bội của 0,25.</p></div></div><div id="essayAiCloTargets">${cloTargetInputs(data,{...seed,max_points:maxPoints})}</div><div id="essayAiScoreSummary" class="essay-ai-score-summary"></div></section>
    <label class="field wide">Yêu cầu thêm cho AI<textarea name="additional_requirements" rows="4" placeholder="Ví dụ: ưu tiên bài toán có tham số; không dùng máy tính; yêu cầu giải thích kết quả...">${h(seed?.additional_requirements||'')}</textarea></label>
    <div class="wide essay-ai-note"><b>AI không lưu trực tiếp.</b><span>Sau khi tạo, câu hỏi sẽ mở trong màn hình biên tập để giảng viên kiểm tra đề bài, lời giải, rubric, điểm và CLO.</span></div>
    <div class="form-actions"><button id="cancelEssayAi" type="button" class="secondary">Hủy</button><button id="generateEssayAi" class="primary">✦ Tạo bản nháp bằng AI</button></div>
  </form></div>`);

  const form=$q('#essayAiForm');
  if(!form) return;
  const refreshTopics=()=>{
    const cid=form.elements.chapter_id.value;
    const old=form.elements.topic_id.value;
    form.elements.topic_id.innerHTML=topicsFor(data,cid,old);
  };
  form.elements.chapter_id.onchange=refreshTopics;
  form.addEventListener('input',()=>aiSummary(form,data));
  form.addEventListener('change',()=>aiSummary(form,data));
  aiSummary(form,data);
  $q('#cancelEssayAi').onclick=async()=>{ state.view='questions'; if(typeof render==='function') await render(); };
  form.onsubmit=async event=>{
    event.preventDefault();
    const max=n(form.elements.max_points.value);
    if(!isQuarter(max)) return notify('Tổng điểm câu phải là bội dương của 0,25.',true);
    const targets=$$q('[data-ai-clo]',form).map(input=>({clo_id:input.dataset.aiClo,points:n(input.value)})).filter(x=>x.points>0);
    if(!targets.length) return notify('Cần phân bổ điểm cho ít nhất một CLO.',true);
    if(targets.some(x=>!isQuarter(x.points))) return notify('Điểm từng CLO phải là bội dương của 0,25.',true);
    const total=targets.reduce((sum,x)=>sum+x.points,0);
    if(Math.abs(total-max)>1e-8) return notify(`Tổng điểm CLO hiện là ${fmt(total)}, phải bằng ${fmt(max)} điểm.`,true);
    const spec={
      chapter_id:form.elements.chapter_id.value,
      topic_id:form.elements.topic_id.value,
      essay_kind:form.elements.essay_kind.value,
      difficulty:form.elements.difficulty.value,
      max_points:max,
      clo_targets:targets,
      additional_requirements:String(form.elements.additional_requirements.value||'').trim()
    };
    if(!spec.topic_id) return notify('Chương đã chọn chưa có Chủ đề.',true);
    lastSpec=spec;
    const button=$q('#generateEssayAi');
    button.disabled=true; button.textContent='AI đang tạo…';
    try{
      const {data:result,error}=await db.functions.invoke('generate-one-essay-question',{body:{subject_id:state.subjectId,...spec}});
      if(error) throw error;
      if(!result?.success) throw new Error(result?.error||'AI chưa tạo được câu tự luận.');
      await openGeneratedDraft(result.question,data,result.model);
    }catch(error){
      if(typeof err==='function') err(error); else notify(String(error?.message||error),true);
      button.disabled=false; button.textContent='✦ Tạo bản nháp bằng AI';
    }
  };
}

async function openGeneratedDraft(question,data,model){
  const essayApi=api();
  if(!essayApi?.openForm) return notify('Không mở được biểu mẫu tự luận.',true);
  await essayApi.openForm(null,data);
  const form=$q('#essayForm');
  if(!form) return notify('Không mở được biểu mẫu tự luận.',true);

  form.elements.content.value=question.content||'';
  form.elements.chapter_id.value=question.chapter_id||form.elements.chapter_id.value;
  form.elements.chapter_id.dispatchEvent(new Event('change',{bubbles:true}));
  if(question.topic_id && [...form.elements.topic_id.options].some(o=>String(o.value)===String(question.topic_id))) form.elements.topic_id.value=String(question.topic_id);
  form.elements.essay_kind.value=question.essay_kind||'exercise';
  form.elements.difficulty.value=question.difficulty||'medium';
  form.elements.solution.value=question.solution||'';
  if(form.elements.approval_status) form.elements.approval_status.value='draft';

  const parts=Array.isArray(question.parts)&&question.parts.length ? question.parts : [{label:'',content:'',rubrics:[]}];
  while($$q('.essay-part-card',$q('#essayParts')).length<parts.length) $q('#addEssayPart')?.click();
  for(let pi=0;pi<parts.length;pi++){
    let card=$$q('.essay-part-card',$q('#essayParts'))[pi];
    const need=Math.max(1,parts[pi].rubrics?.length||0);
    while($$q('.essay-rubric-row',card).length<need){
      $q('[data-add-rubric]',card)?.click();
      card=$$q('.essay-part-card',$q('#essayParts'))[pi];
    }
  }

  const cards=$$q('.essay-part-card',$q('#essayParts'));
  parts.forEach((part,pi)=>{
    const card=cards[pi]; if(!card)return;
    const label=$q('[data-part-label]',card), content=$q('[data-part-content]',card);
    if(label) label.value=part.label||'';
    if(content) content.value=part.content||'';
    const rows=$$q('.essay-rubric-row',card);
    (part.rubrics||[]).forEach((rubric,ri)=>{
      const row=rows[ri]; if(!row)return;
      const criterion=$q('[data-rubric-criterion]',row), points=$q('[data-rubric-points]',row), clo=$q('[data-rubric-clo]',row);
      if(criterion) criterion.value=rubric.criterion||'';
      if(points){ points.value=fmt(rubric.points); points.min='0.25'; points.step='0.25'; }
      if(clo && [...clo.options].some(o=>String(o.value)===String(rubric.clo_id))) clo.value=String(rubric.clo_id);
    });
  });
  decorateQuarterInputs(form);
  $q('#essayParts')?.dispatchEvent(new Event('input',{bubbles:true}));
  form.dataset.aiGenerated='true';

  const note=document.createElement('div');
  note.className='wide essay-ai-draft-banner';
  note.innerHTML=`<div><b>✦ Bản nháp do AI đề xuất</b><span>${model?`Mô hình: ${h(model)} · `:''}Chưa lưu vào ngân hàng. Hãy kiểm tra kỹ đề bài, lời giải và từng dòng rubric.</span></div><button id="regenerateEssayAi" type="button" class="secondary compact">AI tạo lại</button>`;
  const actions=$q('.form-actions',form);
  if(actions) form.insertBefore(note,actions);
  const save=$q('#saveEssayQuestion',form); if(save) save.textContent='Duyệt và lưu câu tự luận';
  $q('#regenerateEssayAi',form)?.addEventListener('click',()=>openAiGenerator(lastSpec));
  notify('AI đã tạo bản nháp. Hãy kiểm tra trước khi lưu.');
  if(typeof renderMath==='function') renderMath(form);
}

window.AICLO_ESSAY_AI_V1271=Object.freeze({
  version:'12.7.1',
  open:openAiGenerator,
  validateQuarter:isQuarter,
  decorate:decorateQuarterInputs
});
})();
