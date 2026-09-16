/* AI-CLO PTITHCM V12.7.3 — keep bank tabs synchronized and keep visual caches coherent. */
(()=>{
'use strict';
if(window.AICLO_QBANK_FAST_BANK_SYNC)return;
const api=window.AICLO_ESSAY_BANK_V127;
if(!api?.setKind)return;
const baseSetKind=api.setKind;

function invalidateQuestionView(){
 window.AICLO_VIEW_TRANSITION?.invalidate?.('questions',state?.subjectId||null,state?.space||null);
}
function essayBank(){
 return document.querySelector('.essay-main-bank-tabs [data-essay-bank].active')?.dataset.essayBank||window.AICLO_ESSAY_CONTEXT_V1272?.getBank?.()||'practice';
}
function applyMcqBank(bank,attempt=0){
 if(bank!=='secure_exam')bank='practice';
 const button=document.querySelector(`[data-bank-tab="${bank}"]`);
 if(button){if(!button.classList.contains('active'))button.click();return}
 if(attempt<40)setTimeout(()=>applyMcqBank(bank,attempt+1),75);
}
async function setKind(kind){
 kind=kind==='essay'?'essay':'mcq';
 if(kind==='essay'&&api.getKind?.()!=='essay'){
  const tab=document.querySelector('[data-question-kind="essay"]');
  if(typeof tab?.onclick==='function'){
   const result=await tab.onclick();
   invalidateQuestionView();
   return result;
  }
 }
 const bank=kind==='mcq'?essayBank():null;
 const result=await baseSetKind(kind);
 invalidateQuestionView();
 if(bank)setTimeout(()=>applyMcqBank(bank),0);
 return result;
}
function invalidateFastCache(){window.AICLO_QBANK_FAST_SWITCH?.clear?.()}
document.addEventListener('submit',event=>{if(event.target?.matches?.('#essayForm'))invalidateFastCache()},true);
document.addEventListener('click',event=>{
 if(event.target.closest?.('[data-bank-tab],[data-essay-bank]'))invalidateQuestionView();
 if(event.target.closest?.('#essayVariantSave,#saveEssayQuestion,#deleteEssayQuestion'))invalidateFastCache();
},true);
window.AICLO_ESSAY_BANK_V127=Object.freeze({...api,setKind});
window.AICLO_QBANK_FAST_BANK_SYNC=Object.freeze({version:'12.7.3',applyMcqBank,invalidate:invalidateFastCache});
})();
