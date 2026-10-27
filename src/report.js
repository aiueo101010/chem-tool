/* ---- on-screen report preview: the tables and figures exactly as they go on the 「レポート用」 sheet ----
   tables → three-line HTML table with a "copy for Word" button
   figures → canvas drawing that mirrors the Excel chart (same axes, ticks from the minimum, legend box, trendline / data labels),
             legend can be dragged (the position is written into the Excel chart), PNG save / image copy */
const REPORT=(()=>{
const FONT='"Yu Gothic","YuGothic","Hiragino Sans","Meiryo",sans-serif';
const MINCHO='"Yu Mincho","YuMincho","Hiragino Mincho ProN","MS PMincho",serif';
const GRAY='#595959';
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
/* markup: ^{sup} _{sub} <i>it</i> */
function runs(s){const out=[];const re=/(\^\{[^}]*\}|_\{[^}]*\}|<i>.*?<\/i>)/g;let last=0,m;s=String(s??'');
 while((m=re.exec(s))){if(m.index>last)out.push({t:s.slice(last,m.index)});const t=m[0];if(t[0]==='^')out.push({t:t.slice(2,-1),sup:1});else if(t[0]==='_')out.push({t:t.slice(2,-1),sub:1});else out.push({t:t.slice(3,-4),i:1});last=re.lastIndex;}
 if(last<s.length)out.push({t:s.slice(last)});return out;}
const html=s=>runs(s).map(r=>r.sup?`<sup>${esc(r.t)}</sup>`:r.sub?`<sub>${esc(r.t)}</sub>`:r.i?`<i>${esc(r.t)}</i>`:esc(r.t)).join('');
const plain=s=>runs(s).map(r=>r.t).join('');
function rfont(r,size){return `${r.i?'italic ':''}${r.sup||r.sub?size*0.7:size}px ${FONT}`;}
function rwidth(g,s,size){let w=0;for(const r of runs(s)){g.font=rfont(r,size);w+=g.measureText(r.t).width;}return w;}
function rdraw(g,s,x,y,size,align='left'){const w=rwidth(g,s,size);let cx=align==='center'?x-w/2:align==='right'?x-w:x;g.textAlign='left';
 for(const r of runs(s)){g.font=rfont(r,size);g.fillText(r.t,cx,y+(r.sup?-size*0.38:r.sub?size*0.22:0));cx+=g.measureText(r.t).width;}return w;}

/* ---------- figure geometry from the sheet (two-cell anchor → pixels, as Excel does) ---------- */
const colPx=(sh,c)=>Math.round((sh.widths[c]??8.43)*7+5);
function chartSize(sh,a){let w=0;for(let c=a.c;c<a.c2;c++)w+=colPx(sh,c);return {W:w,H:(a.r2-a.r)*24};}
function fmtNum(v,fmt){if(Math.abs(v)<1e-12)v=0;const m=/^0(?:\.(0+))?$/.exec(fmt||'');const s=m?v.toFixed(m[1]?m[1].length:0):String(+v.toPrecision(10));return s.replace('-','−');}
function fit(x,y){const n=x.length;if(n<2)return null;const mx=x.reduce((a,b)=>a+b,0)/n,my=y.reduce((a,b)=>a+b,0)/n;let sxx=0,sxy=0;for(let i=0;i<n;i++){sxx+=(x[i]-mx)**2;sxy+=(x[i]-mx)*(y[i]-my);}const a=sxy/sxx;return {a,b:my-a*mx};}
function dashArr(d,w){const u=Math.max(d==='sysdot'||d==='dot'?2:1,w);return d==='dash'||d==='sysdash'?[4*u,3*u]:d==='sysdot'||d==='dot'?[u,u]:d==='dashdot'?[4*u,2*u,u,2*u]:[];}
function marker(g,sym,x,y,size,color){const r=size/2+0.5;g.fillStyle=color;g.beginPath();
 if(sym==='square')g.rect(x-r,y-r,2*r,2*r);else if(sym==='triangle'){g.moveTo(x,y-r*1.15);g.lineTo(x+r*1.1,y+r*0.8);g.lineTo(x-r*1.1,y+r*0.8);g.closePath();}else if(sym==='diamond'){g.moveTo(x,y-r*1.2);g.lineTo(x+r*1.2,y);g.lineTo(x,y+r*1.2);g.lineTo(x-r*1.2,y);g.closePath();}else g.arc(x,y,r,0,7);g.fill();}

