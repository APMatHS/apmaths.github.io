// script.js
// Frontend-only: parse TXT/DOCX, detect questions/options (best-effort), allow manual marking,
// shuffle questions/options, generate multiple .docx files and zip them.

const fileInput = document.getElementById('fileInput');
const parseBtn = document.getElementById('parseBtn');
const generateBtn = document.getElementById('generateBtn');
const messages = document.getElementById('messages');
const previewCard = document.getElementById('previewCard');
const previewList = document.getElementById('previewList');

let parsedQuestions = []; // array of {stem: string, options: [{label, text, isAnswer}], rawHtml?}

// util: show message
function showMessage(txt, isError=false){
  messages.textContent = txt;
  messages.style.color = isError ? 'crimson' : '';
}

// read file
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
      // use mammoth to extract html
      const arrayBuffer = await f.arrayBuffer();
      const result = await mammoth.convertToHtml({arrayBuffer});
      parseFromHtml(result.value);
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

// basic plain-text parser (heuristic)
// split on lines that start with number + '.' or number + ')'
function parsePlainText(txt){
  const lines = txt.replace(/\r/g,'').split('\n').map(s=>s.trim()).filter(()=>true);
  // combine into paragraphs (empty line separates paragraphs)
  const paras = [];
  let cur = [];
  for(const L of lines){
    if(L === ''){
      if(cur.length) paras.push(cur.join(' '));
      cur = [];
    } else {
      cur.push(L);
    }
  }
  if(cur.length) paras.push(cur.join(' '));
  parseParagraphsAsQuestions(paras);
}

// parse mammoth HTML string
function parseFromHtml(htmlString){
  // create temporary DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  // collect paragraphs and heading elements as blocks
  const blocks = [];
  doc.body.querySelectorAll('p, div, li').forEach(node=>{
    const text = node.textContent.trim();
    if(text) blocks.push({text, html: node.innerHTML});
  });
  // try to group into question blocks: paragraph starting with number
  const paras = [];
  let cur = '';
  for(const b of blocks){
    if(/^\d+[\.\)]\s*/.test(b.text)){
      if(cur) paras.push(cur);
      cur = b.html;
    } else {
      // append as continuation
      cur = cur ? (cur + '<br/>' + b.html) : b.html;
    }
  }
  if(cur) paras.push(cur);
  parseHtmlQuestionBlocks(paras);
}

// heuristic: parse paragraphs (plain) into question + options
function parseParagraphsAsQuestions(paras){
  // each para may contain question and options. We'll attempt to split by option labels A., B., C., D.
  for(const p of paras){
    // split by option markers
    const parts = p.split(/(?=(?:^|\s)(?:A|B|C|D)[\.\)]\s+)/g).map(s=>s.trim()).filter(s=>s);
    if(parts.length === 0) continue;
    // first part likely contains question (possibly starting with "1.")
    let stem = parts[0].replace(/^\d+[\.\)]\s*/,'').trim();
    const options = [];
    for(let i=1;i<parts.length;i++){
      const m = parts[i].match(/^([A-D])[\.\)]\s*(.*)$/s);
      if(m){
        options.push({label: m[1], text: m[2].trim(), isAnswer:false});
      } else {
        // fallback: split by newline inside part
        options.push({label: String.fromCharCode(64+i), text: parts[i].trim(), isAnswer:false});
      }
    }
    parsedQuestions.push({stem, options});
  }
}

// parse each HTML block (from mammoth) for stronger detection including <strong>
function parseHtmlQuestionBlocks(blocks){
  for(const html of blocks){
    // create DOM fragment
    const parser = new DOMParser();
    const doc = parser.parseFromString('<div>'+html+'</div>','text/html');
    const text = doc.body.textContent.trim();
    // split on option labels using DOM child nodes
    // Strategy: find substrings starting A. B. etc in text
    const parts = text.split(/(?=(?:^|\s)(?:A|B|C|D)[\.\)]\s+)/g).map(s=>s.trim()).filter(s=>s);
    let stem = parts[0].replace(/^\d+[\.\)]\s*/,'').trim();
    const options = [];
    // For detecting bold in options, search for <strong> or <b> inside html
    // We'll map option text to innerHTML snippets for checking bold
    const htmlParts = html.split(/(?=(?:^|\s)(?:A|B|C|D)[\.\)]\s+)/g).map(s=>s.trim()).filter(s=>s);
    for(let i=1;i<parts.length;i++){
      const labelMatch = parts[i].match(/^([A-D])[\.\)]\s*(.*)$/s);
      let label = '';
      let textOpt = parts[i];
      if(labelMatch){ label = labelMatch[1]; textOpt = labelMatch[2].trim(); }
      // check bold in corresponding htmlParts[i]
      const htmlPart = htmlParts[i] || '';
      const hasBold = /<strong>|<b>/i.test(htmlPart);
      const hasStar = /\*\s*$|^\*/.test(textOpt) || textOpt.includes('(Đ)') || textOpt.includes('(D)');
      options.push({label: label || String.fromCharCode(64+i), text: textOpt.replace(/^\*+/,'').trim(), isAnswer: hasBold || hasStar});
    }
    parsedQuestions.push({stem, options, rawHtml: html});
  }
}

