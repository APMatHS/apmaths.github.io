(function(){
  function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));}
  function renderRich(value){
    const raw=String(value??"").trim();
    if(!raw)return "";
    let html;
    if(/<\/?[a-z][\s\S]*>/i.test(raw)) html=raw;
    else if(window.marked?.parse) html=window.marked.parse(raw,{breaks:true,gfm:true});
    else html=escapeHtml(raw).replace(/\n/g,"<br>");
    return window.DOMPurify?window.DOMPurify.sanitize(html,{USE_PROFILES:{html:true}}):html;
  }
  function safeImage(path){
    const src=String(path||"").trim();
    if(!src)return "";
    if(!/^(https?:|data:|blob:|\/|\.\/|\.\.\/)/i.test(src))return "";
    return `<div><img src="${escapeHtml(src)}" alt="Hình đáp án"></div>`;
  }
  function makeSource(data){
    const root=document.createElement("div");
    root.id="pdfSource";
    const title=escapeHtml(data.practice?.title||`Đề ôn tập – ${data.subject?.name||""}`);
    const subject=escapeHtml(data.subject?.name||"");
    const period=[data.subject?.semester,data.subject?.academic_year].filter(Boolean).map(escapeHtml).join(" • ");
    const questions=Array.isArray(data.questions)?data.questions:[];
    root.innerHTML=`<div class="pdf-doc">
      <header class="pdf-head"><h1>${title}</h1><div>${subject}</div></header>
      <div class="pdf-meta"><span>${period}</span><span>${questions.length} câu</span></div>
      <section class="pdf-questions"></section>
      ${data.practice?.include_answers?'<section class="answer-page"><h2>Đáp án</h2><div class="answer-grid"></div></section>':''}
      <div class="pdf-seed">Mã đề luyện tập: ${escapeHtml(data.seed||"")}</div>
    </div>`;
    const holder=root.querySelector(".pdf-questions");
    questions.forEach((q,index)=>{
      const article=document.createElement("article");
      article.className="pdf-question";
      const options=(q.options||[]).map(opt=>`<div class="pdf-option"><strong>${escapeHtml(opt.key)}.</strong> <span class="rich">${renderRich(opt.content)}</span>${safeImage(opt.image_path)}</div>`).join("");
      article.innerHTML=`<div class="pdf-question-title">Câu ${index+1}. <span class="rich">${renderRich(q.content)}</span></div><div class="pdf-options">${options}</div>`;
      holder.appendChild(article);
    });
    if(data.practice?.include_answers){
      const answers=root.querySelector(".answer-grid");
      questions.forEach((q,index)=>{
        const item=document.createElement("div"); item.className="answer-item";
        item.innerHTML=`<strong>${index+1}.</strong> ${escapeHtml(q.correct_answer||"—")}`;
        answers.appendChild(item);
      });
    }
    return root;
  }
  async function build(data){
    if(typeof html2pdf==="undefined")throw new Error("Không tải được bộ tạo PDF.");
    const source=makeSource(data); document.body.appendChild(source);
    try{
      if(window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([source]);
      const filename=`${String(data.subject?.name||"de-on-tap").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")||"de-on-tap"}-${data.seed||""}.pdf`;
      const worker=html2pdf().set({
        margin:[10,12,14,12],filename,
        image:{type:"jpeg",quality:.96},
        html2canvas:{scale:2,useCORS:true,logging:false,backgroundColor:"#ffffff"},
        jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
        pagebreak:{mode:["css","legacy"],avoid:[".pdf-question"]}
      }).from(source).toPdf();
      await worker.get("pdf").then(pdf=>{
        const total=pdf.internal.getNumberOfPages();
        for(let i=1;i<=total;i++){
          pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(100);
          pdf.text(`Trang ${i}/${total} • ${data.seed||""}`,198,291,{align:"right"});
        }
      });
      const blob=await worker.outputPdf("blob");
      return {blob,filename};
    }finally{source.remove();}
  }
  window.PracticePDF={build,renderRich};
})();