/* draw one chart spec (the same object handed to the xlsx writer) into a W×H box */
function draw(g,ch,W,H){g.fillStyle='#fff';g.fillRect(0,0,W,H);
 const xa=ch.x,ya=ch.y;const yl=Math.max(...[ya.min,ya.max,ya.min+ya.major].map(v=>rwidth(g,fmtNum(v,ya.fmt),12)));
 const PL=Math.round(yl+40),PR=16,PT=14,PB=52;const pw=W-PL-PR,ph=H-PT-PB;
 const X=v=>PL+(v-xa.min)/(xa.max-xa.min)*pw,Y=v=>PT+ph-(v-ya.min)/(ya.max-ya.min)*ph;
 g.lineWidth=1;g.font=`12px ${FONT}`;
 // gridlines + tick labels (Excel counts ticks from the axis minimum)
 for(let k=0;k<=200;k++){const v=xa.min+k*xa.major;if(v>xa.max+xa.major*1e-6)break;const x=Math.round(X(v))+.5;g.strokeStyle='#D9D9D9';g.beginPath();g.moveTo(x,PT);g.lineTo(x,PT+ph);g.stroke();g.fillStyle=GRAY;g.textAlign='center';g.fillText(fmtNum(v,xa.fmt),x,PT+ph+16);}
 for(let k=0;k<=200;k++){const v=ya.min+k*ya.major;if(v>ya.max+ya.major*1e-6)break;const y=Math.round(Y(v))+.5;g.strokeStyle='#D9D9D9';g.beginPath();g.moveTo(PL,y);g.lineTo(PL+pw,y);g.stroke();g.fillStyle=GRAY;g.textAlign='right';g.font=`12px ${FONT}`;g.fillText(fmtNum(v,ya.fmt),PL-6,y+4);}
 // axis lines cross at zero (or at the nearer end when zero is outside the range)
 const cz=(a)=>Math.min(Math.max(0,a.min),a.max);g.strokeStyle='#BFBFBF';g.beginPath();const y0=Math.round(Y(cz(ya)))+.5,x0=Math.round(X(cz(xa)))+.5;g.moveTo(PL,y0);g.lineTo(PL+pw,y0);g.moveTo(x0,PT);g.lineTo(x0,PT+ph);g.stroke();
 g.fillStyle=GRAY;rdraw(g,xa.title||'',PL+pw/2,H-12,13,'center');g.save();g.translate(16,PT+ph/2);g.rotate(-Math.PI/2);rdraw(g,ya.title||'',0,0,13,'center');g.restore();
 // series, trendlines
 const tls=[];const labels=[];
 g.save();g.beginPath();g.rect(PL-4,PT-4,pw+8,ph+8);g.clip();
 ch.series.forEach(s=>{const color='#'+(s.color||'4472C4'),xs=s.x,ys=s.y;
  if(s.trend){const pts=xs.map((x,i)=>[x,ys[i]]).filter(p=>isFinite(p[0])&&isFinite(p[1]));const f=fit(pts.map(p=>p[0]),pts.map(p=>p[1]));
   if(f){const lo=Math.min(...pts.map(p=>p[0])),hi=Math.max(...pts.map(p=>p[0]));const t=s.trend,tc='#'+(t.color||s.color||'4472C4');g.strokeStyle=tc;g.lineWidth=2;g.lineCap='butt';g.setLineDash(dashArr(t.dash||'sysdot',2));g.beginPath();g.moveTo(X(lo),Y(f.a*lo+f.b));g.lineTo(X(hi),Y(f.a*hi+f.b));g.stroke();g.setLineDash([]);
    tls.push({name:t.name||'近似直線',color:tc,dash:t.dash||'sysdot'});if(t.label)labels.push({kind:'trend',px:X(hi),py:Y(f.a*hi+f.b),lab:t.label});}}
  if(s.line){const lw=(s.width||28575)/12700*1.333;g.strokeStyle=color;g.lineWidth=lw;g.lineJoin='round';g.lineCap=(s.dash||'solid')==='solid'?'round':'butt';g.setLineDash(dashArr(s.dash||'solid',lw));g.beginPath();let on=false;
   xs.forEach((x,i)=>{const y=ys[i];if(y==null||!isFinite(y)){on=false;return;}if(!on){g.moveTo(X(x),Y(y));on=true;}else g.lineTo(X(x),Y(y));});g.stroke();g.setLineDash([]);}
  if(s.marker&&s.marker!=='none')xs.forEach((x,i)=>{if(isFinite(ys[i]))marker(g,s.marker,X(x),Y(ys[i]),s.msize||7,color);});
  (s.labels||[]).forEach(L=>{if(isFinite(ys[L.idx]))labels.push({kind:'data',px:X(xs[L.idx]),py:Y(ys[L.idx]),lab:L});});});
 g.restore();
 // trendline / data labels: Excel's default spot plus the stored offset (fractions of the chart)
 for(const L of labels){const lines=String(L.lab.text).split('\n');const size=L.kind==='data'?14:13,lh=size*1.25;const w=Math.max(...lines.map(t=>rwidth(g,t,size)));
  let bx,by;if(L.kind==='data'){bx=L.px+8+L.lab.x*W;by=L.py-lh/2+L.lab.y*H;}else{bx=L.px+4+L.lab.x*W;by=L.py-lines.length*lh-4+L.lab.y*H;}
  bx=Math.min(Math.max(4,bx),W-w-6);by=Math.min(Math.max(4,by),H-lines.length*lh-4);   // Excel keeps labels inside the chart area
  if(L.kind==='data'&&(Math.abs(L.lab.x)>0.02||Math.abs(L.lab.y)>0.02)){const tx=Math.min(Math.max(L.px,bx),bx+w),ty=Math.min(Math.max(L.py,by),by+lh);g.strokeStyle='#000';g.lineWidth=1;g.beginPath();g.moveTo(L.px,L.py);g.lineTo(tx,ty);g.stroke();}
  g.fillStyle='#000';lines.forEach((t,i)=>rdraw(g,t,bx,by+(i+0.8)*lh,size,'left'));}
 // legend: series first, then trendlines (Excel order)
 let box=null;if(ch.legend!==false){const lg=ch.legend||{x:0.12,y:0.04,w:0.45,h:0.22};const entries=[...ch.series.map(s=>({name:s.name,color:'#'+(s.color||'4472C4'),line:!!s.line,dash:s.dash||'solid',width:s.width,marker:s.line?null:s.marker,msize:s.msize})),...tls.map(t=>({name:t.name,color:t.color,line:true,dash:t.dash,width:19050}))];
  const rowH=18,x0=lg.x*W,y1=lg.y*H;let tw=0;entries.forEach((e,i)=>{const y=y1+8+i*rowH+rowH/2;if(e.line){const lw=(e.width||28575)/12700*1.333;g.strokeStyle=e.color;g.lineWidth=lw;g.lineCap='butt';g.setLineDash(dashArr(e.dash,lw));g.beginPath();g.moveTo(x0+4,y);g.lineTo(x0+28,y);g.stroke();g.setLineDash([]);}
   else if(e.marker)marker(g,e.marker,x0+16,y,e.msize||7,e.color);g.fillStyle=GRAY;tw=Math.max(tw,rdraw(g,e.name,x0+34,y+4.5,13,'left'));});
  box={x:x0,y:y1,w:Math.max(lg.w*W,tw+40),h:Math.max(lg.h*H,entries.length*rowH+12)};}
 return {legend:box};}

