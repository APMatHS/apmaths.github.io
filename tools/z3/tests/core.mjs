import assert from 'node:assert/strict';
import {Field,primeStatus} from '../js/field.js';import * as M from '../js/matrix.js';import {calculate,parse} from '../js/expression.js';
const F=new Field('3');const A=[[1n,1n],[0n,1n]],B=[[1n,0n],[1n,1n]],I=M.identity(2);
const calc=(s,m={A,B},f=F)=>calculate(s,m,f).value;
assert.deepEqual(calc('A*(B+A)'),[[0n,0n],[1n,2n]]);
assert.equal(calc('1-5'),2n);assert.equal(calc('2^10000'),1n);assert.equal(calc('1/2'),2n);
assert.deepEqual(calc('A^0'),I);assert.deepEqual(calc('A^(-3)'),I);assert.deepEqual(calc('(A^2)^3'),I);
assert.deepEqual(calc('-A'),[[2n,2n],[0n,2n]]);assert.deepEqual(calc('2A'),M.scale(A,2n,F));
assert.deepEqual(calc('A^T'),M.transpose(A));assert.deepEqual(calc('A^3+2*A+I'),M.add(M.add(M.power(A,3n,F),M.scale(A,2n,F),F),I,F));
assert.equal(calc('det(A+B)'),0n);assert.deepEqual(calc('(A*B)^-1'),M.multiply(M.inverse(B,F),M.inverse(A,F),F));
for(const s of ['A/','A@','Aabc','A^2^3','A+','(A','A)','C','det(A,B)','sub(A,0,2,1,2)','1/3','A+B/zero(1,1)'])assert.throws(()=>calc(s),undefined,s);
assert.throws(()=>F.parse('1.5'));assert.throws(()=>F.parse(''));assert.throws(()=>F.parse('2/3'));assert.equal(F.parse('-4'),2n);assert.equal(F.parse('100000000000000000000000000000000000001'),2n);
assert.equal(calc('rank(A)'),2n);assert.equal(calculate('rank(A)',{A:M.identity(4)},F).kind,'integer');assert.equal(calc('rank(A)',{A:M.identity(4)}),4n);
const R=[[1n,2n,0n],[0n,1n,1n]];assert.deepEqual(calc('A*I',{A:R}),R);assert.deepEqual(calc('I*A',{A:R}),R);assert.deepEqual(calc('A^T',{A:R}),[[1n,0n],[2n,1n],[0n,1n]]);assert.throws(()=>calc('det(A)',{A:R}));
assert.deepEqual(calc('hcat(A,B)'),A.map((r,i)=>[...r,...B[i]]));assert.equal(calc('vcat(A,B)').length,4);assert.deepEqual(calc('sub(A,1,1,1,2)'),[[1n,1n]]);assert.deepEqual(calc('droprow(A,2)'),[[1n,1n]]);assert.deepEqual(calc('dropcol(A,1)'),[[1n],[1n]]);
assert.deepEqual(calc('A∘B'),M.hadamard(A,B,F));assert.deepEqual(calc('A⊗B'),M.kronecker(A,B,F));assert.equal(calc('kron(A,B)').length,4);assert.deepEqual(calc('cofactor(A)'),[[1n,0n],[2n,1n]]);assert.deepEqual(calc('adj(A)'),M.inverse(A,F));assert.deepEqual(calc('adj(A)',{A:[[2n]]}),[[1n]]);
assert.deepEqual(calc('rref(A)',{A:[[1n,2n,0n],[2n,1n,0n],[0n,0n,1n]]}),[[1n,2n,0n],[0n,0n,1n],[0n,0n,0n]]);
// Independent 3x3 formula; exhaustive all 2x2 and 3x3 matrices over F3.
function det3(a,f){return f.norm(a[0][0]*(a[1][1]*a[2][2]-a[1][2]*a[2][1])-a[0][1]*(a[1][0]*a[2][2]-a[1][2]*a[2][0])+a[0][2]*(a[1][0]*a[2][1]-a[1][1]*a[2][0]));}
for(const n of [2,3]){let invertible=0;for(let k=0;k<3**(n*n);k++){let q=k;const a=Array.from({length:n},()=>Array.from({length:n},()=>{const x=BigInt(q%3);q=Math.floor(q/3);return x;}));const d=n===2?F.norm(a[0][0]*a[1][1]-a[0][1]*a[1][0]):det3(a,F);assert.equal(M.determinant(a,F),d);if(d===0n)assert.throws(()=>M.inverse(a,F));else{invertible++;assert.deepEqual(M.multiply(a,M.inverse(a,F),F),M.identity(n));}}assert.equal(invertible,n===2?48:11232);}
for(const p of ['2','3','5','7','11','97','2147483647','18446744073709551557'])assert.equal(primeStatus(p).certified,true);
for(const p of ['0','1','4','9','341','561','3215031751','18446744073709551615','3825123056546413051'])assert.throws(()=>primeStatus(p),undefined,p);
const huge=primeStatus('170141183460469231731687303715884105727');assert.equal(huge.certified,false);assert.equal(huge.rounds,32);
const G=new Field('18446744073709551557'),x=18446744073709551556n;assert.equal(G.norm(x*x),1n);assert.equal(G.inv(x),x);
assert.throws(()=>M.kronecker(M.zeros(64,64),M.identity(2),F));assert.throws(()=>parse('A.'.repeat(100)));
console.log('Passed: exhaustive 19,764 matrices over F3; inverses, determinants, expression validation, rectangular operations, large primes, exact BigInt arithmetic.');
