import {Field,primeStatus} from './field.js';
import {calculate,parse} from './expression.js';
self.onmessage=({data})=>{
 try{
  if(data.action==='prime'){self.postMessage({ok:true,...primeStatus(data.p)});return;}
  const F=new Field(data.p),matrices={},used=new Set();
  function visit(node){if(node.kind==='matrix'&&node.name!=='I')used.add(node.name);if(node.left)visit(node.left);if(node.right)visit(node.right);if(node.arg)visit(node.arg);node.args?.forEach(visit);}
  visit(parse(data.expression));
  for(const item of data.matrices){if(!used.has(item.name))continue;matrices[item.name]=item.cells.map((row,i)=>row.map((value,j)=>{try{return F.parse(value);}catch(e){e.cell={name:item.name,row:i,col:j};throw e;}}));}
  const result=calculate(data.expression,matrices,F,data.identitySize);
  self.postMessage({ok:true,kind:result.kind,value:Array.isArray(result.value)?result.value.map(r=>r.map(String)):String(result.value)});
 }catch(e){self.postMessage({ok:false,error:e.message,position:e.position,cell:e.cell});}
};