/* ---------- copy helpers ---------- */
async function copyHTML(htmlStr,text){try{if(navigator.clipboard&&window.ClipboardItem){await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([htmlStr],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);return true;}}catch(_){}
 try{const d=document.createElement('div');d.contentEditable='true';d.style.cssText='position:fixed;left:-9999px;top:0';d.innerHTML=htmlStr;document.body.appendChild(d);const r=document.createRange();r.selectNodeContents(d);const s=getSelection();s.removeAllRanges();s.addRange(r);const ok=document.execCommand('copy');s.removeAllRanges();d.remove();return ok;}catch(_){return false;}}
function tableHTML(t,forWord){const sp=t.spans||t.head.map(()=>1);const n=t.rows.length;const cell=(v,tag,i,j,extra='')=>{const last=tag==='td'&&i===n-1;
  const st=forWord?`style="font-family:'游明朝','Yu Mincho',serif;font-size:10.5pt;text-align:center;padding:1pt 9pt;${tag==='th'?'border-top:1.5pt solid #000;border-bottom:.75pt solid #000;font-weight:normal;':''}${last?'border-bottom:1.5pt solid #000;':''}"`:(last?'class="last"':'');
  return `<${tag} ${st}${sp[j]>1?` colspan="${sp[j]}"`:''}${extra}>${html(v)}</${tag}>`;};
 const rows=t.rows.map((r,i)=>'<tr>'+r.map((v,j)=>{if(t.vmerge&&j===0){if(i%t.vmerge)return '';return cell(v,'td',i+t.vmerge-1,j,` rowspan="${t.vmerge}"`);}return cell(v,'td',i,j);}).join('')+'</tr>').join('');
 const capSt=forWord?` style="font-family:'游明朝','Yu Mincho',serif;font-size:10.5pt;text-align:center;margin:0 0 2pt"`:'';
 const noteSt=forWord?` style="font-family:'游明朝','Yu Mincho',serif;font-size:9pt;margin:2pt 0 0"`:'';
 return `<p class="cap"${capSt}>${html(t.caption)}</p><table${forWord?` style="border-collapse:collapse;margin:0 auto"`:''}><thead><tr>${t.head.map((h,j)=>cell(h,'th',0,j)).join('')}</tr></thead><tbody>${rows}</tbody></table>${t.note?`<p class="note"${noteSt}>${html(t.note)}</p>`:''}`;}
