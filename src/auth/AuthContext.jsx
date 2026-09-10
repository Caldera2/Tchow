import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const AUTH_PATHS = ['/checkout', '/account', '/account/orders', '/account/profile', '/admin', '/admin/orders', '/admin/menu', '/admin/catering', '/admin/investors', '/admin/settings'];

export const allowlistedReturnTo = (value) => {
  const path = String(value || '');
  return AUTH_PATHS.some((allowed) => path === allowed || path.startsWith(`${allowed}/`)) ? path : '/account';
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!supabase) { setLoading(false); setError('Authentication is not configured yet.'); return undefined; }
    let mounted = true;
    Promise.resolve().then(() => supabase.auth.getSession()).then(({ data, error: sessionError }) => { if (mounted) { setSession(data.session); setError(sessionError?.message || null); setLoading(false); } }).catch((sessionError) => { if (mounted) { setSession(null); setError(sessionError?.message || 'Could not restore your session.'); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => { if (mounted) { if (event === 'SIGNED_IN' || event === 'USER_UPDATED') ['tchow-customer', 'tchow-profile', 'tchow-last-order', 'tchow-partnership-interest', 'tchow-enquiry', 'tchow-catering-enquiry', 'tchow-partnership-application', 'tchow-contact-enquiry'].forEach((key) => localStorage.removeItem(key)); setSession(nextSession); } });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);
  const signOut = async () => { if (!supabase) return { error: new Error('Authentication is not configured.') }; try { const result = await supabase.auth.signOut(); if (!result.error) ['tchow-customer', 'tchow-profile', 'tchow-last-order', 'tchow-partnership-interest', 'tchow-enquiry', 'tchow-catering-enquiry', 'tchow-partnership-application', 'tchow-contact-enquiry'].forEach((key) => localStorage.removeItem(key)); return result; } catch (signOutError) { return { error: signOutError }; } };
  const value = useMemo(() => ({ session, user: session?.user || null, loading, error, configured: Boolean(supabase), signOut }), [session, loading, error]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider.'); return value; }

export function AuthGate({ children }) {
  const { user, loading, configured } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => { if (!loading && configured && !user && !redirecting) { setRedirecting(true); const destination = `${location.pathname}${location.search}`; history.replaceState({}, '', `/signin?returnTo=${encodeURIComponent(destination)}`); dispatchEvent(new PopStateEvent('popstate')); } }, [loading, configured, user, redirecting]);
  if (loading) return <main className="page auth-state"><span className="eyebrow">Account</span><h1>Checking your session.</h1></main>;
  if (!configured) return <main className="page auth-state"><span className="eyebrow">Account unavailable</span><h1>Authentication is not configured.</h1><p>Add the Supabase client environment values before using account features.</p></main>;
  if (!user) return null;
  return children;
}

export function StaffGate({ children }) {
  const { user, loading, configured } = useAuth();
  const [state, setState] = useState({ loading: true, member: null });
  useEffect(() => { let active = true; if (!user || !supabase) { setState({ loading: false, member: null }); return undefined; } Promise.resolve().then(() => supabase.from('staff_members').select('role,is_active').eq('user_id', user.id).maybeSingle()).then(({ data, error: memberError }) => { if (active) setState({ loading: false, member: memberError ? null : data }); }).catch(() => { if (active) setState({ loading: false, member: null }); }); return () => { active = false; }; }, [user]);
  if (loading || state.loading) return <main className="page auth-state"><span className="eyebrow">Operations</span><h1>Verifying staff access.</h1></main>;
  if (!configured || !user || !state.member?.is_active) return <main className="page auth-state"><span className="eyebrow">Operations access</span><h1>This area is restricted.</h1><p>Your sign-in does not have active staff authorization.</p><a className="button button-outline" href="/">Return home</a></main>;
  return <StaffMfaGate>{children}</StaffMfaGate>;
}

function StaffMfaGate({ children }) {
  const [assurance, setAssurance] = useState({ loading: true, data: null });
  const [factor, setFactor] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; if (!supabase?.auth?.mfa) { setAssurance({ loading: false, data: null, error: 'MFA verification is unavailable.' }); return undefined; } Promise.all([Promise.resolve().then(() => supabase.auth.mfa.getAuthenticatorAssuranceLevel()), Promise.resolve().then(() => supabase.auth.mfa.listFactors())]).then(([levelResult, factorResult]) => { if (levelResult.error || factorResult.error) throw levelResult.error || factorResult.error; if (active) { const verified = factorResult.data?.totp?.find((item) => item.status === 'verified'); setFactor(verified || null); setAssurance({ loading: false, data: levelResult.data, error: '' }); } }).catch((mfaError) => { if (active) setAssurance({ loading: false, data: null, error: mfaError?.message || 'Could not verify staff assurance.' }); }); return () => { active = false; }; }, []);
  if (assurance.loading) return <main className="page auth-state"><span className="eyebrow">Operations</span><h1>Checking authentication assurance.</h1></main>;
  if (assurance.error) return <main className="page auth-state"><span className="eyebrow">Staff security</span><h1>Authentication assurance unavailable.</h1><p>{assurance.error}</p><button className="button button-outline" onClick={() => location.reload()}>Retry verification</button></main>;
  if (!factor) return <main className="page auth-state"><span className="eyebrow">Staff security</span><h1>Authenticator setup required.</h1><p>Privileged staff access requires an enrolled and verified authenticator factor. Contact the owner to complete enrollment.</p></main>;
  if (assurance.data?.currentLevel === 'aal2') return children;
  const verify = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id }); if (challenge.error) throw challenge.error; const result = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code }); if (result.error) throw result.error; setAssurance({ loading: false, data: { currentLevel: 'aal2', nextLevel: 'aal2' } }); } catch { setError('That verification code could not be confirmed. Try again.'); } finally { setBusy(false); } };
  return <main className="page auth-page"><div className="auth-card"><span className="eyebrow">Staff security</span><h1>Confirm it’s you.</h1><p>This privileged area requires your verified authenticator code.</p><form className="wide-form" onSubmit={verify}><label>Authenticator code<input inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value)} required /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button" disabled={busy}>{busy ? 'Verifying...' : 'Verify and continue'} <ArrowRight size={17}/></button></form></div></main>;
}
