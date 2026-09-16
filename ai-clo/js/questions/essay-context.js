/* AI-CLO PTITHCM V12.7.2 — preserve active essay-bank context across workspaces. */
(()=>{
'use strict';
if(window.AICLO_ESSAY_CONTEXT_V1272)return;
const KEY='ai-clo:essay-active-bank:v12.7.2';
let bank='practice';
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
function sync(){syncFromList();ensureGhost()}
document.addEventListener('click',event=>{const tab=event.target.closest?.('[data-essay-bank]');if(tab)save(tab.dataset.essayBank)},true);
document.addEventListener('DOMContentLoaded',()=>{sync();const host=document.querySelector('#content');if(host)new MutationObserver(()=>requestAnimationFrame(sync)).observe(host,{childList:true,subtree:true})});
window.AICLO_ESSAY_CONTEXT_V1272=Object.freeze({version:'12.7.2',getBank:()=>bank});
})();