const tableTSV=t=>[plain(t.caption),t.head.map(plain).join('\t'),...t.rows.map(r=>r.map(plain).join('\t')),t.note?plain(t.note):''].join('\n');

/* ---------- rendering the list ---------- */
const OV={};   // legend positions moved by the user, per tab and figure
/* automatic legend placement: try the four inside corners (and top-centre) of the plot area and take the one that covers the
   fewest curve points / markers / labels; the box is sized to its text. Runs in the browser before both preview and Excel export. */
function autoPlace(it){const ch=it.chart.ch;if(!ch.legend)return;const {W,H}=chartSize(it.sheet,it.chart);const g=document.createElement('canvas').getContext('2d');
 const xa=ch.x,ya=ch.y;const yl=Math.max(...[ya.min,ya.max,ya.min+ya.major].map(v=>rwidth(g,fmtNum(v,ya.fmt),12)));const PL=Math.round(yl+40),PR=16,PT=14,PB=52,pw=W-PL-PR,ph=H-PT-PB;
 const X=v=>PL+(v-xa.min)/(xa.max-xa.min)*pw,Y=v=>PT+ph-(v-ya.min)/(ya.max-ya.min)*ph;
 const names=[...ch.series.map(s=>s.name),...ch.series.filter(s=>s.trend).map(s=>s.trend.name||'近似直線')];
 const w=Math.max(...names.map(n=>rwidth(g,n,13)))+44,h=names.length*18+14;
 const pts=[];ch.series.forEach(s=>{const n=s.x.length,step=Math.max(1,Math.floor(n/150));for(let i=0;i<n;i+=step){const y=s.y[i];if(y!=null&&isFinite(y))pts.push([X(s.x[i]),Y(y),s.line?1:4]);}
  if(s.trend){const xs=s.x.filter((x,i)=>isFinite(s.y[i])),f=fit(xs,s.y.filter(v=>isFinite(v)));if(f){const lo=Math.min(...xs),hi=Math.max(...xs);for(let k=0;k<=120;k++){const x=lo+(hi-lo)*k/120;pts.push([X(x),Y(f.a*x+f.b),1]);}
   if(s.trend.label){const lx=X(hi)+4+s.trend.label.x*W,ly=Y(f.a*hi+f.b)-30+s.trend.label.y*H;for(let k=0;k<=8;k++)for(let j=0;j<=2;j++)pts.push([lx+k*22,ly+j*14,3]);}}}
  (s.labels||[]).forEach(L=>{const lx=X(s.x[L.idx])+8+L.x*W,ly=Y(s.y[L.idx])+L.y*H;for(let k=0;k<=5;k++)pts.push([lx+k*18,ly,3]);});});
 const cand=[[PL+8,PT+6],[PL+pw-w-8,PT+6],[PL+(pw-w)/2,PT+6],[PL+8,PT+ph-h-6],[PL+pw-w-8,PT+ph-h-6]];
 let best=null;cand.forEach(([x,y],i)=>{let sc=i*0.01;for(const [px,py,wt] of pts)if(px>=x-6&&px<=x+w+6&&py>=y-6&&py<=y+h+6)sc+=wt;if(!best||sc<best.sc)best={sc,x,y};});
 Object.assign(ch.legend,{x:+(best.x/W).toFixed(4),y:+(best.y/H).toFixed(4),w:+Math.min(0.9,w*1.08/W).toFixed(4),h:+Math.min(0.9,h/H).toFixed(4)});
 // trendline equations: put each one in the emptiest spot of the plot (not on the curves, the legend or another equation), preferring spots near its own line
 const boxes=[[best.x,best.y,w,h]];const curve=pts.filter(p=>p[2]!==3);
 ch.series.forEach(s=>{const L=s.trend&&s.trend.label;if(!L)return;const xs=s.x.filter((x,i)=>isFinite(s.y[i])),f=fit(xs,s.y.filter(v=>isFinite(v)));if(!f)return;const hi=Math.max(...xs),ax=X(hi),ay=Y(f.a*hi+f.b);
  const lines=String(L.text).split('\n'),lw=Math.max(...lines.map(t=>rwidth(g,t,13)))+4,lh=lines.length*16.25+4;let bb=null;
  for(let i=0;i<=12;i++)for(let j=0;j<=10;j++){const bx=PL+6+(pw-lw-12)*i/12,by=PT+4+(ph-lh-8)*j/10;let sc=0;
   for(const [px,py] of curve)if(px>=bx-8&&px<=bx+lw+8&&py>=by-8&&py<=by+lh+8)sc+=3;
   for(const [qx,qy,qw,qh] of boxes){const ox=Math.max(0,Math.min(bx+lw,qx+qw)-Math.max(bx,qx)),oy=Math.max(0,Math.min(by+lh,qy+qh)-Math.max(by,qy));sc+=ox*oy/40;}
   const cx=bx+lw/2,cy=by+lh/2,line=Math.abs(f.a*((cx-PL)/pw*(xa.max-xa.min)+xa.min)+f.b-((PT+ph-cy)/ph*(ya.max-ya.min)+ya.min))/(ya.max-ya.min)*ph;sc+=line/60+Math.hypot(cx-ax,cy-ay)/400;
   if(!bb||sc<bb.sc)bb={sc,bx,by};}
  boxes.push([bb.bx,bb.by,lw,lh]);L.x=+((bb.bx-(ax+4))/W).toFixed(4);L.y=+((bb.by-(ay-lines.length*16.25-4))/H).toFixed(4);});}
