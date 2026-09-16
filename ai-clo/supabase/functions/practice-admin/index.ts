import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const url=Deno.env.get("SUPABASE_URL")||"";
const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const teacherRoles=new Set(["teacher","lecturer","giangvien"]);
const reply=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const clean=(v:unknown)=>String(v??"").trim();
const normalizeCode=(v:unknown)=>clean(v).toUpperCase().replace(/\s+/g,"");
const asBool=(v:unknown,fallback=false)=>typeof v==="boolean"?v:fallback;

function randomCode(length=8){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",b=crypto.getRandomValues(new Uint8Array(length));return Array.from(b,x=>a[x%a.length]).join("");}
async function uniqueCode(){for(let i=0;i<8;i++){const code=randomCode();const {data}=await admin.from("practice_configs").select("id").eq("access_code",code).maybeSingle();if(!data)return code;}throw new Error("Không tạo được mã truy cập duy nhất.");}
async function getCaller(req:Request){const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");if(!token)return null;const {data,error}=await admin.auth.getUser(token);if(error||!data.user)return null;const {data:profile}=await admin.from("profiles").select("id,role,is_active,full_name,email").eq("id",data.user.id).maybeSingle();if(!profile||profile.is_active===false)return null;return profile;}
async function allowedSubjectIds(profile:any){if(clean(profile.role)==="admin")return null;const {data,error}=await admin.from("subject_members").select("subject_id,role").eq("user_id",profile.id);if(error)throw error;return (data||[]).filter((x:any)=>teacherRoles.has(clean(x.role))).map((x:any)=>x.subject_id);}
async function assertAccess(profile:any,subjectId:string){if(clean(profile.role)==="admin")return true;const {data,error}=await admin.from("subject_members").select("id,role").eq("subject_id",subjectId).eq("user_id",profile.id).maybeSingle();if(error)throw error;return !!data&&teacherRoles.has(clean(data.role));}
async function subjectMeta(subjectId:string){const {data,error}=await admin.from("subjects").select("id,name,semester,academic_year,question_bank_id").eq("id",subjectId).single();if(error||!data)throw error||new Error("Không tìm thấy học phần.");return data;}
async function availability(questionBankId:string){const {data,error}=await admin.from("questions").select("id,chapter_id,clo_id").eq("question_bank_id",questionBankId).eq("question_scope","practice").eq("approval_status","approved").eq("status","active");if(error)throw error;const counts:Record<string,number>={},chapterCounts:Record<string,number>={};for(const q of data||[]){const key=`${q.chapter_id}|${q.clo_id}`;counts[key]=(counts[key]||0)+1;chapterCounts[q.chapter_id]=(chapterCounts[q.chapter_id]||0)+1;}return{rows:data||[],counts,chapterCounts};}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return reply({success:false,error:"Chỉ hỗ trợ POST."},405);
 try{
  const profile=await getCaller(req);if(!profile)return reply({success:false,error:"Phiên đăng nhập không hợp lệ."},401);
  const body=await req.json().catch(()=>({}));const action=clean(body.action||"list").toLowerCase();
  if(action==="list"){
   const allowed=await allowedSubjectIds(profile);if(Array.isArray(allowed)&&!allowed.length)return reply({success:true,subjects:[]});
   let q=admin.from("subjects").select("id,name,semester,academic_year,question_bank_id").order("name");if(Array.isArray(allowed))q=q.in("id",allowed);
   const {data:subjects,error}=await q;if(error)throw error;const ids=(subjects||[]).map((s:any)=>s.id);let configs:any[]=[];
   if(ids.length){const r=await admin.from("practice_configs").select("subject_id,access_code,is_enabled,allow_unlimited_redraw,open_at,close_at,title,updated_at").in("subject_id",ids);if(r.error)throw r.error;configs=r.data||[];}
   const by=new Map(configs.map((c:any)=>[c.subject_id,c]));return reply({success:true,subjects:(subjects||[]).map((s:any)=>({...s,practice:by.get(s.id)||null}))});
  }
  const subjectId=clean(body.subject_id);if(!subjectId)return reply({success:false,error:"Thiếu subject_id."},400);if(!(await assertAccess(profile,subjectId)))return reply({success:false,error:"Bạn không có quyền quản lý học phần này."},403);
  const subject=await subjectMeta(subjectId);
  if(action==="detail"){
   const [cr,chr,clr,pr,av]=await Promise.all([
    admin.from("practice_configs").select("*").eq("subject_id",subjectId).maybeSingle(),
    admin.from("chapters").select("id,name,order_index").eq("question_bank_id",subject.question_bank_id).order("order_index"),
    admin.from("clos").select("id,code,description,short_description").eq("question_bank_id",subject.question_bank_id).order("code"),
    admin.from("practice_packages").select("*").eq("subject_id",subjectId).order("sort_order").order("created_at"),
    availability(subject.question_bank_id)
   ]);if(cr.error||chr.error||clr.error||pr.error)throw cr.error||chr.error||clr.error||pr.error;
   const seven=new Date(Date.now()-7*86400000).toISOString();const [{count:total},{count:week}]=await Promise.all([admin.from("practice_draws").select("id",{count:"exact",head:true}).eq("subject_id",subjectId),admin.from("practice_draws").select("id",{count:"exact",head:true}).eq("subject_id",subjectId).gte("drawn_at",seven)]);
   return reply({success:true,subject,config:cr.data||null,chapters:chr.data||[],clos:clr.data||[],packages:pr.data||[],availability:av.counts,chapter_availability:av.chapterCounts,total_available:av.rows.length,stats:{total_draws:total||0,week_draws:week||0}});
  }
  if(action==="rotate_code"){
   const code=await uniqueCode(),now=new Date().toISOString();const {data:existing}=await admin.from("practice_configs").select("id").eq("subject_id",subjectId).maybeSingle();
   const r=existing?await admin.from("practice_configs").update({access_code:code,updated_by:profile.id,updated_at:now}).eq("subject_id",subjectId).select("*").single():await admin.from("practice_configs").insert({subject_id:subjectId,access_code:code,is_enabled:false,updated_by:profile.id}).select("*").single();if(r.error)throw r.error;return reply({success:true,config:r.data});
  }
  if(action==="save_config"){
   let accessCode=normalizeCode(body.access_code);if(!accessCode)accessCode=await uniqueCode();if(!/^[A-Z0-9-]{4,32}$/.test(accessCode))return reply({success:false,error:"Mã truy cập chỉ dùng A-Z, 0-9, dấu gạch ngang; dài 4-32 ký tự."},400);
   const openAt=clean(body.open_at)||null,closeAt=clean(body.close_at)||null;if(openAt&&Number.isNaN(Date.parse(openAt)))return reply({success:false,error:"Thời gian mở không hợp lệ."},400);if(closeAt&&Number.isNaN(Date.parse(closeAt)))return reply({success:false,error:"Thời gian đóng không hợp lệ."},400);if(openAt&&closeAt&&new Date(openAt)>=new Date(closeAt))return reply({success:false,error:"Thời gian đóng phải sau thời gian mở."},400);
   const payload={subject_id:subjectId,access_code:accessCode,is_enabled:asBool(body.is_enabled,false),allow_unlimited_redraw:asBool(body.allow_unlimited_redraw,true),open_at:openAt,close_at:closeAt,title:clean(body.title)||null,updated_by:profile.id,updated_at:new Date().toISOString()};
   const r=await admin.from("practice_configs").upsert(payload,{onConflict:"subject_id"}).select("*").single();if(r.error){if(/duplicate|unique/i.test(r.error.message||""))return reply({success:false,error:"Mã truy cập này đang được môn khác sử dụng."},409);throw r.error;}return reply({success:true,config:r.data});
  }
  if(action==="delete_package"){
   const packageId=clean(body.package_id);if(!packageId)return reply({success:false,error:"Thiếu package_id."},400);const {data:p}=await admin.from("practice_packages").select("id").eq("id",packageId).eq("subject_id",subjectId).maybeSingle();if(!p)return reply({success:false,error:"Không tìm thấy gói ôn tập."},404);const r=await admin.from("practice_packages").delete().eq("id",packageId).eq("subject_id",subjectId);if(r.error)throw r.error;return reply({success:true});
  }
  if(action==="save_package"){
   const packageId=clean(body.package_id)||null,name=clean(body.name);if(!name||name.length>120)return reply({success:false,error:"Tên gói ôn tập phải từ 1 đến 120 ký tự."},400);
   const [chr,clr,av]=await Promise.all([admin.from("chapters").select("id").eq("question_bank_id",subject.question_bank_id),admin.from("clos").select("id").eq("question_bank_id",subject.question_bank_id),availability(subject.question_bank_id)]);if(chr.error||clr.error)throw chr.error||clr.error;
   const validCh=new Set((chr.data||[]).map((x:any)=>x.id)),validCl=new Set((clr.data||[]).map((x:any)=>x.id));const chapterIds=[...new Set((Array.isArray(body.chapter_ids)?body.chapter_ids:[]).map(clean).filter(Boolean))];if(!chapterIds.length||chapterIds.some(id=>!validCh.has(id)))return reply({success:false,error:"Hãy chọn ít nhất một chương hợp lệ."},400);
   const mode=clean(body.draw_mode)==="matrix"?"matrix":"count";let questionCount=Number(body.question_count||20),matrix:any[]=[];
   if(mode==="count"){
    if(!Number.isInteger(questionCount)||questionCount<1||questionCount>200)return reply({success:false,error:"Số câu phải từ 1 đến 200."},400);const have=av.rows.filter((q:any)=>chapterIds.includes(q.chapter_id)).length;if(questionCount>have)return reply({success:false,error:`Các chương đã chọn chỉ có ${have} câu luyện tập đã duyệt.`},409);
   }else{
    const raw=Array.isArray(body.matrix)?body.matrix:[];for(const x of raw){const chapter_id=clean(x.chapter_id),clo_id=clean(x.clo_id),count=Number(x.count||0);if(!count)continue;if(!chapterIds.includes(chapter_id)||!validCl.has(clo_id)||!Number.isInteger(count)||count<0||count>200)return reply({success:false,error:"Ma trận Chương × CLO không hợp lệ."},400);const have=av.counts[`${chapter_id}|${clo_id}`]||0;if(count>have)return reply({success:false,error:`Một ô ma trận yêu cầu ${count} câu nhưng chỉ có ${have} câu.`},409);matrix.push({chapter_id,clo_id,count});}
    questionCount=matrix.reduce((s,x)=>s+x.count,0);if(questionCount<1||questionCount>200)return reply({success:false,error:"Tổng số câu trong ma trận phải từ 1 đến 200."},400);
   }
   const payload={subject_id:subjectId,name,is_enabled:asBool(body.is_enabled,true),chapter_ids:chapterIds,draw_mode:mode,question_count:questionCount,matrix,include_answers:asBool(body.include_answers,false),sort_order:Number.isInteger(Number(body.sort_order))?Number(body.sort_order):0,updated_at:new Date().toISOString()};
   let r;if(packageId){const own=await admin.from("practice_packages").select("id").eq("id",packageId).eq("subject_id",subjectId).maybeSingle();if(!own.data)return reply({success:false,error:"Không tìm thấy gói ôn tập."},404);r=await admin.from("practice_packages").update(payload).eq("id",packageId).eq("subject_id",subjectId).select("*").single();}else r=await admin.from("practice_packages").insert(payload).select("*").single();if(r.error)throw r.error;return reply({success:true,package:r.data});
  }
  return reply({success:false,error:"Action không hợp lệ."},400);
 }catch(error){console.error(error);return reply({success:false,error:"Không thể xử lý cấu hình rút đề lúc này."},500);}
});
