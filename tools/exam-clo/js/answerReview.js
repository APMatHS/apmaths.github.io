function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function normCode(v){const s=String(v??'').trim();return /^\d+$/.test(s)?s.padStart(3,'0'):s}

function rebuild(answerData, draft){
  const codes=Object.keys(draft);
  if(!codes.length) throw new Error('Không còn mã đề nào.');
  const total=Number(answerData.totalQuestion||0);
  const exams={}; let useCLO=false;
  for(const code of codes){
    const d=draft[code];
    if(d.answers.length!==total||d.clos.length!==total) throw new Error(`Mã đề ${code} chưa đủ ${total} câu.`);
    const exam={totalQuestion:total,cloCount:{},questions:{}};
    for(let q=1;q<=total;q++){
      const a=String(d.answers[q-1]??'').trim().toUpperCase();
      const clo=String(d.clos[q-1]??'').trim();
      if(!['A','B','C','D'].includes(a)) throw new Error(`Mã đề ${code}, câu ${q}: đáp án “${a}” không hợp lệ.`);
      if(clo) {useCLO=true;exam.cloCount[clo]=(exam.cloCount[clo]||0)+1}
      exam.questions[q]={answer:a,clo};
    }
    exams[code]=exam;
  }
  if(useCLO){
    for(const [code,exam] of Object.entries(exams)){
      const missing=[];for(let q=1;q<=total;q++) if(!String(exam.questions[q].clo).trim()) missing.push(q);
      if(missing.length) throw new Error(`Mã đề ${code} thiếu CLO ở câu ${missing.join(', ')}.`);
    }
    const standard=JSON.stringify(exams[codes[0]].cloCount);
    for(const c of codes.slice(1)) if(JSON.stringify(exams[c].cloCount)!==standard) throw new Error('Phân bố CLO giữa các mã đề không đồng nhất.');
  }
  answerData.exams=exams;answerData.useCLO=useCLO;answerData.totalQuestion=total;
  return answerData;
}

export function reviewAnswerData({container,answerData,title='Xem lại đáp án'}){
  return new Promise((resolve,reject)=>{
    const total=Number(answerData.totalQuestion||0), codes=Object.keys(answerData.exams||{});
    const draft={};
    codes.forEach(code=>{draft[code]={newCode:code,answers:[],clos:[]};for(let q=1;q<=total;q++){draft[code].answers.push(answerData.exams[code].questions[q]?.answer||'');draft[code].clos.push(answerData.exams[code].questions[q]?.clo||'')}});
    const head=codes.map(c=>`<th colspan="2"><input class="answer-code-input" data-old="${esc(c)}" value="${esc(c)}" aria-label="Mã đề ${esc(c)}"></th>`).join('');
    const sub=codes.map(()=>'<th>Đáp án</th><th>CLO</th>').join('');
    const rows=Array.from({length:total},(_,i)=>`<tr><td>${i+1}</td>${codes.map(c=>`<td><input class="answer-cell" data-code="${esc(c)}" data-q="${i+1}" data-kind="answer" value="${esc(draft[c].answers[i])}" maxlength="1"></td><td><input class="answer-cell clo-cell" data-code="${esc(c)}" data-q="${i+1}" data-kind="clo" value="${esc(draft[c].clos[i])}"></td>`).join('')}</tr>`).join('');
    container.innerHTML=`<div class="result-box review-panel"><div class="result-head"><div><span class="section-kicker">XEM LẠI ĐÁP ÁN</span><h2 class="result-title">${esc(title)}</h2></div><span class="success-pill">${codes.length} mã đề • ${total} câu</span></div><p class="review-description">Có thể sửa mã đề, đáp án hoặc CLO ngay tại đây. Mọi thay đổi chỉ có hiệu lực sau khi bấm <b>Lưu đáp án</b>.</p><div id="answerReviewError" class="inline-error" hidden></div><div class="table-wrapper answer-review-wrapper"><table class="answer-review-table"><thead><tr><th rowspan="2">Câu</th>${head}</tr><tr>${sub}</tr></thead><tbody>${rows}</tbody></table></div><div class="review-actions"><button id="cancelAnswerReview" class="secondary-action">Đóng</button><button id="saveAnswerReview" class="primary-inline-action">Lưu đáp án</button></div></div>`;
    const err=container.querySelector('#answerReviewError');const show=m=>{err.hidden=false;err.textContent=m};
    container.querySelector('#saveAnswerReview')?.addEventListener('click',()=>{
      try{
        const newDraft={};
        for(const input of container.querySelectorAll('.answer-code-input')){
          const old=input.dataset.old,newCode=normCode(input.value); if(!newCode) throw new Error('Có mã đề đang để trống.');
          if(newDraft[newCode]) throw new Error(`Mã đề ${newCode} bị trùng.`);
          newDraft[newCode]={answers:[...draft[old].answers],clos:[...draft[old].clos]};
        }
        container.querySelectorAll('.answer-cell').forEach(input=>{
          const old=input.dataset.code; const codeInput=container.querySelector(`.answer-code-input[data-old="${CSS.escape(old)}"]`); const newCode=normCode(codeInput.value); const q=Number(input.dataset.q)-1;
          if(input.dataset.kind==='answer') newDraft[newCode].answers[q]=input.value.trim().toUpperCase(); else newDraft[newCode].clos[q]=input.value.trim();
        });
        rebuild(answerData,newDraft);resolve(answerData);
      }catch(e){show(e.message)}
    });
    container.querySelector('#cancelAnswerReview')?.addEventListener('click',()=>{const e=new Error('Đóng xem đáp án.');e.name='UserCancelledError';reject(e)});
  });
}