function applyOverrides(tab,o){if(!o||!o.report)return;let k=0;for(const it of o.report)if(it.type==='fig'){const ov=(OV[tab]||{})[k++];if(!it.chart.ch.legend)continue;autoPlace(it);if(ov)Object.assign(it.chart.ch.legend,ov);}}
let toast=null;
function say(el,msg){el.textContent=msg;clearTimeout(el._t);el._t=setTimeout(()=>{el.textContent='';},2600);}
function save(name,blob){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);}
function figCanvas(it,scale){const {W,H}=chartSize(it.sheet,it.chart);const c=document.createElement('canvas');c.width=W*scale;c.height=H*scale;const g=c.getContext('2d');g.scale(scale,scale);draw(g,it.chart.ch,W,H);return c;}
function render(box,tab,o,rerender){box.innerHTML='';if(!o||!o.report){box.innerHTML='<p class="hint">入力がそろうと、ここにレポートの表と図が表示されます。</p>';return;}
 let fi=0;for(const it of o.report){const card=document.createElement('div');card.className='rep-item';
  if(it.type==='table'){card.innerHTML=`<div class="rep-tbl">${tableHTML(it,false)}</div><div class="rep-act"><button class="btn small" type="button">表をコピー（Wordに貼り付け）</button><span class="rep-msg" role="status"></span></div>`;
   card.querySelector('button').addEventListener('click',async()=>{const ok=await copyHTML(tableHTML(it,true),tableTSV(it));say(card.querySelector('.rep-msg'),ok?'コピーしました。Wordで貼り付けてください。':'この環境ではコピーできませんでした。');});}
  else{const k=fi++;const {W,H}=chartSize(it.sheet,it.chart);card.innerHTML=`<div class="rep-fig"><canvas aria-label="${esc(plain(it.caption))}"></canvas></div><p class="cap">${html(it.caption)}</p><div class="rep-act"><button class="btn small" type="button" data-a="png">PNGで保存</button><button class="btn small" type="button" data-a="copy">画像をコピー</button><button class="btn small" type="button" data-a="reset" hidden>凡例を元の位置に</button><span class="rep-msg" role="status"></span></div>`;
   const cv=card.querySelector('canvas'),msg=card.querySelector('.rep-msg'),resetBtn=card.querySelector('[data-a=reset]');
   if((OV[tab]||{})[k])resetBtn.hidden=false;
   const paint=()=>{const cw=cv.parentElement.clientWidth||W;const k2=cw<W*0.8?Math.max(0.85,Math.min(1,cw*1.3/W)):1;const lw=W*k2,lh=H*k2;const dpr=window.devicePixelRatio||1;const sc=cw/lw*dpr;
    cv.width=Math.round(lw*sc);cv.height=Math.round(lh*sc);const g=cv.getContext('2d');g.setTransform(sc,0,0,sc,0,0);const r=draw(g,it.chart.ch,lw,lh);cv._box=r.legend;cv._L=[lw,lh];};
   requestAnimationFrame(paint);cv._paint=paint;
   // legend drag
   let drag=null;const pos=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width*cv._L[0],(e.clientY-r.top)/r.height*cv._L[1]];};
   const onBox=p=>cv._box&&p[0]>=cv._box.x-4&&p[0]<=cv._box.x+cv._box.w+4&&p[1]>=cv._box.y-4&&p[1]<=cv._box.y+cv._box.h+4;
   cv.addEventListener('touchstart',e=>{if(e.touches.length===1&&onBox(pos(e.touches[0])))e.preventDefault();},{passive:false});
   cv.addEventListener('pointerdown',e=>{const p=pos(e);if(!onBox(p))return;drag={dx:p[0]-cv._box.x,dy:p[1]-cv._box.y};cv.setPointerCapture(e.pointerId);});
   cv.addEventListener('pointermove',e=>{const p=pos(e);if(!drag){cv.style.cursor=onBox(p)?'move':'default';return;}const [lw,lh]=cv._L,lg=it.chart.ch.legend;
    const x=Math.min(Math.max(0,(p[0]-drag.dx)/lw),1-Math.min(lg.w,0.95)),y=Math.min(Math.max(0,(p[1]-drag.dy)/lh),1-Math.min(lg.h,0.95));lg.x=+x.toFixed(4);lg.y=+y.toFixed(4);(OV[tab]=OV[tab]||{})[k]={x:lg.x,y:lg.y};resetBtn.hidden=false;paint();});
   const end=()=>{drag=null;};cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',end);
   resetBtn.addEventListener('click',()=>{if(OV[tab])delete OV[tab][k];rerender();});
   card.querySelector('[data-a=png]').addEventListener('click',()=>{figCanvas(it,3).toBlob(b=>{save(plain(it.caption).split(/\s|　/)[0]+'.png',b);say(msg,'PNGを保存しました。');},'image/png');});
   card.querySelector('[data-a=copy]').addEventListener('click',async()=>{try{const p=new Promise(res=>figCanvas(it,3).toBlob(res,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':p})]);say(msg,'コピーしました。Wordで貼り付けてください。');}catch(_){say(msg,'この環境では画像のコピーができません。PNGで保存してください。');}});}
  box.appendChild(card);}}
window.addEventListener('resize',()=>document.querySelectorAll('.rep-fig canvas').forEach(c=>c._paint&&c._paint()));
return {render,applyOverrides,draw,chartSize};})();
