import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const url=Deno.env.get("SUPABASE_URL")||"",serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(body:Record<string,unknown>,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
const clean=(v:unknown)=>String(v??"").trim();
const normalizeCode=(v:unknown)=>clean(v).toUpperCase().replace(/\s+/g,"");
const normalizeSeed=(v:unknown)=>clean(v).toUpperCase().replace(/[^A-Z0-9-]/g,"").slice(0,40);
function randomSeed(length=8){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",b=crypto.getRandomValues(new Uint8Array(length));return Array.from(b,x=>a[x%a.length]).join("");}
function xmur3(str:string){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=(h<<13)|(h>>>19);}return()=>{h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);return(h^=h>>>16)>>>0;};}
function mulberry32(seed:number){return()=>{let t=(seed+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function shuffled<T>(items:T[],salt:string){const rand=mulberry32(xmur3(salt)()),out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
async function stateByCode(code:string){const {data:config,error}=await admin.from("practice_configs").select("id,subject_id,access_code,is_enabled,allow_unlimited_redraw,open_at,close_at,title").eq("access_code",code).maybeSingle();if(error)throw error;if(!config)return{error:"Mã truy cập không hợp lệ.",status:404}as const;const now=Date.now();if(!config.is_enabled)return{error:"Môn này hiện chưa mở rút đề ôn tập.",status:403}as const;if(config.open_at&&now<new Date(config.open_at).getTime())return{error:"Chức năng rút đề của môn này chưa đến thời gian mở.",status:403}as const;if(config.close_at&&now>new Date(config.close_at).getTime())return{error:"Chức năng rút đề của môn này đã đóng.",status:403}as const;const {data:subject,error:se}=await admin.from("subjects").select("id,name,semester,academic_year,question_bank_id").eq("id",config.subject_id).single();if(se||!subject)throw se||new Error("Không tìm thấy học phần.");return{config,subject}as const;}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({success:false,error:"Chỉ hỗ trợ POST."},405);
 try{
  const body=await req.json().catch(()=>({})),action=clean(body.action||"resolve").toLowerCase(),code=normalizeCode(body.code);if(!/^[A-Z0-9-]{4,32}$/.test(code))return json({success:false,error:"Mã truy cập không hợp lệ."},400);
  const state=await stateByCode(code);if("error" in state)return json({success:false,error:state.error},state.status);const {config,subject}=state;
  if(action==="resolve"){
   const {data:packages,error:pe}=await admin.from("practice_packages").select("id,name,chapter_ids,draw_mode,question_count,include_answers,sort_order").eq("subject_id",subject.id).eq("is_enabled",true).order("sort_order").order("created_at");if(pe)throw pe;
   const chapterIds=[...new Set((packages||[]).flatMap((p:any)=>p.chapter_ids||[]))];let chapterNames=new Map<string,string>();if(chapterIds.length){const {data:chs,error:ce}=await admin.from("chapters").select("id,name").in("id",chapterIds);if(ce)throw ce;chapterNames=new Map((chs||[]).map((c:any)=>[c.id,c.name]));}
   return json({success:true,subject:{name:subject.name,semester:subject.semester,academic_year:subject.academic_year},practice:{title:config.title||`Đề ôn tập – ${subject.name}`,allow_unlimited_redraw:config.allow_unlimited_redraw},packages:(packages||[]).map((p:any)=>({id:p.id,name:p.name,draw_mode:p.draw_mode,question_count:p.question_count,include_answers:p.include_answers,chapters:(p.chapter_ids||[]).map((id:string)=>chapterNames.get(id)).filter(Boolean)}))});
  }
  if(action!=="draw")return json({success:false,error:"Action không hợp lệ."},400);
  const packageId=clean(body.package_id);if(!packageId)return json({success:false,error:"Hãy chọn gói ôn tập."},400);
  const {data:pkg,error:pge}=await admin.from("practice_packages").select("*").eq("id",packageId).eq("subject_id",subject.id).eq("is_enabled",true).maybeSingle();if(pge)throw pge;if(!pkg)return json({success:false,error:"Gói ôn tập không tồn tại hoặc đang tắt."},404);
  let seed=normalizeSeed(body.seed);if(!seed)seed=randomSeed();if(seed.length<4)return json({success:false,error:"Seed không hợp lệ."},400);
  let selectedIds:string[]|null=null;const {data:old,error:oe}=await admin.from("practice_draws").select("selected_question_ids").eq("subject_id",subject.id).eq("package_id",pkg.id).eq("seed",seed).maybeSingle();if(oe)throw oe;if(old?.selected_question_ids?.length)selectedIds=old.selected_question_ids;
  const {data:poolRows,error:poolError}=await admin.from("questions").select("id,content,correct_answer,explanation,chapter_id,clo_id,display_code").eq("question_bank_id",subject.question_bank_id).eq("question_scope","practice").eq("approval_status","approved").eq("status","active").in("chapter_id",pkg.chapter_ids).order("id");if(poolError)throw poolError;const pool=poolRows||[];if(!pool.length)return json({success:false,error:"Các chương trong gói này chưa có câu hỏi luyện tập đã duyệt."},409);
  if(!selectedIds){const picked:string[]=[];if(pkg.draw_mode==="matrix"){
    const requested=(Array.isArray(pkg.matrix)?pkg.matrix:[]).map((x:any)=>({chapter_id:clean(x.chapter_id),clo_id:clean(x.clo_id),count:Number(x.count||0)})).filter((x:any)=>x.chapter_id&&x.clo_id&&Number.isInteger(x.count)&&x.count>0);
    for(const cell of requested){const candidates=pool.filter((q:any)=>q.chapter_id===cell.chapter_id&&q.clo_id===cell.clo_id);if(candidates.length<cell.count)return json({success:false,error:`Ngân hàng không đủ câu cho ma trận đã cấu hình (${cell.count} cần, ${candidates.length} có).`},409);picked.push(...shuffled(candidates,`${seed}|${pkg.id}|${cell.chapter_id}|${cell.clo_id}`).slice(0,cell.count).map((q:any)=>q.id));}
    if(!picked.length)return json({success:false,error:"Gói này chưa có ma trận CLO hợp lệ."},409);
   }else{const count=Number(pkg.question_count||20);if(count>pool.length)return json({success:false,error:`Gói này cần ${count} câu nhưng hiện chỉ có ${pool.length} câu đủ điều kiện.`},409);picked.push(...shuffled(pool,`${seed}|${pkg.id}|COUNT`).slice(0,count).map((q:any)=>q.id));}
   selectedIds=picked;const {error:le}=await admin.from("practice_draws").insert({subject_id:subject.id,package_id:pkg.id,seed,selected_question_ids:selectedIds});if(le&&!/duplicate/i.test(le.message||""))throw le;
  }
  const byId=new Map(pool.map((q:any)=>[q.id,q])),selected=selectedIds.map(id=>byId.get(id)).filter(Boolean);if(!selected.length)return json({success:false,error:"Không thể tái tạo đề từ seed này."},409);
  const {data:opts,error:opte}=await admin.from("question_options").select("question_id,option_key,content,image_path").in("question_id",selectedIds).order("option_key");if(opte)throw opte;const optionsBy=new Map<string,any[]>();for(const o of opts||[]){const arr=optionsBy.get(o.question_id)||[];arr.push({key:o.option_key,content:o.content,image_path:o.image_path||null});optionsBy.set(o.question_id,arr);}
  const questions=selected.map((q:any,i:number)=>{const base:any={number:i+1,display_code:q.display_code,content:q.content,options:optionsBy.get(q.id)||[]};if(pkg.include_answers){base.correct_answer=q.correct_answer;base.explanation=q.explanation||null;}return base;});
  return json({success:true,seed,subject:{name:subject.name,semester:subject.semester,academic_year:subject.academic_year},practice:{title:`${config.title||`Đề ôn tập – ${subject.name}`} • ${pkg.name}`,package_name:pkg.name,include_answers:pkg.include_answers,allow_unlimited_redraw:config.allow_unlimited_redraw},questions});
 }catch(error){console.error(error);return json({success:false,error:"Không thể rút đề lúc này. Vui lòng thử lại."},500);}
});
