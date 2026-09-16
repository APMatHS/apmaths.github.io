/* AI-CLO PTITHCM V12.7.3 — fast local switching for question-bank sub-tabs.
   Keeps the current pane responsive, preloads the opposite question type,
   preserves detached DOM/events, and never calls the global app render for sub-tab switches. */
(()=>{
'use strict';
if(window.AICLO_QBANK_FAST_SWITCH)return;

const VERSION='12.7.3';
const paneCache=new Map();
const dataCache=new Map();
let switching=false;
let desiredKind=null;
let seq=0;

const baseEssayApi=window.AICLO_ESSAY_BANK_V127;
const api=()=>window.AICLO_ESSAY_BANK_V127;
const content=()=>document.querySelector('#content');
const currentKind=()=>api()?.getKind?.()==='essay'?'essay':'mcq';
const subjectKey=()=>`${state?.user?.id||'guest'}|${state?.subjectId||'no-subject'}`;
const paneKey=kind=>`${subjectKey()}|${kind}`;
const dataKey=kind=>`${subjectKey()}|data|${kind}`;
const escHtml=value=>typeof window.esc==='function'?window.esc(value==null?'':String(value)):String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=value=>Number.isFinite(Number(value))?Number(value):0;
const fmt=value=>{const n=num(value);return Number.isInteger(n)?String(n):n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')};
const scopeInBank=(scope,bank)=>bank==='secure_exam'?(scope==='secure_exam'||scope==='both'):(scope==='practice'||scope==='both');
const codeOf=q=>q?.display_code||`TL-${String(q?.id||'').replaceAll('-','').slice(0,6).toUpperCase()||'MỚI'}`;
const canManage=q=>!!q&&(state?.profile?.role==='admin'||String(q.created_by||'')===String(state?.user?.id||''));

function installStyle(){
 if(document.querySelector('style[data-qbank-fast-switch]'))return;
 const style=document.createElement('style');
 style.dataset.qbankFastSwitch='1';
 style.textContent=`
  [data-question-kind].qbank-fast-loading{position:relative;padding-right:30px!important}
  [data-question-kind].qbank-fast-loading::after{content:'•';position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:22px;line-height:1;animation:qbankFastPulse .8s ease-in-out infinite alternate}
  .qbank-fast-skeleton{display:grid;gap:12px;margin-top:12px}
  .qbank-fast-skeleton .qbank-fast-line{height:48px;border-radius:10px;background:linear-gradient(90deg,#f3f5f8,#fafbfc,#f3f5f8);background-size:220% 100%;animation:qbankFastSweep 1.1s linear infinite}
  .qbank-fast-skeleton .qbank-fast-line.short{width:42%;height:42px}
  @keyframes qbankFastPulse{from{opacity:.25}to{opacity:1}}
  @keyframes qbankFastSweep{from{background-position:100% 0}to{background-position:-100% 0}}
 `;
 document.head.appendChild(style);
}

function isQuestionList(){
 const c=content();
 if(state?.view!=='questions'||!c||c.querySelector('.question-workspace'))return false;
 return !!c.querySelector('.v105-question-table,.essay-question-table');
}

function dropPanes(){
 paneCache.clear();
 desiredKind=null;
 seq++;
}
function invalidateAll(){
 dropPanes();
 dataCache.clear();
}

function stashPane(kind){
 const c=content();
 if(!c||!c.firstChild)return false;
 const fragment=document.createDocumentFragment();
 while(c.firstChild)fragment.appendChild(c.firstChild);
 paneCache.set(paneKey(kind),{fragment,scrollY:window.scrollY||0});
 return true;
}
function restorePane(kind){
 const c=content(),key=paneKey(kind),saved=paneCache.get(key);
 if(!c||!saved)return false;
 c.replaceChildren(saved.fragment);
 paneCache.delete(key);
 requestAnimationFrame(()=>window.scrollTo({top:Number(saved.scrollY)||0,behavior:'auto'}));
 return true;
}

async function withoutGlobalRender(task){
 const real=window.render;
 window.render=async()=>{};
 try{return await task()}finally{window.render=real}
}
async function setKindState(kind){
 const a=api();
 if(!a?.setKind)return false;
 await withoutGlobalRender(()=>a.setKind(kind));
 return true;
}

function memoPromise(key,loader){
 if(dataCache.has(key))return dataCache.get(key);
 const promise=Promise.resolve().then(loader).catch(error=>{if(dataCache.get(key)===promise)dataCache.delete(key);throw error});
 dataCache.set(key,promise);
 return promise;
}
function cachedEssayLoad({force=false}={}){
 const key=dataKey('essay');
 if(force)dataCache.delete(key);
 if(!baseEssayApi?.load)return Promise.resolve(null);
 return memoPromise(key,()=>baseEssayApi.load());
}
function prefetchEssay(){return cachedEssayLoad()}
function prefetchMcq(){
 const loader=window.AICLO_QUESTION_STATE?.lightQuestionSets;
 if(typeof loader!=='function')return Promise.resolve(null);
 return memoPromise(dataKey('mcq'),()=>loader());
}
function scheduleOppositePrefetch(){
 const run=()=>{
  if(state?.view!=='questions'||!state?.subjectId)return;
  const p=currentKind()==='mcq'?prefetchEssay():prefetchMcq();
  p?.catch?.(error=>console.warn('AI-CLO prefetch ngân hàng câu hỏi',error));
 };
 if(window.AICLO_PERF?.idle)window.AICLO_PERF.idle(run,900);else setTimeout(run,250);
}

function markLoading(button,on){
 if(!button)return;
 button.classList.toggle('qbank-fast-loading',!!on);
 if(on)button.setAttribute('aria-busy','true');else button.removeAttribute('aria-busy');
}
function clearLoadingMarks(){document.querySelectorAll('[data-question-kind].qbank-fast-loading').forEach(b=>markLoading(b,false))}

function kindTabsHtml(kind){
 return `<div class="essay-kind-tabs" role="tablist" aria-label="Loại câu hỏi">
  <button type="button" class="essay-kind-tab ${kind==='mcq'?'active':''}" data-question-kind="mcq">Trắc nghiệm</button>
  <button type="button" class="essay-kind-tab ${kind==='essay'?'active':''}" data-question-kind="essay">Tự luận</button>
 </div>`;
}
function skeleton(kind,data=null){
 const c=content();if(!c)return;
 let bank='practice';
 if(kind==='essay'){
  bank=document.querySelector('.essay-main-bank-tabs [data-essay-bank].active')?.dataset.essayBank||window.AICLO_ESSAY_CONTEXT_V1272?.getBank?.()||'practice';
  const items=data?.items||[],practice=items.filter(q=>scopeInBank(q.question_scope,'practice')).length,secure=items.filter(q=>scopeInBank(q.question_scope,'secure_exam')).length;
  c.innerHTML=`<div class="v105-bank-tabs essay-main-bank-tabs" role="tablist"><button type="button" class="v105-bank-tab ${bank==='practice'?'active':''}" disabled><span>Luyện tập - kiểm tra</span><b>${practice}</b></button><button type="button" class="v105-bank-tab secure ${bank==='secure_exam'?'active':''}" disabled><span>🔒 Đề thi - bảo mật</span><b>${secure}</b></button></div>${kindTabsHtml('essay')}<div class="qbank-fast-skeleton" aria-live="polite"><div class="qbank-fast-line"></div><div class="qbank-fast-line short"></div><div class="panel"><b>Đang hoàn tất ngân hàng tự luận…</b><p class="hint">Giao diện vẫn hoạt động; dữ liệu đang được chuẩn bị ở nền.</p></div></div>`;
 }else{
  c.innerHTML=`${kindTabsHtml('mcq')}<div class="qbank-fast-skeleton" aria-live="polite"><div class="qbank-fast-line"></div><div class="qbank-fast-line short"></div><div class="panel"><b>Đang hoàn tất ngân hàng trắc nghiệm…</b><p class="hint">Giao diện vẫn hoạt động; dữ liệu đang được chuẩn bị ở nền.</p></div></div>`;
 }
}

async function localRenderTarget(kind,prefetched=null){
 const c=content();if(!c||typeof window.questions!=='function')return;
 skeleton(kind,prefetched);
 await window.questions(c);
}

async function switchKind(next,trigger=null){
 next=next==='essay'?'essay':'mcq';
 desiredKind=next;
 if(switching)return;
 const from=currentKind();
 if(next===from){clearLoadingMarks();return}
 const mySeq=++seq;
 switching=true;
 markLoading(trigger,true);
 try{
  let prefetched=null;
  try{prefetched=await (next==='essay'?prefetchEssay():prefetchMcq())}catch(error){console.warn('Không preload được tab '+next,error)}
  if(mySeq!==seq||desiredKind!==next)return;

  await setKindState(next);
  if(mySeq!==seq)return;

  stashPane(from);
  if(!restorePane(next))await localRenderTarget(next,prefetched);
 }catch(error){
  console.error('AI-CLO chuyển tab ngân hàng nhanh',error);
  if(!content()?.children?.length)restorePane(from);
  await setKindState(from).catch(()=>{});
  if(typeof toast==='function')toast('Chưa chuyển được loại câu hỏi. Hãy thử lại.',true);
 }finally{
  switching=false;
  clearLoadingMarks();
 }
 scheduleOppositePrefetch();
 const actual=currentKind();
 if(desiredKind&&desiredKind!==actual){
  const tab=document.querySelector(`[data-question-kind="${desiredKind}"]`);
  queueMicrotask(()=>switchKind(desiredKind,tab));
 }
}

function rubricRows(q){return (q?.essay_question_parts||[]).flatMap(p=>p.essay_rubric_items||[])}
function cloSummary(q,clos){
 const totals=new Map();let total=0;
 for(const r of rubricRows(q)){const pts=num(r.points);total+=pts;totals.set(String(r.clo_id),(totals.get(String(r.clo_id))||0)+pts)}
 return (clos||[]).map(clo=>({clo,points:totals.get(String(clo.id))||0,total})).filter(x=>x.points>0);
}
function essayRow(q,data,bank){
 const chapter=(data.ch||[]).find(x=>String(x.id)===String(q.chapter_id));
 const topic=(data.topics||[]).find(x=>String(x.id)===String(q.topic_id));
 const chips=cloSummary(q,data.clos).map(x=>`<span class="essay-clo-chip"><b>${escHtml(x.clo.code)}</b> ${fmt(x.points)}đ · ${x.total?Math.round(x.points*100/x.total):0}%</span>`).join('')||'<span class="hint">Chưa có rubric</span>';
 const kindLabel=({theory:'Lý thuyết',exercise:'Bài tập',mixed:'Hỗn hợp'})[q.essay_kind]||q.essay_kind||'—';
 const difficulty=({easy:'Dễ',medium:'Trung bình',hard:'Khó'})[q.difficulty]||q.difficulty||'—';
 const approval=({draft:'Bản nháp',pending:'Chờ duyệt',approved:'Đã duyệt',archived:'Lưu trữ'})[q.approval_status]||q.approval_status||'—';
 return `<tr data-essay-question-id="${escHtml(q.id)}"><td class="q-code-cell"><button class="question-code" data-essay-detail="${escHtml(q.id)}">${escHtml(codeOf(q))}</button>${bank==='secure_exam'?'<span class="secure-lock">🔒</span>':''}<br><span class="badge">${escHtml(kindLabel)}</span></td><td class="q-content-cell"><button class="question-summary" data-essay-detail="${escHtml(q.id)}">${escHtml(q.content)}</button></td><td class="q-structure-cell"><b>${escHtml(chapter?.name||'—')}</b><small>${escHtml(topic?.name||'Chưa gán chủ đề')}</small></td><td class="essay-weight-cell"><b>${fmt(q.max_points)} điểm</b><div class="essay-clo-chips">${chips}</div></td><td class="q-class-cell"><span class="badge">${escHtml(difficulty)}</span><br><span class="badge ${q.approval_status==='approved'?'green':'red'}">${escHtml(approval)}</span></td><td class="row-actions"><button data-essay-detail="${escHtml(q.id)}">Chi tiết</button>${canManage(q)?`<button data-essay-edit="${escHtml(q.id)}">Sửa</button>`:''}</td></tr>`;
}
function essayFilters(){
 const value=id=>document.getElementById(id)?.value||'all';
 return {search:String(document.getElementById('essaySearch')?.value||'').trim().toLowerCase(),chapter:value('essayChapter'),topic:value('essayTopic'),clo:value('essayClo'),kind:value('essayKind'),difficulty:value('essayDifficulty'),approval:value('essayApproval')};
}
function filteredEssay(data,bank){
 const f=essayFilters();
 return (data.items||[]).filter(q=>scopeInBank(q.question_scope,bank)&&(!f.search||String(q.content||'').toLowerCase().includes(f.search)||codeOf(q).toLowerCase().includes(f.search))&&(f.chapter==='all'||String(q.chapter_id)===String(f.chapter))&&(f.topic==='all'||String(q.topic_id||'')===String(f.topic))&&(f.clo==='all'||rubricRows(q).some(r=>String(r.clo_id)===String(f.clo)))&&(f.kind==='all'||q.essay_kind===f.kind)&&(f.difficulty==='all'||q.difficulty===f.difficulty)&&(f.approval==='all'||q.approval_status===f.approval));
}
function paintEssayBank(data,bank){
 if(currentKind()!=='essay'||!document.querySelector('.essay-question-table'))return;
 const items=data?.items||[];
 document.querySelectorAll('.essay-main-bank-tabs [data-essay-bank]').forEach(button=>{
  const b=button.dataset.essayBank;
  button.classList.toggle('active',b===bank);
  const count=items.filter(q=>scopeInBank(q.question_scope,b)).length;
  const badge=button.querySelector('b');if(badge)badge.textContent=String(count);
 });
 const note=document.querySelector('.essay-bank-note');
 if(note)note.innerHTML=bank==='secure_exam'?'<b>🔒 Tự luận · Đề thi - bảo mật</b><span>Câu tự luận tại đây dành cho đề chính thức. Tỷ lệ CLO được tính từ điểm rubric.</span>':'<b>Tự luận · Luyện tập - kiểm tra</b><span>Mỗi câu có thể chứa nhiều CLO; hệ thống tính tỷ lệ CLO từ các tiêu chí chấm và số điểm tương ứng.</span>';
 const list=filteredEssay(data,bank),total=items.filter(q=>scopeInBank(q.question_scope,bank)).length,rows=document.querySelector('#essayRows');
 if(rows){rows.innerHTML=list.length?list.map(q=>essayRow(q,data,bank)).join(''):'<tr><td colspan="6" class="empty">Không có câu tự luận phù hợp.</td></tr>';if(typeof renderMath==='function')renderMath(rows)}
 const countBox=document.querySelector('.essay-count-row .hint,.essay-bank-actions .hint');if(countBox)countBox.textContent=`Hiển thị ${list.length}/${total} câu tự luận`;
}

async function switchEssayBank(button,event){
 if(switching||currentKind()!=='essay'||!document.querySelector('.essay-question-table'))return;
 const target=button.dataset.essayBank==='secure_exam'?'secure_exam':'practice';
 if(button.classList.contains('active'))return;
 const original=button.onclick;
 button.setAttribute('aria-busy','true');
 try{
  if(typeof original==='function')await withoutGlobalRender(()=>original.call(button,event));
  const data=await prefetchEssay();
  if(data&&currentKind()==='essay')paintEssayBank(data,target);
 }catch(error){console.error('AI-CLO chuyển ngân hàng tự luận nhanh',error);if(typeof toast==='function')toast('Chưa chuyển được ngân hàng tự luận.',true)}finally{button.removeAttribute('aria-busy')}
}

function shouldInvalidateForWrite(target){
 return !!target.closest?.('#addQ,#generateAI,#bulkImportQ,#addEssayQuestion,#aiCreateEssayQuestion,#essayAiCloneQuestion,#deleteEssayQuestion,#editEssayQuestion,#editQuestion,[data-essay-edit],[data-bulk-scope]');
}
function shouldDropForWorkspace(target){
 return !!target.closest?.('[data-detail],[data-analysis],[data-essay-detail],[data-essay-edit],#addQ,#generateAI,#bulkImportQ,#addEssayQuestion,#aiCreateEssayQuestion,#essayAiCloneQuestion,#deleteEssayQuestion,#editEssayQuestion,#editQuestion,[data-bulk-scope]');
}

document.addEventListener('click',event=>{
 const kindTab=event.target.closest?.('[data-question-kind]');
 if(kindTab&&state?.view==='questions'){
  event.preventDefault();event.stopImmediatePropagation();
  const next=kindTab.dataset.questionKind==='essay'?'essay':'mcq';
  desiredKind=next;
  if(!switching)switchKind(next,kindTab);
  return;
 }
 const essayBank=event.target.closest?.('[data-essay-bank]');
 if(essayBank&&state?.view==='questions'&&currentKind()==='essay'&&document.querySelector('.essay-question-table')){
  event.preventDefault();event.stopImmediatePropagation();
  switchEssayBank(essayBank,event);
  return;
 }
 const nav=event.target.closest?.('[data-view]');
 if(nav){
  if(nav.dataset.view==='questions')setTimeout(scheduleOppositePrefetch,350);
  else if(state?.view==='questions')invalidateAll();
 }
 if(state?.view==='questions'&&shouldInvalidateForWrite(event.target))invalidateAll();
 else if(state?.view==='questions'&&shouldDropForWorkspace(event.target))dropPanes();
},true);

document.addEventListener('change',event=>{
 if(event.target?.id==='subjectSelect'){
  invalidateAll();
  setTimeout(()=>{if(state?.view==='questions')scheduleOppositePrefetch()},500);
 }
},true);

if(baseEssayApi){
 window.AICLO_ESSAY_BANK_V127=Object.freeze({...baseEssayApi,load:cachedEssayLoad});
}
installStyle();
setTimeout(scheduleOppositePrefetch,900);
window.AICLO_QBANK_FAST_SWITCH=Object.freeze({version:VERSION,clear:invalidateAll,prefetch:scheduleOppositePrefetch,switchKind,invalidateEssay:()=>dataCache.delete(dataKey('essay'))});
})();
