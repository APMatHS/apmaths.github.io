/* AI-CLO PTITHCM V12.7.2 — unified essay-bank tools.
   Additive module: layout parity with MCQ, essay matrix, duplicate scan,
   AI session history and AI variants. MCQ code is untouched. */
(()=>{
'use strict';
if(window.AICLO_ESSAY_TOOLS_V1272)return;

const STYLE_HREF='css/questions/essay-tools.css?v=12.7.2';
const api=()=>window.AICLO_ESSAY_BANK_V127;
const $q=(s,r=document)=>r?.querySelector?.(s)||null;
const $$q=(s,r=document)=>[...(r?.querySelectorAll?.(s)||[])];
const h=v=>String(v==null?'':v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const fmt=v=>{const x=num(v);return Number.isInteger(x)?String(x):x.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')};
const notify=(m,bad=false)=>typeof toast==='function'?toast(m,bad):(bad?console.error(m):console.log(m));
const scopeInBank=(scope,bank)=>bank==='secure_exam'?(scope==='secure_exam'||scope==='both'):(scope==='practice'||scope==='both');
const bankLabel=bank=>bank==='secure_exam'?'Đề thi - bảo mật':'Luyện tập - kiểm tra';
let selectionMode=false;
let selectedIds=new Set();
let lastEssayId=null;
let enhanceQueued=false;

function ensureStyle(){if(document.querySelector(`link[href="${STYLE_HREF}"]`))return;const link=document.createElement('link');link.rel='stylesheet';link.href=STYLE_HREF;document.head.appendChild(link)}
function currentBank(){return $q('.essay-main-bank-tabs [data-essay-bank].active')?.dataset.essayBank||'practice'}
function isEssayList(){return api()?.getKind?.()==='essay'&&!!$q('.essay-question-table')&&!!$q('.essay-main-bank-tabs')}
function rubricsOf(item){return (item?.essay_question_parts||[]).flatMap(p=>p.essay_rubric_items||[])}
function cloPoints(item,cloId){return rubricsOf(item).filter(r=>String(r.clo_id)===String(cloId)).reduce((s,r)=>s+num(r.points),0)}
function cloSummary(item,clos){return (clos||[]).map(clo=>({clo,points:cloPoints(item,clo.id)})).filter(x=>x.points>0)}
function displayCode(item){return item?.display_code||`TL-${String(item?.id||'').replaceAll('-','').slice(0,6).toUpperCase()||'MỚI'}`}
async function loadData(){if(!api()?.load)throw new Error('Module ngân hàng tự luận chưa sẵn sàng.');return api().load()}

function decorateCodes(data){
 const map=new Map((data?.items||[]).map(x=>[String(x.id),x]));
 $$q('#essayRows tr').forEach(row=>{
  const codeBtn=$q('.question-code[data-essay-detail]',row);if(!codeBtn)return;
  const id=String(codeBtn.dataset.essayDetail||'');const item=map.get(id);if(!item)return;
  codeBtn.textContent=displayCode(item);row.dataset.essayQuestionId=id;
 });
}

function activeFilterCount(){
 return ['essayChapter','essayTopic','essayClo','essayKind','essayDifficulty','essayApproval'].reduce((n,id)=>{const el=document.getElementById(id);return n+(el&&el.value&&el.value!=='all'?1:0)},0);
}
function updateFilterButton(){
 const btn=$q('#essayFilterButton');if(!btn)return;const count=activeFilterCount();
 btn.classList.toggle('active',count>0);btn.innerHTML=`<span>☷</span> Lọc${count?` <b>${count}</b>`:''}`;
}
function ensurePrimaryActions(){
 const note=$q('.essay-bank-note');const legacy=$q('.essay-bank-actions');if(!note||!legacy)return;
 let bar=$q('#essayPrimaryActions');if(!bar){bar=document.createElement('div');bar.id='essayPrimaryActions';bar.className='essay-primary-actions';note.insertAdjacentElement('afterend',bar)}
 const ai=$q('#aiCreateEssayQuestion'),add=$q('#addEssayQuestion');
 if(ai&&ai.parentElement!==bar)bar.appendChild(ai);
 if(add&&add.parentElement!==bar)bar.appendChild(add);
 let history=$q('#essayAiHistory');if(!history){history=document.createElement('button');history.id='essayAiHistory';history.type='button';history.className='secondary';history.textContent='Phiên AI';history.onclick=openAiSessions}
 if(history.parentElement!==bar)bar.appendChild(history);
 let funcs=$q('#essayFunctionsButton');if(!funcs){funcs=document.createElement('button');funcs.id='essayFunctionsButton';funcs.type='button';funcs.className='secondary';funcs.textContent='☰ Chức năng';funcs.onclick=openFunctions}
 if(funcs.parentElement!==bar)bar.appendChild(funcs);
 legacy.classList.add('essay-legacy-actions');
}
function ensureSearchAndFilter(){
 const source=$q('.essay-question-tools');const legacy=$q('.essay-bank-actions');if(!source||!legacy)return;
 source.classList.add('essay-filter-source');
 let row=$q('#essaySearchRow');if(!row){row=document.createElement('div');row.id='essaySearchRow';row.className='essay-search-row';legacy.insertAdjacentElement('beforebegin',row)}
 const search=$q('#essaySearch');if(search&&search.parentElement!==row)row.appendChild(search);
 let filter=$q('#essayFilterButton');if(!filter){filter=document.createElement('button');filter.id='essayFilterButton';filter.type='button';filter.className='secondary essay-filter-button';filter.onclick=()=>source.classList.toggle('open')}
 if(filter.parentElement!==row)row.appendChild(filter);
 let countRow=$q('#essayCountRow');if(!countRow){countRow=document.createElement('div');countRow.id='essayCountRow';countRow.className='essay-count-row';source.insertAdjacentElement('afterend',countRow)}
 const hint=$q('.essay-bank-actions .hint');if(hint&&hint.parentElement!==countRow)countRow.appendChild(hint);
 ['essayChapter','essayTopic','essayClo','essayKind','essayDifficulty','essayApproval'].forEach(id=>{const el=document.getElementById(id);if(el&&el.dataset.essayToolsFilter!=='1'){el.dataset.essayToolsFilter='1';el.addEventListener('change',()=>requestAnimationFrame(updateFilterButton))}});
 updateFilterButton();
}
function updateSelectionButton(){const btn=$q('#essaySelectionToggle');if(!btn)return;btn.classList.toggle('active',selectionMode);btn.textContent=selectionMode?`✓ Đang chọn${selectedIds.size?` (${selectedIds.size})`:''}`:'☑ Chọn'}
function applySelectionColumn(){
 const table=$q('.essay-question-table table');if(!table)return;table.closest('.essay-question-table')?.classList.toggle('selection-mode',selectionMode);
 const head=$q('thead tr',table);
 if(selectionMode){
  if(head&&!$q('.essay-select-head',head)){const th=document.createElement('th');th.className='essay-select-head';th.textContent='Chọn';head.prepend(th)}
  $$q('tbody tr',table).forEach(row=>{if($q('.essay-select-cell',row))return;const id=row.dataset.essayQuestionId||$q('.question-code[data-essay-detail]',row)?.dataset.essayDetail;if(!id)return;const td=document.createElement('td');td.className='essay-select-cell';td.innerHTML=`<input type="checkbox" aria-label="Chọn câu" ${selectedIds.has(String(id))?'checked':''}>`;td.querySelector('input').onchange=e=>{if(e.target.checked)selectedIds.add(String(id));else selectedIds.delete(String(id));updateSelectionButton()};row.prepend(td)});
 }else{
  $q('.essay-select-head',head)?.remove();$$q('.essay-select-cell',table).forEach(x=>x.remove());
 }
 updateSelectionButton();
}
function ensureSelectionAction(){
 const count=$q('#essayCountRow');if(!count)return;let actions=$q('#essaySelectionActions');if(!actions){actions=document.createElement('div');actions.id='essaySelectionActions';actions.className='essay-selection-actions';count.insertAdjacentElement('afterend',actions)}
 let btn=$q('#essaySelectionToggle');if(!btn){btn=document.createElement('button');btn.id='essaySelectionToggle';btn.type='button';btn.className='secondary essay-selection-toggle';btn.onclick=()=>{selectionMode=!selectionMode;if(!selectionMode)selectedIds.clear();applySelectionColumn()}}
 if(btn.parentElement!==actions)actions.appendChild(btn);applySelectionColumn();
}

function functionCard(id,icon,title,desc){return `<button id="${id}" class="essay-function-card" type="button"><span>${icon}</span><span><b>${h(title)}</b><small>${h(desc)}</small></span><i>→</i></button>`}
function openFunctions(){
 const body=`<div><div><b>Chức năng ngân hàng tự luận</b><p class="hint">Thống kê và kiểm tra trong đúng khu ngân hàng đang xem.</p></div><div class="essay-function-list">${functionCard('essayMatrixOpen','▦','Ma trận tự luận','Chương/Chủ đề × CLO theo số câu và tổng điểm.')}${functionCard('essayDuplicateOpen','⧉','Kiểm tra trùng','Tìm câu gần trùng chỉ trong '+bankLabel(currentBank())+'.')}</div></div>`;
 openDrawer?.('Chức năng',body,()=>{$q('#essayMatrixOpen')?.addEventListener('click',openEssayMatrix);$q('#essayDuplicateOpen')?.addEventListener('click',openEssayDuplicates)},{eyebrow:'NGÂN HÀNG TỰ LUẬN'});
}

function matrixCell(items,cloId){const points=items.reduce((s,q)=>s+cloPoints(q,cloId),0);const count=items.filter(q=>cloPoints(q,cloId)>0).length;return {count,points}}
function matrixHtml(data,mode='chapter'){
 const bank=currentBank();const items=(data.items||[]).filter(q=>scopeInBank(q.question_scope,bank)&&q.approval_status!=='archived');
 let rows=[];
 if(mode==='topic'){
  rows=(data.topics||[]).map(t=>({id:t.id,label:t.name,sub:(data.ch||[]).find(c=>String(c.id)===String(t.chapter_id))?.name||'',items:items.filter(q=>String(q.topic_id||'')===String(t.id))})).filter(r=>r.items.length);
  const noTopic=items.filter(q=>!q.topic_id);if(noTopic.length)rows.push({id:'__none__',label:'Chưa gán chủ đề',sub:'',items:noTopic});
 }else{
  rows=(data.ch||[]).map(c=>({id:c.id,label:c.name,sub:'',items:items.filter(q=>String(q.chapter_id)===String(c.id))})).filter(r=>r.items.length);
 }
 const totalPoints=items.reduce((s,q)=>s+num(q.max_points),0);
 const table=`<div class="table-wrap"><table class="essay-matrix-table"><thead><tr><th>${mode==='topic'?'Chủ đề':'Chương'}</th>${data.clos.map(c=>`<th>${h(c.code)}</th>`).join('')}<th>Tổng</th></tr></thead><tbody>${rows.map(row=>`<tr><td class="essay-matrix-row-label"><b>${h(row.label)}</b>${row.sub?`<small>${h(row.sub)}</small>`:''}</td>${data.clos.map(clo=>{const x=matrixCell(row.items,clo.id);return `<td class="essay-matrix-cell"><b>${x.count} câu</b><small>${fmt(x.points)} điểm</small></td>`}).join('')}<td class="essay-matrix-cell"><b>${row.items.length} câu</b><small>${fmt(row.items.reduce((s,q)=>s+num(q.max_points),0))} điểm</small></td></tr>`).join('')||`<tr><td colspan="${data.clos.length+2}" class="empty">Chưa có dữ liệu.</td></tr>`}</tbody><tfoot><tr><th>Tổng</th>${data.clos.map(clo=>{const x=matrixCell(items,clo.id);return `<th>${x.count} câu<br><small>${fmt(x.points)} điểm</small></th>`}).join('')}<th>${items.length} câu<br><small>${fmt(totalPoints)} điểm</small></th></tr></tfoot></table></div>`;
 return `<div class="essay-matrix-tabs"><button data-essay-matrix-mode="chapter" class="secondary ${mode==='chapter'?'active':''}">Chương × CLO</button><button data-essay-matrix-mode="topic" class="secondary ${mode==='topic'?'active':''}">Chủ đề × CLO</button></div><div class="essay-matrix-summary"><div><small>Ngân hàng</small><b>${h(bankLabel(bank))}</b></div><div><small>Tổng câu</small><b>${items.length}</b></div><div><small>Tổng điểm rubric</small><b>${fmt(totalPoints)}</b></div></div><p class="hint">Mỗi ô hiển thị số câu có đóng góp vào CLO và tổng số điểm CLO trong ô đó.</p>${table}`;
}
async function openEssayMatrix(){
 try{const data=await loadData();const show=mode=>{const body=$q('#drawerBody');if(!body)return;body.innerHTML=matrixHtml(data,mode);$$q('[data-essay-matrix-mode]',body).forEach(btn=>btn.onclick=()=>show(btn.dataset.essayMatrixMode))};openDrawer?.('Ma trận tự luận','<p class="hint">Đang tổng hợp…</p>',()=>show('chapter'),{wide:true,eyebrow:'CHƯƠNG / CHỦ ĐỀ × CLO'});}catch(e){typeof err==='function'?err(e):notify(String(e?.message||e),true)}
}
function similarity(a,b){if(typeof window.v96Similarity==='function')return window.v96Similarity(a,b);const words=s=>new Set(String(s).toLowerCase().replace(/\s+/g,' ').split(/[^\p{L}\p{N}]+/u).filter(x=>x.length>1));const A=words(a),B=words(b),inter=[...A].filter(x=>B.has(x)).length,union=new Set([...A,...B]).size;return union?inter/union:0}
async function openEssayDuplicates(){
 try{const data=await loadData(),bank=currentBank();const items=data.items.filter(q=>scopeInBank(q.question_scope,bank)&&q.approval_status!=='archived');const pairs=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const score=similarity(items[i].content,items[j].content);if(score>=.72)pairs.push({a:items[i],b:items[j],score})}pairs.sort((a,b)=>b.score-a.score);const html=`<div class="essay-duplicate-results"><p class="hint">Chỉ đối chiếu trong <b>${h(bankLabel(bank))}</b>. Hệ thống cảnh báo; giảng viên quyết định giữ hoặc sửa.</p>${pairs.slice(0,50).map(p=>`<article class="essay-duplicate-pair"><div class="essay-duplicate-head"><b>${h(displayCode(p.a))} ↔ ${h(displayCode(p.b))}</b><span class="essay-duplicate-score">${Math.round(p.score*100)}%</span></div><p>${h(p.a.content)}</p><p>${h(p.b.content)}</p></article>`).join('')||'<div class="empty"><b>Không phát hiện cặp gần trùng</b><span>Không có cặp nào vượt ngưỡng 72% trong khu đang xem.</span></div>'}</div>`;openDrawer?.('Kiểm tra trùng tự luận',html,null,{wide:true,eyebrow:'CHỐNG TRÙNG'})}catch(e){typeof err==='function'?err(e):notify(String(e?.message||e),true)}
}

async function openAiSessions(){
 try{const data=await loadData(),bank=currentBank();const {data:rows,error}=await db.from('essay_ai_sessions').select('*').eq('question_bank_id',data.bankId).eq('question_scope',bank).order('created_at',{ascending:false}).limit(50);if(error)throw error;const itemMap=new Map(data.items.map(x=>[String(x.id),x]));const chMap=new Map(data.ch.map(x=>[String(x.id),x]));const topicMap=new Map(data.topics.map(x=>[String(x.id),x]));const html=`<div class="essay-ai-session-list">${(rows||[]).map(s=>{const src=itemMap.get(String(s.source_question_id||''));return `<article class="essay-ai-session"><div><b>${s.generation_type==='variant'?'AI nhân bản':'AI tạo câu hỏi'}${src?` · từ ${h(displayCode(src))}`:''}</b><div class="essay-ai-session-tags"><span class="badge">${h(chMap.get(String(s.chapter_id))?.name||'—')}</span>${s.topic_id?`<span class="badge">${h(topicMap.get(String(s.topic_id))?.name||'—')}</span>`:''}<span class="badge">${s.generated_count} câu</span>${s.model?`<span class="badge">${h(s.model)}</span>`:''}</div></div><small>${new Date(s.created_at).toLocaleString('vi-VN')}</small></article>`}).join('')||'<div class="empty"><b>Chưa có phiên AI</b><span>Các lần AI tạo câu hoặc nhân bản trong khu này sẽ xuất hiện tại đây.</span></div>'}</div>`;openDrawer?.('Phiên AI tự luận',html,null,{wide:true,eyebrow:bankLabel(bank).toUpperCase()})}catch(e){typeof err==='function'?err(e):notify(String(e?.message||e),true)}
}
async function logCreatedAiDraft(form){
 if(!form||form.dataset.aiGenerated!=='true'||form.dataset.aiSessionState)return;form.dataset.aiSessionState='pending';
 try{const data=await loadData();const rawScope=form.querySelector('input[name="question_scope"]:checked')?.value||currentBank();const scope=rawScope==='secure_exam'?'secure_exam':rawScope==='practice'?'practice':currentBank();const cloTotals={};$$q('.essay-rubric-row',form).forEach(row=>{const clo=$q('[data-rubric-clo]',row)?.value,pts=num($q('[data-rubric-points]',row)?.value);if(clo&&pts>0)cloTotals[clo]=(cloTotals[clo]||0)+pts});const banner=$q('.essay-ai-draft-banner',form);const model=(banner?.textContent||'').match(/Mô hình:\s*([^·]+)/)?.[1]?.trim()||null;const {error}=await db.from('essay_ai_sessions').insert({question_bank_id:data.bankId,question_scope:scope,generation_type:'create',chapter_id:form.elements.chapter_id?.value||null,topic_id:form.elements.topic_id?.value||null,specification:{essay_kind:form.elements.essay_kind?.value,difficulty:form.elements.difficulty?.value,clo_points:cloTotals},model,generated_count:1,created_by:state.user.id});if(error)throw error;form.dataset.aiSessionState='logged';banner?.setAttribute('data-session-state','logged')}catch(e){form.dataset.aiSessionState='';console.warn('Không ghi được phiên AI tự luận',e)}
}

function sourceCloneHtml(item,data){const ch=data.ch.find(x=>String(x.id)===String(item.chapter_id)),topic=data.topics.find(x=>String(x.id)===String(item.topic_id));const chips=cloSummary(item,data.clos).map(x=>`<span class="badge">${h(x.clo.code)} ${fmt(x.points)}đ</span>`).join('');return `<section class="essay-clone-source"><h4>${h(displayCode(item))} · ${fmt(item.max_points)} điểm</h4><div class="detail-meta"><span class="badge">${h(ch?.name||'—')}</span>${topic?`<span class="badge">${h(topic.name)}</span>`:''}${chips}</div><p>${h(item.content)}</p></section>`}
async function openEssayClone(item,data){
 const scope=currentBank();questionWorkspace?.(`AI nhân bản ${displayCode(item)}`,'Giữ nguyên tổng điểm và phân bố điểm CLO của câu gốc; AI chỉ thay đề bài, dữ kiện, lời giải và mô tả rubric.',`<div>${sourceCloneHtml(item,data)}<section class="essay-clone-config"><div class="essay-clone-config-grid"><label class="field">Số câu<input id="essayCloneCount" type="number" min="1" max="10" step="1" value="3"></label><label class="field">Mức biến đổi<select id="essayCloneVariation"><option value="close">Gần câu gốc</option><option value="balanced" selected>Vừa phải</option><option value="strong">Biến đổi mạnh</option></select></label><label class="field wide">Yêu cầu thêm<textarea id="essayCloneRequirements" rows="3" placeholder="Ví dụ: thay hàm số; hệ số nguyên; không dùng máy tính..."></textarea></label></div><div class="essay-clone-preserve"><b>Giữ cố định:</b> ${fmt(item.max_points)} điểm · ${cloSummary(item,data.clos).map(x=>`${h(x.clo.code)} ${fmt(x.points)}đ`).join(' · ')} · nơi lưu ${h(bankLabel(scope))}.</div><div class="form-actions"><button id="essayCloneCancel" class="secondary" type="button">Hủy</button><button id="essayCloneGenerate" class="primary" type="button">✦ AI tạo câu nhân bản</button></div></section></div>`);
 $q('#essayCloneCancel')?.addEventListener('click',async()=>{state.view='questions';await render?.()});
 $q('#essayCloneGenerate')?.addEventListener('click',async()=>{const btn=$q('#essayCloneGenerate'),count=Math.max(1,Math.min(10,num($q('#essayCloneCount')?.value)||3)),variation=$q('#essayCloneVariation')?.value||'balanced',additional_requirements=String($q('#essayCloneRequirements')?.value||'').trim();btn.disabled=true;btn.textContent='AI đang tạo…';try{const {data:result,error}=await db.functions.invoke('generate-essay-variants',{body:{source_question_id:item.id,question_scope:scope,count,variation,additional_requirements}});if(error)throw error;if(!result?.success)throw new Error(result?.error||'AI chưa tạo được câu nhân bản.');await db.from('essay_ai_sessions').insert({question_bank_id:data.bankId,question_scope:scope,generation_type:'variant',source_question_id:item.id,chapter_id:item.chapter_id,topic_id:item.topic_id,specification:{count,variation,additional_requirements,max_points:item.max_points,clo_points:Object.fromEntries(cloSummary(item,data.clos).map(x=>[x.clo.id,x.points]))},model:result.model||null,generated_count:(result.variants||[]).length,created_by:state.user.id});const variants=(result.variants||[]).map(v=>({...v,_status:'pending'}));if(!variants.length)throw new Error('AI chưa trả về biến thể.');showVariantReview(item,data,variants,0,scope,result.model||'Gemini')}catch(e){typeof err==='function'?err(e):notify(String(e?.message||e),true);btn.disabled=false;btn.textContent='✦ AI tạo câu nhân bản'}});
}
function pendingIndex(variants,start){for(let i=start+1;i<variants.length;i++)if(variants[i]._status==='pending')return i;for(let i=0;i<=start;i++)if(variants[i]._status==='pending')return i;return -1}
function readVariantEditor(v){v.content=String($q('#essayVariantContent')?.value||'').trim();v.solution=String($q('#essayVariantSolution')?.value||'').trim();$$q('[data-variant-part]').forEach((partEl,pi)=>{if(!v.parts[pi])return;v.parts[pi].label=String($q('[data-variant-label]',partEl)?.value||'').trim();v.parts[pi].content=String($q('[data-variant-content]',partEl)?.value||'').trim();$$q('[data-variant-criterion]',partEl).forEach((input,ri)=>{if(v.parts[pi].rubrics?.[ri])v.parts[pi].rubrics[ri].criterion=String(input.value||'').trim()})});return v}
function variantPartsHtml(v,data){return (v.parts||[]).map((part,pi)=>`<section class="essay-variant-part" data-variant-part="${pi}"><label class="field">Nhãn ý<input data-variant-label value="${h(part.label||'')}"></label><label class="field">Nội dung ý<textarea data-variant-content>${h(part.content||'')}</textarea></label>${(part.rubrics||[]).map((r,ri)=>{const clo=data.clos.find(c=>String(c.id)===String(r.clo_id));return `<div class="essay-variant-rubric-row"><label class="field">Tiêu chí<input data-variant-criterion="${ri}" value="${h(r.criterion||'')}"></label><div class="essay-variant-fixed">${fmt(r.points)} điểm</div><div class="essay-variant-fixed">${h(clo?.code||'CLO')}</div></div>`}).join('')}</section>`).join('')}
function showVariantReview(source,data,variants,pos,scope,model){
 const v=variants[pos];const saved=variants.filter(x=>x._status==='saved').length,skipped=variants.filter(x=>x._status==='skipped').length;questionWorkspace?.('Duyệt câu AI nhân bản',`Câu ${pos+1}/${variants.length} · Đã lưu ${saved} · Bỏ qua ${skipped}`,`<div class="essay-variant-review"><div class="detail-meta"><span class="badge">Từ ${h(displayCode(source))}</span><span class="badge">${h(bankLabel(scope))}</span><span class="badge">${h(model||'Gemini')}</span><span class="badge">${fmt(source.max_points)} điểm</span></div><section class="essay-variant-editor"><label class="field">Đề bài<textarea id="essayVariantContent" rows="5">${h(v.content)}</textarea></label><label class="field">Lời giải<textarea id="essayVariantSolution" rows="6">${h(v.solution)}</textarea></label>${variantPartsHtml(v,data)}</section><div class="essay-variant-actions"><button id="essayVariantSkip" class="danger" type="button">Bỏ qua</button><div><button id="essayVariantSave" class="primary" type="button">Duyệt & lưu bản nháp</button></div></div></div>`);renderMath?.($q('.essay-variant-review'));
 $q('#essayVariantSkip').onclick=async()=>{readVariantEditor(v);v._status='skipped';const next=pendingIndex(variants,pos);if(next>=0)return showVariantReview(source,data,variants,next,scope,model);notify(`Đã duyệt xong: lưu ${variants.filter(x=>x._status==='saved').length}, bỏ qua ${variants.filter(x=>x._status==='skipped').length}.`);state.view='questions';await render?.()};
 $q('#essayVariantSave').onclick=async()=>{readVariantEditor(v);if(!v.content||!v.solution)return notify('Cần có đề bài và lời giải trước khi lưu.',true);for(const part of v.parts||[])for(const r of part.rubrics||[])if(!r.criterion)return notify('Mỗi rubric cần có mô tả tiêu chí.',true);const btn=$q('#essayVariantSave');btn.disabled=true;btn.textContent='Đang lưu…';try{const {error}=await db.rpc('save_essay_question',{p_question_id:null,p_question_bank_id:data.bankId,p_chapter_id:source.chapter_id,p_topic_id:source.topic_id||null,p_content:v.content,p_solution:v.solution,p_essay_kind:source.essay_kind,p_difficulty:source.difficulty,p_question_scope:scope,p_approval_status:'draft',p_parts:v.parts});if(error)throw error;v._status='saved';const next=pendingIndex(variants,pos);if(next>=0)return showVariantReview(source,data,variants,next,scope,model);notify(`Đã duyệt xong: lưu ${variants.filter(x=>x._status==='saved').length}, bỏ qua ${variants.filter(x=>x._status==='skipped').length}.`);state.view='questions';await render?.()}catch(e){typeof err==='function'?err(e):notify(String(e?.message||e),true);btn.disabled=false;btn.textContent='Duyệt & lưu bản nháp'}};
}

async function enhanceDetail(){
 const detail=$q('#essayDetail');if(!detail||detail.dataset.essayToolsEnhanced==='1')return;detail.dataset.essayToolsEnhanced='1';
 try{const data=await loadData();let item=data.items.find(x=>String(x.id)===String(lastEssayId||''));if(!item){const title=$q('.question-workspace .workspace-head h3')?.textContent||'';const old=title.match(/TL-([A-F0-9]{6})/i)?.[1]?.toUpperCase();if(old)item=data.items.find(x=>String(x.id).replaceAll('-','').slice(0,6).toUpperCase()===old)}if(!item)return;lastEssayId=item.id;const heading=$q('.question-workspace .workspace-head h3');if(heading)heading.textContent=`${displayCode(item)} · Chi tiết tự luận`;const actions=$q('.question-detail-actions',detail);if(actions&&!$q('#essayAiCloneQuestion',actions)){const btn=document.createElement('button');btn.id='essayAiCloneQuestion';btn.type='button';btn.className='secondary';btn.textContent='✦ AI nhân bản';btn.onclick=()=>openEssayClone(item,data);const edit=$q('#editEssayQuestion',actions);if(edit)actions.insertBefore(btn,edit);else actions.appendChild(btn)}}catch(e){console.warn('Không tăng cường được chi tiết tự luận',e)}
}

async function enhanceList(){
 if(!isEssayList())return;try{const data=await loadData();decorateCodes(data)}catch(e){console.warn('Không cập nhật được mã tự luận',e)}ensurePrimaryActions();ensureSearchAndFilter();ensureSelectionAction();
}
async function enhance(){ensureStyle();await enhanceList();await enhanceDetail();const form=$q('#essayForm[data-ai-generated="true"]');if(form)logCreatedAiDraft(form)}
function queueEnhance(){if(enhanceQueued)return;enhanceQueued=true;requestAnimationFrame(async()=>{enhanceQueued=false;await enhance()})}

document.addEventListener('click',e=>{const target=e.target.closest?.('[data-essay-detail],[data-essay-edit]');if(target)lastEssayId=target.dataset.essayDetail||target.dataset.essayEdit||lastEssayId;const bank=e.target.closest?.('[data-essay-bank]');if(bank){selectionMode=false;selectedIds.clear()}},true);
document.addEventListener('DOMContentLoaded',()=>{ensureStyle();enhance();const host=$q('#content');if(host)new MutationObserver(queueEnhance).observe(host,{childList:true,subtree:true})});

window.AICLO_ESSAY_TOOLS_V1272=Object.freeze({version:'12.7.2',openMatrix:openEssayMatrix,openDuplicates:openEssayDuplicates,openSessions:openAiSessions,openClone:openEssayClone});
})();
