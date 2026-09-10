import { requireSupabase } from '../lib/supabase';

export const signUp = (email, password, fullName) => requireSupabase().auth.signUp({ email, password, options: { data: { full_name: fullName } } });
export const signIn = (email, password) => requireSupabase().auth.signInWithPassword({ email, password });
export const signOut = () => requireSupabase().auth.signOut();
export const getCurrentUser = async () => (await requireSupabase().auth.getUser()).data.user;
export const onAuthStateChange = (callback) => requireSupabase().auth.onAuthStateChange(callback);
export const getAuthenticatorAssuranceLevel = () => requireSupabase().auth.getAuthenticatorAssuranceLevel();
