// script.js - generate DOCX versions + dap_an.docx (client-side)
const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');
const messages = document.getElementById('messages');

function showMessage(txt, isError=false){
  messages.textContent = txt;
  messages.style.color = isError ? 'crimson' : '';
}

function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// Parse plain text into questions
function parsePlainText(txt){
  const lines = txt.replace(/\r/g,'').split('\n').map(s=>s.trim());
  const parsed = [];
  let current = null;
  for(const L of lines){
    if(!L) continue;
    if(/^Câu\s*\d+[\.\)]?/i.test(L) || /^\d+[\.\)]\s*/.test(L)){
      if(current) parsed.push(current);
      const stem = L.replace(/^Câu\s*\d+[\.\)]?\s*/i,'').replace(/^\d+[\.\)]\s*/,'').trim();
      current = {stem, options: []};
      continue;
    }
    const m = L.match(/^([A-D])[\.\)]\s*(.*)$/i) || L.match(/^([A-D])\s+(.*)$/i);
    if(m && current){
      current.options.push({label: m[1].toUpperCase(), text: m[2].trim(), isAnswer:false});
      continue;
    }
    if(current){
      if(current.options.length) current.options[current.options.length-1].text += ' ' + L;
      else current.stem += ' ' + L;
    }
  }
  if(current) parsed.push(current);
  return parsed;
}

// Parse HTML from mammoth
function parseFromHtmlStrict(htmlString){
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const blocks = [];
  doc.body.querySelectorAll('p, div, li').forEach(node => {
    const text = node.textContent.replace(/\u00A0/g,' ').trim();
    if(text) blocks.push({text, html: node.innerHTML});
  });

  const parsed = [];
  let current = null;
  blocks.forEach(block => {
    const text = block.text.trim();
    if(/^Câu\s*\d+[\.\)]?/i.test(text) || /^\d+[\.\)]\s*/.test(text)){
      if(current) parsed.push(current);
      const stem = text.replace(/^Câu\s*\d+[\.\)]?\s*/i,'').replace(/^\d+[\.\)]\s*/,'').trim();
      current = {stem, options: []};
      return;
    }
    const m = text.match(/^([A-D])[\.\)]\s*(.*)$/i) || text.match(/^([A-D])\s+(.*)$/i);
    if(m && current){
      const label = m[1].toUpperCase();
      const body = m[2].trim();
      const isBold = /<b>|<strong>/i.test(block.html);
      const markAnswer = /\*|\(Đ\)|\(D\)/i.test(body);
      current.options.push({label, text: body.replace(/^\*+|\(Đ\)|\(D\)/ig,'').trim(), isAnswer: isBold || markAnswer});
      return;
    }
    if(current){
      if(current.options.length) current.options[current.options.length-1].text += ' ' + text;
      else current.stem += ' ' + text;
    }
  });
  if(current) parsed.push(current);
  // default A if no answer marked
  parsed.forEach(q => {
    if(!q.options.some(o => o.isAnswer)){
      const a = q.options.find(o => o.label === 'A');
      if(a) a.isAnswer = true;
    }
  });
  return parsed;
}

// Ensure default A for plain parsed
function ensureDefaultA(parsed){
  parsed.forEach(q => {
    if(!q.options.some(o => o.isAnswer)){
      const a = q.options.find(o => o.label === 'A');
      if(a) a.isAnswer = true;
    }
  });
}

// Build docx blob for one version (with "Câu X." header)
async function buildDocxBlob(questions, title){
  const { Document, Paragraph, Packer, TextRun } = window.docx;
  const children = [];
  children.push(new Paragraph({children:[ new TextRun({text:title || 'Đề thi', bold:true, size:28}) ]}));
  children.push(new Paragraph({children:[ new TextRun({text:"", size:18}) ]}));
  questions.forEach((q, idx) => {
    children.push(new Paragraph({children:[ new TextRun({text:'Câu ' + (idx+1) + '. ', bold:true}), new TextRun({text: q.stem}) ]}));
    q.options.forEach(op => {
      children.push(new Paragraph({children:[ new TextRun({text: op.label + '. ' + op.text, bold: !!op.isAnswer})]}));
    });
    children.push(new Paragraph({children:[ new TextRun({text:''})]}));
  });
  const doc = new Document({sections:[{children}]});
  const blob = await Packer.toBlob(doc);
  return blob;
}

