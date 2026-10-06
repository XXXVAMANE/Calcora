const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const host = document.querySelector<HTMLElement>('[data-immersive-scene]');
let disposeScene: (()=>void) | undefined;
let sceneLoading=false;
let active=true;
// Only the first visible product scene loads WebGL; the rest use lightweight layers.
const loadScene=async()=>{
  if(!host||reduced.matches||sceneLoading||!active)return;
  sceneLoading=true;
  try {
    const {createDeviceScene}=await import('./device-scene');
    if(!active)return;
    disposeScene=await createDeviceScene(host);
    if(!active)disposeScene();
  } catch { if(host)host.dataset.webgl='fallback'; }
};
if(host){const observer=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){void loadScene();observer.disconnect();}},{rootMargin:'100px'});observer.observe(host);}
const revealTargets=document.querySelectorAll<HTMLElement>('.shop-section-heading,.product-card,.shop-approach,.ai-hardware,.shop-faq,.shop-closing,.physical-copy,.product-specs');
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
  if(entry.isIntersecting){(entry.target as HTMLElement).dataset.revealed='true';revealObserver.unobserve(entry.target);}
}),{threshold:.06,rootMargin:'0px 0px -20px 0px'});
function reveals(){
  revealTargets.forEach((element,index)=>{
    element.classList.add('motion-reveal');element.style.setProperty('--reveal-delay',`${element.matches('.product-card')?(index%4)*65:0}ms`);
    if(reduced.matches){element.dataset.revealed='true';return;}
    if(element.getBoundingClientRect().top<innerHeight-20)element.dataset.revealed='true';else revealObserver.observe(element);
  });
}
reveals();
// Filtered products and focusable links must never stay visually concealed.
const mutation=new MutationObserver(records=>records.forEach(record=>{const element=record.target as HTMLElement;if(!element.hidden&&element.matches('.motion-reveal'))element.dataset.revealed='true';}));
document.querySelectorAll('[data-product-card]').forEach(element=>mutation.observe(element,{attributes:true,attributeFilter:['hidden']}));
const cards=document.querySelectorAll<HTMLElement>('.product-stage,.detail-device-stage,.ai-hardware-art');
cards.forEach(card=>{
  card.classList.add('motion-surface');
  let frame=0,x=0,y=0;
  const update=()=>{frame=0;card.style.setProperty('--pointer-x',`${50+x*35}%`);card.style.setProperty('--pointer-y',`${50+y*35}%`);card.style.setProperty('--tilt-x',`${-y*5}deg`);card.style.setProperty('--tilt-y',`${x*7}deg`);};
  card.addEventListener('pointermove',event=>{
    if(reduced.matches||!fine.matches)return;
    const rect=card.getBoundingClientRect();x=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));y=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));
    if(!frame)frame=requestAnimationFrame(update);
  });
  const reset=()=>{x=y=0;if(frame)cancelAnimationFrame(frame);update();};
  card.addEventListener('pointerleave',reset);reduced.addEventListener('change',reset);
});
let scrollFrame=0;
const parallax=()=>{
  scrollFrame=0;if(reduced.matches)return;
  const scene=document.querySelector<HTMLElement>('.ai-hardware-art');
  if(scene){const rect=scene.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight){const offset=Math.max(-1,Math.min(1,(innerHeight/2-rect.top-rect.height/2)/innerHeight));scene.style.setProperty('--drift',`${offset*35}px`);}}
};
window.addEventListener('scroll',()=>{if(!scrollFrame&&!document.hidden)scrollFrame=requestAnimationFrame(parallax);},{passive:true});
reduced.addEventListener('change',()=>{reveals();if(reduced.matches)document.querySelector<HTMLElement>('.ai-hardware-art')?.style.setProperty('--drift','0px');else void loadScene();});
window.addEventListener('pagehide',()=>{active=false;disposeScene?.();disposeScene=undefined;revealObserver.disconnect();mutation.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted){active=true;sceneLoading=false;void loadScene();reveals();}});
