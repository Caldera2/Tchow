const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function corsHeaders(request: Request) {
  const configured = (Deno.env.get('FRONTEND_ORIGINS') || '').split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowed = configured.length ? configured : defaultOrigins;
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, idempotency-key',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
  if (origin && allowed.includes(origin)) { headers['Access-Control-Allow-Origin'] = origin; headers['Access-Control-Allow-Credentials'] = 'true'; }
  return headers;
}

export function handleOptions(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export function jsonResponse(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), 'Content-Type': 'application/json' } });
}
