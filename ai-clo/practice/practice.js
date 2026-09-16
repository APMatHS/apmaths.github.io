(()=>{
  const $=id=>document.getElementById(id);
  const cfg=window.AICLO_CONFIG||{};
  const endpoint=`${String(cfg.SUPABASE_URL||"").replace(/\/$/,"")}/functions/v1/practice-public`;
  let currentCode="",practiceInfo=null,currentBlobUrl="",currentFilename="";

  function setMessage(el,text,type=""){el.textContent=text||"";el.className=`message ${type}`.trim();}
  function normalizeCode(v){return String(v||"").trim().toUpperCase().replace(/\s+/g,"");}
  async function api(body){
    if(!cfg.SUPABASE_URL||!cfg.SUPABASE_PUBLISHABLE_KEY)throw new Error("Thiếu cấu hình Supabase.");
    const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","apikey":cfg.SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(body)});
    let data={};try{data=await res.json();}catch{}
    if(!res.ok||!data.success)throw new Error(data.error||"Không thể kết nối máy chủ.");
    return data;
  }
  function setBusy(button,busy,label){
    if(!button)return; if(!button.dataset.label)button.dataset.label=button.textContent;
    button.disabled=busy; button.textContent=busy?label:(button.dataset.label||button.textContent);
  }
  function clearPdf(){
    if(currentBlobUrl)URL.revokeObjectURL(currentBlobUrl); currentBlobUrl=""; currentFilename="";
    $("pdfPreview").removeAttribute("src"); $("resultPanel").classList.add("hidden");
  }
  async function openCourse(){
    const code=normalizeCode($("accessCode").value); $("accessCode").value=code;
    if(code.length<4){setMessage($("codeMessage"),"Vui lòng nhập mã môn hợp lệ.","error");return;}
    setBusy($("openBtn"),true,"Đang kiểm tra…"); setMessage($("codeMessage"),"");
    try{
      const data=await api({action:"resolve",code});
      currentCode=code; practiceInfo=data;
      $("subjectMeta").textContent=[data.subject?.semester,data.subject?.academic_year].filter(Boolean).join(" • ");
      $("practiceTitle").textContent=data.practice?.title||data.subject?.name||"Đề ôn tập";
      $("practiceMeta").textContent=`${data.subject?.name||""} • ${data.practice?.question_count||0} câu${data.practice?.include_answers?" • có đáp án cuối PDF":""}`;
      $("codeCard").classList.add("hidden"); $("practicePanel").classList.remove("hidden");
      $("redrawBtn").classList.toggle("hidden",data.practice?.allow_unlimited_redraw===false);
      clearPdf();
    }catch(err){setMessage($("codeMessage"),err.message||String(err),"error");}
    finally{setBusy($("openBtn"),false);}
  }
  async function draw(){
    if(!currentCode)return;
    const button=$("drawBtn"); setBusy(button,true,"Đang rút và tạo PDF…"); $("redrawBtn").disabled=true; setMessage($("drawStatus"),"Đang lấy câu hỏi…"); clearPdf();
    try{
      const data=await api({action:"draw",code:currentCode});
      setMessage($("drawStatus"),`Đã rút ${data.questions?.length||0} câu. Đang biên dịch PDF…`);
      const built=await window.PracticePDF.build(data);
      currentFilename=built.filename; currentBlobUrl=URL.createObjectURL(built.blob);
      $("seedText").textContent=data.seed||"—"; $("pdfPreview").src=currentBlobUrl;
      $("resultPanel").classList.remove("hidden"); setMessage($("drawStatus"),"PDF đã sẵn sàng.","ok");
      if(data.practice?.allow_unlimited_redraw===false) button.disabled=true;
    }catch(err){setMessage($("drawStatus"),err.message||String(err),"error");}
    finally{
      if(practiceInfo?.practice?.allow_unlimited_redraw!==false)setBusy(button,false);
      $("redrawBtn").disabled=false;
    }
  }
  function download(){
    if(!currentBlobUrl)return; const a=document.createElement("a"); a.href=currentBlobUrl; a.download=currentFilename||"de-on-tap.pdf"; document.body.appendChild(a); a.click(); a.remove();
  }
  function changeCode(){
    clearPdf(); currentCode=""; practiceInfo=null; $("practicePanel").classList.add("hidden"); $("codeCard").classList.remove("hidden"); setMessage($("drawStatus"),""); $("accessCode").focus();
  }

  $("openBtn").addEventListener("click",openCourse);
  $("accessCode").addEventListener("keydown",e=>{if(e.key==="Enter")openCourse();});
  $("drawBtn").addEventListener("click",draw); $("redrawBtn").addEventListener("click",draw);
  $("downloadBtn").addEventListener("click",download); $("changeCodeBtn").addEventListener("click",changeCode);
  const preset=new URLSearchParams(location.search).get("code"); if(preset){$("accessCode").value=normalizeCode(preset); openCourse();}
  window.addEventListener("beforeunload",()=>{if(currentBlobUrl)URL.revokeObjectURL(currentBlobUrl);});
})();
