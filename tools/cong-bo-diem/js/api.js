
const cfg=window.AICLO_CONFIG;
export const client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY,{auth:{storageKey:'apmaths-grade-admin',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
export const $=s=>document.querySelector(s);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const stamp=s=>s?new Date(s).toLocaleString('vi-VN'):'Chưa cập nhật';
export function status(message,error=false){const el=$('#status');el.className='notice '+(error?'error':'success');el.textContent=message;}
export async function api(action,payload={},admin=false){
 const headers={'Content-Type':'application/json','apikey':cfg.SUPABASE_PUBLISHABLE_KEY};
 if(admin){const {data}=await client.auth.getSession();if(!data.session)throw Error('Cần đăng nhập admin.');headers.Authorization='Bearer '+data.session.access_token;}
 const response=await fetch(cfg.SUPABASE_URL+'/functions/v1/grade-publications',{method:'POST',headers,body:JSON.stringify({action,payload}),cache:'no-store'});
 let data;try{data=await response.json();}catch{throw Error('Không kết nối được dịch vụ. Thử lại sau.');}
 if(!response.ok||data.error)throw Error(data.error||'Yêu cầu thất bại.');return data;
}
export async function busy(button,fn){const disabled=button?.disabled;if(button)button.disabled=true;try{return await fn();}catch(e){status(e.message,true);}finally{if(button)button.disabled=disabled??false;}}
export function lookupLink(id){return new URL('/tools/cong-bo-diem/tra-cuu/?id='+encodeURIComponent(id),location.origin).href;}
export async function showQR(id){
 const link=lookupLink(id);const dialog=$('#qrDialog');$('#qrLink').value=link;$('#qr').replaceChildren();dialog.showModal();
 if(!window.QRCode)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';s.onload=resolve;s.onerror=()=>reject(Error('Không tải được QR. Bạn vẫn có thể sao chép link.'));document.head.append(s);});
 new window.QRCode($('#qr'),{text:link,width:220,height:220,correctLevel:window.QRCode.CorrectLevel.M});
}
export function bindQR(){
 $('#qrClose')?.addEventListener('click',()=>$('#qrDialog').close());
 $('#copyLink')?.addEventListener('click',()=>busy($('#copyLink'),async()=>{await navigator.clipboard.writeText($('#qrLink').value);status('Đã sao chép link tra cứu.');}));
}
