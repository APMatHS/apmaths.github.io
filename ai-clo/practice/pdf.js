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
  function makeRenderMask(){
    const mask=document.createElement("div");
    mask.className="pdf-render-mask";
    mask.innerHTML='<div><strong>Đang tạo PDF…</strong><span>Đang dàn trang câu hỏi và công thức.</span></div>';
    return mask;
  }
  async function build(data){
    if(typeof html2pdf==="undefined")throw new Error("Không tải được bộ tạo PDF.");
    const questions=Array.isArray(data?.questions)?data.questions:[];
    if(!questions.length)throw new Error("Không có câu hỏi để tạo PDF. Vui lòng rút đề lại.");
    const source=makeSource(data),mask=makeRenderMask();
    document.body.classList.add("pdf-rendering");
    document.body.appendChild(source);
    document.body.appendChild(mask);
    try{
      if(window.MathJax?.typesetPromise) await window.MathJax.typesetPromise([source]);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const renderedCount=source.querySelectorAll(".pdf-question").length;
      if(renderedCount!==questions.length)throw new Error(`Không dàn đủ câu hỏi (${renderedCount}/${questions.length}). Vui lòng thử lại.`);
      const filename=`${String(data.subject?.name||"de-on-tap").replace(/[^\p{L}\p{N}]+/gu,"-").replace(/^-|-$/g,"")||"de-on-tap"}-${data.seed||""}.pdf`;
      const rect=source.getBoundingClientRect();
      const renderWidth=Math.max(760,Math.ceil(rect.width+48));
      const renderHeight=Math.max(window.innerHeight,Math.ceil(source.scrollHeight+48));
      const worker=html2pdf().set({
        margin:[10,12,14,12],filename,
        image:{type:"jpeg",quality:.96},
        html2canvas:{scale:2,useCORS:true,logging:false,backgroundColor:"#ffffff",scrollX:0,scrollY:0,windowWidth:renderWidth,windowHeight:renderHeight},
        jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
        pagebreak:{mode:["css","legacy"]}
      }).from(source).toPdf();
      await worker.get("pdf").then(pdf=>{
        const total=pdf.internal.getNumberOfPages();
        for(let i=1;i<=total;i++){
          pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(100);
          pdf.text(`Trang ${i}/${total} • ${data.seed||""}`,198,291,{align:"right"});
        }
      });
      const blob=await worker.outputPdf("blob");
      if(!blob||blob.size<1000)throw new Error("PDF tạo ra không hợp lệ. Vui lòng thử lại.");
      return {blob,filename};
    }finally{
      source.remove();
      mask.remove();
      document.body.classList.remove("pdf-rendering");
    }
  }
  window.PracticePDF={build,renderRich};
})();
