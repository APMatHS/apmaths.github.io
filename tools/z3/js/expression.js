import * as M from './matrix.js';
function problem(message,pos){const e=new Error(message+(pos===undefined?'':' (vị trí '+(pos+1)+')'));e.position=pos;return e;}
export function parse(expression){
 if(typeof expression!=='string'||expression.length>10000)throw Error('Biểu thức quá dài.');
 const tokens=[];let pos=0;const regex=/\s+|\d+|[a-zA-Z]+|[+\-*\/^(),⊗∘]/y;
 while(pos<expression.length){regex.lastIndex=pos;const m=regex.exec(expression);if(!m)throw problem('Ký tự không hợp lệ: '+expression[pos],pos);if(m[0].trim())tokens.push({value:m[0],pos});pos=regex.lastIndex;if(tokens.length>2000)throw Error('Biểu thức quá phức tạp.');}
 tokens.push({value:'',pos:expression.length});let i=0,depth=0;
 const peek=()=>tokens[i].value;const take=()=>tokens[i++];
 function expect(s){if(peek()!==s)throw problem('Cần dấu '+s,tokens[i].pos);take();}
 function sum(){let a=product();while(['+','-'].includes(peek())){const op=take();a={kind:'binary',op:op.value,left:a,right:product(),pos:op.pos};}return a;}
 function product(){let a=unary();while(true){let op;if(['*','/','⊗','∘'].includes(peek()))op=take();else if(/^\d+$/.test(peek())||/^[A-Z]$/.test(peek())||peek()==='('||/^[a-z]+$/.test(peek()))op={value:'*',pos:tokens[i].pos};else break;a={kind:'binary',op:op.value,left:a,right:unary(),pos:op.pos};}return a;}
 function unary(){if(['+','-'].includes(peek())){const t=take();return {kind:'unary',op:t.value,arg:unary(),pos:t.pos};}return postfix();}
 function integer(){let sign='';if(['+','-'].includes(peek()))sign=take().value;const t=take();if(!/^\d+$/.test(t.value))throw problem('Số mũ phải là số nguyên',t.pos);return BigInt(sign+t.value);}
 function postfix(){let a=atom();while(peek()==='^'){const op=take();if(peek()==='T'){take();a={kind:'call',name:'transpose',args:[a],pos:op.pos};}else{let k;if(peek()==='('){take();k=integer();expect(')');}else k=integer();a={kind:'power',arg:a,exponent:k,pos:op.pos};if(peek()==='^'&&tokens[i+1].value!=='T')throw problem('Dùng ngoặc để xác định thứ tự các lũy thừa',tokens[i].pos);}}return a;}
 function atom(){if(++depth>100)throw Error('Biểu thức lồng quá sâu.');try{const t=take();if(/^\d+$/.test(t.value))return {kind:'number',value:BigInt(t.value),pos:t.pos};if(/^[A-Z]$/.test(t.value))return {kind:'matrix',name:t.value,pos:t.pos};if(t.value==='('){const a=sum();expect(')');return a;}if(/^[a-z]+$/.test(t.value)){expect('(');const args=[];if(peek()!==')'){args.push(sum());while(peek()===','){take();args.push(sum());}}expect(')');return {kind:'call',name:t.value,args,pos:t.pos};}throw problem('Thiếu số, ma trận hoặc biểu thức',t.pos);}finally{depth--;}}
 if(!expression.trim())throw Error('Nhập biểu thức cần tính.');const ast=sum();if(peek())throw problem('Ký hiệu không đúng vị trí: '+peek(),tokens[i].pos);return ast;
}
export function calculate(expression,matrices,F,identitySize=2){
 const ast=parse(expression);let visits=0;
 const isMatrix=Array.isArray;const needMatrix=x=>{if(!isMatrix(x))throw Error('Phép toán này cần ma trận.');return x;};
 function integerArg(node){let n;if(node.kind==='number')n=node.value;else if(node.kind==='unary'&&node.arg.kind==='number')n=node.op==='-'?-node.arg.value:node.arg.value;else throw Error('Kích thước và chỉ số phải là số nguyên trực tiếp.');if(n<1n||n>4096n)throw Error('Kích thước/chỉ số ngoài giới hạn.');return Number(n);}
 function evalNode(node,hint=identitySize){
  if(++visits>3000)throw Error('Biểu thức quá phức tạp.');
  try{
   if(node.kind==='number')return F.norm(node.value);
   if(node.kind==='matrix'){if(node.name==='I')return M.identity(hint);if(!matrices[node.name])throw Error('Chưa có ma trận '+node.name+'.');return matrices[node.name];}
   if(node.kind==='unary'){const a=evalNode(node.arg,hint);return node.op==='+'?a:isMatrix(a)?M.scale(a,-1n,F):F.norm(-a);}
   if(node.kind==='power'){const a=evalNode(node.arg,hint);return isMatrix(a)?M.power(a,node.exponent,F):F.pow(a,node.exponent);}
   if(node.kind==='binary'){
    let a,b;
    if(node.left.kind==='matrix'&&node.left.name==='I'){b=evalNode(node.right,hint);a=evalNode(node.left,isMatrix(b)?M.shape(b)[0]:hint);}
    else{a=evalNode(node.left,hint);b=evalNode(node.right,isMatrix(a)?M.shape(a)[node.op==='*'?1:0]:hint);}
    if(!isMatrix(a)&&!isMatrix(b)){if(node.op==='+')return F.norm(a+b);if(node.op==='-')return F.norm(a-b);if(node.op==='*')return F.norm(a*b);if(node.op==='/')return F.norm(a*F.inv(b));throw Error('Toán tử này cần hai ma trận.');}
    if(node.op==='*'&&!isMatrix(a))return M.scale(b,a,F);
    if(node.op==='*'&&!isMatrix(b))return M.scale(a,b,F);
    if(node.op==='/'&&isMatrix(a)&&!isMatrix(b))return M.scale(a,F.inv(b),F);
    if(!isMatrix(a)||!isMatrix(b))throw Error('Cộng/trừ cần hai ma trận hoặc hai số. Dùng I để biểu diễn ma trận đơn vị.');
    switch(node.op){case '+':return M.add(a,b,F);case '-':return M.add(a,b,F,-1n);case '*':return M.multiply(a,b,F);case '⊗':return M.kronecker(a,b,F);case '∘':return M.hadamard(a,b,F);default:throw Error('Không dùng phép chia giữa hai ma trận; dùng nghịch đảo.');}
   }
   if(node.kind==='call'){
    const {name,args}=node;
    const counts={det:1,determinant:1,inv:1,inverse:1,transpose:1,rank:1,trace:1,tr:1,ref:1,rref:1,adj:1,adjugate:1,cofactor:1,kron:2,had:2,hcat:2,vcat:2,sub:5,droprow:2,dropcol:2,eye:1,zero:2};
    if(!(name in counts))throw Error('Hàm không được hỗ trợ: '+name+'.');if(args.length!==counts[name])throw Error(name+' cần '+counts[name]+' đối số.');
    if(name==='eye')return M.identity(integerArg(args[0]));if(name==='zero')return M.zeros(integerArg(args[0]),integerArg(args[1]));
    const a=needMatrix(evalNode(args[0],hint));
    switch(name){
     case 'det':case 'determinant':return M.determinant(a,F);case 'inv':case 'inverse':return M.inverse(a,F);case 'transpose':return M.transpose(a);
     case 'rank':return BigInt(M.echelon(a,F).rank);case 'trace':case 'tr':return M.trace(a,F);case 'ref':return M.echelon(a,F).matrix;case 'rref':return M.echelon(a,F,true).matrix;
     case 'adj':case 'adjugate':return M.adjugate(a,F);case 'cofactor':return M.cofactor(a,F);
     case 'sub':return M.submatrix(a,...args.slice(1).map(integerArg));case 'droprow':return M.drop(a,integerArg(args[1]),'row');case 'dropcol':return M.drop(a,integerArg(args[1]),'col');
    }
    const b=needMatrix(evalNode(args[1],hint));return {kron:()=>M.kronecker(a,b,F),had:()=>M.hadamard(a,b,F),hcat:()=>M.hcat(a,b),vcat:()=>M.vcat(a,b)}[name]();
   }
  }catch(e){if(e.position===undefined){e.position=node.pos;e.message+=' (vị trí '+(node.pos+1)+')';}throw e;}
 }
 const value=evalNode(ast);
 return {value,kind:isMatrix(value)?'matrix':ast.kind==='call'&&ast.name==='rank'?'integer':'scalar'};
}
