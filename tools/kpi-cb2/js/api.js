const config=window.AICLO_CONFIG;
export const auth=window.supabase.createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY,{auth:{storageKey:'apmaths-kpi-manager',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}).auth;
export async function call(action,payload={},manager=false){
 const headers={'Content-Type':'application/json',apikey:config.SUPABASE_PUBLISHABLE_KEY};
 if(manager){const {data}=await auth.getSession();if(!data.session)throw Error('Cần đăng nhập quản lý');headers.Authorization='Bearer '+data.session.access_token;}
 const response=await fetch(config.SUPABASE_URL+'/functions/v1/kpi-cb2',{method:'POST',headers,body:JSON.stringify({action,payload}),signal:AbortSignal.timeout(65000)});
 let result;try{result=await response.json();}catch{throw Error('Không kết nối được máy chủ KPI. Thử lại sau.');}
 if(!response.ok||result.error){const error=new Error(result.error||'Không xử lý được yêu cầu');error.status=response.status;throw error;}
 return result;
}
