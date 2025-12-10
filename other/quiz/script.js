// script.js -- upgraded parser + "Câu 1." when exporting DOCX
const fileInput = document.getElementById('fileInput');
const parseBtn = document.getElementById('parseBtn');
const generateBtn = document.getElementById('generateBtn');
const messages = document.getElementById('messages');
const previewCard = document.getElementById('previewCard');
const previewList = document.getElementById('previewList');

let parsedQuestions = [];

// ----------------------------
// Utility
// ----------------------------
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

// ----------------------------
// Event: Parse file
// ----------------------------
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
      showMessage('Không tìm thấy câu hỏi trong file.', true);
      return;
    }

    showMessage(`Đã phát hiện ${parsedQuestions.length} câu. Bạn có thể chỉnh đáp án thủ công.`);
    renderPreview();
    generateBtn.disabled = false;
  
  } catch(e){
    console.error(e);
    showMessage("Lỗi khi đọc file: " + e.message, true);
  }
});

// ----------------------------
// Parser: Plain text (TXT)
// ----------------------------
function parsePlainText(txt){
  const lines = txt.replace(/\r/g,'').split('\n').map(s=>s.trim());
  parsedQuestions = [];
  let currentQuestion = null;

  for(const L of lines){
    if(!L) continue;

    // Detect question: "Câu 1." or "1."
    if(/^Câu\s*\d+[\.\)]?/i.test(L) || /^\d+[\.\)]\s*/.test(L)){
      if(currentQuestion) parsedQuestions.push(currentQuestion);

      const stem = L.replace(/^Câu\s*\d+[\.\)]?\s*/i,'')
                    .replace(/^\d+[\.\)]\s*/,'')
                    .trim();

      currentQuestion = { stem, options: [] };
      continue;
    }

    // Detect options: A. | B. | C. | D.
    const m = L.match(/^([A-D])[\.\)]\s*(.*)$/i) || L.match(/^([A-D])\s+(.*)$/i);
    if(m && currentQuestion){
      currentQuestion.options.push({
        label: m[1].toUpperCase(),
        text: m[2].trim(),
        isAnswer: false
      });
      continue;
    }

    // Continuation lines
    if(currentQuestion){
      if(currentQuestion.options.length){
        const last = currentQuestion.options[currentQuestion.options.length - 1];
        last.text += ' ' + L;
      } else {
        currentQuestion.stem += ' ' + L;
      }
    }
  }

  if(currentQuestion) parsedQuestions.push(currentQuestion);
}

// ----------------------------
// Parser: DOCX (via HTML from mammoth)
// ----------------------------
function parseFromHtmlStrict(htmlString){
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');

  const blocks = [];
  doc.body.querySelectorAll('p, div, li').forEach(node => {
    const text = node.textContent.replace(/\u00A0/g,' ').trim();
    if(text) blocks.push({text, html: node.innerHTML});
  });

  parsedQuestions = [];
  let currentQuestion = null;

  blocks.forEach(block => {
    const text = block.text.trim();

    // Question: "Câu 1." or "1."
    if(/^Câu\s*\d+[\.\)]?/i.test(text) || /^\d+[\.\)]\s*/.test(text)){
      if(currentQuestion) parsedQuestions.push(currentQuestion);

      const stem = text.replace(/^Câu\s*\d+[\.\)]?\s*/i,'')
                       .replace(/^\d+[\.\)]\s*/,'')
                       .trim();

      currentQuestion = { stem, options: [] };
      return;
    }

    // Option: A. B. C. D.
    const m = text.match(/^([A-D])[\.\)]\s*(.*)$/i);
    if(m && currentQuestion){
      const label = m[1].toUpperCase();
      const body = m[2].trim();
      const isBold = /<b>|<strong>/i.test(block.html);

      currentQuestion.options.push({
        label,
        text: body,
        isAnswer: isBold
      });
      return;
    }

    // Continuation
    if(currentQuestion){
      if(currentQuestion.options.length){
        const last = currentQuestion.options[currentQuestion.options.length - 1];
        last.text += ' ' + text;
      } else {
        currentQuestion.stem += ' ' + text;
      }
    }
  });

  if(currentQuestion) parsedQuestions.push(currentQuestion);
}

// ----------------------------
// Preview UI
// ----------------------------
function renderPreview(){
  previewList.innerHTML = '';

  parsedQuestions.forEach((q, qi) => {
    const box = document.createElement('div');
    box.className = 'question';

    const head = document.createElement('div');
    head.className = 'q-header';
    head.innerHTML = `<strong>Câu ${qi+1}</strong>`;
    box.appendChild(head);

    const stemDiv = document.createElement('div');
    stemDiv.textContent = q.stem;
    box.appendChild(stemDiv);

    const opts = document.createElement('div');
    opts.className = 'options';

    q.options.forEach((op, oi) => {
      const btn = document.createElement('div');
      btn.className = 'option' + (op.isAnswer ? ' correct' : '');
      btn.innerHTML = `<strong>${op.label}.</strong> ${op.text}`;
      btn.onclick = () => {
        q.options.forEach(o => o.isAnswer = false);
        op.isAnswer = true;
        renderPreview();
      };
      opts.appendChild(btn);
    });

    box.appendChild(opts);
    previewList.appendChild(box);
  });

  previewCard.hidden = false;
}

// ----------------------------
// Generate DOCX + ZIP
// ----------------------------
generateBtn.addEventListener('click', async () => {

  const { Document, Paragraph, TextRun, Packer } = window.docx;

  const numVersions = parseInt(document.getElementById('numVersions').value) || 1;
  const shuffleQ = document.getElementById('shuffleQuestions').checked;
  const shuffleO = document.getElementById('shuffleOptions').checked;

  showMessage('Đang tạo file...');

  const zip = new JSZip();

  for(let v=1; v <= numVersions; v++){
    // Clone data
    const Qs = parsedQuestions.map(q => ({
      stem: q.stem,
      options: q.options.map(o => ({
        label: o.label,
        text: o.text,
        isAnswer: o.isAnswer
      }))
    }));

    if(shuffleQ) shuffleArray(Qs);
    if(shuffleO){
      Qs.forEach(q => {
        const correct = q.options.find(o => o.isAnswer)?.text;
        shuffleArray(q.options);
        q.options.forEach((o,i) => o.label = String.fromCharCode(65+i));
        q.options.forEach(o => o.isAnswer = (o.text === correct));
      });
    }

    // Build document
    const paragraphs = [];

    paragraphs.push(
      new Paragraph({
        children: [ new TextRun({text:`Mã đề ${v}`, bold:true, size:28}) ],
      })
    );

    Qs.forEach((q, qi) => {

      // -----------------------------------------------------------
      // 🔥 SỬA CHÍNH TẠI ĐÂY: THÊM CHỮ "Câu"
      // -----------------------------------------------------------
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({text:`Câu ${qi+1}. `, bold:true}),
            new TextRun({text:q.stem})
          ]
        })
      );

      q.options.forEach(op => {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${op.label}. ${op.text}`,
                bold: op.isAnswer
              })
            ]
          })
        );
      });

      paragraphs.push(new Paragraph({children:[new TextRun("")]}));
    });

    const doc = new Document({
      sections: [{ children: paragraphs }]
    });

    const blob = await Packer.toBlob(doc);
    zip.file(`made_${v}.docx`, blob);
  }

  const content = await zip.generateAsync({type:"blob"});
  saveAs(content, "made_zip.zip");

  showMessage(`Đã tạo xong ${numVersions} mã đề!`);
});
