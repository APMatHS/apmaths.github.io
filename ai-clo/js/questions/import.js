/* AI-CLO PTITHCM V12.6.40 — bulk question import/update with owner delegation and revision history. */
(() => {
'use strict';

const MAX_ROWS = 1000;
const OPTION_KEYS = ['A','B','C','D'];
const TEMPLATE_HEADERS = ['Mã câu','Chương','Chủ đề','CLO','Nội dung','A','B','C','D','Đáp án','Lời giải','Ngân hàng','Trạng thái'];
const TEMPLATE_WIDTHS = [14,28,34,10,58,30,30,30,30,10,46,24,16];
const OWNER_STORAGE_KEY = 'aiclo_question_import_owner';

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const normalizeQuestion = value => normalize(value).replace(/[“”‘’]/g, "'");
const safeFileName = value => String(value || 'hoc-phan')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'D')
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 70) || 'hoc-phan';
const isAdmin = () => state?.profile?.role === 'admin';

async function getXLSX() {
  if (window.XLSX) return window.XLSX;
  if (window.AICLO_OFFICE_LIBS?.xlsx) return window.AICLO_OFFICE_LIBS.xlsx();
  throw new Error('Không tải được thư viện Excel.');
}

function activeBank() {
  const bank = window.AICLO_V105?.activeBank?.();
  return ['practice','secure_exam','both'].includes(bank) ? bank : 'practice';
}

function bankLabel(scope) {
  if (scope === 'secure_exam') return 'Đề thi - bảo mật';
  if (scope === 'both') return 'Cả hai';
  return 'Luyện tập - kiểm tra';
}

function readField(row, ...names) {
  for (const name of names) {
    if (row?.[name] != null) return String(row[name]).trim();
  }
  return '';
}

function normalizeCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{1,6}$/.test(raw)) return raw.padStart(6, '0');
  return raw;
}

function parseScope(raw, fallback) {
  const text = String(raw || '').trim();
  const key = normalize(text);
  if (!text) return fallback;
  if (text === 'both' || key.includes('ca hai')) return 'both';
  if (text === 'secure_exam' || key.includes('de thi') || key.includes('bao mat')) return 'secure_exam';
  if (text === 'practice' || key.includes('luyen tap') || key.includes('kiem tra')) return 'practice';
  return null;
}

function parseApproval(raw) {
  const text = String(raw || '').trim();
  const key = normalize(text);
  if (!text || text === 'draft' || key.includes('ban nhap')) return 'draft';
  if (text === 'pending' || key.includes('cho duyet')) return 'pending';
  if (text === 'approved' || key.includes('da duyet')) return 'approved';
  return null;
}

function findChapter(text, chapters) {
  const normalized = normalize(text);
  const numberOnly = String(text || '').replace(/\D/g, '');
  return chapters.find(ch => normalize(ch.name) === normalized)
    || chapters.find(ch => numberOnly && String(ch.order_index) === numberOnly)
    || null;
}

function findTopic(text, chapter, topics) {
  if (!chapter) return null;
  const normalized = normalize(text);
  return topics.find(topic => topic.chapter_id === chapter.id && normalize(topic.name) === normalized) || null;
}

function findClo(text, clos) {
  const code = String(text || '').trim().toUpperCase();
  return clos.find(clo => String(clo.code || '').trim().toUpperCase() === code) || null;
}

function existingByCode(code, items) {
  if (!code) return null;
  return (items || []).find(item => normalizeCode(item.display_code) === code) || null;
}

