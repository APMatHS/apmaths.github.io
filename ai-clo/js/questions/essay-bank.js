/* AI-CLO PTITHCM V12.7 — Essay question bank.
   Additive module: legacy MCQ renderer and MCQ tables remain untouched. */
(() => {
'use strict';

if (window.AICLO_ESSAY_BANK_V127) return;

const legacyQuestions = window.questions;
let activeKind = 'mcq';
let essayBank = null;
let lastSubject = null;
let filters = { search:'', chapter:'all', topic:'all', clo:'all', kind:'all', difficulty:'all', approval:'all' };

const h = value => {
  if (typeof esc === 'function') return esc(value == null ? '' : String(value));
  return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
};
const currentBank = () => window.AICLO_V105?.activeBank?.() || 'practice';
const currentBankId = () => window.AICLO_QUESTION_BANK_OWNERSHIP?.currentBankId?.() || null;
const isAdmin = () => state?.profile?.role === 'admin';
const canManage = qx => !!qx && (isAdmin() || String(qx.created_by||'') === String(state?.user?.id||''));
const scopeInBank = (scope, bank) => bank === 'secure_exam'
  ? scope === 'secure_exam' || scope === 'both'
  : scope === 'practice' || scope === 'both';
const scopeLabel = scope => scope === 'secure_exam' ? 'Đề thi - bảo mật' : scope === 'both' ? 'Cả hai ngân hàng' : 'Luyện tập - kiểm tra';
const approvalLabel = value => ({draft:'Bản nháp',pending:'Chờ duyệt',approved:'Đã duyệt',archived:'Lưu trữ'})[value] || value || '—';
const essayKindLabel = value => ({theory:'Lý thuyết',exercise:'Bài tập',mixed:'Hỗn hợp'})[value] || value || '—';
const difficultyLabel = value => ({easy:'Dễ',medium:'Trung bình',hard:'Khó'})[value] || value || '—';
const codeOf = qx => `TL-${String(qx?.id||'').replaceAll('-','').slice(0,6).toUpperCase() || 'MỚI'}`;
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const fmt = value => {
  const n = num(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/,'').replace(/\.$/,'');
};
const renderApp = () => typeof render === 'function' ? render() : Promise.resolve();

function storageKey(){ return `ai-clo:essay-bank:v12.7:${state?.user?.id||'user'}:${state?.subjectId||'subject'}:kind`; }
function syncSubjectKind(){
  const sid = String(state?.subjectId||'');
  if (sid === lastSubject) return;
  lastSubject = sid;
  try { activeKind = sessionStorage.getItem(storageKey()) === 'essay' ? 'essay' : 'mcq'; } catch { activeKind = 'mcq'; }
  essayBank = currentBank();
}
function setKind(kind){
  activeKind = kind === 'essay' ? 'essay' : 'mcq';
  try { sessionStorage.setItem(storageKey(), activeKind); } catch {}
}

function kindTabs(active){
  return `<div class="essay-kind-tabs" role="tablist" aria-label="Loại câu hỏi">
    <button type="button" class="essay-kind-tab ${active==='mcq'?'active':''}" data-question-kind="mcq">Trắc nghiệm</button>
    <button type="button" class="essay-kind-tab ${active==='essay'?'active':''}" data-question-kind="essay">Tự luận</button>
  </div>`;
}

function bindKindTabs(root){
  root.querySelectorAll('[data-question-kind]').forEach(button => {
    button.onclick = async () => {
      const next = button.dataset.questionKind === 'essay' ? 'essay' : 'mcq';
      if (next === activeKind) return;
      if (next === 'essay') essayBank = currentBank();
      setKind(next);
      await renderApp();
    };
  });
}

function injectKindTabs(root){
  const outer = root.querySelector('.v105-bank-tabs');
  if (!outer) return;
  let tabs = root.querySelector('.essay-kind-tabs');
  if (!tabs) {
    outer.insertAdjacentHTML('afterend', kindTabs('mcq'));
    tabs = root.querySelector('.essay-kind-tabs');
  }
  tabs.querySelectorAll('[data-question-kind]').forEach(button => button.classList.toggle('active', button.dataset.questionKind === 'mcq'));
  bindKindTabs(root);
}

function normalizeNested(items){
  for (const qx of items || []) {
    qx.essay_question_parts = (qx.essay_question_parts || []).slice().sort((a,b) => num(a.order_index)-num(b.order_index));
    for (const part of qx.essay_question_parts) {
      part.essay_rubric_items = (part.essay_rubric_items || []).slice().sort((a,b) => num(a.order_index)-num(b.order_index));
    }
  }
  return items || [];
}
function rubricsOf(qx){ return (qx?.essay_question_parts || []).flatMap(part => part.essay_rubric_items || []); }
function cloSummary(qx, clos){
  const totals = new Map();
  let total = 0;
  for (const row of rubricsOf(qx)) {
    const pts = num(row.points); total += pts;
    totals.set(String(row.clo_id), (totals.get(String(row.clo_id)) || 0) + pts);
  }
  return {
    total,
    rows: (clos || []).map(clo => {
      const points = totals.get(String(clo.id)) || 0;
      return {clo, points, percent: total > 0 ? points * 100 / total : 0};
    }).filter(x => x.points > 0)
  };
}
function cloSummaryInline(qx, clos){
  const s = cloSummary(qx, clos);
  if (!s.rows.length) return '<span class="hint">Chưa có rubric</span>';
  return s.rows.map(x => `<span class="essay-clo-chip"><b>${h(x.clo.code)}</b> ${fmt(x.points)}đ · ${Math.round(x.percent)}%</span>`).join('');
}

async function loadEssayData(){
  const bankId = currentBankId();
  if (!bankId) throw new Error('Chưa xác định được ngân hàng câu hỏi của học phần hiện tại.');
  const [questionsRes, chaptersRes, topicsRes, closRes] = await Promise.all([
    db.from('essay_questions').select('*, essay_question_parts(*, essay_rubric_items(*))').eq('question_bank_id', bankId).order('created_at',{ascending:false}),
    db.from('chapters').select('*').eq('question_bank_id', bankId).order('order_index'),
    db.from('topics').select('*').eq('question_bank_id', bankId).order('order_index'),
    db.from('clos').select('*').eq('question_bank_id', bankId).order('code')
  ]);
  for (const result of [questionsRes,chaptersRes,topicsRes,closRes]) if (result.error) throw result.error;
  const items = normalizeNested(questionsRes.data || []);
  const creatorIds = [...new Set(items.map(x => x.created_by).filter(Boolean))];
  let profiles = [];
  if (creatorIds.length) {
    const profileRes = await db.from('profiles').select('id,full_name,email').in('id',creatorIds);
    if (!profileRes.error) profiles = profileRes.data || [];
  }
  return {bankId, items, ch:chaptersRes.data||[], topics:topicsRes.data||[], clos:closRes.data||[], profiles};
}

function migrationErrorHtml(ex){
  const text = String(ex?.message || ex || '');
  const schemaMissing = /essay_questions|save_essay_question|relation .* does not exist|schema cache/i.test(text);
  return `<div class="panel essay-migration-panel">
    <h3>${schemaMissing ? 'Cần cập nhật cơ sở dữ liệu cho ngân hàng tự luận' : 'Chưa tải được ngân hàng tự luận'}</h3>
    <p>${schemaMissing ? 'Phần trắc nghiệm vẫn hoạt động bình thường. Hãy chạy migration V12.7 cho ngân hàng tự luận rồi tải lại trang.' : h(text)}</p>
  </div>`;
}

function bankTabs(items){
  const practiceCount = items.filter(x => scopeInBank(x.question_scope,'practice')).length;
  const secureCount = items.filter(x => scopeInBank(x.question_scope,'secure_exam')).length;
  return `<div class="v105-bank-tabs essay-main-bank-tabs" role="tablist" aria-label="Loại ngân hàng câu hỏi">
    <button type="button" class="v105-bank-tab ${essayBank==='practice'?'active':''}" data-essay-bank="practice"><span>Luyện tập - kiểm tra</span><b>${practiceCount}</b></button>
    <button type="button" class="v105-bank-tab secure ${essayBank==='secure_exam'?'active':''}" data-essay-bank="secure_exam"><span>🔒 Đề thi - bảo mật</span><b>${secureCount}</b></button>
  </div>`;
}

function bankNote(){
  return essayBank === 'secure_exam'
    ? `<b>🔒 Tự luận · Đề thi - bảo mật</b><span>Câu tự luận tại đây dành cho đề chính thức. Tỷ lệ CLO được tính từ điểm rubric.</span>`
    : `<b>Tự luận · Luyện tập - kiểm tra</b><span>Mỗi câu có thể chứa nhiều CLO; hệ thống tính tỷ lệ CLO từ các tiêu chí chấm và số điểm tương ứng.</span>`;
}

function topicOptions(data, chapterId, selected='all', includeAll=true){
  const allowed = chapterId === 'all' ? data.topics : data.topics.filter(t => String(t.chapter_id) === String(chapterId));
  return `${includeAll?'<option value="all">Tất cả chủ đề</option>':''}${allowed.map(t => `<option value="${h(t.id)}" ${String(t.id)===String(selected)?'selected':''}>${h(t.name)}</option>`).join('')}`;
}

function filteredItems(data){
  const search = String(filters.search||'').trim().toLowerCase();
  return data.items.filter(qx => {
    if (!scopeInBank(qx.question_scope, essayBank)) return false;
    if (search && !String(qx.content||'').toLowerCase().includes(search) && !codeOf(qx).toLowerCase().includes(search)) return false;
    if (filters.chapter !== 'all' && String(qx.chapter_id) !== String(filters.chapter)) return false;
    if (filters.topic !== 'all' && String(qx.topic_id||'') !== String(filters.topic)) return false;
    if (filters.clo !== 'all' && !rubricsOf(qx).some(r => String(r.clo_id) === String(filters.clo))) return false;
    if (filters.kind !== 'all' && qx.essay_kind !== filters.kind) return false;
    if (filters.difficulty !== 'all' && qx.difficulty !== filters.difficulty) return false;
    if (filters.approval !== 'all' && qx.approval_status !== filters.approval) return false;
    return true;
  });
}

function listRows(data, items){
  if (!items.length) return '<tr><td colspan="6" class="empty">Không có câu tự luận phù hợp.</td></tr>';
  return items.map(qx => {
    const chapter = data.ch.find(x => String(x.id) === String(qx.chapter_id));
    const topic = data.topics.find(x => String(x.id) === String(qx.topic_id));
    return `<tr>
      <td class="q-code-cell"><button class="question-code" data-essay-detail="${h(qx.id)}">${h(codeOf(qx))}</button>${essayBank==='secure_exam'?'<span class="secure-lock">🔒</span>':''}<br><span class="badge">${h(essayKindLabel(qx.essay_kind))}</span></td>
      <td class="q-content-cell"><button class="question-summary" data-essay-detail="${h(qx.id)}">${h(qx.content)}</button></td>
      <td class="q-structure-cell"><b>${h(chapter?.name||'—')}</b><small>${h(topic?.name||'Chưa gán chủ đề')}</small></td>
      <td class="essay-weight-cell"><b>${fmt(qx.max_points)} điểm</b><div class="essay-clo-chips">${cloSummaryInline(qx,data.clos)}</div></td>
      <td class="q-class-cell"><span class="badge">${h(difficultyLabel(qx.difficulty))}</span><br><span class="badge ${qx.approval_status==='approved'?'green':'red'}">${h(approvalLabel(qx.approval_status))}</span></td>
      <td class="row-actions"><button data-essay-detail="${h(qx.id)}">Chi tiết</button>${canManage(qx)?`<button data-essay-edit="${h(qx.id)}">Sửa</button>`:''}</td>
    </tr>`;
  }).join('');
}

async function renderEssayBank(c){
  if (typeof canTeach === 'function' && !canTeach()) { c.innerHTML='<div class="panel">Sinh viên không được truy cập ngân hàng câu hỏi.</div>'; return; }
  if (!state.subjectId) { c.innerHTML='<div class="empty"><b>Chưa chọn học phần</b><span>Hãy chọn học phần trước.</span></div>'; return; }
  essayBank = essayBank || currentBank();
  let data;
  try { data = await loadEssayData(); }
  catch (ex) { c.innerHTML = `${kindTabs('essay')}${migrationErrorHtml(ex)}`; bindKindTabs(c); return; }

  const list = filteredItems(data);
  const bankTotal = data.items.filter(x => scopeInBank(x.question_scope,essayBank)).length;
  c.innerHTML = `${bankTabs(data.items)}${kindTabs('essay')}
    <div class="v105-bank-note essay-bank-note">${bankNote()}</div>
    <div class="essay-question-tools">
      <input id="essaySearch" placeholder="Tìm theo mã hoặc nội dung…" value="${h(filters.search)}">
      <select id="essayChapter"><option value="all">Tất cả chương</option>${data.ch.map(x=>`<option value="${h(x.id)}" ${String(x.id)===String(filters.chapter)?'selected':''}>${h(x.order_index)}. ${h(x.name)}</option>`).join('')}</select>
      <select id="essayTopic">${topicOptions(data,filters.chapter,filters.topic,true)}</select>
      <select id="essayClo"><option value="all">Tất cả CLO</option>${data.clos.map(x=>`<option value="${h(x.id)}" ${String(x.id)===String(filters.clo)?'selected':''}>${h(x.code)}</option>`).join('')}</select>
      <select id="essayKind"><option value="all">Mọi dạng</option><option value="theory" ${filters.kind==='theory'?'selected':''}>Lý thuyết</option><option value="exercise" ${filters.kind==='exercise'?'selected':''}>Bài tập</option><option value="mixed" ${filters.kind==='mixed'?'selected':''}>Hỗn hợp</option></select>
      <select id="essayDifficulty"><option value="all">Mọi độ khó</option><option value="easy" ${filters.difficulty==='easy'?'selected':''}>Dễ</option><option value="medium" ${filters.difficulty==='medium'?'selected':''}>Trung bình</option><option value="hard" ${filters.difficulty==='hard'?'selected':''}>Khó</option></select>
      <select id="essayApproval"><option value="all">Mọi trạng thái</option><option value="draft" ${filters.approval==='draft'?'selected':''}>Bản nháp</option><option value="pending" ${filters.approval==='pending'?'selected':''}>Chờ duyệt</option><option value="approved" ${filters.approval==='approved'?'selected':''}>Đã duyệt</option><option value="archived" ${filters.approval==='archived'?'selected':''}>Lưu trữ</option></select>
    </div>
    <div class="toolbar essay-bank-actions"><span class="hint">Hiển thị ${list.length}/${bankTotal} câu tự luận</span><button id="addEssayQuestion" class="primary">+ Thêm câu tự luận</button></div>
    <div class="panel table-wrap question-table essay-question-table"><table><thead><tr><th>Mã câu</th><th>Nội dung</th><th>Chương · Chủ đề</th><th>Điểm · CLO</th><th>Phân loại</th><th></th></tr></thead><tbody id="essayRows">${listRows(data,list)}</tbody></table></div>`;

  bindKindTabs(c);
  c.querySelectorAll('[data-essay-bank]').forEach(button => button.onclick = async () => { essayBank = button.dataset.essayBank; await renderApp(); });
  const redraw = async () => { await renderEssayBank(c); };
  $('#essaySearch').oninput = e => { filters.search=e.target.value; clearTimeout(e.target._timer); e.target._timer=setTimeout(redraw,180); };
  $('#essayChapter').onchange = async e => { filters.chapter=e.target.value; filters.topic='all'; await redraw(); };
  $('#essayTopic').onchange = async e => { filters.topic=e.target.value; await redraw(); };
  $('#essayClo').onchange = async e => { filters.clo=e.target.value; await redraw(); };
  $('#essayKind').onchange = async e => { filters.kind=e.target.value; await redraw(); };
  $('#essayDifficulty').onchange = async e => { filters.difficulty=e.target.value; await redraw(); };
  $('#essayApproval').onchange = async e => { filters.approval=e.target.value; await redraw(); };
  $('#addEssayQuestion').onclick = () => openEssayForm(null,data);
  $('#essayRows').onclick = e => {
    const detail = e.target.closest('[data-essay-detail]');
    const edit = e.target.closest('[data-essay-edit]');
    const id = detail?.dataset.essayDetail || edit?.dataset.essayEdit;
    if (!id) return;
    const item = data.items.find(x => String(x.id) === String(id));
    if (edit) openEssayForm(item,data); else openEssayDetail(item,data);
  };
  if (typeof renderMath === 'function') renderMath(c);
}

function scopeChooser(value='practice'){
  value = ['practice','secure_exam','both'].includes(value) ? value : 'practice';
  return `<fieldset class="essay-scope-chooser wide"><legend>Nơi lưu câu hỏi</legend><div class="essay-scope-options">
    <label><input type="radio" name="question_scope" value="practice" ${value==='practice'?'checked':''}><span><b>Luyện tập - kiểm tra</b><small>Dùng cho luyện tập và kiểm tra.</small></span></label>
    <label><input type="radio" name="question_scope" value="secure_exam" ${value==='secure_exam'?'checked':''}><span><b>🔒 Đề thi - bảo mật</b><small>Dùng cho đề chính thức.</small></span></label>
    <label><input type="radio" name="question_scope" value="both" ${value==='both'?'checked':''}><span><b>Cả hai</b><small>Xuất hiện ở cả hai ngân hàng.</small></span></label>
  </div></fieldset>`;
}

function initialParts(item, data){
  if (item?.essay_question_parts?.length) return item.essay_question_parts.map(part => ({
    label:part.label||'', content:part.content||'', rubrics:(part.essay_rubric_items||[]).map(r=>({criterion:r.criterion||'',points:fmt(r.points),clo_id:r.clo_id||data.clos[0]?.id||''}))
  }));
  return [{label:'',content:'',rubrics:[{criterion:'',points:'',clo_id:data.clos[0]?.id||''}]}];
}

function partHtml(part,index,data,totalParts){
  return `<section class="essay-part-card" data-part-index="${index}">
    <div class="essay-part-head"><div><b>${totalParts===1 && !part.label ? 'Toàn câu' : `Ý / phần ${index+1}`}</b><small>Rubric của phần này có thể trải trên nhiều CLO.</small></div><button type="button" class="secondary compact" data-remove-part="${index}" ${totalParts===1?'disabled':''}>Xóa phần</button></div>
    <div class="essay-part-meta"><label class="field">Nhãn ý (không bắt buộc)<input data-part-label value="${h(part.label||'')}" placeholder="a), b), ..."></label><label class="field wide">Nội dung ý (không bắt buộc)<textarea data-part-content placeholder="Để trống nếu rubric áp dụng cho toàn câu">${h(part.content||'')}</textarea></label></div>
    <div class="essay-rubric-list">${(part.rubrics||[]).map((r,ri)=>rubricHtml(r,index,ri,data)).join('')}</div>
    <button type="button" class="secondary compact" data-add-rubric="${index}">+ Thêm tiêu chí chấm</button>
  </section>`;
}
function rubricHtml(r,partIndex,rubricIndex,data){
  return `<div class="essay-rubric-row" data-rubric-index="${rubricIndex}">
    <label class="field rubric-criterion">Tiêu chí chấm<input data-rubric-criterion value="${h(r.criterion||'')}" placeholder="Ví dụ: Thiết lập đúng công thức"></label>
    <label class="field rubric-points">Điểm<input data-rubric-points type="number" min="0.01" step="0.01" value="${h(r.points||'')}"></label>
    <label class="field rubric-clo">CLO<select data-rubric-clo>${data.clos.map(clo=>`<option value="${h(clo.id)}" ${String(clo.id)===String(r.clo_id)?'selected':''}>${h(clo.code)}</option>`).join('')}</select></label>
    <button type="button" class="danger compact rubric-remove" data-remove-rubric="${partIndex}:${rubricIndex}" aria-label="Xóa tiêu chí">×</button>
  </div>`;
}

function readParts(root){
  return [...root.querySelectorAll('.essay-part-card')].map(part => ({
    label:part.querySelector('[data-part-label]')?.value?.trim()||'',
    content:part.querySelector('[data-part-content]')?.value?.trim()||'',
    rubrics:[...part.querySelectorAll('.essay-rubric-row')].map(row=>({
      criterion:row.querySelector('[data-rubric-criterion]')?.value?.trim()||'',
      points:row.querySelector('[data-rubric-points]')?.value||'',
      clo_id:row.querySelector('[data-rubric-clo]')?.value||''
    }))
  }));
}
function formSummary(root,data){
  const totals = new Map(); let total=0;
  for (const part of readParts(root)) for (const r of part.rubrics) {
    const pts=num(r.points); if (pts<=0) continue; total+=pts; totals.set(String(r.clo_id),(totals.get(String(r.clo_id))||0)+pts);
  }
  const box = root.querySelector('#essayCloLive'); if (!box) return;
  box.innerHTML = `<div><small>Tổng điểm</small><b>${fmt(total)}</b></div>${data.clos.map(clo=>{const pts=totals.get(String(clo.id))||0;const pct=total?pts*100/total:0;return `<div><small>${h(clo.code)}</small><b>${fmt(pts)}đ <span>${total?`${Math.round(pct)}%`:'0%'}</span></b></div>`}).join('')}`;
}

async function openEssayForm(item,data){
  if (item && !canManage(item)) return typeof toast==='function' && toast('Chỉ người tạo hoặc Admin được sửa câu tự luận.',true);
  let parts = initialParts(item,data);
  const title = item ? `Sửa ${codeOf(item)}` : 'Thêm câu tự luận';
  const subtitle = item ? 'Bản hiện tại sẽ được lưu vào lịch sử trước khi cập nhật.' : 'Điểm CLO được tính tự động từ rubric; không nhập tỷ lệ CLO bằng tay.';
  const workspace = typeof questionWorkspace === 'function' ? questionWorkspace : (t,s,html)=>{ $('#content').innerHTML=html; };
  workspace(title,subtitle,`<div class="essay-edit-page"><form id="essayForm" class="form-grid">
    <label class="field wide">Nội dung câu hỏi<textarea name="content" required>${h(item?.content||'')}</textarea></label>
    <label class="field">Chương<select name="chapter_id" id="essayFormChapter" required>${data.ch.map(v=>`<option value="${h(v.id)}" ${String(v.id)===String(item?.chapter_id||data.ch[0]?.id)?'selected':''}>${h(v.name)}</option>`).join('')}</select></label>
    <label class="field">Chủ đề<select name="topic_id" id="essayFormTopic"><option value="">Không gán chủ đề</option></select></label>
    <label class="field">Dạng câu<select name="essay_kind"><option value="theory" ${item?.essay_kind==='theory'?'selected':''}>Lý thuyết</option><option value="exercise" ${!item||item?.essay_kind==='exercise'?'selected':''}>Bài tập</option><option value="mixed" ${item?.essay_kind==='mixed'?'selected':''}>Hỗn hợp</option></select></label>
    <label class="field">Độ khó<select name="difficulty"><option value="easy" ${item?.difficulty==='easy'?'selected':''}>Dễ</option><option value="medium" ${!item||item?.difficulty==='medium'?'selected':''}>Trung bình</option><option value="hard" ${item?.difficulty==='hard'?'selected':''}>Khó</option></select></label>
    <label class="field">Trạng thái duyệt<select name="approval_status"><option value="draft">Bản nháp</option><option value="pending" ${item?.approval_status==='pending'?'selected':''}>Chờ duyệt</option><option value="approved" ${item?.approval_status==='approved'?'selected':''}>Đã duyệt</option><option value="archived" ${item?.approval_status==='archived'?'selected':''}>Lưu trữ</option></select></label>
    ${scopeChooser(item?.question_scope||essayBank||'practice')}
    <label class="field wide">Lời giải / hướng dẫn giải<textarea name="solution" rows="5">${h(item?.solution||'')}</textarea></label>
    <section class="wide essay-rubric-editor"><div class="essay-editor-title"><div><h4>Cấu trúc chấm điểm</h4><p>Mỗi tiêu chí có điểm và một CLO chính. Một ý có thể chứa nhiều CLO.</p></div><button id="addEssayPart" type="button" class="secondary">+ Thêm ý / phần</button></div><div id="essayParts"></div></section>
    <aside id="essayCloLive" class="wide essay-clo-live"></aside>
    <div class="form-actions"><button id="cancelEssayEdit" class="secondary" type="button">Hủy</button><button id="saveEssayQuestion" class="primary">Lưu câu tự luận</button></div>
  </form></div>`);
  const form=$('#essayForm'); if(!form) return;
  const partsRoot=$('#essayParts');
  const renderParts=()=>{ partsRoot.innerHTML=parts.map((p,i)=>partHtml(p,i,data,parts.length)).join(''); formSummary(form,data); };
  const capture=()=>{ parts=readParts(partsRoot); };
  const fillTopics=()=>{
    const cid=$('#essayFormChapter').value, selected=item?.topic_id||'';
    const old=$('#essayFormTopic').value;
    $('#essayFormTopic').innerHTML=`<option value="">Không gán chủ đề</option>${topicOptions(data,cid,old||selected,false)}`;
    if(old && [...$('#essayFormTopic').options].some(o=>o.value===old)) $('#essayFormTopic').value=old;
    else if(selected && [...$('#essayFormTopic').options].some(o=>o.value===String(selected))) $('#essayFormTopic').value=String(selected);
  };
  renderParts(); fillTopics();
  $('#essayFormChapter').onchange=fillTopics;
  $('#addEssayPart').onclick=()=>{capture();parts.push({label:'',content:'',rubrics:[{criterion:'',points:'',clo_id:data.clos[0]?.id||''}]});renderParts();};
  partsRoot.onclick=e=>{
    const add=e.target.closest('[data-add-rubric]'), remPart=e.target.closest('[data-remove-part]'), remRubric=e.target.closest('[data-remove-rubric]');
    if(!add&&!remPart&&!remRubric)return;
    capture();
    if(add){const pi=Number(add.dataset.addRubric);parts[pi].rubrics.push({criterion:'',points:'',clo_id:data.clos[0]?.id||''});}
    if(remPart&&parts.length>1)parts.splice(Number(remPart.dataset.removePart),1);
    if(remRubric){const [pi,ri]=remRubric.dataset.removeRubric.split(':').map(Number);if(parts[pi]?.rubrics?.length>1)parts[pi].rubrics.splice(ri,1);else return typeof toast==='function'&&toast('Mỗi phần phải có ít nhất một tiêu chí chấm.',true);}
    renderParts();
  };
  partsRoot.addEventListener('input',()=>formSummary(form,data));
  partsRoot.addEventListener('change',()=>formSummary(form,data));
  $('#cancelEssayEdit').onclick=async()=>{state.view='questions';await renderApp();};
  form.onsubmit=async e=>{
    e.preventDefault();
    const button=$('#saveEssayQuestion');
    const values=Object.fromEntries(new FormData(form));
    const payloadParts=readParts(partsRoot);
    if(!data.clos.length)return typeof toast==='function'&&toast('Học phần chưa có CLO để gắn rubric.',true);
    for(const [pi,part] of payloadParts.entries()){
      if(!part.rubrics.length)return typeof toast==='function'&&toast(`Phần ${pi+1} chưa có tiêu chí chấm.`,true);
      for(const [ri,r] of part.rubrics.entries()){
        if(!r.criterion)return typeof toast==='function'&&toast(`Tiêu chí ${ri+1} của phần ${pi+1} đang trống.`,true);
        if(num(r.points)<=0)return typeof toast==='function'&&toast(`Điểm tiêu chí ${ri+1} của phần ${pi+1} phải lớn hơn 0.`,true);
        if(!r.clo_id)return typeof toast==='function'&&toast('Mỗi tiêu chí phải gắn một CLO.',true);
      }
    }
    button.disabled=true;button.textContent='Đang lưu…';
    try{
      const {data:id,error}=await db.rpc('save_essay_question',{
        p_question_id:item?.id||null,
        p_question_bank_id:data.bankId,
        p_chapter_id:values.chapter_id,
        p_topic_id:values.topic_id||null,
        p_content:String(values.content||'').trim(),
        p_solution:String(values.solution||'').trim(),
        p_essay_kind:values.essay_kind,
        p_difficulty:values.difficulty,
        p_question_scope:values.question_scope,
        p_approval_status:values.approval_status,
        p_parts:payloadParts
      });
      if(error)throw error;
      essayBank=values.question_scope==='secure_exam'?'secure_exam':values.question_scope==='practice'?'practice':essayBank;
      window.logActivity?.(item?'update':'create','essay_question',id,(item?'Cập nhật tự luận: ':'Tạo tự luận: ')+String(values.content||'').slice(0,120));
      if(typeof toast==='function')toast(item?'Đã cập nhật câu tự luận':'Đã tạo câu tự luận');
      state.view='questions';await renderApp();
    }catch(ex){ if(typeof err==='function')err(ex); else console.error(ex); button.disabled=false;button.textContent='Lưu câu tự luận'; }
  };
  if(typeof renderMath==='function')renderMath(form);
}

async function openEssayDetail(item,data){
  if(!item)return;
  const chapter=data.ch.find(x=>String(x.id)===String(item.chapter_id));
  const topic=data.topics.find(x=>String(x.id)===String(item.topic_id));
  const creator=data.profiles.find(x=>String(x.id)===String(item.created_by));
  const summary=cloSummary(item,data.clos);
  const workspace = typeof questionWorkspace === 'function' ? questionWorkspace : (t,s,html)=>{ $('#content').innerHTML=html; };
  workspace(`${codeOf(item)} · Chi tiết tự luận`,'Xem lời giải, rubric, tỷ lệ CLO và lịch sử chỉnh sửa.',`<div class="essay-detail" id="essayDetail">
    <div class="detail-meta"><span class="badge">${h(essayKindLabel(item.essay_kind))}</span><span class="badge">${h(difficultyLabel(item.difficulty))}</span><span class="badge">${h(chapter?.name||'—')}</span><span class="badge">${h(topic?.name||'Chưa gán chủ đề')}</span><span class="badge ${item.question_scope==='secure_exam'?'secure':''}">${h(scopeLabel(item.question_scope))}</span><span class="badge ${item.approval_status==='approved'?'green':'red'}">${h(approvalLabel(item.approval_status))}</span></div>
    <div class="essay-detail-audit"><div><small>Người tạo</small><b>${h(creator?.full_name||creator?.email||'Chưa xác định')}</b></div><div><small>Tổng điểm</small><b>${fmt(summary.total)}</b></div><div><small>Số phần</small><b>${item.essay_question_parts.length}</b></div></div>
    <section class="essay-detail-question"><h4>Đề bài</h4><div>${h(item.content)}</div></section>
    <section class="essay-detail-clo"><h4>Phân bố CLO</h4><div class="essay-clo-chips">${cloSummaryInline(item,data.clos)}</div></section>
    <section class="essay-detail-rubric"><h4>Rubric chấm điểm</h4>${item.essay_question_parts.map((part,pi)=>`<article><header><b>${h(part.label||(`Phần ${pi+1}`))}</b>${part.content?`<span>${h(part.content)}</span>`:''}</header><table><thead><tr><th>Tiêu chí</th><th>CLO</th><th>Điểm</th></tr></thead><tbody>${(part.essay_rubric_items||[]).map(r=>{const clo=data.clos.find(c=>String(c.id)===String(r.clo_id));return `<tr><td>${h(r.criterion)}</td><td>${h(clo?.code||'—')}</td><td>${fmt(r.points)}</td></tr>`}).join('')}</tbody></table></article>`).join('')}</section>
    <section class="essay-detail-solution"><h4>Lời giải / hướng dẫn giải</h4><div>${h(item.solution||'Chưa có lời giải.')}</div></section>
    <section><h4>Lịch sử chỉnh sửa</h4><div id="essayRevisionList"><p class="hint">Đang tải…</p></div></section>
    <div class="account-actions question-detail-actions">${canManage(item)?`<button id="deleteEssayQuestion" class="danger">Xóa câu</button><button id="editEssayQuestion" class="primary">Sửa câu</button>`:'<span class="hint">Chỉ người tạo hoặc Admin được sửa/xóa.</span>'}</div>
  </div>`);
  $('#editEssayQuestion')?.addEventListener('click',()=>openEssayForm(item,data));
  $('#deleteEssayQuestion')?.addEventListener('click',async()=>{
    const ok=typeof confirmAction==='function' ? await confirmAction('Xóa câu tự luận',`Xóa ${codeOf(item)}?`,{confirmLabel:'Xóa',danger:true}) : confirm(`Xóa ${codeOf(item)}?`);
    if(!ok)return;
    const {error}=await db.from('essay_questions').delete().eq('id',item.id);if(error)return typeof err==='function'?err(error):console.error(error);
    if(typeof toast==='function')toast('Đã xóa câu tự luận');state.view='questions';await renderApp();
  });
  try{
    const {data:revisions,error}=await db.from('essay_question_revisions').select('revision_no,changed_at,changed_by').eq('essay_question_id',item.id).order('revision_no',{ascending:false});
    if(error)throw error;
    $('#essayRevisionList').innerHTML=(revisions||[]).map(r=>`<div class="essay-revision-row"><b>Phiên bản ${r.revision_no}</b><span>${new Date(r.changed_at).toLocaleString('vi-VN')}</span></div>`).join('')||'<p class="hint">Chưa có phiên bản cũ.</p>';
  }catch{ $('#essayRevisionList').innerHTML='<p class="hint">Chưa tải được lịch sử.</p>'; }
  if(typeof renderMath==='function')renderMath($('#essayDetail'));
}

window.questions = async function(c){
  syncSubjectKind();
  if(activeKind==='essay') return renderEssayBank(c);
  await legacyQuestions(c);
  if(!c || state.view!=='questions') return;
  if(essayBank && currentBank()!==essayBank){
    const target=c.querySelector(`[data-bank-tab="${essayBank}"]`);
    if(target && !target.classList.contains('active')){ target.click(); return; }
  } else essayBank=currentBank();
  injectKindTabs(c);
};

window.AICLO_ESSAY_BANK_V127 = Object.freeze({
  version:'12.7',
  getKind:()=>activeKind,
  setKind:async kind=>{setKind(kind);await renderApp();},
  openForm:openEssayForm,
  load:loadEssayData
});
})();
