
import {$,esc,api,busy,showQR,bindQR,stamp,status} from './api.js';
let offset=0,count=0;
async function load(){
 const list=await api('list',{search:$('#search').value.trim(),offset});count=list.length;
 $('#list').innerHTML=list.length?list.map(g=>'<article class="card"><span class="badge">'+esc(g.class_name)+'</span><h2>'+esc(g.title)+'</h2><p>'+esc(g.teacher)+' · '+esc(g.semester)+'</p><small>Cập nhật '+esc(stamp(g.updated_at))+'</small><div class="toolbar"><a class="button primary" href="tra-cuu/?id='+g.id+'">Tra cứu</a><a class="button" href="quan-ly/?id='+g.id+'">Chỉnh sửa</a><button data-qr="'+g.id+'">QR</button></div></article>').join(''):'<p class="muted">Không có công bố phù hợp.</p>';
 $('#page').textContent='Trang '+(offset/50+1);$('#prev').disabled=offset===0;$('#next').disabled=count<50;
}
$('#searchBtn').onclick=()=>{offset=0;busy($('#searchBtn'),load);};
$('#search').onkeydown=e=>{if(e.key==='Enter')$('#searchBtn').click();};
$('#prev').onclick=()=>{offset=Math.max(0,offset-50);busy(null,load);};
$('#next').onclick=()=>{offset+=50;busy(null,load);};
$('#list').onclick=e=>{const button=e.target.closest('[data-qr]');if(button)busy(button,()=>showQR(button.dataset.qr));};
$('#openManage').onclick=()=>{const id=prompt('Dán mã công bố hoặc link tra cứu/quản lý:');if(!id)return;let value=id.trim();try{value=new URL(value).searchParams.get('id')||value;}catch{}if(!/^[0-9a-f-]{36}$/i.test(value)){status('Mã công bố không hợp lệ.',true);return;}location.href='quan-ly/?id='+encodeURIComponent(value);};
bindQR();busy(null,load);