function parseRow(row, sets, rowNo, fallbackScope) {
  const displayCode = normalizeCode(readField(row, 'Mã câu', 'Ma cau', 'Mã', 'Ma'));
  const existing = existingByCode(displayCode, sets.items || []);
  const chapterText = readField(row, 'Chương', 'Chuong');
  const topicText = readField(row, 'Chủ đề', 'Chu de', 'Chủ đề/Mục', 'Chu de/Muc');
  const cloText = readField(row, 'CLO');
  const chapter = findChapter(chapterText, sets.ch || []);
  const topic = findTopic(topicText, chapter, sets.topics || []);
  const clo = findClo(cloText, sets.clos || []);
  const content = readField(row, 'Nội dung', 'Noi dung');
  const options = Object.fromEntries(OPTION_KEYS.map(key => [key, readField(row, key)]));
  const answerRaw = readField(row, 'Đáp án', 'Dap an').toUpperCase();
  const correctAnswer = OPTION_KEYS.includes(answerRaw) ? answerRaw : '';
  const scope = parseScope(readField(row, 'Ngân hàng', 'Ngan hang', 'Nhóm sử dụng', 'Nhom su dung'), fallbackScope);
  const approval = parseApproval(readField(row, 'Trạng thái', 'Trang thai'));
  const errors = [];

  if (displayCode && !existing) errors.push(`không tìm thấy mã câu ${displayCode}`);
  if (existing && !isAdmin() && String(existing.created_by || '') !== String(state?.user?.id || '')) errors.push('bạn không phải người nhập câu này');
  if (!chapterText) errors.push('thiếu Chương');
  else if (!chapter) errors.push('không tìm thấy Chương');
  if (!topicText) errors.push('thiếu Chủ đề');
  else if (!topic) errors.push('không tìm thấy Chủ đề trong Chương');
  if (!cloText) errors.push('thiếu CLO');
  else if (!clo) errors.push('CLO không hợp lệ');
  if (!content) errors.push('thiếu nội dung');
  OPTION_KEYS.forEach(key => { if (!options[key]) errors.push(`thiếu phương án ${key}`); });
  if (!correctAnswer) errors.push('Đáp án phải là A, B, C hoặc D');
  if (!scope) errors.push('Ngân hàng không hợp lệ');
  if (!approval) errors.push('Trạng thái không hợp lệ');

  return {rowNo,display_code:displayCode,existing,action:existing?'update':'insert',chapter,topic,clo,content,options,correct_answer:correctAnswer,explanation:readField(row,'Lời giải','Loi giai')||null,question_scope:scope||fallbackScope,approval_status:approval||'draft',errors};
}

function flagDuplicates(parsed, existingItems = []) {
  const existingByContent = new Map();
  for (const item of existingItems || []) {
    const key = normalizeQuestion(item.content);
    if (!key) continue;
    if (!existingByContent.has(key)) existingByContent.set(key, []);
    existingByContent.get(key).push(item);
  }
  const seen = new Map();
  parsed.forEach(item => {
    const key = normalizeQuestion(item.content);
    if (!key) return;
    const matches = existingByContent.get(key) || [];
    const otherMatch = matches.some(x => String(x.id || '') !== String(item.existing?.id || ''));
    if (otherMatch) item.errors.push('trùng nội dung với câu khác đã có trong học phần');
    if (seen.has(key)) item.errors.push(`trùng nội dung với dòng ${seen.get(key)}`);
    else seen.set(key, item.rowNo);
  });
}

function setSheetWidths(sheet, widths) { sheet['!cols'] = (widths || []).map(wch => ({wch})); return sheet; }
function templateDataSheet(XLSX) { const sheet=XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS]); setSheetWidths(sheet,TEMPLATE_WIDTHS); sheet['!autofilter']={ref:'A1:M1'}; return sheet; }

