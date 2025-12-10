// script.js -- upgraded parser for "Câu N." style
const fileInput = document.getElementById('fileInput');
const parseBtn = document.getElementById('parseBtn');
const generateBtn = document.getElementById('generateBtn');
const messages = document.getElementById('messages');
const previewCard = document.getElementById('previewCard');
const previewList = document.getElementById('previewList');

let parsedQuestions = [];

// utility
function showMessage(txt, isError=false){
  messages.textContent = txt;
  messages.style.color = isError ? 'crimson' : '';
}

// event listeners
parseBtn.addEventListener('click', async () => {
  const f = fileInput.files[0];
  if(!f){ showMessage('Chưa chọn file', true); return; }
  showMessage('Đang đọc file...');
  parsedQuestions = [];
  previewList.innerHTML = '';
  previewCard.hidden = true;
  try {
    if(f.name.toLowerCase().endsWith('.txt')){
      const txt = await f.text();
      parsePlainText(txt);
    } else if (f.name.toLowerCase().endsWith('.docx')){
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.convertToHtml({arrayBuffer});
      parseFromHtmlStrict(result.value);
    } else {
      showMessage('Chỉ hỗ trợ .txt và .docx', true);
      return;
    }
    if(parsedQuestions.length === 0){
      showMessage('Không tìm thấy câu hỏi. Vui lòng kiểm tra định dạng file.', true);
      return;
    }
    showMessage(`Đã phát hiện ${parsedQuestions.length} câu. Bạn có thể chỉnh đáp án thủ công rồi nhấn "Sinh mã đề".`);
    renderPreview();
    generateBtn.disabled = false;
  } catch(e){
    console.error(e);
    showMessage('Lỗi khi đọc file: '+e.message, true);
  }
});

// Plain text parser (improved): accept "Câu 1." or "1." and options A., B., C., D.
function parsePlainText(txt){
  const lines = txt.replace(/\r/g,'').split('\n').map(s=>s.trim());
  parsedQuestions = [];
  let currentQuestion = null;
  for(const L of lines){
    if(!L) continue;
    // question line patterns: "Câu 1." or "1." or "1)" at line start
    if(/^Câu\s*\d+[\.\)]?/i.test(L) || /^\d+[\.\)]\s*/.test(L)){
      if(currentQuestion) parsedQuestions.push(currentQuestion);
      // remove leading "Câu n." or "n."
      const stem = L.replace(/^Câu\s*\d+[\.\)]?\s*/i,'').replace(/^\d+[\.\)]\s*/,'').trim();
      currentQuestion = {stem, options: []};
    } else if(/^[A-D][\.\)]\s+/i.test(L) || /^[A-D]\s+/i.test(L)){
      // option line
      const m = L.match(/^([A-D])[\.\)]\s*(.*)$/i) || L.match(/^([A-D])\s+(.*)$/i);
      if(m && currentQuestion){
        currentQuestion.options.push({label: m[1].toUpperCase(), text: m[2].trim(), isAnswer:false});
      }
    } else {
      // maybe continuation of stem or option without label
      if(currentQuestion){
        // if we already have options, treat as continuation of last option; else part of stem
        if(currentQuestion.options.length > 0){
          const last = currentQuestion.options[currentQuestion.options.length - 1];
          last.text += ' ' + L;
        } else {
          currentQuestion.stem += ' ' + L;
        }
      }
    }
  }
  if(currentQuestion) parsedQuestions.push(currentQuestion);
}

// Strict HTML parser for mammoth output: iterate <p> blocks and look for "Câu n." etc.
function parseFromHtmlStrict(htmlString){
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  // collect paragraphs in order
  const paras = [];
  // mammoth often wraps text in <p>, <div>, <li>
  doc.body.querySelectorAll('p, div, li').forEach(node=>{
    const text = node.textContent.replace(/\u00A0/g,' ').trim();
    if(text) paras.push({text, html: node.innerHTML});
  });

  parsedQuestions = [];
  let currentQuestion = null;

  paras.forEach(block => {
    const text = block.text.trim();

    // detect question lines: "Câu 1." or "Câu 1" or "1." or "1)"
    if(/^Câu\s*\d+[\.\)]?/i.test(text) || /^\d+[\.\)]\s*/.test(text)){
      if(currentQuestion) parsedQuestions.push(currentQuestion);
      const stem = text.replace(/^Câu\s*\d+[\.\)]?\s*/i,'').replace(/^\d+[\.\)]\s*/,'').trim();
      currentQuestion = { stem, options: [] };
      return;
    }

    // detect options: "A. text" or "A) text" or "A text"
    const optMatch = text.match(/^([A-D])[\.\)]\s*(.*)$/i) || text.match(/^([A-D])\s+(.*)$/i);
    if(optMatch && currentQuestion){
      const label = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      // detect bold in html as hint for answer
      const isBold = /<b>|<strong>/i.test(block.html);
      // detect star/ (Đ) markers
      const markAnswer = /\*|[(（]Đ[)）]|\(D\)/i.test(optText);
      currentQuestion.options.push({ label, text: optText.replace(/^\*+|\(Đ\)|\(D\)/ig,'').trim(), isAnswer: isBold || markAnswer });
      return;
    }

    // If block looks like "A. ... B. ... C. ..." in same paragraph (rare) -> split by A. B. C. D.
    if(/(?:^|\s)A[\.\)]\s+/i.test(text) && /B[\.\)]/i.test(text) ){
      // split around lookahead for A/B/C/D
      const parts = text.split(/(?=(?:^|\s)(?:[A-D])[\.\)]\s+)/g).map(s=>s.trim()).filter(s=>s);
      if(parts.length >= 2){
        parts.forEach((p, idx) => {
          const m = p.match(/^([A-D])[\.\)]\s*(.*)$/i);
          if(m && currentQuestion){
            currentQuestion.options.push({ label: m[1].toUpperCase(), text: m[2].trim(), isAnswer: /<b>|<strong>/i.test(block.html) || /\*/.test(m[2]) });
          } else if(idx === 0 && currentQuestion){
            // treat first as stem continuation
            currentQuestion.stem += ' ' + p;
          }
        });
        return;
      }
    }

    // continuation of previous item:
    if(currentQuestion){
      if(currentQuestion.options.length > 0){
        // append to last option
        const last = currentQuestion.options[currentQuestion.options.length - 1];
        last.text += ' ' + text;
      } else {
        currentQuestion.stem += ' ' + text;
      }
    }
  });

  if(currentQuestion) parsedQuestions.push(currentQuestion);

  // final cleanup: ensure labels A,B,C,... if missing
  parsedQuestions.forEach(q => {
    if(q.options.length > 0){
      q.options.forEach((o,i) => {
        if(!o.label) o.label = String.fromCharCode(65 + i);
      });
    }
  });
}

