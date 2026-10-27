/* ---- math + report-format workbook builders (tables/figures match the student's report) ---- */
const LAB=(()=>{
const {Sheet,ST,aref,col}=XL;
const OF={blue:'4472C4',orange:'ED7D31',gray:'A5A5A5',red:'FF0000',gold:'FFC000'};
const M='−';
/* ---------- numbers & text ---------- */
const fx=(v,d)=>isFinite(v)?(v<0?M:'')+Math.abs(v).toFixed(d):'—';
function sig(v,n=3){if(!isFinite(v))return '—';if(v===0)return '0';const e=Math.floor(Math.log10(Math.abs(v)));const d=Math.max(0,n-1-e);return fx(+v.toPrecision(n),d);}
function sci(v,n=3){if(!isFinite(v))return '—';const e=Math.floor(Math.log10(Math.abs(v)));let m=v/10**e;let mm=+m.toFixed(n-1);let ee=e;if(Math.abs(mm)>=10){mm/=10;ee++;}return `${fx(mm,n-1)} × 10^{${ee<0?M:''}${Math.abs(ee)}}`;}
const roundSig=(v,n=3)=>isFinite(v)&&v!==0?+(v*(1+1e-12)).toPrecision(n):v;
/* ---------- regression / spectra ---------- */
function fit(x,y){const n=x.length;if(n<2)return null;const mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;let sxx=0,sxy=0,syy=0;for(let i=0;i<n;i++){sxx+=(x[i]-mx)**2;sxy+=(x[i]-mx)*(y[i]-my);syy+=(y[i]-my)**2;}
 const a=sxy/sxx,b=my-a*mx;let sse=0;for(let i=0;i<n;i++)sse+=(y[i]-a*x[i]-b)**2;return {a,b,r2:syy?1-sse/syy:1,se:n>2?Math.sqrt(sse/(n-2)/sxx):NaN,n};}
function parseSpectrum(text){const lines=text.split(/\r?\n/);let start=0;const xi=lines.findIndex(l=>/^\s*XYDATA/i.test(l));if(xi>=0)start=xi+1;const pts=[];
 for(let i=start;i<lines.length;i++){const p=lines[i].trim().split(/[\t,; ]+/);if(p.length<2)continue;const a=parseFloat(p[0]),b=parseFloat(p[1]);if(isFinite(a)&&isFinite(b))pts.push([a,b]);}
 pts.sort((p,q)=>p[0]-q[0]);return pts;}
function steps(sp){const d=[];for(let i=1;i<sp.length;i++)d.push(Math.abs(sp[i][1]-sp[i-1][1]));const out=[];
 for(let i=0;i<d.length;i++){const loc=[d[i-2],d[i-1],d[i+1],d[i+2]].filter(v=>v!=null);const lm=loc.length?Math.max(...loc):0;if(d[i]>0.004&&d[i]>3*lm)out.push((sp[i][0]+sp[i+1][0])/2);}return out;}
function peak(sp,lo,hi){const st=steps(sp);const inr=sp.filter(p=>p[0]>=lo&&p[0]<=hi);if(!inr.length)return null;
 const segs=[[]];inr.forEach((p,i)=>{if(i>0&&st.some(s=>s>inr[i-1][0]&&s<p[0]))segs.push([]);segs[segs.length-1].push(p);});
 let best=null,gl=null;for(const sg of segs){let bi=0;sg.forEach((p,i)=>{if(p[1]>sg[bi][1])bi=i;});const q=sg[bi];if(!gl||q[1]>gl.p[1])gl={p:q};if(bi>0&&bi<sg.length-1&&(!best||q[1]>best[1]))best=q;}
 if(best)return {w:best[0],a:best[1],edge:false,step:false};return {w:gl.p[0],a:gl.p[1],edge:true,step:segs.length>1};}
const valAt=(sp,w)=>{let best=null,d=Infinity;for(const p of sp){const dd=Math.abs(p[0]-w);if(dd<d){d=dd;best=p;}}return best?best[1]:NaN;};
function parseTime(s){s=String(s??'').trim().replace(/\s+/g,'');if(!s)return NaN;let m=s.match(/^(\d+)(?:['′’:]|分)(\d+(?:\.\d+)?)(?:["″”]|''|秒)?$/);if(m)return +m[1]*60+ +m[2];m=s.match(/^(\d+(?:\.\d+)?)(?:["″”s]|''|秒)?$/);if(m)return +m[1];return NaN;}
/* BTB colour for a given pH (HL yellow -> green -> L- blue), pKa 7.1 */
function btbColor(pH){const f=1/(1+10**(7.1-pH));const st=[[0,[214,170,0]],[0.5,[56,150,72]],[1,[33,64,160]]];let a=st[0],b=st[2];if(f<=0.5){a=st[0];b=st[1];}else{a=st[1];b=st[2];}const t=(f-a[0])/(b[0]-a[0]);
 return a[1].map((v,i)=>Math.round(v+(b[1][i]-v)*t).toString(16).padStart(2,'0')).join('').toUpperCase();}
function niceAxis(lo,hi,step){return {min:+(Math.floor(lo/step+1e-9)*step).toFixed(6),max:+(Math.ceil(hi/step-1e-9)*step).toFixed(6),major:step};}
/* ---------- report-style table (three-line, 游明朝, centred) ---------- */
function table(sh,r,c,caption,head,rows,note,spans){const sp=spans||head.map(()=>1);const W=sp.reduce((a,b)=>a+b,0);const pos=sp.map((_,j)=>c+sp.slice(0,j).reduce((a,b)=>a+b,0));
 sh.set(r,c,{r:caption},ST.cap);if(W>1)sh.merge(r,c,r,c+W-1);
 const put=(rr,j,v,st)=>{sh.set(rr,pos[j],{r:String(v)},st);for(let k=1;k<sp[j];k++)sh.set(rr,pos[j]+k,'',st);if(sp[j]>1)sh.merge(rr,pos[j],rr,pos[j]+sp[j]-1);};
 head.forEach((h,j)=>put(r+1,j,h,ST.th));
 rows.forEach((row,i)=>row.forEach((v,j)=>put(r+2+i,j,v,i===rows.length-1?ST.tdl:ST.td)));
 let end=r+2+rows.length;if(note){sh.set(end,c,{r:note},ST.tn);end++;}return end+1;}
function caption(sh,r,c,text,w){sh.set(r,c,{r:text},ST.cap);sh.merge(r,c,r,c+w-1);}
const XFMT=d=>d<=0?'0':'0.'+'0'.repeat(d);

/* ================== 比色分析 ================== */
function colorimetry(p){
 const rep=new Sheet('レポート用');rep.grid=false;const cs=new Sheet('計算');
 [6,20,12,16,16,20,10,10].forEach((w,i)=>rep.width(i,w));
 const n=p.mass/p.M,cstd=n/(p.vstd/1000),cstdR=roundSig(cstd,3);
 const N=p.V.length;const rows=p.V.map((V,i)=>{const Cr=roundSig(cstd*V/p.vflask,3);return {no:i+1,V,C:Cr,A:p.A[i],use:p.use[i]};});
 const fall=fit(rows.map(x=>x.C),rows.map(x=>x.A));const used=rows.filter(x=>x.use),ex=rows.filter(x=>!x.use);const fuse=ex.length&&used.length>=2?fit(used.map(x=>x.C),used.map(x=>x.A)):null;
 const Cu=(p.Aunk-fall.b)/fall.a,orig=Cu*p.vflask/p.vunk;const Cu2=fuse?(p.Aunk-fuse.b)/fuse.a:NaN;
 /* --- 計算 sheet (live formulas, chart data) --- */
 cs.width(0,26).width(1,13);for(let c=2;c<=12;c++)cs.width(c,12);
 cs.set(0,0,'計算用シート（グラフはこのシートの値を参照しています）',ST.sub);
 const P=[['硫酸銅五水和物の質量 / g',p.mass,ST.n2,null],['式量 / g mol⁻¹',p.M,ST.n1,null],['物質量 / mol',n,ST.sci,'B2/B3'],['標準溶液の体積 / mL',p.vstd,ST.n0,null],['標準溶液の濃度 / mol L⁻¹',cstd,ST.sci,'B4/(B5/1000)'],['比色用メスフラスコ / mL',p.vflask,ST.n0,null],['未知試料の採取量 / mL',p.vunk,ST.n2,null],['セル長 / cm',p.l,ST.n2,null]];
 P.forEach((r,i)=>{cs.set(1+i,0,r[0],ST.bold);cs.set(1+i,1,r[1],r[2],r[3]);});
 const R0=11;cs.row(R0,0,['No.','V / mL','C / 10⁻³ mol L⁻¹','A','検量線（図3）に使用'],ST.head);
 rows.forEach((x,i)=>{const r=R0+1+i;cs.set(r,0,x.no,ST.n0);cs.set(r,1,x.V,ST.n2);cs.set(r,3,x.A,ST.n3);cs.set(r,4,x.use?'○':'×',ST.text);});
 const ru=R0+1+N;cs.set(ru,0,N+1,ST.n0);cs.set(ru,1,p.vunk,ST.n2);cs.set(ru,2,Cu*1000,ST.n3,`(D${ru+1}-INTERCEPT(D${R0+2}:D${R0+1+N},C${R0+2}:C${R0+1+N}))/SLOPE(D${R0+2}:D${R0+1+N},C${R0+2}:C${R0+1+N})`);cs.set(ru,3,p.Aunk,ST.n3);
 const F0=ru+2;cs.row(F0,0,['','全点（図2）',ex.length?'除外後（図3）':''],ST.head);
 const yr=`D${R0+2}:D${R0+1+N}`,xr=`C${R0+2}:C${R0+1+N}`;
 const UB=F0+9;
 const fr=[['傾き / L mol⁻¹（C を mol L⁻¹ にしたとき）',fall.a*1000,fuse?fuse.a*1000:null,`SLOPE(${yr},${xr})*1000`,`SLOPE(D${UB+2}:D${UB+1+used.length},C${UB+2}:C${UB+1+used.length})*1000`,ST.n2],
  ['切片',fall.b,fuse?fuse.b:null,`INTERCEPT(${yr},${xr})`,`INTERCEPT(D${UB+2}:D${UB+1+used.length},C${UB+2}:C${UB+1+used.length})`,ST.n4],
  ['決定係数 R²',fall.r2,fuse?fuse.r2:null,`RSQ(${yr},${xr})`,`RSQ(D${UB+2}:D${UB+1+used.length},C${UB+2}:C${UB+1+used.length})`,ST.n4],
  ['未知試料（発色後）C / mol L⁻¹',Cu,fuse?Cu2:null,`(D${ru+1}-B${F0+3})/B${F0+2}`,`(D${ru+1}-C${F0+3})/C${F0+2}`,ST.sci],
  ['もとの硫酸銅溶液の濃度 / mol L⁻¹',orig,fuse?Cu2*p.vflask/p.vunk:null,`B${F0+5}*B7/B8`,`C${F0+5}*B7/B8`,ST.n3]];
 fr.forEach((r,i)=>{cs.set(F0+1+i,0,r[0],ST.bold);cs.set(F0+1+i,1,r[1],r[5],r[3]);if(r[2]!=null)cs.set(F0+1+i,2,r[2],r[5],r[4]);});
 cs.row(UB,0,['','（図3用）使用した点','C / 10⁻³ mol L⁻¹','A'],ST.head);
 used.forEach((x,i)=>{const r=UB+1+i,src=R0+1+(x.no-1)+1;cs.set(r,1,'No.'+x.no,ST.text);cs.set(r,2,x.C*1000,ST.n3,`C${src}`);cs.set(r,3,x.A,ST.n3,`D${src}`);});
 const EB=UB+2+used.length;
 if(ex.length){cs.row(EB,0,['','除外した点','C / 10⁻³ mol L⁻¹','A（実測値）','A（予想値）'],ST.head);ex.forEach((x,i)=>{const r=EB+1+i,src=R0+1+(x.no-1)+1;cs.set(r,1,'No.'+x.no,ST.text);cs.set(r,2,x.C*1000,ST.n3,`C${src}`);cs.set(r,3,x.A,ST.n3,`D${src}`);cs.set(r,4,fuse.a*x.C+fuse.b,ST.n3,`$C$${F0+2}*C${r+1}/1000+$C$${F0+3}`);});}
 // simplify the per-row C formula to something readable
 rows.forEach((x,i)=>{const r=R0+1+i;cs.set(r,2,x.C*1000,ST.n3,`ROUND($B$6*B${r+1}/$B$7*1000,${x.C*1000>=10?1:2})`);});
 /* --- spectra on 計算 --- */
 let SC=7,specInfo=[];const Cs=roundSig(cstd*p.Vspec/p.vflask,3);
 (p.spectra||[]).forEach((s,k)=>{const d=s.data;const c=SC+k*3;cs.set(0,c,s.label,ST.bold);cs.row(1,c,['λ / nm','A'],ST.head);d.forEach((q,i)=>{cs.set(2+i,c,q[0],ST.n1);cs.set(2+i,c+1,q[1],ST.n6);});
  const pk=peak(d,s.lo,s.hi);specInfo.push({s,c,d,pk,idx:pk?d.findIndex(q=>q[0]===pk.w):-1});});
 /* --- レポート用 sheet --- */
 let r=0;rep.set(r,0,'比色分析：レポート用の表と図（表・図をそのままコピーしてWordに貼り付けられます）',ST.sub);r+=2;
 r=table(rep,r,0,'表1　硫酸銅標準溶液の調製結果',['項目','値'],[['硫酸銅五水和物の質量',`${fx(p.mass,2)} g`],['硫酸銅五水和物の物質量',`${sci(n)} mol`],['硫酸銅標準溶液の濃度',`${sci(cstd)} mol L^{${M}1}`]],null,[2,2]);
 const figW=6,figH=19;
 if(specInfo.length){
  const ser=specInfo.map((x,k0)=>{const k=x.s.label.includes('ていない')?1:0;return {name:x.s.label,x:x.d.map(q=>q[0]),y:x.d.map(q=>q[1]),xRef:aref('計算',2,x.c,1+x.d.length,x.c),yRef:aref('計算',2,x.c+1,1+x.d.length,x.c+1),line:true,color:k?OF.orange:OF.blue,dash:k?'dash':'solid',marker:'none',
   labels:x.idx>=0?[{idx:x.idx,text:`${Math.round(x.pk.w)} nm , ${x.pk.a.toFixed(3)}`,x:k?0.03:-0.16,y:k?-0.16:-0.06}]:[]};});
  const allx=specInfo.flatMap(x=>x.d.map(q=>q[0])),ally=specInfo.flatMap(x=>x.d.map(q=>q[1]));const xa=niceAxis(Math.min(...allx),Math.max(...allx),100),ya=niceAxis(Math.min(0,...ally),Math.max(...ally)*1.1,0.1);if(ya.min>-0.1&&Math.min(...ally)<0)ya.min=-0.1;
  rep.chart({series:ser,x:{title:'<i>λ</i> / nm',...xa},y:{title:'<i>A</i>',...ya,fmt:'0.0'},legend:{x:0.56,y:0.05,w:0.42,h:0.16}},r,0,r+figH,figW);r+=figH;
  caption(rep,r,0,'図1　発色させた比色用標準溶液と発色させていない硫酸銅溶液の吸収スペクトル',figW);r+=2;
  r=table(rep,r,0,'表2　各溶液の吸収極大波長, 極大での吸光度とモル吸光係数',['溶液','<i>λ</i>_{max} / nm','<i>A</i>',`<i>C</i> / mol L^{${M}1}`,`<i>ε</i> / L mol^{${M}1} cm^{${M}1}`],
   specInfo.map(x=>[x.s.label.includes('ていない')?'無発色（硫酸銅）':'発色（テトラアンミン銅(II)）',x.pk?x.pk.w.toFixed(1):'—',x.pk?x.pk.a.toFixed(3):'—',sci(Cs),x.pk?(x.pk.a/(Cs*p.l)).toFixed(1):'—']),null,[2,1,1,1,1]);}
 r=table(rep,r,0,`表3　各溶液の Cu^{2+}濃度と ${p.wl} nm における吸光度`,['No.','溶液の種類','<i>V</i> / mL',`<i>C</i> / 10^{${M}3} mol L^{${M}1}`,'<i>A</i>'],
  [...rows.map((x,i)=>[String(x.no),i===0?'対照液':'比色用標準溶液',x.V.toFixed(2),sig(x.C*1000,3).replace(/^0$/,'0.00'),x.A.toFixed(3)]),[String(N+1),'濃度未知試料溶液',p.vunk.toFixed(2),sig(Cu*1000,3)+'*',p.Aunk.toFixed(3)]],'* 検量線（図2）から求めた値');
 const allC=rows.map(x=>x.C*1000).concat([Cu*1000]);const xa2={min:0,max:Math.ceil(Math.max(...allC)/2+0.01)*2,major:2};const ya2={min:Math.min(fall.b,0)<0?-0.1:0,max:Math.ceil(Math.max(...rows.map(x=>x.A),p.Aunk)*10)/10+0.1,major:0.1};
 const eq=(f)=>`<i>A</i> = ${sig(f.a,3)} L mol^{${M}1} × <i>C</i> ${f.b<0?M:'+'} ${Math.abs(f.b).toFixed(4)}`;
 rep.chart({series:[{name:`比色用標準溶液・対照液（No.1-${N}）`,x:rows.map(x=>x.C*1000),y:rows.map(x=>x.A),xRef:aref('計算',R0+1,2,R0+N,2),yRef:aref('計算',R0+1,3,R0+N,3),marker:'circle',color:OF.blue,trend:{name:'近似直線',color:OF.blue,dash:'sysdot',label:{text:eq(fall),x:0.02,y:-0.04}}},
  {name:`濃度未知試料溶液（No.${N+1}）`,x:[Cu*1000],y:[p.Aunk],xRef:aref('計算',ru,2,ru,2),yRef:aref('計算',ru,3,ru,3),marker:'circle',color:OF.orange}],
  x:{title:`<i>C</i> / 10^{${M}3} mol L^{${M}1}`,...xa2},y:{title:'<i>A</i>',...ya2,fmt:'0.0'},legend:{x:0.1,y:0.04,w:0.48,h:0.22}},r,0,r+figH,figW);r+=figH;
 caption(rep,r,0,`図2　${p.wl} nm における吸光度と Cu^{2+}濃度の関係（検量線）`,figW);r+=2;
 if(ex.length&&fuse){const nm=ex.map(x=>x.no).join(', ');const un=used.map(x=>x.no);
  const uname=un.length>=3&&un.every((v,i)=>!i||v===un[i-1]+1)?`${un[0]}-${un[un.length-1]}`:un.join(', ');
  const ser=[{name:`比色用標準溶液・対照液（No.${uname}）`,x:used.map(x=>x.C*1000),y:used.map(x=>x.A),xRef:aref('計算',UB+1,2,UB+used.length,2),yRef:aref('計算',UB+1,3,UB+used.length,3),marker:'circle',color:OF.blue,trend:{name:`近似直線（No.${nm}を除く）`,color:OF.blue,dash:'sysdot',label:{text:eq(fuse),x:0.05,y:0.06}}},
   {name:`No.${nm}（予想値）`,x:ex.map(x=>fuse.a*x.C+fuse.b).map((_,i)=>ex[i].C*1000),y:ex.map(x=>fuse.a*x.C+fuse.b),xRef:aref('計算',EB+1,2,EB+ex.length,2),yRef:aref('計算',EB+1,4,EB+ex.length,4),marker:'circle',color:OF.red},
   {name:`No.${nm}（実測値）`,x:ex.map(x=>x.C*1000),y:ex.map(x=>x.A),xRef:aref('計算',EB+1,2,EB+ex.length,2),yRef:aref('計算',EB+1,3,EB+ex.length,3),marker:'circle',color:OF.gray}];
  rep.chart({series:ser,x:{title:`<i>C</i> / 10^{${M}3} mol L^{${M}1}`,...xa2},y:{title:'<i>A</i>',min:Math.min(fuse.b,0)<0?-0.1:0,max:ya2.max,major:0.1,fmt:'0.0'},legend:{x:0.1,y:0.04,w:0.55,h:0.3}},r,0,r+figH,figW);r+=figH;
  caption(rep,r,0,`図3　No.${nm} を除いた検量線`,figW);r+=2;}
 return {sheets:[rep,cs],res:{n,cstd,fall,fuse,Cu,orig,Cu2,orig2:Cu2*p.vflask/p.vunk,rows,used,ex,spec:specInfo.map(x=>({label:x.s.label,pk:x.pk,eps:x.pk?x.pk.a/(Cs*p.l):NaN}))}};}

/* ================== BTB ================== */
function btb(p){
 const S=[...p.samples].sort((a,b)=>a.pH-b.pH);const N=S.length;const C0=p.stock*1e-3*p.aliq/p.flask;const l=p.l;
 const grid=[...new Set(S.flatMap(s=>s.data.map(q=>q[0])))].sort((a,b)=>a-b);const maps=S.map(s=>new Map(s.data.map(q=>[q[0],q[1]])));
 const rep=new Sheet('レポート用');rep.grid=false;const cs=new Sheet('計算');
 /* 計算 sheet: spectra grid */
 cs.width(0,10);cs.set(0,0,'λ / nm',ST.head);cs.set(1,0,'ファイル',ST.head);S.forEach((s,k)=>{cs.set(0,k+1,'pH '+s.pH,ST.head);cs.set(1,k+1,s.file||'',ST.text);cs.width(k+1,11);});
 grid.forEach((w,i)=>{cs.set(2+i,0,w,ST.n1);maps.forEach((m,k)=>{const v=m.get(w);if(v!=null)cs.set(2+i,k+1,v,ST.n6);});});
 const G0=2,G1=1+grid.length;const EC=N+2;
 cs.row(1,EC,['λ / nm','ε_HL / L mol⁻¹ cm⁻¹','ε_L / L mol⁻¹ cm⁻¹'],ST.head);cs.width(EC,10).width(EC+1,16).width(EC+2,16);
 cs.set(0,EC,'C / mol L⁻¹',ST.bold);cs.set(0,EC+1,C0,ST.sci);cs.set(0,EC+2,'l / cm',ST.bold);cs.set(0,EC+3,l,ST.n2);
 const eH=[],eL=[];grid.forEach((w,i)=>{const a=maps[0].get(w),b=maps[N-1].get(w);cs.set(2+i,EC,w,ST.n1);eH.push(a!=null?a/(C0*l):null);eL.push(b!=null?b/(C0*l):null);
  if(a!=null)cs.set(2+i,EC+1,a/(C0*l),ST.n0,`${col(1)}${3+i}/($${col(EC+1)}$1*$${col(EC+3)}$1)`);if(b!=null)cs.set(2+i,EC+2,b/(C0*l),ST.n0,`${col(N)}${3+i}/($${col(EC+1)}$1*$${col(EC+3)}$1)`);});
 const val=(k,w)=>{let best=null,d=Infinity;for(const g of grid){const dd=Math.abs(g-w);if(dd<d&&maps[k].get(g)!=null){d=dd;best=g;}}return best==null?NaN:maps[k].get(best);};
 const rowsA=S.map((s,k)=>({pH:s.pH,color:s.color||'',a1:val(k,p.w1),a2:val(k,p.w2),use:s.use}));
 const A1w1=rowsA[0].a1,A2w1=rowsA[N-1].a1,A1w2=rowsA[0].a2,A2w2=rowsA[N-1].a2;
 const lg=(A,a1,a2)=>{const r=(A-a1)/(a2-A);return r>0&&isFinite(r)?Math.log10(r):NaN;};
 rowsA.forEach((x,k)=>{if(k&&k<N-1){x.y1=lg(x.a1,A1w1,A2w1);x.y2=lg(x.a2,A1w2,A2w2);}});
 const mid=rowsA.slice(1,-1);const u1=mid.filter(x=>x.use&&isFinite(x.y1)),u2=mid.filter(x=>x.use&&isFinite(x.y2));
 const f1=fit(u1.map(x=>x.pH),u1.map(x=>x.y1)),f2=fit(u2.map(x=>x.pH),u2.map(x=>x.y2));
 // fit data block on 計算
 const FB=EC+5;cs.row(1,FB,[`pH（${p.w1} nm）`,`log（${p.w1} nm）`,`pH（${p.w2} nm）`,`log（${p.w2} nm）`],ST.head);for(let c=FB;c<FB+4;c++)cs.width(c,13);
 u1.forEach((x,i)=>{cs.set(2+i,FB,x.pH,ST.n2);cs.set(2+i,FB+1,x.y1,ST.n3);});u2.forEach((x,i)=>{cs.set(2+i,FB+2,x.pH,ST.n2);cs.set(2+i,FB+3,x.y2,ST.n3);});
 const fr=2+Math.max(u1.length,u2.length)+1;cs.row(fr,FB,['','傾き','切片','R²'],ST.head);
 const rg=(c,n)=>`${col(c)}3:${col(c)}${2+n}`;
 [[`${p.w1} nm`,f1,u1.length,FB],[`${p.w2} nm`,f2,u2.length,FB+2]].forEach(([lab,f,n,c],i)=>{cs.set(fr+1+i,FB,lab,ST.bold);if(!f)return;cs.set(fr+1+i,FB+1,f.a,ST.n3,`SLOPE(${rg(c+1,n)},${rg(c,n)})`);cs.set(fr+1+i,FB+2,f.b,ST.n3,`INTERCEPT(${rg(c+1,n)},${rg(c,n)})`);cs.set(fr+1+i,FB+3,f.r2,ST.n4,`RSQ(${rg(c+1,n)},${rg(c,n)})`);});
 // peaks, isosbestic, steps, baseline (reference only)
 const peaks=S.map(s=>({pH:s.pH,a:peak(s.data,p.r1[0],p.r1[1]),b:peak(s.data,p.r2[0],p.r2[1])}));
 const isoS=S.map((s,k)=>k).filter(k=>S[k].iso);let iso=null;
 if(isoS.length>=2)for(const w of grid){if(w<p.ri[0]||w>p.ri[1])continue;const vs=isoS.map(k=>maps[k].get(w));if(vs.some(v=>v==null))continue;const sp=Math.max(...vs)-Math.min(...vs);if(!iso||sp<iso.spread)iso={w,spread:sp,mean:vs.reduce((a,b)=>a+b,0)/vs.length,min:Math.min(...vs),max:Math.max(...vs)};}
 const stp=[...new Set(S.flatMap(s=>steps(s.data)).map(w=>Math.round(w)))].sort((a,b)=>a-b);
 const base=S.map((s,k)=>({pH:s.pH,a:maps[k].get(grid[grid.length-1])}));
 const PR=fr+5;cs.set(PR,FB,'参考：吸収極大・等吸収点',ST.sub);cs.row(PR+1,FB,['pH',`極大（${p.r1[0]}–${p.r1[1]} nm）`,`極大（${p.r2[0]}–${p.r2[1]} nm）`],ST.head);
 peaks.forEach((q,i)=>{cs.set(PR+2+i,FB,q.pH,ST.n2);cs.set(PR+2+i,FB+1,q.a?(q.a.edge?'明確な極大なし':`${q.a.w} nm（${q.a.a.toFixed(3)}）`):'—',ST.text);cs.set(PR+2+i,FB+2,q.b?(q.b.edge?'明確な極大なし':`${q.b.w} nm（${q.b.a.toFixed(3)}）`):'—',ST.text);});
 const IR=PR+3+N;cs.set(IR,FB,'等吸収点',ST.bold);cs.set(IR,FB+1,iso?`${iso.w} nm（A = ${iso.min.toFixed(3)}〜${iso.max.toFixed(3)}）`:'—',ST.text);
 cs.set(IR+1,FB,'段差（不連続）',ST.bold);cs.set(IR+1,FB+1,stp.length?stp.map(w=>'約'+w+' nm').join('、'):'なし',ST.text);
 /* レポート用 */
 [10,10,20,10,20,10,10,10].forEach((w,i)=>rep.width(i,w));
 let r=0;rep.set(r,0,'分子の吸収スペクトルと溶液の平衡：レポート用の表と図',ST.sub);r+=2;const figW=8,figH=19;
 const allA=S.flatMap(s=>s.data.map(q=>q[1]));const ya=niceAxis(Math.min(0,...allA),Math.max(...allA)*1.08,0.1);const xa=niceAxis(grid[0],grid[grid.length-1],50);
 rep.chart({series:S.map((s,k)=>({name:'pH '+s.pH.toFixed(2),x:grid,y:grid.map(w=>maps[k].get(w)??null),xRef:aref('計算',G0,0,G1,0),yRef:aref('計算',G0,k+1,G1,k+1),line:true,width:22225,color:btbColor(s.pH),marker:'none'})),
  x:{title:'<i>λ</i> / nm',...xa},y:{title:'<i>A</i>',...ya,fmt:'0.0'},legend:{x:0.74,y:0.04,w:0.22,h:0.065*N}},r,0,r+figH,figW);r+=figH;
 caption(rep,r,0,'図1　pHの異なるBTB溶液の吸収スペクトル',figW);r+=2;
 const hasColor=rowsA.some(x=>x.color);
 r=table(rep,r,0,`表1　各pHにおける${hasColor?'溶液の色と':''} ${p.w1} nm, ${p.w2} nm における吸光度`,['pH',...(hasColor?['溶液の色']:[]),`<i>A</i>（${p.w1} nm）`,`<i>A</i>（${p.w2} nm）`],rowsA.map(x=>[x.pH.toFixed(2),...(hasColor?[x.color||'']:[]),x.a1.toFixed(3),x.a2.toFixed(3)]));
 const eAll=[...eH,...eL].filter(v=>v!=null);const emax=Math.max(...eAll);const sc=emax>=1e4?1e4:1e3;const scE=Math.log10(sc);
 rep.chart({series:[{name:`<i>ε</i>_{HL}（pH ${S[0].pH.toFixed(2)}）`,x:grid,y:eH,xRef:aref('計算',2,EC,G1,EC),yRef:aref('計算',2,EC+1,G1,EC+1),line:true,color:OF.orange,marker:'none'},{name:`<i>ε</i>_{L}（pH ${S[N-1].pH.toFixed(2)}）`,x:grid,y:eL,xRef:aref('計算',2,EC,G1,EC),yRef:aref('計算',2,EC+2,G1,EC+2),line:true,dash:'dash',color:OF.blue,marker:'none'}],
  x:{title:'<i>λ</i> / nm',...xa},y:{title:`<i>ε</i> / L mol^{${M}1} cm^{${M}1}`,...niceAxis(Math.min(...eAll)<-0.1*emax?Math.min(...eAll):0,emax*1.08,sc),fmt:'0'},legend:{x:0.1,y:0.04,w:0.32,h:0.14}},r,0,r+figH,figW);r+=figH;
 caption(rep,r,0,'図2　HL と L^{−} のモル吸光係数の波長依存性',figW);r+=2;
 r=table(rep,r,0,`表2　${p.w1} nm と ${p.w2} nm における <i>A</i>_{1}, <i>A</i>_{2} とモル吸光係数`,['波長','<i>A</i>_{1}',`<i>ε</i>_{HL} / L mol^{${M}1} cm^{${M}1}`,'<i>A</i>_{2}',`<i>ε</i>_{L} / L mol^{${M}1} cm^{${M}1}`],
  [[`${p.w1} nm`,A1w1.toFixed(3),sci(A1w1/(C0*l)),A2w1.toFixed(3),sci(A2w1/(C0*l))],[`${p.w2} nm`,A1w2.toFixed(3),sci(A1w2/(C0*l)),A2w2.toFixed(3),sci(A2w2/(C0*l))]]);
 const LOG='log_{10}{(<i>A</i> − <i>A</i>_{1}) / (<i>A</i>_{2} − <i>A</i>)}';
 r=table(rep,r,0,'表3　pH 7 付近の溶液における式(5.20)の左辺の値',['pH',`<i>A</i>（${p.w1} nm）`,`log 値（${p.w1} nm）`,`<i>A</i>（${p.w2} nm）`,`log 値（${p.w2} nm）`],
  mid.map(x=>[x.pH.toFixed(2),x.a1.toFixed(3),isFinite(x.y1)?fx(x.y1,3):'解なし',x.a2.toFixed(3),isFinite(x.y2)?fx(x.y2,3):'解なし']),`log 値 = ${LOG}`);
 const ser=[];const eqt=(f,w)=>`${w} nm: <i>y</i> = ${fx(f.a,3)}<i>x</i> ${f.b<0?M:'+'} ${Math.abs(f.b).toFixed(3)}\n<i>R</i>^{2} = ${f.r2.toFixed(3)}`;
 if(f1)ser.push({name:`${p.w1} nm`,x:u1.map(x=>x.pH),y:u1.map(x=>x.y1),xRef:aref('計算',2,FB,1+u1.length,FB),yRef:aref('計算',2,FB+1,1+u1.length,FB+1),marker:'circle',color:OF.orange,trend:{name:`線形近似（${p.w1} nm）`,color:OF.orange,dash:'sysdot',label:{text:eqt(f1,p.w1),x:-0.3,y:-0.02}}});
 if(f2)ser.push({name:`${p.w2} nm`,x:u2.map(x=>x.pH),y:u2.map(x=>x.y2),xRef:aref('計算',2,FB+2,1+u2.length,FB+2),yRef:aref('計算',2,FB+3,1+u2.length,FB+3),marker:'triangle',color:OF.blue,trend:{name:`線形近似（${p.w2} nm）`,color:OF.blue,dash:'dash',label:{text:eqt(f2,p.w2),x:0.05,y:0.1}}});
 const pk1=f1?-f1.b/f1.a:NaN,pk2=f2?-f2.b/f2.a:NaN;const pks=[pk1,pk2].filter(isFinite);const pkm=pks.length?pks.reduce((a,b)=>a+b,0)/pks.length:NaN;
 if(ser.length){const xs=[...u1,...u2].map(x=>x.pH),ys=[...u1.map(x=>x.y1),...u2.map(x=>x.y2)];
  rep.chart({series:ser,x:{title:'pH',...niceAxis(Math.min(...xs)-0.2,Math.max(...xs)+0.2,0.25),fmt:'0.00'},y:{title:LOG,...niceAxis(Math.min(...ys)-0.2,Math.max(...ys)+0.2,0.25),fmt:'0.00'},legend:{x:0.1,y:0.04,w:0.36,h:0.26}},r,0,r+figH,figW);r+=figH;
  caption(rep,r,0,'図3　BTB の吸光度と pH の関係',figW);r+=2;}
 r=table(rep,r,0,'表4　近似直線の傾き・切片と求めた p<i>K</i>_{a}',['波長','傾き','切片','<i>R</i>^{2}','p<i>K</i>_{a}'],[[`${p.w1} nm`,f1?fx(f1.a,3):'—',f1?fx(f1.b,3):'—',f1?f1.r2.toFixed(3):'—',isFinite(pk1)?pk1.toFixed(2):'—'],[`${p.w2} nm`,f2?fx(f2.a,3):'—',f2?fx(f2.b,3):'—',f2?f2.r2.toFixed(3):'—',isFinite(pk2)?pk2.toFixed(2):'—']]);
 return {sheets:[rep,cs],res:{C0,rowsA,f1,f2,pkm,u1,u2,peaks,iso,steps:stp,base,S,grid,maps}};}

/* ================== 振動反応 ================== */
function oscillation(p){const n=p.n;
 const rep=new Sheet('レポート用');rep.grid=false;const cs=new Sheet('計算');
 const rows=p.temps.map(t=>{const ts=t.times;const Pind=ts[0],Posc=(ts[n-1]-ts[0])/(n-1),T=t.t+273.15;return {t:t.t,T,Pind,Posc,ts,x:1000/T,yi:Math.log(1/Pind),yo:Math.log(1/Posc)};});
 const fi=fit(rows.map(x=>x.x),rows.map(x=>x.yi)),fo=fit(rows.map(x=>x.x),rows.map(x=>x.yo));const R=8.314;
 const Ea=f=>-f.a*1000*R/1000,dEa=f=>f.se*1000*R/1000;
 /* 計算 */
 cs.width(0,14);cs.set(0,0,'計算用シート',ST.sub);cs.row(1,0,['t / ℃','T / K','T⁻¹ / 10⁻³ K⁻¹',...Array.from({length:n},(_,i)=>`${i+1}回目 / s`),'Pind / s','Posc / s','ln(1/Pind)','ln(1/Posc)'],ST.head);
 rows.forEach((x,k)=>{const r=2+k,Rr=r+1;cs.set(r,0,x.t,ST.n1);cs.set(r,1,x.T,ST.n2,`A${Rr}+273.15`);cs.set(r,2,x.x,ST.n4,`1000/B${Rr}`);x.ts.forEach((v,i)=>cs.set(r,3+i,v,ST.n0));
  const c1=col(3),cn=col(2+n);cs.set(r,3+n,x.Pind,ST.n0,`${c1}${Rr}`);cs.set(r,4+n,x.Posc,ST.n2,`(${cn}${Rr}-${c1}${Rr})/${n-1}`);cs.set(r,5+n,x.yi,ST.n3,`LN(1/${col(3+n)}${Rr})`);cs.set(r,6+n,x.yo,ST.n3,`LN(1/${col(4+n)}${Rr})`);});
 const e0=2,e1=1+rows.length,xr=`C${e0+1}:C${e1+1}`,yi=`${col(5+n)}${e0+1}:${col(5+n)}${e1+1}`,yo=`${col(6+n)}${e0+1}:${col(6+n)}${e1+1}`;const F0=e1+2;
 cs.row(F0,0,['','誘導期','振動期'],ST.head);
 [['傾き / 10³ K',fi.a,fo.a,y=>`SLOPE(${y},${xr})`,ST.n3],['切片',fi.b,fo.b,y=>`INTERCEPT(${y},${xr})`,ST.n3],['R²',fi.r2,fo.r2,y=>`RSQ(${y},${xr})`,ST.n4],['Ea / kJ mol⁻¹',Ea(fi),Ea(fo),(y,c)=>`-${c}${F0+2}*${R}`,ST.n1],['Ea の標準誤差 / kJ mol⁻¹',dEa(fi),dEa(fo),y=>`INDEX(LINEST(${y},${xr},TRUE,TRUE),2,1)*${R}`,ST.n1]]
  .forEach((L,i)=>{cs.set(F0+1+i,0,L[0],ST.bold);cs.set(F0+1+i,1,L[1],L[4],L[3](yi,'B'));cs.set(F0+1+i,2,L[2],L[4],L[3](yo,'C'));});
 /* レポート用 */
 rep.width(0,22).width(1,12);for(let c=2;c<2+n;c++)rep.width(c,7);
 let r=0;rep.set(r,0,'化学的振動反応：レポート用の表と図',ST.sub);r+=2;
 const t1=[];rows.forEach(x=>{t1.push([`${x.t} ℃`,'時間 / s',...x.ts.map(v=>String(Math.round(v)))]);t1.push(['','周期 / s',...x.ts.map((v,i)=>String(Math.round(i?v-x.ts[i-1]:v)))]);});
 const T1=r+2;r=table(rep,r,0,'表1　発色の回数と時間（時間は反応開始からの経過時間）',['温度','項目',...Array.from({length:n},(_,i)=>String(i+1))],t1,'※ 1回目の周期は誘導期 <i>P</i>_{ind} に等しい。');rows.forEach((_,k)=>{rep.set(T1+2*k,0,{r:`${rows[k].t} ℃`},ST.td);rep.set(T1+2*k+1,0,'',k===rows.length-1?ST.tdl:ST.td);rep.merge(T1+2*k,0,T1+2*k+1,0);});
 const W2=1+rows.length;
 r=table(rep,r,0,'表2　アーレニウスプロット用のデータ整理',['',...rows.map(x=>`${x.t} ℃`)],[
  [`<i>T</i>^{${M}1} / 10^{${M}3} K^{${M}1}`,...rows.map(x=>x.x.toFixed(3))],
  ['<i>P</i>_{ind} / s',...rows.map(x=>String(Math.round(x.Pind)))],['<i>P</i>_{osc} / s',...rows.map(x=>x.Posc.toFixed(1))],
  [`<i>P</i>_{ind}^{${M}1} / 10^{${M}2} s^{${M}1}`,...rows.map(x=>sig(100/x.Pind,3))],[`<i>P</i>_{osc}^{${M}1} / 10^{${M}2} s^{${M}1}`,...rows.map(x=>sig(100/x.Posc,3))],
  ['ln (1/<i>P</i>_{ind})',...rows.map(x=>fx(x.yi,3))],['ln (1/<i>P</i>_{osc})',...rows.map(x=>fx(x.yo,3))]],'※ <i>T</i> は絶対温度（<i>T</i> = <i>t</i> + 273.15 K）。');
 const xs=rows.map(x=>x.x),ys=[...rows.map(x=>x.yi),...rows.map(x=>x.yo)];const figW=Math.max(8,n+2),figH=19;
 const lab=(nm,f)=>`${nm}: <i>y</i> = ${fx(f.a,3)}<i>x</i> ${f.b<0?M:'+'} ${Math.abs(f.b).toFixed(2)}\n<i>R</i>^{2} = ${f.r2.toFixed(3)}`;
 rep.chart({series:[{name:'誘導期',x:xs,y:rows.map(x=>x.yi),xRef:aref('計算',e0,2,e1,2),yRef:aref('計算',e0,5+n,e1,5+n),marker:'square',color:OF.orange,trend:{name:'線形近似（誘導期）',color:OF.orange,dash:'sysdot',label:{text:lab('誘導期',fi),x:-0.25,y:0.1}}},
  {name:'振動期',x:xs,y:rows.map(x=>x.yo),xRef:aref('計算',e0,2,e1,2),yRef:aref('計算',e0,6+n,e1,6+n),marker:'circle',color:OF.blue,trend:{name:'線形近似（振動期）',color:OF.blue,dash:'dash',label:{text:lab('振動期',fo),x:0.05,y:-0.12}}}],
  x:{title:`<i>T</i>^{${M}1} / 10^{${M}3} K^{${M}1}`,...niceAxis(Math.min(...xs)-0.015,Math.max(...xs)+0.015,0.02),fmt:'0.00'},y:{title:'ln (1/<i>P</i>)',...niceAxis(Math.min(...ys)-0.3,Math.max(...ys)+0.3,0.5),fmt:'0.0'},legend:{x:0.6,y:0.45,w:0.36,h:0.3}},r,0,r+figH,8);r+=figH;
 caption(rep,r,0,'図1　誘導期および振動期のアーレニウスプロット',8);r+=2;
 r=table(rep,r,0,'表3　誘導期および振動期の活性化エネルギー',['','傾き / K','<i>R</i>^{2}',`<i>E</i>_{a} / kJ mol^{${M}1}`],[['誘導期',sci(fi.a*1000,4),fi.r2.toFixed(3),`${Ea(fi).toFixed(1)} ± ${dEa(fi).toFixed(1)}`],['振動期',sci(fo.a*1000,4),fo.r2.toFixed(3),`${Ea(fo).toFixed(1)} ± ${dEa(fo).toFixed(1)}`]],null,[1,1,2,3]);
 return {sheets:[rep,cs],res:{rows,fi,fo,Ea:{ind:Ea(fi),osc:Ea(fo),dind:dEa(fi),dosc:dEa(fo)}}};}
return {colorimetry,btb,oscillation,parseSpectrum,parseTime,fit,peak,steps,btbColor};})();
if(typeof module!=='undefined')module.exports=LAB;