async function downloadTemplate(sets) {
  const XLSX=await getXLSX(), fallbackScope=activeBank(), firstChapter=sets.ch?.[0], firstTopic=sets.topics?.find(topic=>topic.chapter_id===firstChapter?.id), firstClo=sets.clos?.[0];
  const sample=[{'Mã câu':'','Chương':firstChapter?.name||'Chương 1','Chủ đề':firstTopic?.name||'Mục 1.1','CLO':firstClo?.code||'CLO1','Nội dung':'Ví dụ: Nội dung câu hỏi','A':'Phương án A','B':'Phương án B','C':'Phương án C','D':'Phương án D','Đáp án':'A','Lời giải':'Giải thích ngắn (không bắt buộc)','Ngân hàng':bankLabel(fallbackScope),'Trạng thái':'Bản nháp'}];
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,templateDataSheet(XLSX),'Cau_hoi');
  const exampleSheet=XLSX.utils.json_to_sheet(sample,{header:TEMPLATE_HEADERS}); setSheetWidths(exampleSheet,TEMPLATE_WIDTHS); XLSX.utils.book_append_sheet(wb,exampleSheet,'Vi_du');
  const chapterTopicRows=[]; for(const chapter of sets.ch||[]) for(const topic of (sets.topics||[]).filter(item=>item.chapter_id===chapter.id)) chapterTopicRows.push({'Chương':chapter.name,'Chủ đề':topic.name});
  const chapterSheet=XLSX.utils.json_to_sheet(chapterTopicRows,{header:['Chương','Chủ đề']}); setSheetWidths(chapterSheet,[32,42]); XLSX.utils.book_append_sheet(wb,chapterSheet,'Chuong_Chu_de');
  const cloSheet=XLSX.utils.json_to_sheet((sets.clos||[]).map(clo=>({'CLO':clo.code,'Mô tả':clo.description||'','Mô tả ngắn':clo.short_description||''})),{header:['CLO','Mô tả','Mô tả ngắn']}); setSheetWidths(cloSheet,[12,58,42]); XLSX.utils.book_append_sheet(wb,cloSheet,'CLO');
  const catalogue=[
    {'Trường':'Mã câu','Giá trị hiển thị':'000079','Giá trị kỹ thuật':'000079','Ghi chú':'Không bắt buộc. Để trống = thêm mới; có mã = cập nhật câu hiện có và lưu revision trước khi sửa.'},
    {'Trường':'Ngân hàng','Giá trị hiển thị':'Luyện tập - kiểm tra','Giá trị kỹ thuật':'practice','Ghi chú':'Dùng cho luyện tập và bài kiểm tra trực tuyến.'},
    {'Trường':'Ngân hàng','Giá trị hiển thị':'Đề thi - bảo mật','Giá trị kỹ thuật':'secure_exam','Ghi chú':'Chỉ dùng cho đề thi cuối kỳ/chính thức.'},
    {'Trường':'Ngân hàng','Giá trị hiển thị':'Cả hai','Giá trị kỹ thuật':'both','Ghi chú':'Xuất hiện ở cả hai ngân hàng.'},
    {'Trường':'Trạng thái','Giá trị hiển thị':'Bản nháp','Giá trị kỹ thuật':'draft','Ghi chú':'Mặc định nếu để trống.'},
    {'Trường':'Trạng thái','Giá trị hiển thị':'Chờ duyệt','Giá trị kỹ thuật':'pending','Ghi chú':'Lưu ở trạng thái chờ duyệt.'},
    {'Trường':'Trạng thái','Giá trị hiển thị':'Đã duyệt','Giá trị kỹ thuật':'approved','Ghi chú':'Lưu ở trạng thái đã duyệt theo quyền hiện tại.'}
  ];
  const catalogueSheet=XLSX.utils.json_to_sheet(catalogue); setSheetWidths(catalogueSheet,[16,28,20,62]); XLSX.utils.book_append_sheet(wb,catalogueSheet,'Danh_muc');
  const guide=[
    {'Mục':'Sheet nhập dữ liệu','Hướng dẫn':'Chỉ nhập câu hỏi tại sheet Cau_hoi. Sheet Vi_du chỉ để tham khảo; không cần xóa.'},
    {'Mục':'Thêm mới / cập nhật','Hướng dẫn':'Để trống Mã câu để thêm mới. Nếu nhập Mã câu đang có (ví dụ 000079), hệ thống cập nhật câu đó và tự lưu bản cũ vào lịch sử revision trước khi sửa.'},
    {'Mục':'Cột bắt buộc','Hướng dẫn':'Chương, Chủ đề, CLO, Nội dung, A, B, C, D và Đáp án.'},
    {'Mục':'Đáp án','Hướng dẫn':'Chỉ ghi A, B, C hoặc D.'},
    {'Mục':'Chương · Chủ đề','Hướng dẫn':'Nên sao chép đúng tên từ sheet Chuong_Chu_de. Chương cũng chấp nhận số thứ tự chương.'},
    {'Mục':'CLO','Hướng dẫn':'Ghi đúng mã trong sheet CLO, ví dụ CLO1.'},
    {'Mục':'Lời giải','Hướng dẫn':'Không bắt buộc. Có thể để trống.'},
    {'Mục':'Ngân hàng','Hướng dẫn':`Không bắt buộc. Nếu để trống, hệ thống dùng ngân hàng đang mở: ${bankLabel(fallbackScope)}.`},
    {'Mục':'Trạng thái','Hướng dẫn':'Không bắt buộc. Nếu để trống, hệ thống dùng Bản nháp.'},
    {'Mục':'Chủ sở hữu','Hướng dẫn':'Không nhập trong Excel. Admin chọn chủ sở hữu cho các câu thêm mới trên màn hình xem trước; cập nhật câu cũ luôn giữ nguyên chủ sở hữu.'},
    {'Mục':'Giới hạn','Hướng dẫn':`Mỗi lần nhập tối đa ${MAX_ROWS} câu.`}
  ];
  const guideSheet=XLSX.utils.json_to_sheet(guide); setSheetWidths(guideSheet,[24,100]); XLSX.utils.book_append_sheet(wb,guideSheet,'Huong_dan');
  XLSX.writeFile(wb,`Mau-nhap-cap-nhat-cau-hoi-${safeFileName(activeSubject()?.name)}.xlsx`);
}

