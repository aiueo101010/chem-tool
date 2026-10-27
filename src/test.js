// 動作確認用（node src/test.js）。比色分析・BTBの数値は架空、振動反応は実測値です。
global.XL=require('./xlsx.js');const LAB=require('./calc.js');const fs=require('fs');
const g=(x,m,s)=>Math.exp(-0.5*((x-m)/s)**2);const sp=f=>{const d=[];for(let w=350;w<=1000;w++)d.push([w,+f(w).toFixed(6)]);return d;};
let o=LAB.colorimetry({mass:1.18,M:249.7,vstd:100,vflask:25,vunk:1.00,l:1.00,wl:615,V:[0,1,2,3,4,5],A:[0,0.098,0.203,0.297,0.402,0.494],use:[1,1,1,1,1,1],Aunk:0.336,Vspec:5,
 spectra:[{label:'発色させた比色用標準溶液',data:sp(w=>0.478*g(w,608,72)),lo:400,hi:1000},{label:'発色させていない硫酸銅溶液',data:sp(w=>0.092*g(w,790,90)+0.023),lo:400,hi:1000}]});
console.log('比色',o.res.fall.a.toFixed(1),o.res.orig.toFixed(3));fs.writeFileSync('test_c.xlsx',XL.build(o.sheets));
const C=1.2e-5,pHs=[3.85,6.12,6.88,7.35,7.95,10.45];
o=LAB.btb({stock:0.3,aliq:1,flask:25,l:1,w1:435,w2:615,r1:[375,480],r2:[550,700],ri:[450,560],samples:pHs.map(pH=>{const fL=1/(1+10**(7.05-pH));return {pH,file:'pH'+pH,use:true,iso:true,data:sp(w=>((1.55e4*g(w,431,42))*(1-fL)+(3.9e4*g(w,618,45)+3000*g(w,540,25))*fL)*C)};})});
console.log('BTB pKa',o.res.pkm.toFixed(2));fs.writeFileSync('test_b.xlsx',XL.build(o.sheets));
o=LAB.oscillation({n:11,temps:[[35,`1'32",1'46",1'59",2'13",2'28",2'43",2'57",3'13",3'29",3'45",4'02"`],[40,'69,78,88,97,107,117,127,138,149,160,171'],[45,'48,55,62,69,76,83,91,99,106,114,123'],[50,'35,40,45,50,55,59,64,69,75,80,86']].map(([t,s])=>({t,times:s.split(',').map(LAB.parseTime)}))});
console.log('振動 Ea',o.res.Ea.ind.toFixed(1),o.res.Ea.osc.toFixed(1));fs.writeFileSync('test_o.xlsx',XL.build(o.sheets));
