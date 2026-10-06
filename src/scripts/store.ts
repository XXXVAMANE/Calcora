import { evaluate, futureValue, convert, unitGroups } from './math';

const t = JSON.parse(document.getElementById('ui-copy')?.textContent || '{}');
const locale = document.documentElement.lang === 'ru' ? 'ru-RU' : 'en-US';
const calculatorDialog = document.getElementById('calculator-dialog') as HTMLDialogElement;
const planDialog = document.getElementById('plan-dialog') as HTMLDialogElement;
let activeTool = 'scientific';
let lastTrigger: HTMLElement | null = null;
const number = (value: number) => new Intl.NumberFormat(locale, { maximumSignificantDigits: 12 }).format(value);
const currency = (value: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value);
const contexts = new Map<string,string>();
const requests = new Map<string,AbortController>();

function showDialog(dialog: HTMLDialogElement, trigger?: HTMLElement) {
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(open => open.close());
  lastTrigger = trigger || (document.activeElement as HTMLElement);
  dialog.showModal(); document.body.style.overflow = 'hidden';
}
function selectTool(slug: string) {
  if (!document.querySelector(`[data-calculator="${slug}"]`)) return;
  activeTool = slug;
  document.querySelectorAll<HTMLElement>('[data-calculator]').forEach(panel => panel.hidden = panel.dataset.calculator !== slug);
  document.querySelectorAll<HTMLButtonElement>('[data-tool-tab]').forEach(button => { const selected = button.dataset.toolTab === slug; button.classList.toggle('active',selected); button.setAttribute('aria-pressed',String(selected)); });
  const form = document.querySelector<HTMLFormElement>(`[data-calculator-form="${slug}"]`);
  if (form) calculate(form);
}
document.querySelectorAll<HTMLElement>('[data-open-tool]').forEach(button => button.addEventListener('click', () => { selectTool(button.dataset.openTool!); showDialog(calculatorDialog,button); }));
document.querySelectorAll<HTMLButtonElement>('[data-tool-tab]').forEach(button => button.addEventListener('click', () => selectTool(button.dataset.toolTab!)));
document.querySelectorAll<HTMLElement>('[data-close-dialog]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
document.querySelectorAll<HTMLDialogElement>('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { const rect=dialog.getBoundingClientRect(); if(event.target===dialog && (event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom)) dialog.close(); });
  dialog.addEventListener('close', () => { if(!document.querySelector('dialog[open]')) { document.body.style.overflow=''; lastTrigger?.focus(); } });
});
const menuToggle = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
const mobileMenu = document.getElementById('mobile-nav')!;
menuToggle?.addEventListener('click', () => { const expanded = menuToggle.getAttribute('aria-expanded') === 'true'; menuToggle.setAttribute('aria-expanded',String(!expanded)); mobileMenu.hidden=expanded; });
mobileMenu.querySelectorAll('a,button').forEach(link => link.addEventListener('click', () => { mobileMenu.hidden=true; menuToggle?.setAttribute('aria-expanded','false'); }));
document.querySelectorAll<HTMLAnchorElement>('.language-switch a').forEach(link => link.addEventListener('click', () => { link.hash=window.location.hash; }));
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const category = button.dataset.filter;
  document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(tab=>{ const selected=tab===button; tab.classList.toggle('active',selected); tab.setAttribute('aria-pressed',String(selected)); });
  let count=0;
  document.querySelectorAll<HTMLElement>('[data-tool-card]').forEach(card=>{ card.hidden=category!=='all' && card.dataset.category!==category; if(!card.hidden) count++; });
  const counter=document.getElementById('catalog-count');
  if(counter) counter.textContent=locale==='ru-RU' ? `${count} ${count===1?'калькулятор':count<5?'калькулятора':'калькуляторов'}` : `${count} calculator${count===1?'':'s'}`;
}));
document.querySelectorAll<HTMLButtonElement>('[data-billing]').forEach(button => button.addEventListener('click', () => {
  const yearly=button.dataset.billing==='yearly';
  document.querySelectorAll<HTMLButtonElement>('[data-billing]').forEach(tab=>{tab.classList.toggle('active',tab===button);tab.setAttribute('aria-pressed',String(tab===button));});
  document.querySelectorAll<HTMLElement>('[data-price-monthly]').forEach(price=>price.textContent=currency(Number(yearly?price.dataset.priceYearly:price.dataset.priceMonthly)).replace(/\.00$/, '').replace(/,00(?=\s|$)/, ''));
  document.querySelectorAll<HTMLElement>('[data-billing-note]').forEach(note=>note.textContent=yearly?t.billedYearly:t.billedMonthly);
}));
document.querySelectorAll<HTMLElement>('[data-plan]').forEach(button=>button.addEventListener('click',()=>{document.getElementById('selected-plan')!.textContent=button.dataset.plan!;showDialog(planDialog,button);}));

