import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const cfg=window.AICLO_CONFIG||{};
const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const $=id=>document.getElementById(id);
let subjects=[],selectedSubject=null,detail=null;

function msg(el,text,type=""){el.textContent=text||"";el.className=`message ${type}`.trim();}
function busy(btn,on,label="Đang xử lý…"){if(!btn.dataset.label)btn.dataset.label=btn.textContent;btn.disabled=on;btn.textContent=on?label:btn.dataset.label;}
function normalizeCode(v){return String(v||"").trim().toUpperCase().replace(/\s+/g,"");}
function localValue(iso){if(!iso)return"";const d=new Date(iso);if(Number.isNaN(d.getTime()))return"";const z=n=>String(n).padStart(2,"0");return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;}
function isoValue(v){if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString();}
async function fn(body){const {data,error}=await supabase.functions.invoke("practice-admin",{body});if(error){let text=error.message||"Lỗi máy chủ.";try{const payload=await error.context?.json?.();if(payload?.error)text=payload.error;}catch{}throw new Error(text);}if(!data?.success)throw new Error(data?.error||"Không thể xử lý yêu cầu.");return data;}

async function restoreSession(){
  const {data:{session}}=await supabase.auth.getSession();
  if(session)showAdmin(session.user);else showLogin();
}
function showLogin(){ $("loginView").classList.remove("hidden"); $("adminView").classList.add("hidden"); }
async function showAdmin(user){
  $("loginView").classList.add("hidden"); $("adminView").classList.remove("hidden");
  $("accountName").textContent="Giảng viên / Admin"; $("accountEmail").textContent=user?.email||""; await loadSubjects();
}
async function login(){
  busy($("loginBtn"),true,"Đang đăng nhập…");msg($("loginMessage"),"");
  try{const {data,error}=await supabase.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)throw error;await showAdmin(data.user);}catch(e){msg($("loginMessage"),e.message||String(e),"error");}finally{busy($("loginBtn"),false);}
}
async function logout(){await supabase.auth.signOut();subjects=[];selectedSubject=null;detail=null;showLogin();}

