(function(){
const $=id=>document.getElementById(id);
const num=v=>{const x=parseFloat(String(v).replace(/,/g,''));return isFinite(x)?x:NaN;};
const fmt=(v,d=3)=>isFinite(v)?Number(v).toFixed(d):'—';
const sci=v=>isFinite(v)?v.toExponential(2).replace('e',' × 10^').replace(/\^\+?(-?\d+)/,(m,e)=>'^'+e):'—';
const supify=s=>s.replace(/\^(-?\d+)/g,(m,e)=>e.split('').map(ch=>({'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'}[ch])).join(''));
const sciTxt=v=>supify(sci(v));
const range=s=>{const m=String(s).match(/(-?\d+(?:\.\d+)?)\s*[-–〜~,]\s*(-?\d+(?:\.\d+)?)/);return m?[+m[1],+m[2]].sort((a,b)=>a-b):null;};
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const state={tab:'colorimetry',sample:{colorimetry:true,btb:true,oscillation:true},c:{spec:[null,null]},b:{files:[]},o:{rows:[]}};

/* ---------------- sample data (fictional) ---------------- */
const gauss=(x,m,s)=>Math.exp(-0.5*((x-m)/s)**2);
function sampleCuSpectra(){const a=[],b=[];for(let w=400;w<=1000;w++){a.push([w,+(0.478*gauss(w,608,72)+0.018*gauss(w,455,38)-0.004).toFixed(6)]);b.push([w,+(0.092*gauss(w,790,90)+0.023).toFixed(6)]);}return [{label:'発色させた比色用標準溶液',data:a,name:'サンプル（架空）',lo:'400',hi:'1000',isSample:true},{label:'発色させていない硫酸銅溶液',data:b,name:'サンプル（架空）',lo:'400',hi:'1000',isSample:true}];}
function sampleBTB(){let s=7;const rnd=()=>{s=(s*16807)%2147483647;return s/2147483647-0.5;};const C=1.2e-5;const pHs=[3.85,6.12,6.88,7.35,7.95,10.45];
 return pHs.map(pH=>{const fL=1/(1+10**(7.05-pH)),k=1+rnd()*0.008;const d=[];for(let w=350;w<=700;w++){const eH=1.55e4*gauss(w,431,42)+2500*gauss(w,350,25),eL=3.9e4*gauss(w,618,45)+3000*gauss(w,540,25)+5000*gauss(w,398,32)+1500*gauss(w,350,20);d.push([w,+((eH*(1-fL)+eL*fL)*C*k+0*rnd()).toFixed(6)]);}
  return {name:'サンプル_pH'+pH+'.txt',pH:String(pH),color:'',data:d,use:true,isSample:true};});}
function sampleOsc(){return [[35,`1'32",1'46",1'59",2'13",2'28",2'43",2'57",3'13",3'29",3'45",4'02"`],[40,'69,78,88,97,107,117,127,138,149,160,171'],[45,'48,55,62,69,76,83,91,99,106,114,123'],[50,'35,40,45,50,55,59,64,69,75,80,86']].map(([t,s])=>({t:String(t),times:s.split(',')}));}
const CDEF={mass:'1.18',M:'249.7',vstd:'100',vflask:'25',vunk:'1.00',l:'1.00',wl:'615',Vspec:'5.00',Vs:'0, 1, 2, 3, 4, 5',A:['0.000','0.098','0.203','0.297','0.402','0.494'],Aunk:'0.336'};
const BDEF={stock:'0.3',aliq:'1.00',flask:'25',l:'1.00',w1:'435',w2:'615',r1:'375-480',r2:'550-700',ri:'450-560'};
const SPECL=['発色させた比色用標準溶液','発色させていない硫酸銅溶液'];

/* ---------------- 比色分析 ---------------- */
function cInit(sample){const d=CDEF;for(const k of ['mass','M','vstd','vflask','vunk','l','wl','Vspec','Vs'])$('c-'+k).value=d[k];
 $('c-Aunk').value=sample?d.Aunk:'';const tb=$('c-rows');tb.innerHTML='';d.A.forEach((v,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td>${i+1}</td><td class="l">${i?'比色用標準溶液':'対照液'}<span id="c-sub${i}"></span></td><td><input id="c-A${i}" type="number" step="0.001" value="${sample?v:(i?'':'0.000')}" aria-label="No.${i+1}の吸光度"></td><td><input id="c-u${i}" type="checkbox" checked aria-label="No.${i+1}を検量線に使う"></td>`;tb.appendChild(tr);tr.querySelectorAll('input').forEach(x=>x.addEventListener('input',()=>{touch('colorimetry');update();}));});
 if(!sample)$('c-mass').value='';state.c.spec=sample?sampleCuSpectra():[null,null];cSpecUI();}
function cSpecUI(){const box=$('c-spec');box.innerHTML='';
 [0,1].forEach(i=>{const s=state.c.spec[i];const div=document.createElement('div');div.style.marginBottom='8px';
  div.innerHTML=`<div class="drop" tabindex="0" role="button">${s?`<b>${SPECL[i]}</b>：${s.name}　（クリックで差し替え）`:`${SPECL[i]}のファイルを選択`}<input type="file" class="sr" accept=".txt,.TXT,.csv"></div>`;box.appendChild(div);
  const inp=div.querySelector('input'),dr=div.querySelector('.drop');
  bindDrop(dr,inp,async fs=>{const f=fs[0];const data=LAB.parseSpectrum(await f.text());if(data.length<5){$('c-msg').className='msg err';$('c-msg').textContent=f.name+' から数値データを読み取れませんでした。';return;}
   state.c.spec=state.c.spec.map(s=>s&&s.isSample?null:s);touch('colorimetry');state.c.spec[i]={label:SPECL[i],data,name:f.name,lo:data[0][0],hi:data[data.length-1][0]};cSpecUI();update();});});}
function cRead(){const p={mass:num($('c-mass').value),M:num($('c-M').value),vstd:num($('c-vstd').value),vflask:num($('c-vflask').value),vunk:num($('c-vunk').value),l:num($('c-l').value),wl:num($('c-wl').value),Vspec:num($('c-Vspec').value),Aunk:num($('c-Aunk').value),A:[],use:[]};
 p.V=$('c-Vs').value.split(/[,、\s]+/).filter(Boolean).map(num);for(let i=0;i<6;i++){p.A.push(num($('c-A'+i).value));p.use.push($('c-u'+i).checked);}
 p.spectra=state.c.spec.filter(Boolean).map(s=>({label:s.label,data:s.data,lo:+s.lo,hi:+s.hi}));return p;}
function cCheck(p){const e=[];if(!(p.mass>0))e.push('硫酸銅五水和物の質量を入力してください。');if(!(p.M>0&&p.vstd>0&&p.vflask>0&&p.vunk>0&&p.l>0))e.push('テキストの条件に正の数を入力してください。');
 if(p.V.length!==6||p.V.some(v=>!isFinite(v)))e.push('No.1〜6 の標準溶液の量は「0, 1, 2, 3, 4, 5」のように6つ入力してください。');
 if(p.A.some(v=>!isFinite(v)))e.push('No.1〜6 の吸光度をすべて入力してください。');if(p.use.filter(Boolean).length<2)e.push('検量線には2点以上が必要です。');if(!isFinite(p.Aunk))e.push('No.7 の吸光度を入力してください。');return e;}
function cSub(p){for(let i=0;i<6;i++){const el=$('c-sub'+i);if(el)el.textContent=isFinite(p.V[i])?`（${p.V[i].toFixed(2)} mL）`:'';}}
function cUpdate(){const p=cRead();cSub(p);const e=cCheck(p),m=$('c-msg'),res=$('c-res');if(e.length){m.className='msg err';m.textContent=e.join(' ');res.innerHTML='';REPORT.render($('c-rep'),'colorimetry',null);return null;}
 const o=LAB.colorimetry({...p,tableStyle:STYLE.table}),r=o.res;m.className='msg';m.textContent='';
 const kv=[['検量線（全点）の傾き',`${fmt(r.fall.a,1)} L mol⁻¹`],['もとの硫酸銅溶液の濃度',fmt(r.orig,3)+' mol L⁻¹']];
 if(r.fuse)kv.push([`No.${r.ex.map(x=>x.no).join(', ')} を除くと（図3）`,fmt(r.orig2,3)+' mol L⁻¹']);
 r.spec.forEach(s=>{if(s.pk)kv.push([s.label.replace('させた比色用標準溶液','後').replace('させていない硫酸銅溶液','前')+'のピーク',`${Math.round(s.pk.w)} nm, ε = ${fmt(s.eps,1)}`]);});
 res.innerHTML=kv.map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
 REPORT.applyOverrides('colorimetry',o,STYLE.chart);REPORT.render($('c-rep'),'colorimetry',o,update,STYLE.table);
 return o;}

/* ---------------- BTB ---------------- */
function bInit(sample){for(const k in BDEF)$('b-'+k).value=BDEF[k];state.b.files=sample?sampleBTB():[];bRows();}
function bRows(){const tb=$('b-rows');tb.innerHTML='';if(!state.b.files.length){tb.innerHTML='<tr><td colspan="5" class="l" style="color:var(--muted)">まだファイルがありません。上の枠からスペクトルのファイルを読み込んでください。</td></tr>';return;}
 state.b.files.forEach((f,i)=>{const tr=document.createElement('tr');const ph=num(f.pH);tr.innerHTML=`<td class="l mono"><span class="swatch" style="background:${isFinite(ph)?'#'+LAB.btbColor(ph):'transparent'}"></span>${f.name}</td><td><input type="number" step="0.01" value="${f.pH}" style="width:76px" aria-label="${f.name}のpH"></td><td><input type="text" value="${f.color||''}" style="width:84px" aria-label="${f.name}の溶液の色"></td><td><input type="checkbox" ${f.use?'checked':''} aria-label="計算に使う"></td><td><button class="btn small" type="button" aria-label="${f.name}を削除">×</button></td>`;tb.appendChild(tr);
  const [iph,icol,iuse]=tr.querySelectorAll('input');const sw=tr.querySelector('.swatch');
  iph.addEventListener('input',e=>{f.pH=e.target.value;const v=num(f.pH);sw.style.background=isFinite(v)?'#'+LAB.btbColor(v):'transparent';touch('btb');update();});
  icol.addEventListener('input',e=>{f.color=e.target.value;touch('btb');update();});
  iuse.addEventListener('change',e=>{f.use=e.target.checked;touch('btb');update();});
  tr.querySelector('button').addEventListener('click',()=>{state.b.files.splice(i,1);touch('btb');bRows();update();});});}
async function bLoad(fs){for(const f of fs){const data=LAB.parseSpectrum(await f.text());if(data.length<5){$('b-msg').className='msg err';$('b-msg').textContent=f.name+' から数値データを読み取れませんでした。';continue;}
  state.b.files=state.b.files.filter(x=>!x.isSample);touch('btb');state.b.files.push({name:f.name,pH:'',color:'',data,use:true});}
 state.b.files.sort((a,b)=>a.name.localeCompare(b.name,'ja',{numeric:true}));bRows();update();}
function bRead(){const p={stock:num($('b-stock').value),aliq:num($('b-aliq').value),flask:num($('b-flask').value),l:num($('b-l').value),w1:num($('b-w1').value),w2:num($('b-w2').value),r1:range($('b-r1').value),r2:range($('b-r2').value),ri:range($('b-ri').value)};
 p.samples=state.b.files.map(f=>({pH:num(f.pH),file:f.name,color:(f.color||'').trim(),data:f.data,use:f.use,iso:f.use}));return p;}
function bCheck(p){const e=[];if(p.samples.length<3)e.push('pHの異なるスペクトルを3つ以上読み込んでください（両端のpHと、その間の溶液）。');else if(p.samples.some(s=>!isFinite(s.pH)))e.push('すべてのファイルにpHを入力してください。');
 if(!(p.stock>0&&p.aliq>0&&p.flask>0&&p.l>0))e.push('テキストの条件に正の数を入力してください。');if(!isFinite(p.w1)||!isFinite(p.w2))e.push('解析波長を入力してください。');if(!p.r1||!p.r2||!p.ri)e.push('範囲は「375-480」のように入力してください。');return e;}
function bUpdate(){const p=bRead(),e=bCheck(p),m=$('b-msg'),res=$('b-res');
 if(e.length){m.className='msg err';m.textContent=e.join(' ');res.innerHTML='';REPORT.render($('b-rep'),'btb',null);return null;}
 const o=LAB.btb({...p,tableStyle:STYLE.table}),r=o.res;const notes=[];
 const bad=r.rowsA.slice(1,-1).filter(x=>!isFinite(x.y1)||!isFinite(x.y2));if(bad.length)notes.push('pH '+bad.map(x=>x.pH.toFixed(2)).join('、')+' は log 値が求められない波長があります（表3では「解なし」）。');
 if(r.steps.length)notes.push('約 '+r.steps.join(' nm、約 ')+' nm に装置の段差があります。');
 // an intermediate pH must lie between the two end spectra at every wavelength; flag spectra that leave that band over >10 % of the range
 const N=r.S.length,off=[];for(let k=1;k<N-1;k++){let out=0,n=0;for(const w of r.grid){const a0=r.maps[0].get(w),a1=r.maps[N-1].get(w),v=r.maps[k].get(w);if(a0==null||a1==null||v==null)continue;n++;if(v<Math.min(a0,a1)-0.01||v>Math.max(a0,a1)+0.01)out++;}if(n&&out/n>0.1)off.push({pH:r.S[k].pH});}
 if(off.length)notes.push('pH '+off.map(b=>b.pH.toFixed(2)).join('、')+' はスペクトル全体が上下にずれている可能性があります（「計算に使う」を外すと除けます）。');
 m.className=notes.length?'msg warn':'msg';m.textContent=notes.join(' ');
 const pk=f=>f?fmt(-f.b/f.a,2):'—';
 res.innerHTML=[[`pKa（${p.w1} nm / ${p.w2} nm）`,pk(r.f1)+' / '+pk(r.f2)],['pKa の平均',fmt(r.pkm,2)],['等吸収点',r.iso?r.iso.w+' nm':'—']].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
 REPORT.applyOverrides('btb',o,STYLE.chart);REPORT.render($('b-rep'),'btb',o,update,STYLE.table);
 return o;}

/* ---------------- 振動反応 ---------------- */
function oInit(sample){$('o-n').value='11';state.o.rows=sample?sampleOsc():[{t:'35',times:[]},{t:'40',times:[]},{t:'45',times:[]},{t:'50',times:[]}];oRows();}
function oRows(){const n=Math.max(3,Math.min(30,parseInt($('o-n').value)||11));$('o-head').innerHTML=`<tr><th>温度 / ℃</th>${Array.from({length:n},(_,i)=>`<th>${i+1}</th>`).join('')}<th></th></tr>`;
 const tb=$('o-rows');tb.innerHTML='';state.o.rows.forEach((r,k)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input type="number" step="0.1" id="o-t${k}" value="${r.t}" style="width:64px" aria-label="温度"></td>`+Array.from({length:n},(_,i)=>`<td><input type="text" id="o-${k}-${i}" value="${r.times[i]??''}" style="width:62px" aria-label="${r.t}℃の${i+1}回目"></td>`).join('')+`<td><button class="btn small" type="button" data-del="${k}">削除</button></td>`;tb.appendChild(tr);
  tr.querySelector('#o-t'+k).addEventListener('input',e=>{r.t=e.target.value;touch('oscillation');update();});
  for(let i=0;i<n;i++)tr.querySelector(`#o-${k}-${i}`).addEventListener('input',e=>{r.times[i]=e.target.value;touch('oscillation');update();});
  tr.querySelector('[data-del]').addEventListener('click',()=>{state.o.rows.splice(k,1);touch('oscillation');oRows();update();});});}
function oRead(){const n=Math.max(3,Math.min(30,parseInt($('o-n').value)||11));return {n,temps:state.o.rows.map(r=>({t:num(r.t),times:Array.from({length:n},(_,i)=>LAB.parseTime(r.times[i]))}))};}
function oCheck(p){const e=[];if(p.temps.length<2)e.push('温度は2つ以上必要です。');
 p.temps.forEach(t=>{if(!isFinite(t.t))e.push('温度を入力してください。');const bad=t.times.findIndex(v=>!isFinite(v));if(bad>=0)e.push(`${isFinite(t.t)?t.t+' ℃':'温度未入力の行'}の${bad+1}回目の時間を読み取れません。`);else if(t.times.some((v,i)=>i&&v<=t.times[i-1]))e.push(`${t.t} ℃の時間が増えていない箇所があります。`);});return [...new Set(e)];}
function oUpdate(){const p=oRead(),e=oCheck(p),m=$('o-msg'),res=$('o-res');if(e.length){m.className='msg err';m.textContent=e.join(' ');res.innerHTML='';REPORT.render($('o-rep'),'oscillation',null);return null;}
 const o=LAB.oscillation({...p,tableStyle:STYLE.table}),r=o.res;m.className='msg';m.textContent='';
 res.innerHTML=[['Ea（誘導期）',fmt(r.Ea.ind,1)+' ± '+fmt(r.Ea.dind,1)+' kJ mol⁻¹'],['Ea（振動期）',fmt(r.Ea.osc,1)+' ± '+fmt(r.Ea.dosc,1)+' kJ mol⁻¹']].map(([k,v])=>`<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('');
 REPORT.applyOverrides('oscillation',o,STYLE.chart);REPORT.render($('o-rep'),'oscillation',o,update,STYLE.table);
 return o;}

/* ---------------- look of all tables / figures (one setting for everything, remembered in this browser) ---------------- */
const STYLE={table:'three',chart:'office'};try{const s=JSON.parse(localStorage.getItem('chem-tool-style')||'{}');if(s.table)STYLE.table=s.table;if(s.chart)STYLE.chart=s.chart;}catch(_){}
function syncPick(){document.querySelectorAll('.ts-pick').forEach(s=>s.value=STYLE.table);document.querySelectorAll('.cs-pick').forEach(s=>s.value=STYLE.chart);}
document.querySelectorAll('.ts-pick,.cs-pick').forEach(s=>s.addEventListener('change',()=>{if(s.classList.contains('ts-pick'))STYLE.table=s.value;else STYLE.chart=s.value;syncPick();try{localStorage.setItem('chem-tool-style',JSON.stringify(STYLE));}catch(_){}update();}));
syncPick();

/* ---------------- shell ---------------- */
function bindDrop(dr,inp,cb){dr.addEventListener('click',e=>{if(e.target!==inp)inp.click();});dr.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inp.click();}});
 inp.addEventListener('change',()=>{if(inp.files.length)cb([...inp.files]);inp.value='';});
 dr.addEventListener('dragover',e=>{e.preventDefault();dr.classList.add('over');});dr.addEventListener('dragleave',()=>dr.classList.remove('over'));dr.addEventListener('drop',e=>{e.preventDefault();dr.classList.remove('over');if(e.dataTransfer.files.length)cb([...e.dataTransfer.files]);});}
function touch(t){if(state.sample[t]){state.sample[t]=false;note();}}
function note(){const s=state.sample[state.tab];$('bar-note').innerHTML=s?'<span class="chip">サンプル値を表示中</span> 自分の測定値に書き換えてから作成してください。':'<span class="chip ok">自分の値</span> 「レポート用」シートに表と図、「計算」シートに途中計算が入ります。';}
const UPD={colorimetry:cUpdate,btb:bUpdate,oscillation:oUpdate};
/* ---------------- remember the inputs in this browser (restored on the next visit; nothing leaves the browser) ---------------- */
const SAVE_KEY='chem-tool-inputs-v1';
const CF=['mass','Aunk','M','vstd','vflask','vunk','l','wl','Vs','Vspec'],BF=['stock','aliq','flask','l','w1','w2','r1','r2','ri'];
function snapshot(withSpectra=true){const c={f:{},A:[],use:[]};CF.forEach(k=>c.f[k]=$('c-'+k).value);for(let i=0;i<6;i++){c.A.push($('c-A'+i).value);c.use.push($('c-u'+i).checked);}
 c.spec=withSpectra?state.c.spec:[null,null];const b={f:{}};BF.forEach(k=>b.f[k]=$('b-'+k).value);b.files=withSpectra?state.b.files:[];
 return {v:1,tab:state.tab,sample:state.sample,c,b,o:{n:$('o-n').value,rows:state.o.rows},ov:REPORT.getOV()};}
let saveT=0;function saveSoon(){clearTimeout(saveT);saveT=setTimeout(()=>{let ok=false;try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot(true)));ok=true;}catch(_){}
 if(!ok){try{localStorage.setItem(SAVE_KEY,JSON.stringify(snapshot(false)));}catch(_){}}},400);}   // too big for the browser's storage → keep everything except the spectra
function restore(){let s=null;try{s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');}catch(_){}if(!s||s.v!==1)return false;
 try{CF.forEach(k=>{if(s.c.f[k]!=null)$('c-'+k).value=s.c.f[k];});s.c.A.forEach((v,i)=>{if($('c-A'+i))$('c-A'+i).value=v;});s.c.use.forEach((v,i)=>{if($('c-u'+i))$('c-u'+i).checked=v;});
  if(s.c.spec&&s.c.spec.some(Boolean)){state.c.spec=s.c.spec;}cSpecUI();
  BF.forEach(k=>{if(s.b.f[k]!=null)$('b-'+k).value=s.b.f[k];});if(s.b.files&&s.b.files.length)state.b.files=s.b.files;bRows();
  if(s.o){$('o-n').value=s.o.n||'11';if(s.o.rows)state.o.rows=s.o.rows;oRows();}
  if(s.sample)Object.assign(state.sample,s.sample);if(s.tab&&!location.hash)state.tab=s.tab;if(s.ov)REPORT.setOV(s.ov);return true;}catch(_){return false;}}
function update(){const o=UPD[state.tab]();saveSoon();return o;}
function show(tab){const t=tab||(location.hash||'').slice(1);state.tab=UPD[t]?t:'colorimetry';document.querySelectorAll('nav a').forEach(a=>a.setAttribute('aria-current',a.dataset.tab===state.tab?'page':'false'));
 for(const k in UPD)$('p-'+k).hidden=k!==state.tab;note();update();}
const NAMES={colorimetry:'比色分析_図表.xlsx',btb:'BTB_吸収スペクトル_図表.xlsx',oscillation:'振動反応_図表.xlsx'};
async function save(name,bytes){const sm=$('save-msg');sm.className='msg';sm.textContent='';
 try{if(window.claude&&typeof window.claude.use==='function'){const d=await window.claude.use('downloads');if(d){try{await d.save({filename:name,data:new Blob([bytes])});sm.textContent=name+' を保存しました。';}catch(e){const c=e&&e.code;sm.className='msg '+(c==='declined'?'':'err');sm.textContent=c==='declined'?'保存はキャンセルされました。':c==='rate_limited'?'保存の確認画面がすでに開いています。少し待ってからもう一度押してください。':'保存できませんでした（'+(c||'不明なエラー')+'）。';}return;}}}catch(e){}
 const url=URL.createObjectURL(new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);sm.textContent=name+' を作成しました。';}
$('export').addEventListener('click',async()=>{const o=update();if(!o){$('save-msg').className='msg err';$('save-msg').textContent='入力に足りない所があります。上の赤い文字を確認してください。';return;}
 await save(NAMES[state.tab],XL.build(o.sheets));});
const INIT={colorimetry:cInit,btb:bInit,oscillation:oInit};
$('clear').addEventListener('click',()=>{const t=state.tab;state.sample[t]=false;INIT[t](false);$('save-msg').textContent='';note();update();});
$('b-clear').addEventListener('click',()=>{state.b.files=[];state.sample.btb=false;note();bRows();update();});
$('sample').addEventListener('click',()=>{const t=state.tab;state.sample[t]=true;({colorimetry:cInit,btb:bInit,oscillation:oInit})[t](true);note();update();});
document.querySelectorAll('#p-colorimetry .grid2 input').forEach(x=>x.addEventListener('input',()=>{touch('colorimetry');update();}));
document.querySelectorAll('#p-btb details input').forEach(x=>x.addEventListener('input',()=>{touch('btb');update();}));
$('o-n').addEventListener('change',()=>{touch('oscillation');oRows();update();});
$('o-add').addEventListener('click',()=>{state.o.rows.push({t:'',times:[]});touch('oscillation');oRows();update();});
bindDrop($('b-drop'),$('b-file'),bLoad);
cInit(true);
bInit(true);oInit(true);
const restored=restore();
window.addEventListener('hashchange',()=>show());
document.querySelectorAll('nav a').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();const t=el.dataset.tab;show(t);try{if(location.hash!=='#'+t)history.replaceState(null,'','#'+t);}catch(_){}}));
show(restored&&!location.hash?state.tab:undefined);
})();
