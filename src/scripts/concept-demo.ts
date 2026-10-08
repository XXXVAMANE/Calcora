const conceptRoot = document.querySelector<HTMLElement>('[data-concept-demo]');
if (conceptRoot) {
 const buttons = [...conceptRoot.querySelectorAll<HTMLButtonElement>('[data-concept-step]')];
 const screens = [...conceptRoot.querySelectorAll<HTMLElement>('[data-concept-screen]')];
 const select = (index: number) => {
  buttons.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  screens.forEach((screen,i)=>screen.hidden=i!==index);
  if (matchMedia('(max-width: 760px)').matches) conceptRoot.querySelector('.concept-lcd-frame')?.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 };
 buttons.forEach((button,index)=>button.addEventListener('click',()=>select(index)));
 conceptRoot.querySelectorAll<HTMLInputElement>('input[name="concept-model"]').forEach(input=>input.addEventListener('change',()=>{
  const text=screens[3]?.querySelector('pre');
  if(text) text.textContent=`MODEL: ${input.value}\nPHOTO: DEMO ONLY`;
  select(3);
 }));
}
