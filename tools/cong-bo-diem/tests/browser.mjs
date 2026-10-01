
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const server=http.createServer((req,res)=>{
 let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname.endsWith('/'))pathname+='index.html';
 const file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'text/javascript',body:"window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:sessionStorage.getItem('mock-admin')?{access_token:'mock'}:null}}),signInWithPassword:async()=>{sessionStorage.setItem('mock-admin','1');return {error:null};},signOut:async()=>{sessionStorage.removeItem('mock-admin');return {error:null};}},storage:{from:()=>({uploadToSignedUrl:async()=>({error:null})})}})};"}));
const id='00000000-0000-4000-8000-000000000001';
let g={id,title:'Toán cơ sở',teacher:'Giảng viên',class_name:'D26',semester:'HK1',note:'Điểm tạm thời',published:true,source:'paste',columns:['MSSV','Điểm','Ngày sinh'],rows:[['001','8','01/02/2000']],visible_columns:[1],verification:[{type:'mssv',column:0,label:'MSSV'}],revision:1,source_config:{},updated_at:new Date().toISOString()};
await page.route('**/functions/v1/grade-publications',async route=>{
 const {action,payload}=route.request().postDataJSON();let data;
 switch(action){
 case 'list':data=[g];break;
 case 'meta':data={...g,rows:undefined,columns:undefined};break;
 case 'lookup':data=payload.values[0]==='001'?{fields:[{label:'Điểm',value:'8'}],note:g.note,updated_at:g.updated_at}:{error:'Không tìm thấy kết quả phù hợp'};break;
 case 'create':g={...g,title:payload.title,teacher:payload.teacher,class_name:payload.class_name,published:false,columns:[],rows:[],visible_columns:[],verification:[],revision:1,source:'excel'};data={id,token:'mock-session'};break;
 case 'read':data=g;break;
 case 'save':g={...g,...payload,revision:g.revision+1};data={ok:true,revision:g.revision};break;
 case 'settings':data={code_configured:true,google_email:null};break;
 case 'set_code':data={ok:true};break;
 case 'unlock':data={token:'mock-session'};break;
 case 'connector':data={configured:false,email:null};break;
 case 'reset_password':case 'delete':data={ok:true};break;
 default:throw Error('Unexpected action '+action);
 }
 await route.fulfill({status:data.error?400:200,contentType:'application/json',body:JSON.stringify(data)});
});
try{
 await page.goto(origin+'/tools/cong-bo-diem/');
 await page.getByRole('heading',{name:'Toán cơ sở'}).waitFor();
 await page.getByRole('link',{name:'Tra cứu',exact:true}).click();
 await page.locator('[data-field="0"]').fill('002');await page.getByRole('button',{name:'Tra cứu kết quả'}).click();
 await page.locator('#status.error').waitFor();assert.equal(await page.locator('#resultPanel').isVisible(),false);
 await page.locator('[data-field="0"]').fill('001');await page.getByRole('button',{name:'Tra cứu kết quả'}).click();
 await page.locator('#resultPanel').waitFor();assert.match(await page.locator('#result').innerText(),/Điểm\s+8/);
 assert.doesNotMatch(await page.locator('#result').innerText(),/Ngày sinh|MSSV/);
 await page.goto(origin+'/tools/cong-bo-diem/quan-ly/');
 await page.locator('#newTitle').fill('Giải tích 1');await page.locator('#newTeacher').fill('Nam');await page.locator('#newClass').fill('D26A');
 await page.locator('#creationCode').fill('1234');await page.locator('#editPassword').fill('password-test');
 await page.locator('#newClass').fill('');await page.locator('#gateBtn').click();
 await page.locator('#status.error').waitFor();assert.equal(await page.locator('#newClass').getAttribute('aria-invalid'),'true');
 await page.getByRole('button',{name:'Đóng thông báo'}).click();await page.locator('#newClass').fill('D26A');
 await page.locator('#gateBtn').click();await page.locator('#editor').waitFor();
 await page.locator('#source').selectOption('paste');
 await page.locator('#pasteWhole').click();await page.locator('#pasteText').fill('MSSV\tĐiểm\tNgày sinh\n001\t8\t01/02/2000\n002\t9\t02/03/2000');
 await page.locator('#inspectPaste').click();await page.locator('#applyPaste').click();
 assert.equal(await page.locator('#table tbody tr').count(),2);
 assert.equal(await page.locator('[data-visible="2"]').isChecked(),false);
 await page.locator('[data-row="0"][data-cell="0"]').fill('');await page.locator('#validate').click();
 await page.locator('#status.error').waitFor();assert.equal(await page.locator('[data-row="0"][data-cell="0"]').getAttribute('aria-invalid'),'true');
 await page.getByRole('button',{name:'Đóng thông báo'}).click();await page.locator('[data-row="0"][data-cell="0"]').fill('001');
 await page.locator('#validate').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Dữ liệu hợp lệ'));
 await page.locator('#preview').click();await page.locator('[data-preview="0"]').fill('001');await page.locator('#previewForm button').click();
 assert.match(await page.locator('#previewResult').innerText(),/Điểm\s+8/);await page.locator('#closePreview').click();
 await page.locator('[data-row="0"][data-cell="1"]').fill('7.5');
 await page.locator('#published').check();await page.locator('#save').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Đã lưu và mở công bố'));
 const notice=await page.locator('#status').boundingBox(),viewport=page.viewportSize();
 assert.ok(Math.abs(notice.x+notice.width/2-viewport.width/2)<2);assert.ok(Math.abs(notice.y+notice.height/2-viewport.height/2)<2);
 assert.ok(await page.locator('#status').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=20));
 assert.equal(await page.locator('header nav a').first().evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
 await page.locator('header nav a').first().hover();assert.equal(await page.locator('header nav a').first().evaluate(el=>getComputedStyle(el).textDecorationLine),'none');
 await page.screenshot({path:'/tmp/grade-saved.png'});
 assert.equal(g.rows[0][1],'7.5');assert.equal(g.published,true);
 await page.goto(origin+'/tools/cong-bo-diem/login/');
 await page.locator('#email').fill('admin@example.test');await page.locator('#password').fill('password-test');await page.locator('#loginBtn').click();
 await page.locator('#adminPanel').waitFor();await page.locator('[data-reset]').waitFor();
 await page.locator('#code').fill('4321');await page.locator('#codeBtn').click();
 await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Đã lưu mã tạo chung'));
 assert.deepEqual(errors,[]);
 console.log('Browser workflows passed: list, private lookup, create, paste, preview, cell edit, save, admin login/settings.');
}finally{await browser.close();server.close();}