function ownerSelectHtml(owners) {
  if (!isAdmin()) return '';
  const saved=localStorage.getItem(OWNER_STORAGE_KEY)||state?.user?.id||'';
  const options=owners.map(owner=>{const label=owner.id===state?.user?.id?`${owner.full_name||owner.email||'Admin'} (tôi)`:`${owner.full_name||'Giảng viên'}${owner.email?` · ${owner.email}`:''}`;return `<option value="${esc(owner.id)}" ${String(owner.id)===String(saved)?'selected':''}>${esc(label)}</option>`;}).join('');
  return `<label class="field bulk-origin-field"><span>Chủ sở hữu câu thêm mới</span><select id="questionImportOwner">${options}</select><small>Admin có thể chọn tài khoản giảng viên ảo “AI Lecturer”. Các câu cập nhật giữ nguyên chủ sở hữu hiện tại.</small></label>`;
}

function previewHtml(parsed, owners=[]) {
  const bad=parsed.filter(item=>item.errors.length), goodCount=parsed.length-bad.length, insertCount=parsed.filter(item=>!item.errors.length&&item.action==='insert').length, updateCount=parsed.filter(item=>!item.errors.length&&item.action==='update').length;
  return `<div class="import-summary"><b>Đã đọc ${parsed.length} câu</b><span class="badge green">Thêm mới ${insertCount}</span><span class="badge green">Cập nhật ${updateCount}</span><span class="badge ${bad.length?'red':'green'}">Có lỗi ${bad.length}</span></div>
    <div class="question-import-preview-table table-wrap"><table><thead><tr><th>Dòng</th><th>Thao tác</th><th>Mã câu</th><th>Chương · Chủ đề</th><th>CLO</th><th>Nội dung</th><th>Ngân hàng</th><th>Kiểm tra</th></tr></thead><tbody>
      ${parsed.map(item=>`<tr class="${item.errors.length?'import-bad':''}"><td>${item.rowNo}</td><td>${item.action==='update'?'↻ Cập nhật':'+ Thêm mới'}</td><td>${esc(item.display_code||'Tự sinh')}</td><td>${esc(item.chapter?.name||'—')}<br><small>${esc(item.topic?.name||'—')}</small></td><td>${esc(item.clo?.code||'—')}</td><td>${esc(item.content.slice(0,120))}</td><td>${esc(bankLabel(item.question_scope))}</td><td>${item.errors.length?esc(item.errors.join('; ')):'✓ Hợp lệ'}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="question-import-confirm">${ownerSelectHtml(owners)}<label class="field bulk-origin-field"><span>Nguồn của danh sách nhập</span><select id="questionImportOrigin"><option value="lecturer">Giảng viên biên soạn</option><option value="academy">Đề xuất là câu hỏi Học viện</option></select><small>Nguồn chỉ áp dụng cho câu thêm mới. Câu cập nhật giữ nguyên nguồn hiện có.</small></label><button id="confirmQuestionImport" class="primary" ${goodCount?'':'disabled'}>Xử lý ${goodCount} câu hợp lệ</button></div>`;
}

async function loadOwners() {
  const self={id:state?.user?.id,full_name:state?.profile?.full_name||'Admin',email:state?.profile?.email||''};
  if(!isAdmin()) return self.id?[self]:[];
  const {data,error}=await db.from('profiles').select('id,full_name,email,role,is_active').eq('is_active',true).in('role',['teacher','lecturer','giangvien']).order('full_name',{ascending:true});
  if(error){console.warn('Không tải được danh sách chủ sở hữu câu hỏi',error);return self.id?[self]:[];}
  const owners=[self,...(data||[])].filter(x=>x?.id), seen=new Set(); return owners.filter(x=>!seen.has(x.id)&&seen.add(x.id));
}

function selectedOwnerId(){if(!isAdmin())return state?.user?.id||null;const id=$('#questionImportOwner')?.value||state?.user?.id||null;if(id)localStorage.setItem(OWNER_STORAGE_KEY,id);return id;}

async function insertOne(item,subjectId,originType,ownerId){
  const academy=originType==='academy',approval=academy?'pending':item.approval_status;
  const {data:question,error:questionError}=await db.from('questions').insert({subject_id:subjectId,chapter_id:item.chapter.id,topic_id:item.topic.id,clo_id:item.clo.id,content:item.content,correct_answer:item.correct_answer,explanation:item.explanation,created_by:isAdmin()&&ownerId?ownerId:state.user.id,status:approval==='approved'?'active':'draft',question_scope:academy?'secure_exam':item.question_scope,approval_status:approval,approved_by:approval==='approved'?state.user.id:null,approved_at:approval==='approved'?new Date().toISOString():null,origin_type:academy?'academy':'lecturer'}).select().single();
  if(questionError)throw questionError;
  const {error:optionsError}=await db.from('question_options').insert(OPTION_KEYS.map(key=>({question_id:question.id,option_key:key,content:item.options[key]})));
  if(!optionsError)return question;
  const {error:rollbackError}=await db.from('questions').delete().eq('id',question.id);if(rollbackError)console.error('Question import rollback failed',rollbackError);throw new Error(`Không lưu được A–D: ${optionsError.message||'lỗi không xác định'}`);
}

async function updateOptions(item){
  const byKey=new Map((item.existing?.question_options||[]).map(option=>[String(option.option_key||'').trim().toUpperCase(),option]));
  for(const key of OPTION_KEYS){const old=byKey.get(key);if(old?.id){const {error}=await db.from('question_options').update({content:item.options[key]}).eq('id',old.id);if(error)throw error;}else{const {error}=await db.from('question_options').insert({question_id:item.existing.id,option_key:key,content:item.options[key]});if(error)throw error;}}
}

async function updateOne(item){
  if(!item.existing?.id)throw new Error('Không tìm thấy câu cần cập nhật.');
  const archived=await db.rpc('archive_question_revision',{p_question_id:item.existing.id});if(archived.error)throw archived.error;
  const approval=item.approval_status;
  const payload={chapter_id:item.chapter.id,topic_id:item.topic.id,clo_id:item.clo.id,content:item.content,correct_answer:item.correct_answer,explanation:item.explanation,status:approval==='approved'?'active':'draft',question_scope:item.question_scope,approval_status:approval,approved_by:approval==='approved'?state.user.id:null,approved_at:approval==='approved'?new Date().toISOString():null,updated_at:new Date().toISOString()};
  const {error}=await db.from('questions').update(payload).eq('id',item.existing.id);if(error)throw error;await updateOptions(item);return item.existing;
}

async function returnToBank(){if(typeof window.backToQuestionList==='function')return window.backToQuestionList();state.view='questions';return render();}

async function importRows(parsed,subjectId,button,preview){
  const good=parsed.filter(item=>!item.errors.length);if(!good.length)return;
  const originType=$('#questionImportOrigin')?.value==='academy'?'academy':'lecturer',ownerId=selectedOwnerId(),inserts=good.filter(item=>item.action==='insert'),updates=good.filter(item=>item.action==='update');
  const accepted=await confirmAction('Nhập / cập nhật câu hỏi',`Thực hiện ${inserts.length} câu thêm mới và ${updates.length} câu cập nhật${isAdmin()&&ownerId?'; câu mới thuộc chủ sở hữu đã chọn':''}? Mỗi câu cập nhật sẽ lưu revision trước khi sửa. Các dòng lỗi bị bỏ qua.`,{confirmLabel:'Xác nhận'});if(!accepted)return;
  button.disabled=true;const failures=[];let success=0,inserted=0,updated=0;
  for(let index=0;index<good.length;index++){const item=good[index];button.textContent=`Đang xử lý ${index+1}/${good.length}…`;try{if(item.action==='update'){await updateOne(item);updated++;}else{await insertOne(item,subjectId,originType,ownerId);inserted++;}success++;}catch(error){console.error('Bulk question import row failed',item.rowNo,error);failures.push({rowNo:item.rowNo,code:item.display_code||'',message:error?.message||'Không lưu được câu hỏi'});}}
  window.logActivity?.('bulk_import','question',null,`Excel: thêm ${inserted}, cập nhật ${updated}, lỗi ${failures.length}`,failures.length?'warning':'success',null,{subject_id:subjectId,owner_id:ownerId});
  if(!failures.length){toast(`Hoàn tất: thêm ${inserted}, cập nhật ${updated} câu hỏi`);await returnToBank();return;}
  preview.innerHTML=`<section class="panel question-import-result"><h4>Kết quả xử lý</h4><p><b>Thành công:</b> ${success}/${good.length} câu · thêm ${inserted} · cập nhật ${updated}.</p><p class="hint">Câu cập nhật đã archive revision trước khi chỉnh. Nếu một bước cập nhật A–D lỗi, dòng đó được báo để Admin kiểm tra lại lịch sử.</p>${failures.length?`<div class="table-wrap"><table><thead><tr><th>Dòng</th><th>Mã</th><th>Lỗi</th></tr></thead><tbody>${failures.map(item=>`<tr><td>${item.rowNo}</td><td>${esc(item.code||'—')}</td><td>${esc(item.message)}</td></tr>`).join('')}</tbody></table></div>`:''}<div class="question-import-confirm"><button id="closeQuestionImport" class="primary">Về ngân hàng câu hỏi</button></div></section>`;$('#closeQuestionImport').onclick=returnToBank;
}

async function readWorkbook(file,sets,subjectId,preview){
  const XLSX=await getXLSX(),workbook=XLSX.read(await file.arrayBuffer(),{type:'array'}),preferredName=workbook.SheetNames.find(name=>['cau_hoi','cau hoi'].includes(normalize(name))),firstSheet=workbook.Sheets[preferredName||workbook.SheetNames[0]];
  if(!firstSheet)throw new Error('File Excel không có sheet dữ liệu.');
  const rows=XLSX.utils.sheet_to_json(firstSheet,{defval:''}).filter(row=>Object.values(row).some(value=>String(value).trim()));
  if(!rows.length)throw new Error('Không tìm thấy dòng câu hỏi nào trong sheet Cau_hoi.');if(rows.length>MAX_ROWS)throw new Error(`File có ${rows.length} dòng. Mỗi lần chỉ nhập tối đa ${MAX_ROWS} câu.`);
  const fallbackScope=activeBank(),parsed=rows.map((row,index)=>parseRow(row,sets,index+2,fallbackScope));flagDuplicates(parsed,sets.items||[]);const owners=await loadOwners();preview.innerHTML=previewHtml(parsed,owners);
  $('#questionImportOwner')?.addEventListener('change',event=>localStorage.setItem(OWNER_STORAGE_KEY,event.target.value||''));const button=$('#confirmQuestionImport');if(button)button.onclick=()=>importRows(parsed,subjectId,button,preview);
}

function bulkModeSwitchHtml(){return `<div id="questionCreateMode" class="question-create-mode wide" role="tablist" aria-label="Cách tạo câu hỏi"><button id="questionSingleCreateMode" type="button" class="question-create-mode-btn" aria-pressed="false">● Tạo một câu</button><button id="questionImageCreateMode" type="button" class="question-create-mode-btn" aria-pressed="false">▣ Nhận dạng từ ảnh</button><button id="questionBulkUploadMode" type="button" class="question-create-mode-btn active" aria-pressed="true">⇧ Tải hàng loạt</button></div>`;}

function open(sets){
  if(!sets||!state.subjectId)return toast('Hãy chọn học phần trước khi nhập câu hỏi.',true);captureQuestionFilters?.();const subjectId=state.subjectId;if(typeof questionWorkspace!=='function')return toast('Không mở được trang tạo câu hỏi.',true);
  questionWorkspace('Thêm / cập nhật câu hỏi','Excel hỗ trợ cả thêm mới và cập nhật theo Mã câu; dữ liệu luôn được kiểm tra trước khi lưu.',`<div class="question-import-workspace question-edit-page">${bulkModeSwitchHtml()}<section class="panel question-import-start"><div class="question-import-step"><span>1</span><div><h4>Tải file mẫu</h4><p>Để trống <b>Mã câu</b> khi thêm mới; nhập mã hiện có khi cần sửa. Câu sửa sẽ tự lưu revision.</p></div></div><button id="downloadQuestionImportTemplate" class="secondary" type="button">↓ Tải Excel mẫu</button><div class="question-import-step"><span>2</span><div><h4>Chọn file đã điền</h4><p>Mỗi dòng cần Chương, Chủ đề, CLO, nội dung, A–D và đáp án. Admin có thể chọn chủ sở hữu cho các câu thêm mới.</p></div></div><label class="file-button question-import-file">Chọn file Excel<input id="questionImportFile" type="file" accept=".xlsx,.xls" hidden></label></section><section class="panel question-import-preview-section"><div class="panel-head"><div><h3>Xem trước và kiểm tra</h3><p class="hint">Chưa có dữ liệu nào được lưu cho đến khi bạn xác nhận.</p></div></div><div id="questionImportPreview" class="question-import-preview-empty"><b>Chưa chọn file Excel</b><span>Sau khi chọn file, hệ thống sẽ phân loại Thêm mới / Cập nhật và kiểm tra lỗi.</span></div></section></div>`);
  $('#questionSingleCreateMode')?.addEventListener('click',()=>window.v96QuestionForm?.(null,sets));$('#questionImageCreateMode')?.addEventListener('click',async()=>{await window.v96QuestionForm?.(null,sets);window.AICLO_QUESTION_IMAGE?.activate(document.querySelector('#qForm'));});$('#downloadQuestionImportTemplate').onclick=async()=>{try{await downloadTemplate(sets);}catch(error){err(error);}};$('#questionImportFile').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;const preview=$('#questionImportPreview');preview.innerHTML='<div class="question-import-loading">Đang kiểm tra file Excel…</div>';try{await readWorkbook(file,sets,subjectId,preview);}catch(error){preview.innerHTML=`<div class="question-import-error"><b>Không đọc được file</b><p>${esc(error?.message||'File Excel không hợp lệ.')}</p></div>`;err(error);}};
}

const api=Object.freeze({open,downloadTemplate,parseRow});window.AICLO_QUESTION_IMPORT=api;window.v102BulkImportQuestions=open;
})();