// render preview and allow marking answer
function renderPreview(){
  previewList.innerHTML = '';
  parsedQuestions.forEach((q, idx) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question';
    const header = document.createElement('div');
    header.className = 'q-header';
    header.innerHTML = `<strong>Q${idx+1}.</strong><div class="muted">Options: ${q.options.length}</div>`;
    qDiv.appendChild(header);

    const stemP = document.createElement('div');
    stemP.innerHTML = `<div>${q.stem}</div>`;
    qDiv.appendChild(stemP);

    const opts = document.createElement('div'); opts.className = 'options';
    q.options.forEach((op, oi) => {
      const opDiv = document.createElement('div');
      opDiv.className = 'option' + (op.isAnswer ? ' correct' : '');
      opDiv.dataset.q = idx; opDiv.dataset.i = oi;
      opDiv.innerHTML = `<strong>${op.label}.</strong> ${op.text}`;
      opDiv.onclick = () => {
        // single-select mark
        q.options.forEach(o=>o.isAnswer=false);
        op.isAnswer = true;
        renderPreview();
      };
      opts.appendChild(opDiv);
    });
    qDiv.appendChild(opts);
    previewList.appendChild(qDiv);
  });
  previewCard.hidden = false;
}

// shuffle util
function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// generate docx for multiple versions and zip them
generateBtn.addEventListener('click', async () => {
  const n = parseInt(document.getElementById('numVersions').value) || 1;
  const doShuffleQ = document.getElementById('shuffleQuestions').checked;
  const doShuffleO = document.getElementById('shuffleOptions').checked;

  if(parsedQuestions.length === 0){ showMessage('Chưa có câu nào để sinh', true); return; }
  showMessage('Đang tạo tài liệu...');

  const zip = new JSZip();

  for(let v=1; v<=n; v++){
    // deep copy
    const Qs = parsedQuestions.map(q => ({
      stem: q.stem,
      options: q.options.map(o => ({ label: o.label, text: o.text, isAnswer: !!o.isAnswer }))
    }));

    if(doShuffleQ) shuffleArray(Qs);

    if(doShuffleO){
      Qs.forEach(q => {
        const answerTxt = (q.options.find(o => o.isAnswer) || {}).text;
        shuffleArray(q.options);
        q.options.forEach((o,i)=> o.label = String.fromCharCode(65+i));
        // try to restore answer marking by matching text
        q.options.forEach(o => o.isAnswer = (o.text === answerTxt));
        // if no match found, keep none marked
      });
    }

    // Build Document (docx)
    const { Document, Paragraph, Packer, TextRun } = window.docx;
    const children = [];
    children.push(new Paragraph({children:[ new TextRun({text:`Mã đề ${v}`, bold:true, size:28}) ]}));
    children.push(new Paragraph({children:[ new TextRun({text:"", size:18}) ]}));

    Qs.forEach((q, idx) => {
      // question
      children.push(new Paragraph({children:[ new TextRun({text: `${idx+1}. `, bold:false}), new TextRun({text: q.stem}) ]}));
      // options
      q.options.forEach(op => {
        children.push(new Paragraph({children:[ new TextRun({text: `   ${op.label}. ${op.text}`, bold: op.isAnswer})]}));
      });
      children.push(new Paragraph({children:[ new TextRun({text:"", size:16}) ])});
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    zip.file(`made_${v}.docx`, blob);
  }

  const content = await zip.generateAsync({type:"blob"});
  saveAs(content, "made_zip.zip");
  showMessage(`Đã tạo ${n} file và đóng gói thành made_zip.zip`);
});
