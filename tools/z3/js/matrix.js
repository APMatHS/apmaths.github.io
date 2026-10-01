export const MAX_CELLS=4096;
export function shape(A){if(!Array.isArray(A)||!A.length||!Array.isArray(A[0])||!A[0].length||A.some(r=>!Array.isArray(r)||r.length!==A[0].length))throw Error('Ma trận phải có các dòng cùng số cột.');return [A.length,A[0].length];}
function checkSize(r,c){if(r<1||c<1||r*c>MAX_CELLS)throw Error('Ma trận kết quả vượt giới hạn 4096 ô hoặc có kích thước rỗng.');}
export function zeros(r,c){checkSize(r,c);return Array.from({length:r},()=>Array(c).fill(0n));}
export function identity(n){const A=zeros(n,n);for(let i=0;i<n;i++)A[i][i]=1n;return A;}
function square(A){const [r,c]=shape(A);if(r!==c)throw Error('Phép toán này cần ma trận vuông.');return r;}
function same(A,B){const a=shape(A),b=shape(B);if(a[0]!==b[0]||a[1]!==b[1])throw Error('Hai ma trận phải cùng số dòng và số cột.');}
export function add(A,B,F,sign=1n){same(A,B);return A.map((r,i)=>r.map((a,j)=>F.norm(a+sign*B[i][j])));}
export function scale(A,s,F){shape(A);return A.map(r=>r.map(a=>F.norm(a*s)));}
export function multiply(A,B,F){const [r,k]=shape(A),[kb,c]=shape(B);if(k!==kb)throw Error('Số cột của ma trận bên trái phải bằng số dòng của ma trận bên phải.');const C=zeros(r,c);for(let i=0;i<r;i++)for(let t=0;t<k;t++)if(A[i][t])for(let j=0;j<c;j++)C[i][j]=F.norm(C[i][j]+A[i][t]*B[t][j]);return C;}
export function transpose(A){const [r,c]=shape(A);return Array.from({length:c},(_,j)=>Array.from({length:r},(_,i)=>A[i][j]));}
export function determinant(A,F){if(!A.length)return 1n;const n=square(A),M=A.map(r=>r.slice());let d=1n;for(let c=0;c<n;c++){let j=c;while(j<n&&M[j][c]===0n)j++;if(j===n)return 0n;if(j!==c){[M[j],M[c]]=[M[c],M[j]];d=F.norm(-d);}const pivot=M[c][c];d=F.norm(d*pivot);const inv=F.inv(pivot);for(let i=c+1;i<n;i++){const a=F.norm(M[i][c]*inv);for(let k=c+1;k<n;k++)M[i][k]=F.norm(M[i][k]-a*M[c][k]);M[i][c]=0n;}}return d;}
export function echelon(A,F,reduced=false){const [r,c]=shape(A),M=A.map(row=>row.slice());let row=0;for(let col=0;col<c&&row<r;col++){let j=row;while(j<r&&M[j][col]===0n)j++;if(j===r)continue;[M[j],M[row]]=[M[row],M[j]];const inv=F.inv(M[row][col]);M[row]=M[row].map(x=>F.norm(x*inv));for(let i=reduced?0:row+1;i<r;i++){if(i===row)continue;const a=M[i][col];if(a)M[i]=M[i].map((x,k)=>F.norm(x-a*M[row][k]));}row++;}return {matrix:M,rank:row};}
export function inverse(A,F){const n=square(A),I=identity(n),{matrix:M,rank}=echelon(A.map((r,i)=>[...r,...I[i]]),F,true);if(rank<n||M.some((r,i)=>r.slice(0,n).some((x,j)=>x!==(i===j?1n:0n))))throw Error('Ma trận không khả nghịch.');return M.map(r=>r.slice(n));}
export function power(A,k,F){const n=square(A);k=BigInt(k);if(k<0n){A=inverse(A,F);k=-k;}let R=identity(n);while(k){if(k&1n)R=multiply(R,A,F);k>>=1n;if(k)A=multiply(A,A,F);}return R;}
export function trace(A,F){square(A);return F.norm(A.reduce((s,r,i)=>s+r[i],0n));}
export function cofactor(A,F){const n=square(A);return A.map((row,i)=>row.map((_,j)=>F.norm(((i+j)%2?-1n:1n)*determinant(A.filter((_,k)=>k!==i).map(r=>r.filter((_,k)=>k!==j)),F))));}
export function adjugate(A,F){return transpose(cofactor(A,F));}
export function hadamard(A,B,F){same(A,B);return A.map((r,i)=>r.map((a,j)=>F.norm(a*B[i][j])));}
export function kronecker(A,B,F){const [ar,ac]=shape(A),[br,bc]=shape(B),C=zeros(ar*br,ac*bc);for(let i=0;i<ar;i++)for(let j=0;j<ac;j++)for(let k=0;k<br;k++)for(let l=0;l<bc;l++)C[i*br+k][j*bc+l]=F.norm(A[i][j]*B[k][l]);return C;}
export function hcat(A,B){const [ar,ac]=shape(A),[br,bc]=shape(B);if(ar!==br)throw Error('Ghép ngang cần hai ma trận cùng số dòng.');checkSize(ar,ac+bc);return A.map((r,i)=>[...r,...B[i]]);}
export function vcat(A,B){const [ar,ac]=shape(A),[br,bc]=shape(B);if(ac!==bc)throw Error('Ghép dọc cần hai ma trận cùng số cột.');checkSize(ar+br,ac);return [...A.map(r=>r.slice()),...B.map(r=>r.slice())];}
export function submatrix(A,r1,r2,c1,c2){const [r,c]=shape(A);if(r1<1||r2>r||c1<1||c2>c||r1>r2||c1>c2)throw Error('Khoảng dòng/cột không hợp lệ; chỉ số bắt đầu từ 1.');return A.slice(r1-1,r2).map(row=>row.slice(c1-1,c2));}
export function drop(A,index,axis){const [r,c]=shape(A);if(index<1||index>(axis==='row'?r:c))throw Error('Chỉ số dòng/cột ngoài ma trận; chỉ số bắt đầu từ 1.');const B=axis==='row'?A.filter((_,i)=>i!==index-1):A.map(row=>row.filter((_,i)=>i!==index-1));shape(B);return B;}
