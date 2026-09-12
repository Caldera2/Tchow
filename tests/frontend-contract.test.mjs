import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('database homepage hero cannot inherit the legacy image overlay', async () => {
  const css = await readFile(new URL('src/index.css', root), 'utf8');
  const guard = css.slice(css.lastIndexOf('Keep the active database-backed hero'));

  assert.match(guard, /\.home\s*\{[^}]*background-image:\s*none\s*!important/);
  assert.match(guard, /\.home > \.hero\s*\{[^}]*background:\s*var\(--cream\)\s*!important/);
  assert.match(guard, /\.home > \.hero::before[\s\S]*display:\s*none\s*!important/);
  assert.match(guard, /\.home > \.hero \.hero-art img\s*\{[\s\S]*mix-blend-mode:\s*normal\s*!important/);
});

test('hosted builds retain only public Supabase client defaults', async () => {
  const env = await readFile(new URL('src/config/env.js', root), 'utf8');
  assert.match(env, /VITE_SUPABASE_URL/);
  assert.match(env, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(env, /sb_publishable_/);
  assert.doesNotMatch(env, /SUPABASE_SERVICE_ROLE_KEY|postgresql:\/\//);
});
