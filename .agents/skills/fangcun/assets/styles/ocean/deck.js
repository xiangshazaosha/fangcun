// C31/C33: host-owned navigation; scene messages cannot consume ordinary slide clicks.
import {installCarrier} from './modules/carrier.js';
const stage=document.getElementById('deckStage'),slides=[...document.querySelectorAll('.slide')];
let current=0;
const reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
function fit(){const s=Math.min(innerWidth/1920,innerHeight/1080);stage.style.transform=`translate(${(innerWidth-1920*s)/2}px,${(innerHeight-1080*s)/2}px) scale(${s})`}
fit();addEventListener('resize',fit,{passive:true});
const getSlide=()=>slides[current];
const carrier=slides.some(s=>s.classList.contains('carrier-slide'))?installCarrier(slides,getSlide):null;
const particle=document.querySelector('.particle-frame'),globalOcean=document.getElementById('globalOcean');
const closingOcean=document.querySelector('.closing-ocean'),frames=[particle,globalOcean,closingOcean].filter(Boolean);
const controls='a,button,input,textarea,select,label,[contenteditable],[data-interactive],[data-light-interaction]';
const waterContent=controls+',.glass,[data-build],.brand,.folio,.build-progress,.statement,h1,h2,h3,p,span,b,strong,em,small,li,table,svg,img,canvas,video';
function post(frame,action,coords={}){if(frame?.hasAttribute('src'))frame.contentWindow?.postMessage({type:frame===particle?'yandeck-particle':'ocean-background',action,...coords},location.origin)}
function live(frame,on){if(!frame)return;if(on&&!frame.hasAttribute('src'))frame.src=frame.dataset.src;else post(frame,on?(frame===particle?'reset':'resume'):'pause')}
function sync(){const s=getSlide();live(particle,s.classList.contains('prologue'));live(globalOcean,s.dataset.background==='ocean');live(closingOcean,s.classList.contains('closing'));const v=document.querySelector('.global-video');if(v){if(s.dataset.background==='video'&&!reduced)v.play().catch(()=>{});else v.pause()}}
frames.forEach(f=>f.addEventListener('load',sync));
function buildStep(step){const s=getSlide(),items=[...s.querySelectorAll('[data-build]')];step=Math.max(0,Math.min(step,items.length));s.dataset.step=step;items.forEach((el,i)=>{el.classList.toggle('shown',i<step);el.classList.toggle('current',i===step-1)});s.querySelector('.build-progress').textContent=items.length?(step<items.length?`单击继续  ${step} / ${items.length}`:'本页讲解完成'):''}
let hoverFrame=null;
function clearHover(){post(hoverFrame,'hover',{x:null,y:null});hoverFrame=null}
function goTo(index,complete=false){clearHover();current=Math.max(0,Math.min(slides.length-1,index));slides.forEach((s,i)=>{s.classList.toggle('active',i===current);s.classList.toggle('visible',i===current)});buildStep(complete?999:0);carrier?.activate();sync()}
function forward(){const s=getSlide();if(s.classList.contains('prologue')){post(particle,'disperse');return}const step=Number(s.dataset.step||0),max=s.querySelectorAll('[data-build]').length;if(step<max)buildStep(step+1);else if(current<slides.length-1)goTo(current+1)}
function waterHit(e){const s=getSlide();let frame=s.dataset.background==='ocean'?globalOcean:(s.classList.contains('closing')?closingOcean:null);if(!frame||!s.contains(e.target)||e.target.closest(waterContent))return null;for(let n=e.target;n&&n!==s;n=n.parentElement)if([...n.childNodes].some(n=>n.nodeType===3&&n.textContent.trim()))return null;const r=frame.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;if(x<0||x>1||y<0||y>1||(frame===closingOcean&&x<.18*(1-y)))return null;let u=x,v=1-y;const a=r.width/r.height,t=1.779;if(a<t)u=(u-.5)*(a/t)+.5;else v=(v-.5)*(t/a)+.5;const shore=.266+.078*v+.006*Math.sin(v*12.8+.7)+.003*Math.sin(v*31);return u>=shore+.008?{frame,x,y}:null}
stage.addEventListener('pointermove',e=>{const hit=e.pointerType==='touch'?null:waterHit(e);if(hit){if(hoverFrame!==hit.frame)clearHover();hoverFrame=hit.frame;post(hit.frame,'hover',{x:hit.x,y:hit.y})}else clearHover();const card=e.target.closest('.glass');if(card){const r=card.getBoundingClientRect();card.style.setProperty('--gx',`${(e.clientX-r.left)*card.offsetWidth/r.width}px`);card.style.setProperty('--gy',`${(e.clientY-r.top)*card.offsetHeight/r.height}px`)}},{passive:true});
stage.addEventListener('pointerleave',clearHover);stage.addEventListener('pointercancel',clearHover);
document.addEventListener('click',e=>{if(e.button!==0)return;if(e.target.closest('[data-skip]')){goTo(current+1);return}if(e.target.closest('[data-next]')){forward();return}if(e.target.closest(controls))return;const hit=waterHit(e);if(hit)post(hit.frame,'ripple',{x:hit.x,y:hit.y});if(!getSlide().classList.contains('cover'))forward()});
document.addEventListener('keydown',e=>{if(e.target.closest(controls))return;if([' ','PageDown'].includes(e.key)){e.preventDefault();forward()}else if(['ArrowRight','ArrowDown'].includes(e.key)){e.preventDefault();getSlide().classList.contains('prologue')?forward():goTo(current+1,true)}else if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();goTo(current-1,true)}else if(e.key==='Home'){e.preventDefault();goTo(0)}else if(e.key==='End'){e.preventDefault();goTo(slides.length-1,true)}});
let wheel=0,locked=false,timer;
document.addEventListener('wheel',e=>{if(e.ctrlKey||e.target.closest(controls))return;e.preventDefault();if(locked)return;wheel+=Math.abs(e.deltaY)>=Math.abs(e.deltaX)?e.deltaY:e.deltaX;clearTimeout(timer);timer=setTimeout(()=>wheel=0,180);if(Math.abs(wheel)<46)return;wheel>0?forward():goTo(current-1,true);wheel=0;locked=true;setTimeout(()=>locked=false,520)},{passive:false});
addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==particle?.contentWindow||e.data?.type!=='yandeck-particle'||e.data.action!=='reassembled'||!getSlide().classList.contains('prologue'))return;goTo(current+1)});
const page=Number(new URLSearchParams(location.search).get('page')||0);goTo(Number.isFinite(page)&&page>=0&&page<slides.length?Math.floor(page):0);
window.YanDeck={goTo,state:()=>({page:current,step:Number(getSlide().dataset.step||0),count:slides.length,model:carrier?.state()||null})};