// Build answer key docx
async function buildAnswerDocx(versionsAnswers){
  const { Document, Paragraph, Packer, TextRun } = window.docx;
  const children = [];
  children.push(new Paragraph({children:[ new TextRun({text:'ĐÁP ÁN', bold:true, size:28}) ]}));
  children.push(new Paragraph({children:[ new TextRun({text:"", size:18}) ])});
  versionsAnswers.forEach(v => {
    children.push(new Paragraph({children:[ new TextRun({text: 'Mã đề ' + v.code, bold:true}) ]}));
    v.answers.forEach(a => {
      children.push(new Paragraph({children:[ new TextRun({text: 'Câu ' + a.number + ': ' + a.answer}) ]}));
    });
    children.push(new Paragraph({children:[ new TextRun({text:''})]}));
  });
  const doc = new Document({sections:[{children}]});
  const blob = await Packer.toBlob(doc);
  return blob;
}

// Main generate handler
generateBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if(!f){ showMessage('Chưa chọn file', true); return; }
  const n = parseInt(document.getElementById('numVersions').value) || 1;
  const shuffleQ = document.getElementById('shuffleQuestions').checked;
  const shuffleO = document.getElementById('shuffleOptions').checked;

  showMessage('Đang xử lý file, vui lòng chờ...');

  let parsed = [];
  try {
    if(f.name.toLowerCase().endsWith('.txt')){
      const txt = await f.text();
      parsed = parsePlainText(txt);
      ensureDefaultA(parsed);
    } else if(f.name.toLowerCase().endsWith('.docx')){
      const arrayBuffer = await f.arrayBuffer();
      const res = await mammoth.convertToHtml({arrayBuffer});
      parsed = parseFromHtmlStrict(res.value);
    } else {
      showMessage('Chỉ hỗ trợ .txt và .docx', true);
      return;
    }
  } catch(e){
    console.error(e);
    showMessage('Lỗi khi đọc file: ' + e.message, true);
    return;
  }

  if(parsed.length === 0){ showMessage('Không tìm thấy câu hỏi', true); return; }

  // prepare zip
  const zip = new JSZip();
  const versionsAnswers = [];

  for(let v=1; v<=n; v++){
    // deep copy
    const Qs = parsed.map(q => ({
      stem: q.stem,
      options: q.options.map(o => ({ label: o.label, text: o.text, isAnswer: !!o.isAnswer }))
    }));

    if(shuffleQ) shuffleArray(Qs);

    // ensure original mapping
    Qs.forEach(q => {
      const originalCorrect = q.options.find(o=>o.isAnswer)?.text;
      if(shuffleO){
        shuffleArray(q.options);
        q.options.forEach((o,i)=> o.label = String.fromCharCode(65+i));
        q.options.forEach(o=> o.isAnswer = (o.text === originalCorrect));
      }
    });

    // build docx blob
    const blob = await buildDocxBlob(Qs, 'Mã đề ' + v);
    zip.file('made_' + v + '.docx', blob);

    // collect answers
    const answersThis = Qs.map((q, i) => ({ number: i+1, answer: (q.options.find(o=>o.isAnswer)||{}).label || '' }));
    versionsAnswers.push({ code: v, answers: answersThis });
  }

  // build answer docx
  const ansBlob = await buildAnswerDocx(versionsAnswers);
  zip.file('dap_an.docx', ansBlob);

  const content = await zip.generateAsync({type:'blob'});
  saveAs(content, 'made_zip.zip');
  showMessage('Hoàn tất. Tải file made_zip.zip về máy.');
});
