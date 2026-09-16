// AI·CLO APMaths — public scoped chat helper.
const MODEL = Deno.env.get('GEMINI_CHAT_MODEL') || 'gemini-3.5-flash-lite';
const ALLOWED_ORIGINS = new Set([
  'https://apmaths.github.io',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
]);
const KNOWLEDGE_URL = 'https://raw.githubusercontent.com/APMatHS/apmaths.github.io/main/ai-clo/data/ai-clo-knowledge.json';
const SYSTEM = 'Bạn là trợ lý AI·CLO APMaths. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt về AI·CLO, CLO và cách dùng hệ thống. Chỉ dùng thông tin được cung cấp; không bịa dữ liệu.';
let cache:{at:number;data:any}={at:0,data:null};

function cors(origin:string|null){
  const allowed=origin&&ALLOWED_ORIGINS.has(origin)?origin:'https://apmaths.github.io';
  return {
    'Access-Control-Allow-Origin':allowed,
    'Access-Control-Allow-Headers':'content-type, authorization, apikey, x-client-info',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Vary':'Origin'
  };
}
function json(body:unknown,status:number,origin:string|null){
  return new Response(JSON.stringify(body),{status,headers:{...cors(origin),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
function clean(v:unknown,n:number){return typeof v==='string'?v.replace(/\u0000/g,'').trim().slice(0,n):'';}
function normalize(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[^a-z0-9\s.-]/g,' ').replace(/\s+/g,' ').trim();}
async function knowledge(){
  if(cache.data&&Date.now()-cache.at<300000)return cache.data;
  try{
    const r=await fetch(KNOWLEDGE_URL,{headers:{Accept:'application/json'},cache:'no-store'});
    if(r.ok){const d=await r.json();cache={at:Date.now(),data:d};return d;}
  }catch(e){console.warn('knowledge',e);}
  return cache.data||{topics:[{id:'overview',title:'AI·CLO APMaths',keywords:['ai-clo','ai·clo','clo','apmaths'],content:'AI·CLO APMaths là hệ thống hỗ trợ đánh giá sinh viên theo chuẩn đầu ra học phần.'}]};
}
function selectContext(q:string,k:any){
  const nq=normalize(q),topics=Array.isArray(k?.topics)?k.topics:[];
  const scored=topics.map((t:any)=>({t,s:(Array.isArray(t.keywords)?t.keywords:[]).reduce((a:number,x:any)=>a+(nq.includes(normalize(String(x)))?4:0),0)})).sort((a:any,b:any)=>b.s-a.s);
  const chosen=scored.filter((x:any)=>x.s>0).slice(0,3).map((x:any)=>x.t);
  const use=chosen.length?chosen:topics.filter((t:any)=>t.id==='overview').slice(0,1);
  const rules=[k?.rules?.dynamic_data,k?.rules?.style].filter(Boolean).join('\n');
  return [rules,...use.map((t:any)=>`[${t.title||t.id}]\n${clean(t.content,1800)}`)].filter(Boolean).join('\n\n').slice(0,5000);
}

Deno.serve(async(req)=>{
  const origin=req.headers.get('origin');
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json({ok:false,error:'Origin không được phép.'},403,origin);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
  if(req.method!=='POST')return json({ok:false,error:'Chỉ hỗ trợ POST.'},405,origin);
  const apiKey=Deno.env.get('GEMINI_API_KEY')||Deno.env.get('GEMINI_LIVE_API_KEY');
  if(!apiKey)return json({ok:false,error:'Chưa cấu hình Gemini API key.'},500,origin);
  let body:any;
  try{body=await req.json();}catch{return json({ok:false,error:'Dữ liệu không hợp lệ.'},400,origin);}
  const message=clean(body?.message,600);
  if(!message)return json({ok:false,error:'Vui lòng nhập câu hỏi.'},400,origin);
  const history=(Array.isArray(body?.history)?body.history:[]).slice(-8).map((x:any)=>({role:x?.role==='model'?'model':'user',parts:[{text:clean(x?.text,900)}]})).filter((x:any)=>x.parts[0].text);
  const ctx=selectContext(message,await knowledge());
  const contents=[...history,{role:'user',parts:[{text:`THÔNG TIN THAM KHẢO:\n${ctx}\n\nCÂU HỎI:\n${message}`}]}];
  try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},
      body:JSON.stringify({systemInstruction:{parts:[{text:SYSTEM}]},contents,generationConfig:{maxOutputTokens:500,temperature:0.4}})
    });
    const d=await r.json().catch(()=>({}));
    if(!r.ok){console.error('Gemini chat',r.status,d);return json({ok:false,error:'Không thể nhận phản hồi từ AI·CLO.',detail:`Gemini HTTP ${r.status}`},502,origin);}
    const reply=(d?.candidates?.[0]?.content?.parts||[]).map((p:any)=>p?.text||'').join('').trim();
    if(!reply)return json({ok:false,error:'AI·CLO chưa trả về nội dung.'},502,origin);
    return json({ok:true,reply},200,origin);
  }catch(e){console.error('ai_clo_chat',e);return json({ok:false,error:'AI·CLO Chat gặp lỗi.'},500,origin);}
});