// parse html blocks fallback (when previous method not used)
function parseHtmlQuestionBlocksFallback(blocks){
  blocks.forEach(b => {
    const txt = b.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    // naive split
    parseParagraphsAsQuestions([txt]);
  });
}

// render preview with ability to click option to mark as answer
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
        // toggle answer (single select)
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

// shuffle utilities
function shuffleArray(a){
  for(let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
}

// Generate docx for a single version using docx library
async function buildDocxDocument(questions, title='De-tron'){
  const { Document, Paragraph, Packer, TextRun } = docx;
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({children:[ new TextRun({text:title, bold:true, size:28}) ]}),
        new Paragraph({children:[ new TextRun({text:"", size:18}) ]})
      ]
    }]
  });

  // add questions
  questions.forEach((q, idx) => {
    // question stem
    doc.addSection({
      properties:{},
      children:[
        new Paragraph({
          children: [
            new TextRun({text: `${idx+1}. `, bold:false}),
            new TextRun({text: q.stem, break:1})
          ]
        })
      ]
    });
    // options
    q.options.forEach(op => {
      const tr = new TextRun({
        text: `${op.label}. ${op.text}`,
        bold: op.isAnswer ? true : false
      });
      doc.addSection({properties:{}, children:[ new Paragraph({children:[tr]}) ]});
    });
  });

  // pack
  const blob = await Packer.toBlob(doc);
  return blob;
}

// generate many versions, zip, and download
generateBtn.addEventListener('click', async () => {
  const n = parseInt(document.getElementById('numVersions').value) || 1;
  const doShuffleQ = document.getElementById('shuffleQuestions').checked;
  const doShuffleO = document.getElementById('shuffleOptions').checked;

  if(parsedQuestions.length === 0){ showMessage('Chưa có câu nào để sinh', true); return; }
  showMessage('Đang tạo tài liệu...');

  const zip = new JSZip();

  for(let v=1; v<=n; v++){
    // deep copy parsedQuestions
    const Qs = parsedQuestions.map(q=>{
      return {
        stem: q.stem,
        options: q.options.map(o=>({label: o.label, text: o.text, isAnswer: o.isAnswer}))
      };
    });

    if(doShuffleQ) shuffleArray(Qs);

    if(doShuffleO){
      Qs.forEach(q=>{
        // keep track of which option was answer before shuffle
        const answer = q.options.find(o=>o.isAnswer);
        shuffleArray(q.options);
        // relabel A,B,C...
        q.options.forEach((o,i)=> o.label = String.fromCharCode(65+i));
        // ensure exactly one is marked (move marking to new position)
        if(answer){
          // find option with same text (best-effort)
          const match = q.options.find(o=>o.text === answer.text);
          q.options.forEach(o=>o.isAnswer=false);
          if(match) match.isAnswer = true;
          else q.options[0].isAnswer = true;
        } else {
          // keep none marked or pick first? keep none (no answer).
        }
      });
    }

    // build docx content in plain paragraphs (docx lib expects proper structure).
    // Instead of using many sections, create a Document with children paragraphs in single section:
    const { Document, Paragraph, Packer, TextRun } = docx;
    const children = [];
    children.push(new Paragraph({children:[ new TextRun({text:`Mã đề ${v}`, bold:true, size:28}) ]}));
    children.push(new Paragraph({children:[ new TextRun({text:"", size:18}) ]}));
    Qs.forEach((q, idx) => {
      children.push(new Paragraph({
        children: [ new TextRun({text: `${idx+1}. `}), new TextRun({text: q.stem}) ]
      }));
      q.options.forEach(op => {
        children.push(new Paragraph({children:[ new TextRun({text: `   ${op.label}. ${op.text}`, bold: op.isAnswer})]}));
      });
      children.push(new Paragraph({children:[ new TextRun({text:"", size:16}) ]}));
    });
    const docObj = new Document({sections:[{children}]});
    const blob = await Packer.toBlob(docObj);
    zip.file(`made_${v}.docx`, blob);
  }

  // generate zip
  const content = await zip.generateAsync({type:"blob"});
  saveAs(content, "made_zip.zip");
  showMessage(`Đã tạo ${n} file và đóng gói thành made_zip.zip`);
});
