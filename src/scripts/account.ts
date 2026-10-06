import { createClient, type User } from '@supabase/supabase-js';
import type { accountCopy } from '../data/account';

const root = document.querySelector<HTMLElement>('[data-account]');
if (root) void setupAccount(root);

async function setupAccount(root: HTMLElement) {
  const t = JSON.parse(document.querySelector('#account-copy')!.textContent!) as typeof accountCopy.en;
  const get = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const status = get<HTMLParagraphElement>('[data-auth-status]');
  const form = get<HTMLFormElement>('[data-auth-form]');
  const profile = get<HTMLElement>('[data-auth-profile]');
  const email = get<HTMLInputElement>('#account-email');
  const password = get<HTMLInputElement>('#account-password');
  const confirmation = get<HTMLInputElement>('#account-confirm');
  const submit = get<HTMLButtonElement>('[data-auth-submit]');
  const say = (message: string, error = false) => { status.textContent = message; status.dataset.error = String(error); };
  let url: URL;
  try {
    url = new URL(root.dataset.url || '');
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || !root.dataset.key) throw Error('Unconfigured');
  } catch { say(t.unavailable); get('[data-auth-tabs]').hidden = true; return; }
  const client = createClient(url.origin, root.dataset.key!, { auth: { detectSessionInUrl: true } });
  const redirectTo = `${window.location.origin}/account/`;
  type Mode = 'signin' | 'signup' | 'reset' | 'update';
  let mode: Mode = 'signin', user: User | null = null, busy = false;
  const errorText = (error: { code?: string; status?: number }) => {
    if (error.status === 429) return t.limit;
    if (error.code === 'invalid_credentials') return t.invalid;
    if (error.code === 'email_not_confirmed') return t.unconfirmed;
    if (error.code === 'weak_password') return t.weak;
    return t.generic;
  };
  const setMode = (next: Mode) => {
    mode = next; password.value = ''; confirmation.value = ''; say('');
    profile.hidden = true; form.hidden = false;
    get('[data-auth-tabs]').hidden = next === 'update';
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-auth-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.authMode === next));
    }
    get('[data-email-field]').hidden = next === 'update'; email.required = next !== 'update';
    get('[data-password-field]').hidden = next === 'reset'; password.required = next !== 'reset';
    password.minLength = next === 'signin' ? 1 : 8;
    password.autocomplete = next === 'signin' ? 'current-password' : 'new-password';
    get('[data-confirm-field]').hidden = !['signup', 'update'].includes(next);
    confirmation.required = ['signup', 'update'].includes(next);
    get('[data-signup-hint]').hidden = next !== 'signup';
    get('[data-auth-forgot]').hidden = next !== 'signin';
    get('[data-auth-back]').hidden = !['reset', 'update'].includes(next);
    submit.textContent = t[next];
  };
  const showProfile = () => {
    form.hidden = true; profile.hidden = false; get('[data-auth-tabs]').hidden = true;
    get('[data-user-email]').textContent = user?.email || '';
    password.value = ''; confirmation.value = '';
  };
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-auth-mode]')) {
    button.addEventListener('click', () => { if (!busy) setMode(button.dataset.authMode as Mode); });
  }
  get('[data-auth-forgot]').addEventListener('click', () => { if (!busy) setMode('reset'); });
  get('[data-auth-back]').addEventListener('click', () => { if (!busy) { if (user) { say(''); showProfile(); } else setMode('signin'); } });
  get('[data-auth-change]').addEventListener('click', () => setMode('update'));
  get<HTMLButtonElement>('[data-auth-signout]').addEventListener('click', async () => {
    if (busy) return;
    busy = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) say(errorText(error), true);
      else { user = null; email.value = ''; setMode('signin'); }
    } catch { say(t.generic, true); } finally { busy = false; }
  });
  client.auth.onAuthStateChange((event, session) => {
    user = session?.user || null;
    if (event === 'PASSWORD_RECOVERY') setMode('update');
    else if (user && mode !== 'update') { say(''); showProfile(); }
    else if (event === 'SIGNED_OUT') setMode('signin');
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    if (confirmation.required && password.value !== confirmation.value) { say(t.mismatch, true); return; }
    const submittedMode = mode;
    busy = true; submit.disabled = true; say(t.loading);
    try {
      if (submittedMode === 'signin') {
        const { data, error } = await client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        if (error) say(errorText(error), true);
        else { user = data.user; say(''); showProfile(); }
      } else if (submittedMode === 'signup') {
        const { data, error } = await client.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: redirectTo } });
        if (error) say(errorText(error), true);
        else if (data.session) { user = data.user; say(''); showProfile(); }
        else { setMode('signin'); say(t.signupSent); }
      } else if (submittedMode === 'reset') {
        const { error } = await client.auth.resetPasswordForEmail(email.value.trim(), { redirectTo });
        if (error) say(errorText(error), true);
        else { setMode('signin'); say(t.resetSent); }
      } else {
        const { error } = await client.auth.updateUser({ password: password.value });
        if (error) say(errorText(error), true);
        else { showProfile(); say(t.updated); }
      }
    } catch { say(t.generic, true); }
    finally { busy = false; submit.disabled = false; }
  });
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const callbackError = hash.has('error') || new URLSearchParams(window.location.search).has('error');
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    user = data.session?.user || null;
    // Email callback events can change mode while getSession is pending.
    if ((mode as Mode) !== 'update') { if (user) { say(''); showProfile(); } else setMode('signin'); }
    if (callbackError) {
      history.replaceState(null, '', window.location.pathname);
      if (!user) setMode('reset');
      say(t.expired, true);
    }
  } catch { setMode('signin'); say(t.generic, true); }
}