function renderSubjects(){
  const host=$("subjectList");host.innerHTML="";
  if(!subjects.length){host.innerHTML='<p class="muted">Chưa có môn được phân công.</p>';return;}
  subjects.forEach(s=>{
    const node=document.createElement("div");node.className=`subject-card ${selectedSubject?.id===s.id?"active":""}`;
    const on=!!s.practice?.is_enabled;
    node.innerHTML=`<div><span class="status-dot ${on?"on":""}"></span><strong>${escapeHtml(s.name)}</strong></div><div class="muted small">${escapeHtml(s.semester||"")} • ${escapeHtml(s.academic_year||"")}</div><div class="small" style="margin-top:6px">${s.practice?`Mã: <strong>${escapeHtml(s.practice.access_code)}</strong>`:"Chưa cấu hình"}</div>`;
    node.addEventListener("click",()=>openSubject(s));host.appendChild(node);
  });
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));}
async function loadSubjects(){
  msg($("listMessage"),"Đang tải…");
  try{const data=await fn({action:"list"});subjects=data.subjects||[];msg($("listMessage"),"");renderSubjects();if(selectedSubject){const fresh=subjects.find(x=>x.id===selectedSubject.id);if(fresh)selectedSubject=fresh;}}
  catch(e){msg($("listMessage"),e.message||String(e),"error");}
}
async function openSubject(subject){
  selectedSubject=subject;renderSubjects();$("editorCard").classList.remove("hidden");msg($("saveMessage"),"Đang tải cấu hình…");
  try{detail=await fn({action:"detail",subject_id:subject.id});fillEditor();msg($("saveMessage"),"");}
  catch(e){msg($("saveMessage"),e.message||String(e),"error");}
}
function fillEditor(){
  const c=detail.config||{};$("editorMeta").textContent=[detail.subject.semester,detail.subject.academic_year].filter(Boolean).join(" • ");$("editorTitle").textContent=detail.subject.name;
  $("editorStatus").innerHTML=c.is_enabled?'<span class="status-dot on"></span><strong>Đang bật</strong>':'<span class="status-dot"></span><strong>Đang tắt</strong>';
  $("practiceTitleInput").value=c.title||`Đề ôn tập – ${detail.subject.name}`;$("accessCodeInput").value=c.access_code||"";$("enabledInput").checked=!!c.is_enabled;$("answersInput").checked=!!c.include_answers;$("redrawInput").checked=c.allow_unlimited_redraw!==false;
  $("openAtInput").value=localValue(c.open_at);$("closeAtInput").value=localValue(c.close_at);$("fallbackCountInput").value=c.question_count||20;
  $("statAvailable").textContent=detail.total_available||0;$("statWeek").textContent=detail.stats?.week_draws||0;$("statTotal").textContent=detail.stats?.total_draws||0;
  buildMatrix();updatePublicLink();
}
function buildMatrix(){
  const clos=detail.clos||[],chapters=detail.chapters||[],saved=new Map((detail.config?.matrix||[]).map(x=>[`${x.chapter_id}|${x.clo_id}`,Number(x.count)||0]));
  $("matrixHead").innerHTML=`<tr><th>Chương</th>${clos.map(c=>`<th>${escapeHtml(c.code)}</th>`).join("")}</tr>`;
  $("matrixBody").innerHTML=chapters.map(ch=>`<tr><td><strong>${escapeHtml(ch.name)}</strong></td>${clos.map(cl=>{const key=`${ch.id}|${cl.id}`,have=detail.availability?.[key]||0,val=saved.get(key)||0;return `<td><input class="matrix-input" type="number" min="0" max="${have}" value="${val}" data-chapter="${ch.id}" data-clo="${cl.id}"><span class="availability">có ${have}</span></td>`;}).join("")}</tr>`).join("");
  document.querySelectorAll(".matrix-input").forEach(i=>i.addEventListener("input",recalcMatrix));recalcMatrix();
}
function recalcMatrix(){let total=0;document.querySelectorAll(".matrix-input").forEach(i=>{const n=Math.max(0,Number(i.value)||0);total+=n;});$("matrixTotalInput").value=total;$("fallbackCountInput").disabled=total>0;}
function collectMatrix(){return [...document.querySelectorAll(".matrix-input")].map(i=>({chapter_id:i.dataset.chapter,clo_id:i.dataset.clo,count:Math.max(0,Number(i.value)||0)})).filter(x=>x.count>0);}
function updatePublicLink(){const code=normalizeCode($("accessCodeInput").value);const url=new URL("./index.html",location.href);if(code)url.searchParams.set("code",code);$("publicLink").href=url.toString();}
async function rotateCode(){
  if(!selectedSubject)return;busy($("rotateCodeBtn"),true,"Đang tạo…");msg($("saveMessage"),"");
  try{const data=await fn({action:"rotate_code",subject_id:selectedSubject.id});$("accessCodeInput").value=data.config.access_code;detail.config=data.config;updatePublicLink();msg($("saveMessage"),"Đã tạo mã mới. Mã cũ hết hiệu lực ngay.","ok");await loadSubjects();}
  catch(e){msg($("saveMessage"),e.message||String(e),"error");}finally{busy($("rotateCodeBtn"),false);}
}
async function save(){
  if(!selectedSubject)return;busy($("saveBtn"),true,"Đang lưu…");msg($("saveMessage"),"");
  try{
    const payload={action:"save",subject_id:selectedSubject.id,title:$("practiceTitleInput").value.trim(),access_code:normalizeCode($("accessCodeInput").value),is_enabled:$("enabledInput").checked,include_answers:$("answersInput").checked,allow_unlimited_redraw:$("redrawInput").checked,open_at:isoValue($("openAtInput").value),close_at:isoValue($("closeAtInput").value),question_count:Number($("fallbackCountInput").value||20),matrix:collectMatrix()};
    const data=await fn(payload);detail.config=data.config;$("accessCodeInput").value=data.config.access_code;updatePublicLink();msg($("saveMessage"),"Đã lưu cấu hình.","ok");await loadSubjects();await openSubject(subjects.find(x=>x.id===selectedSubject.id)||selectedSubject);
  }catch(e){msg($("saveMessage"),e.message||String(e),"error");}finally{busy($("saveBtn"),false);}
}

$("loginBtn").addEventListener("click",login);$("password").addEventListener("keydown",e=>{if(e.key==="Enter")login();});$("logoutBtn").addEventListener("click",logout);$("refreshBtn").addEventListener("click",loadSubjects);$("rotateCodeBtn").addEventListener("click",rotateCode);$("saveBtn").addEventListener("click",save);$("accessCodeInput").addEventListener("input",()=>{$("accessCodeInput").value=normalizeCode($("accessCodeInput").value);updatePublicLink();});
restoreSession();
