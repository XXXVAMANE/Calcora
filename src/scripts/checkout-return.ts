const section = document.querySelector<HTMLElement>('[data-checkout-return]');
if (section && section.dataset.cancelled !== 'true') {
  const en = document.documentElement.lang !== 'ru';
  const title = section.querySelector<HTMLElement>('[data-payment-title]')!;
  const status = section.querySelector<HTMLElement>('[data-payment-status]')!;
  const id = new URL(location.href).searchParams.get('session_id');
  const failed = () => { title.textContent = en ? 'Payment not confirmed.' : 'Оплата не подтверждена.'; status.textContent = en ? 'We could not verify payment. Your bag is unchanged. Refresh to check again.' : 'Не удалось подтвердить оплату. Корзина сохранена. Обновите страницу для повторной проверки.'; };
  (async () => {
    if (!id || !/^cs_test_[A-Za-z0-9_]{1,200}$/.test(id)) { failed(); return; }
    try {
      const result = await fetch(`/api/checkout?session_id=${encodeURIComponent(id)}`, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
      const data = await result.json();
      if (!result.ok || data.test !== true || data.currency !== 'USD' || data.paid !== true) { failed(); return; }
      title.textContent = en ? 'Test payment confirmed.' : 'Тестовая оплата подтверждена.';
      status.textContent = en ? 'Stripe confirmed your test purchase. The test order is recorded in Stripe.' : 'Stripe подтвердил тестовую покупку. Тестовый заказ сохранён в Stripe.';
      const total = section.querySelector<HTMLElement>('[data-payment-total]')!;
      if (Number.isSafeInteger(data.amount) && data.amount >= 0) { total.hidden = false; total.textContent = new Intl.NumberFormat(en ? 'en-US' : 'ru-RU', { style: 'currency', currency: 'USD' }).format(data.amount / 100); }
      try {
        const pending = JSON.parse(sessionStorage.getItem('calcora-checkout') || 'null');
        if (pending?.id === id && Array.isArray(pending.items)) {
          const bag = JSON.parse(localStorage.getItem('calcora-demo-bag') || '[]');
          if (Array.isArray(bag)) {
            const remaining = bag.map(item => ({ ...item, quantity: item.quantity - (pending.items.find((bought: {slug:string;quantity:number}) => bought.slug === item.slug)?.quantity || 0) })).filter(item => item.quantity > 0);
            localStorage.setItem('calcora-demo-bag', JSON.stringify(remaining));
            window.dispatchEvent(new StorageEvent('storage', { key: 'calcora-demo-bag' }));
          }
          sessionStorage.removeItem('calcora-checkout');
        }
      } catch { /* Payment confirmation remains valid when storage is unavailable. */ }
    } catch { failed(); }
  })();
}