function calculate(form: HTMLFormElement) {
  const slug=form.dataset.calculatorForm!;
  const panel=form.closest<HTMLElement>('[data-calculator]')!;
  const error=panel.querySelector<HTMLElement>('[data-calc-error]')!;
  const output=panel.querySelector<HTMLOutputElement>('[data-result]')!;
  const formula=panel.querySelector<HTMLElement>('[data-formula]')!;
  const explanation=panel.querySelector<HTMLElement>('[data-ai-response]')!;
  requests.get(slug)?.abort(); requests.delete(slug);
  explanation.hidden=true; explanation.textContent='';
  const explainButton=panel.querySelector<HTMLButtonElement>('[data-explain]')!;
  explainButton.disabled=false;
  explainButton.querySelector('span')?.remove();
  const values=new FormData(form);
  const getNumber=(name:string)=>{ const value=values.get(name); if(typeof value!=='string' || !value.trim()) throw new Error('Empty input'); const parsed=Number(value); if(!Number.isFinite(parsed)) throw new Error('Invalid number'); return parsed; };
  try {
    if(!form.checkValidity()) throw new Error('Invalid form');
    let context='';
    if(slug==='scientific') { const expression=String(values.get('expression')||''); const result=evaluate(expression); output.textContent=number(result); formula.textContent=`${expression} = ${number(result)}`; context=`Expression: ${expression}. Calculated result: ${result}. All trigonometry is in radians.`; }
    if(slug==='finance') { const principal=getNumber('principal'),monthly=getNumber('monthly'),rate=getNumber('rate'),years=getNumber('years'); const result=futureValue(principal,monthly,rate,years); output.textContent=currency(result.total); formula.textContent=`${t.contributions}: ${currency(result.contributions)} · ${t.growth}: ${currency(result.growth)}`; context=`Monthly compounding: P=${principal}, end-of-month contribution=${monthly}, annual rate=${rate}%, years=${years}, future value=${result.total}, contributions=${result.contributions}, growth=${result.growth}. Explain assumptions; no financial advice.`; }
    if(slug==='percentage') { const percent=getNumber('percent'),amount=getNumber('amount'),result=percent/100*amount; if(!Number.isFinite(result)) throw new Error('Invalid result'); output.textContent=number(result); formula.textContent=`${number(percent)} ÷ 100 × ${number(amount)} = ${number(result)}`; context=`${percent}% of ${amount} equals ${result}. Formula: percentage / 100 * amount.`; }
    if(slug==='converter') { const value=getNumber('value'),category=String(values.get('unitType')),from=String(values.get('from')),to=String(values.get('to')),result=convert(value,category,from,to); output.textContent=`${number(result)} ${to}`; formula.textContent=`${number(value)} ${from} → ${number(result)} ${to}`; context=`Convert ${value} ${from} to ${to} (${category}). Result: ${result} ${to}.`; }
    contexts.set(slug,context); error.hidden=true; error.textContent=''; panel.querySelector<HTMLElement>('[data-result-box]')!.hidden=false;
  } catch { contexts.delete(slug); error.textContent=t.invalid; error.hidden=false; panel.querySelector<HTMLElement>('[data-result-box]')!.hidden=true; }
}
document.querySelectorAll<HTMLFormElement>('[data-calculator-form]').forEach(form=>form.addEventListener('submit',event=>{event.preventDefault();calculate(form);}));
const expressionInput=document.getElementById('expression') as HTMLInputElement;
document.querySelectorAll<HTMLButtonElement>('[data-expression]').forEach(button=>button.addEventListener('click',()=>{ expressionInput.value=button.dataset.expression!; calculate(expressionInput.form!); }));
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button=>button.addEventListener('click',()=>{
  const key=button.dataset.key!;
  if(key==='AC') {expressionInput.value='';expressionInput.focus();return;}
  const start=expressionInput.selectionStart??expressionInput.value.length,end=expressionInput.selectionEnd??start;
  expressionInput.setRangeText(key,start,end,'end');expressionInput.focus();
}));
const unitType=document.getElementById('unit-type') as HTMLSelectElement;
unitType.addEventListener('change',()=>{
  const units=Object.keys(unitGroups[unitType.value]);
  for(const id of ['unit-from','unit-to']) {const select=document.getElementById(id) as HTMLSelectElement;select.replaceChildren(...units.map(unit=>new Option(unit,unit)));}
  (document.getElementById('unit-to') as HTMLSelectElement).selectedIndex=1;
  calculate(unitType.form!);
});
document.querySelectorAll<HTMLButtonElement>('[data-explain]').forEach(button=>button.addEventListener('click',async()=>{
  const slug=button.dataset.explain!;
  const panel=button.closest<HTMLElement>('[data-calculator]')!;
  calculate(panel.querySelector<HTMLFormElement>('form')!);
  const context=contexts.get(slug);if(!context)return;
  const responseBox=panel.querySelector<HTMLElement>('[data-ai-response]')!;
  const controller=new AbortController();requests.set(slug,controller);
  responseBox.hidden=false;responseBox.textContent=t.aiLoading;button.disabled=true;
  try {
    const response=await fetch('/api/explain',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({expression:context,locale:document.documentElement.lang}),signal:controller.signal});
    if(controller.signal.aborted)return;
    if(response.status===503 || response.status===404) {responseBox.textContent=t.aiUnavailable;return;}
    if(!response.ok)throw new Error('AI response failed');
    const data=await response.json();if(typeof data.explanation!=='string')throw new Error('Invalid AI response');
    responseBox.textContent=data.explanation;
  } catch {if(!controller.signal.aborted)responseBox.textContent=t.aiError;}
  finally {if(requests.get(slug)===controller){requests.delete(slug);button.disabled=false;}}
}));
selectTool(activeTool);
