/* AI-CLO PTITHCM V12.6.51 — Moodle XML export for approved question-bank items. */
(()=>{
'use strict';

const TAB_SCOPE={all:'all',practice:'practice',secure_exam:'secure_exam'};
const keys=['A','B','C','D'];
const safeFileName=value=>String(value||'Ngan-hang').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'Ngan-hang';
const xmlText=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const cdata=value=>`<![CDATA[${String(value??'').replace(/]]>/g,']]]]><![CDATA[>')}]]>`;
const htmlText=value=>{
 let text=String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 text=text.replace(/\$\$([\s\S]+?)\$\$/g,(_,m)=>`\\[${m}\\]`);
 text=text.replace(/\$([^$\n]+?)\$/g,(_,m)=>`\\(${m}\\)`);
 return text.replace(/\r?\n/g,'<br>');
};
const categoryPart=value=>String(value||'Chua-phan-loai').replace(/[\\/]+/g,' - ').trim()||'Chua-phan-loai';
const scopeMatch=(item,scope)=>scope==='all'||scope==='practice'&&['practice','both'].includes(item.question_scope)||scope==='secure_exam'&&['secure_exam','both'].includes(item.question_scope);
const scopeLabel=scope=>scope==='practice'?'Luyện tập - kiểm tra':scope==='secure_exam'?'Đề thi - bảo mật':'Tất cả';
const optionMap=item=>Object.fromEntries((item.question_options||[]).map(x=>[String(x.option_key||'').toUpperCase(),String(x.content||'').trim()]));
const validQuestion=item=>{
 const options=optionMap(item);
 return keys.every(k=>options[k])&&keys.includes(String(item.correct_answer||'').toUpperCase());
};

async function resolveBank(){
 const head=document.querySelector('.v113-bank-page .v109-workspace-head');
 const code=head?.querySelector('div > small')?.textContent?.trim();
 if(!code)throw new Error('Không xác định được ngân hàng đang mở.');
 const {data,error}=await db.from('question_banks').select('id,name,code').eq('code',code).single();
 if(error)throw error;
 return data;
}

function currentScope(){
 const active=document.querySelector('.v113-tabs [data-v113-tab].active')?.dataset.v113Tab;
 return TAB_SCOPE[active]||'all';
}

function categoryXml(path){
 return `  <question type="category">\n    <category><text>${xmlText(path)}</text></category>\n  </question>`;
}

function questionXml(item,chapter,topic,clo,bank){
 const options=optionMap(item),correct=String(item.correct_answer||'').toUpperCase();
 const code=item.display_code||(typeof questionCode==='function'?questionCode(item):item.id);
 const tags=['AI-CLO',bank.code,clo?.code,item.question_scope==='secure_exam'?'De-thi-bao-mat':item.question_scope==='both'?'Ca-hai-ngan-hang':'Luyen-tap-kiem-tra'].filter(Boolean);
 const answers=keys.map(k=>`    <answer fraction="${k===correct?100:0}" format="html">\n      <text>${cdata(htmlText(options[k]))}</text>\n      <feedback format="html"><text>${cdata(k===correct?'Đúng.':'')}</text></feedback>\n    </answer>`).join('\n');
 const tagXml=tags.map(tag=>`      <tag><text>${xmlText(tag)}</text></tag>`).join('\n');
 return `  <question type="multichoice">\n    <name><text>${xmlText(code)}</text></name>\n    <questiontext format="html"><text>${cdata(`<p>${htmlText(item.content)}</p>`)}</text></questiontext>\n    <generalfeedback format="html"><text>${cdata(item.explanation?`<p>${htmlText(item.explanation)}</p>`:'')}</text></generalfeedback>\n    <defaultgrade>1.0000000</defaultgrade>\n    <penalty>0.3333333</penalty>\n    <hidden>0</hidden>\n    <single>true</single>\n    <shuffleanswers>true</shuffleanswers>\n    <answernumbering>ABCD</answernumbering>\n${answers}\n    <tags>\n${tagXml}\n    </tags>\n  </question>`;
}

async function exportCurrent(){
 if(role()!=='admin')return toast('Chỉ Admin được xuất ngân hàng sang Moodle.',true);
 const button=document.querySelector('#v126MoodleExport');
 const original=button?.textContent||'↓ Moodle XML';
 try{
  if(button){button.disabled=true;button.textContent='Đang chuẩn bị…'}
  const bank=await resolveBank(),scope=currentScope();
  const [questions,chapters,topics,clos]=await Promise.all([
   q('questions','*,question_options(*)',x=>x.eq('question_bank_id',bank.id).eq('status','active').eq('approval_status','approved').order('created_at',{ascending:true})),
   q('chapters','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),
   q('topics','*',x=>x.eq('question_bank_id',bank.id).order('order_index')),
   q('clos','*',x=>x.eq('question_bank_id',bank.id).order('code'))
  ]);
  const scoped=questions.filter(x=>scopeMatch(x,scope));
  const valid=scoped.filter(validQuestion),skipped=scoped.length-valid.length;
  if(!valid.length)return toast(scoped.length?'Không có câu trắc nghiệm hợp lệ để xuất Moodle.':'Không có câu đã duyệt trong phạm vi đang chọn.',true);
  const secure=valid.filter(x=>['secure_exam','both'].includes(x.question_scope)).length;
  const message=[`Xuất ${valid.length} câu đã duyệt, đang hoạt động ở phạm vi “${scopeLabel(scope)}” sang Moodle XML.`,skipped?`${skipped} câu thiếu đáp án hoặc phương án sẽ được bỏ qua.`:'',secure?`Có ${secure} câu thuộc phạm vi đề thi - bảo mật. Hãy lưu file ở nơi an toàn.`:''].filter(Boolean).join(' ');
  if(!await confirmAction('Xuất Moodle XML?',message,{confirmLabel:'Tải Moodle XML'}))return;

  const chapterMap=new Map(chapters.map(x=>[x.id,x])),topicMap=new Map(topics.map(x=>[x.id,x])),cloMap=new Map(clos.map(x=>[x.id,x]));
  valid.sort((a,b)=>{
   const ac=chapterMap.get(a.chapter_id)?.order_index??9999,bc=chapterMap.get(b.chapter_id)?.order_index??9999;
   if(ac!==bc)return ac-bc;
   const at=topicMap.get(a.topic_id)?.order_index??9999,bt=topicMap.get(b.topic_id)?.order_index??9999;
   if(at!==bt)return at-bt;
   return String(a.display_code||a.id).localeCompare(String(b.display_code||b.id),'vi',{numeric:true});
  });

  const parts=['<?xml version="1.0" encoding="UTF-8"?>','<quiz>'];
  let lastCategory='';
  for(const item of valid){
   const chapter=chapterMap.get(item.chapter_id),topic=topicMap.get(item.topic_id),clo=cloMap.get(item.clo_id);
   const category=`$course$/top/AI-CLO/${categoryPart(bank.name)}/${categoryPart(chapter?.name||'Khac')}/${categoryPart(topic?.name||'Chua phan loai')}`;
   if(category!==lastCategory){parts.push(categoryXml(category));lastCategory=category}
   parts.push(questionXml(item,chapter,topic,clo,bank));
  }
  parts.push('</quiz>');
  const blob=new Blob([parts.join('\n')],{type:'application/xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  const scopeSuffix=scope==='all'?'Tat-ca':scope==='practice'?'Luyen-tap':'Bao-mat';
  a.href=url;a.download=`Moodle-${safeFileName(bank.name)}-${scopeSuffix}_${new Date().toISOString().slice(0,10)}.xml`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  window.logActivity?.('export','question_bank',bank.id,`Xuất Moodle XML ${bank.name}: ${valid.length} câu (${scopeLabel(scope)})`,'success',null,{question_bank_id:bank.id,format:'moodle_xml',scope,questions:valid.length,skipped,secure});
  toast(`Đã xuất ${valid.length} câu sang Moodle XML${skipped?` · bỏ qua ${skipped} câu chưa hợp lệ`:''}`);
 }catch(error){err(error)}
 finally{if(button){button.disabled=false;button.textContent=original}}
}

function installButton(){
 const excel=document.querySelector('#v113Export');
 if(!excel||document.querySelector('#v126MoodleExport'))return;
 const button=document.createElement('button');
 button.id='v126MoodleExport';button.type='button';button.className='secondary';button.textContent='↓ Moodle XML';button.title='Xuất các câu đã duyệt trong tab hiện tại để nhập vào Moodle';
 button.onclick=exportCurrent;
 excel.insertAdjacentElement('afterend',button);
}

const observer=new MutationObserver(installButton);
observer.observe(document.documentElement,{subtree:true,childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installButton,{once:true});else installButton();
window.AICLO_MOODLE_EXPORT=Object.freeze({exportCurrent,installButton});
})();
