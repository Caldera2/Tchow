import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { allowlistedReturnTo, useAuth } from './AuthContext';

const go = (path) => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); };
const genericError = 'We could not complete that request. Check your details and try again.';

export function AuthPage({ mode = 'signin' }) {
  const { configured } = useAuth();
  const params = new URLSearchParams(location.search);
  const returnTo = allowlistedReturnTo(params.get('returnTo'));
  const [form, setForm] = useState({ email: '', password: '', fullName: '', nextPassword: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (key, value) => { setMessage(''); setError(''); setForm((current) => ({ ...current, [key]: value })); };
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    if (!configured || !supabase) { setError('Authentication is not configured yet.'); setBusy(false); return; }
    try {
      if (mode === 'signin') { const { error: signInError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password }); if (signInError) throw signInError; go(returnTo); }
      if (mode === 'register') { const { error: signUpError } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.fullName }, emailRedirectTo: `${location.origin}/account` } }); if (signUpError) throw signUpError; setMessage('Check your email for a verification link.'); }
      if (mode === 'forgot') { await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: `${location.origin}/reset-password` }); setMessage('If an account exists for that address, recovery instructions are on the way.'); }
      if (mode === 'reset') { const { error: resetError } = await supabase.auth.updateUser({ password: form.nextPassword }); if (resetError) throw resetError; setMessage('Your password has been updated. You can now continue securely.'); }
    } catch { setError(genericError); } finally { setBusy(false); }
  };
  const content = { signin: ['Welcome back.', 'Sign in to continue your Tchow order.', 'Sign in'], register: ['Create your account.', 'Keep orders, addresses, and saved boxes together.', 'Create account'], forgot: ['Reset your password.', 'Enter your email and we will show the same neutral response whether or not an account exists.', 'Send recovery link'], reset: ['Choose a new password.', 'Use a strong password you do not reuse elsewhere.', 'Update password'] }[mode];
  return <main className="page auth-page"><div className="auth-card"><span className="eyebrow">Tchow / Account</span><h1>{content[0]}</h1><p>{content[1]}</p><form className="wide-form" onSubmit={submit} noValidate>{mode === 'register' && <label>Full name<input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} /></label>}<label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} /></label>{(mode === 'signin' || mode === 'register') && <label>Password<input required minLength="8" type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => update('password', e.target.value)} /></label>}{mode === 'reset' && <label>New password<input required minLength="8" type="password" autoComplete="new-password" value={form.nextPassword} onChange={(e) => update('nextPassword', e.target.value)} /></label>}{error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status"><Check size={15}/>{message}</p>}<button className="button" type="submit" disabled={busy}>{busy ? 'Please wait...' : content[2]} <ArrowRight size={17}/></button></form><div className="auth-links">{mode === 'signin' && <><a href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Create an account</a><a href="/forgot-password">Forgot password?</a></>}{mode === 'register' && <a href={`/signin?returnTo=${encodeURIComponent(returnTo)}`}>Already have an account? Sign in</a>}{mode === 'forgot' && <a href="/signin">Return to sign in</a>}{mode === 'reset' && <a href="/signin">Return to sign in</a>}</div></div></main>;
}
