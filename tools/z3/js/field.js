// Exact finite-field arithmetic; no conversion of elements to floating point.
export function mod(a,p){const r=a%p;return r<0n?r+p:r;}
export function modPow(a,k,p){let out=1n;a=mod(a,p);while(k>0n){if(k&1n)out=out*a%p;a=a*a%p;k>>=1n;}return out;}
export function primeStatus(text){
 if(!/^\d+$/.test(text)||text.length>1000)throw Error('Nhập p bằng số nguyên dương, tối đa 1000 chữ số.');
 const p=BigInt(text);if(p<2n)throw Error('p phải là số nguyên tố từ 2 trở lên.');
 const small=[2n,3n,5n,7n,11n,13n,17n,19n,23n,29n,31n,37n];
 for(const q of small){if(p===q)return {p:p.toString(),certified:true};if(p%q===0n)throw Error('p là hợp số, không tạo thành trường Fp.');}
 let d=p-1n,s=0;while(!(d&1n)){d>>=1n;s++;}
 const certified=p<18446744073709551616n;
 // Jim Sinclair's 7-base set for n < 2^64: https://miller-rabin.appspot.com/
 let bases=[2n,325n,9375n,28178n,450775n,9780504n,1795265022n];
 if(!certified){
  bases=[];const bits=p.toString(2).length,bytes=Math.ceil(bits/8),mask=(1<<(bits%8||8))-1;
  for(let i=0;i<32;i++){let a;do{const data=crypto.getRandomValues(new Uint8Array(bytes));data[0]&=mask;a=BigInt('0x'+[...data].map(x=>x.toString(16).padStart(2,'0')).join(''));}while(a<2n||a>p-2n);bases.push(a);}
 }
 for(let a of bases){a%=p;if(a<2n)continue;let x=modPow(a,d,p);if(x===1n||x===p-1n)continue;let passed=false;
  for(let r=1;r<s;r++){x=x*x%p;if(x===p-1n){passed=true;break;}}if(!passed)throw Error('p là hợp số, không tạo thành trường Fp.');
 }
 return {p:p.toString(),certified,rounds:certified?0:32};
}
export class Field{
 constructor(p){this.p=BigInt(p);if(this.p<2n)throw Error('Trường tính toán không hợp lệ.');}
 norm(a){return mod(BigInt(a),this.p);}
 inv(a){a=this.norm(a);let r=this.p,n=a,t=0n,u=1n;while(n){const q=r/n;[r,n]=[n,r-q*n];[t,u]=[u,t-q*u];}if(r!==1n)throw Error('Phần tử không có nghịch đảo trong trường đã chọn.');return this.norm(t);}
 parse(text){
  const s=String(text).trim();if(!s)throw Error('Ô ma trận đang trống. Nhập 0 nếu phần tử bằng 0.');
  if(s.length>2000||!/^[-+]?\d+(?:\s*\/\s*[-+]?\d+)?$/.test(s))throw Error('Chỉ nhập số nguyên hoặc phân số a/b.');
  const [a,b]=s.split('/');return b===undefined?this.norm(a.trim()):this.norm(BigInt(a.trim())*this.inv(BigInt(b.trim())));
 }
 pow(a,k){k=BigInt(k);if(k<0n){a=this.inv(a);k=-k;}return modPow(a,k,this.p);}
}
