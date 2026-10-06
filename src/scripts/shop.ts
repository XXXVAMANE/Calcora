type Product = { slug: string; brand: string; model: string; price: number | null };
type Item = { slug: string; quantity: number };
const products = JSON.parse(document.getElementById('shop-products')!.textContent!) as Product[];
const copy = JSON.parse(document.getElementById('shop-copy')!.textContent!);
const locale = document.documentElement.lang === 'ru' ? 'ru' : 'en';
const money = (value: number) => new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: 'USD' }).format(value);
const storageKey = 'calcora-demo-bag';
const dialog = document.getElementById('bag-dialog') as HTMLDialogElement;
const itemBox = document.querySelector<HTMLElement>('[data-bag-items]')!;
const notice = document.querySelector<HTMLElement>('[data-checkout-notice]')!;
let trigger: HTMLElement | null = null;
let items: Item[] = [];
const getProduct = (slug: string) => products.find(product => product.slug === slug && product.price !== null);

function load() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(stored)) return;
    items = [];
    for (const item of stored) {
      if (!item || typeof item.slug !== 'string' || !getProduct(item.slug) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20 || items.some(existing => existing.slug === item.slug)) continue;
      items.push({ slug: item.slug, quantity: item.quantity });
    }
  } catch { /* The bag also works in memory when browser storage is unavailable. */ }
}
function save() { try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {} }
function render() {
  itemBox.replaceChildren();
  let total = 0;
  for (const item of items) {
    const product = getProduct(item.slug)!;
    total += product.price! * item.quantity;
    const row = document.createElement('article'); row.className = 'bag-item';
    const mark = document.createElement('span'); mark.className = 'bag-item-mark'; mark.textContent = '＝'; mark.setAttribute('aria-hidden', 'true');
    const content = document.createElement('div');
    const title = document.createElement('a'); title.href = `${locale === 'ru' ? '/ru' : ''}/products/${product.slug}/`; title.textContent = `${product.brand} ${product.model}`;
    const amount = document.createElement('p'); amount.textContent = money(product.price!);
    const controls = document.createElement('div'); controls.className = 'bag-item-controls';
    const quantity = document.createElement('input'); quantity.type = 'number'; quantity.min = '1'; quantity.max = '20'; quantity.step = '1'; quantity.value = String(item.quantity); quantity.setAttribute('aria-label', `${copy.quantity}: ${product.model}`);
    quantity.addEventListener('change', () => {
      const value = Number(quantity.value);
      if (!Number.isInteger(value) || value < 1 || value > 20) { quantity.value = String(item.quantity); return; }
      item.quantity = value; save(); notice.hidden = true; render();
    });
    const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = copy.remove; remove.setAttribute('aria-label', `${copy.remove}: ${product.model}`);
    remove.addEventListener('click', () => { items = items.filter(existing => existing !== item); save(); notice.hidden = true; render(); dialog.querySelector<HTMLButtonElement>('[data-close-dialog]')?.focus(); });
    controls.append(quantity, remove); content.append(title, amount, controls); row.append(mark, content); itemBox.append(row);
  }
  document.querySelector<HTMLElement>('[data-bag-empty]')!.hidden = items.length !== 0;
  document.querySelector<HTMLElement>('[data-bag-summary]')!.hidden = items.length === 0;
  document.querySelector<HTMLElement>('[data-bag-total]')!.textContent = money(total);
  document.querySelectorAll('[data-bag-count]').forEach(counter => counter.textContent = String(items.reduce((sum,item) => sum + item.quantity,0)));
}
let toastTimer: ReturnType<typeof setTimeout>;
document.querySelectorAll<HTMLElement>('[data-add-product]').forEach(button => button.addEventListener('click', () => {
  const slug = button.dataset.addProduct!;
  if (!getProduct(slug)) return;
  const existing = items.find(item => item.slug === slug);
  if (existing) { if (existing.quantity >= 20) return; existing.quantity++; }
  else items.push({ slug, quantity: 1 });
  save(); render(); notice.hidden = true;
  const toast = document.querySelector<HTMLElement>('[data-shop-toast]')!;
  toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.hidden = true, 2400);
}));
document.querySelectorAll<HTMLElement>('[data-open-bag]').forEach(button => button.addEventListener('click', () => {
  trigger = button;
  document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(open => open.close());
  render(); dialog.showModal(); document.body.style.overflow = 'hidden';
}));
dialog.addEventListener('close', () => trigger?.focus());
const checkout = document.querySelector<HTMLButtonElement>('[data-preview-checkout]')!;
let attempt = '', fingerprint = '';
checkout.addEventListener('click', async () => {
  if (checkout.disabled || !items.length) return;
  const contents = JSON.stringify(items);
  if (fingerprint !== contents) { fingerprint = contents; attempt = crypto.randomUUID(); }
  checkout.disabled = true; notice.hidden = false; notice.textContent = copy.checkoutBusy;
  try {
    const result = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, locale, attempt }), signal: AbortSignal.timeout(20000) });
    const data = await result.json();
    if (!result.ok) { notice.textContent = data.error === 'CHECKOUT_NOT_CONFIGURED' ? copy.checkoutNotice : copy.checkoutFailed; return; }
    const destination = new URL(data.url);
    if (destination.origin !== 'https://checkout.stripe.com' || data.test !== true) throw Error();
    try { sessionStorage.setItem('calcora-checkout', JSON.stringify({ id: data.id, items })); } catch {}
    window.location.assign(destination.href);
  } catch { notice.textContent = copy.checkoutFailed; }
  finally { checkout.disabled = false; }
});
window.addEventListener('storage', event => { if (event.key === storageKey) { load(); render(); } });
document.querySelectorAll<HTMLButtonElement>('[data-shop-filter]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll<HTMLButtonElement>('[data-shop-filter]').forEach(tab => { tab.classList.toggle('active', tab === button); tab.setAttribute('aria-pressed', String(tab === button)); });
  let count = 0;
  document.querySelectorAll<HTMLElement>('[data-product-card]').forEach(card => { card.hidden = button.dataset.shopFilter !== 'all' && card.dataset.category !== button.dataset.shopFilter; if (!card.hidden) count++; });
  const counter = document.querySelector<HTMLElement>('[data-shop-count]');
  if (counter) counter.textContent = locale === 'ru' ? `${count} ${count===1?'модель':count<5?'модели':'моделей'}` : `${count} model${count===1?'':'s'}`;
}));
load(); render();
