/* AI-CLO PTITHCM V12.7.3 — preserve essay context and load fast bank switching after app modules. */
(()=>{
'use strict';
if(window.AICLO_ESSAY_CONTEXT_V1272)return;
const KEY='ai-clo:essay-active-bank:v12.7.2';
let bank='practice',lastEssayId=null,decorating=false;
try{bank=sessionStorage.getItem(KEY)==='secure_exam'?'secure_exam':'practice'}catch{}
const save=value=>{bank=value==='secure_exam'?'secure_exam':'practice';try{sessionStorage.setItem(KEY,bank)}catch{}};
function syncFromList(){
 const active=document.querySelector('.essay-main-bank-tabs [data-essay-bank].active');
 if(active)save(active.dataset.essayBank);
 const search=document.querySelector('#essaySearchRow'),filters=document.querySelector('.essay-question-tools.essay-filter-source');
 if(search&&filters&&search.nextElementSibling!==filters)filters.parentElement?.insertBefore(search,filters);
}
function ensureGhost(){
 if(document.querySelector('.essay-main-bank-tabs'))return;
 const detail=document.querySelector('#essayDetail');
 if(!detail)return;
 const ghost=document.createElement('div');
 ghost.className='essay-main-bank-tabs essay-context-ghost';
 ghost.hidden=true;
 ghost.setAttribute('aria-hidden','true');
 ghost.innerHTML=`<button type="button" class="active" data-essay-bank="${bank}"></button>`;
 detail.appendChild(ghost);
}
async function decorateWorkspaceCode(){
 const form=document.querySelector('#essayForm');
 if(decorating||!lastEssayId||!form||form.dataset.essayCodeDecorated==='1')return;
 const heading=document.querySelector('.question-workspace .workspace-head h3');
 if(!heading||!/^Sửa\s+TL-/i.test(String(heading.textContent||'').trim()))return;
 const loader=window.AICLO_ESSAY_BANK_V127?.load;if(typeof loader!=='function')return;
 decorating=true;
 try{const data=await loader();const item=(data.items||[]).find(x=>String(x.id)===String(lastEssayId));if(item?.display_code){heading.textContent=`Sửa ${item.display_code}`;form.dataset.essayCodeDecorated='1'}}catch(ex){console.warn('Không cập nhật được mã câu tự luận trên trang sửa',ex)}finally{decorating=false}
}
function sync(){syncFromList();ensureGhost();decorateWorkspaceCode()}
function loadFastSwitch(){
 if(window.AICLO_QBANK_FAST_SWITCH||document.querySelector('script[data-qbank-fast-switch]'))return;
 const script=document.createElement('script');
 script.src='js/questions/bank-fast-switch.js?v=12.7.3';
 script.async=true;
 script.dataset.qbankFastSwitch='1';
 script.onerror=()=>console.warn('Không tải được bộ chuyển tab nhanh của Ngân hàng câu hỏi.');
 document.head.appendChild(script);
}
document.addEventListener('click',event=>{
 const tab=event.target.closest?.('[data-essay-bank]');if(tab)save(tab.dataset.essayBank);
 const q=event.target.closest?.('[data-essay-detail],[data-essay-edit]');if(q)lastEssayId=q.dataset.essayDetail||q.dataset.essayEdit||lastEssayId;
},true);
document.addEventListener('DOMContentLoaded',()=>{
 sync();
 const host=document.querySelector('#content');if(host)new MutationObserver(()=>requestAnimationFrame(sync)).observe(host,{childList:true,subtree:true});
 loadFastSwitch();
});
window.AICLO_ESSAY_CONTEXT_V1272=Object.freeze({version:'12.7.3',getBank:()=>bank,getLastEssayId:()=>lastEssayId});
})();
