import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type StaffPermission =
  | 'manage_menu'
  | 'manage_orders'
  | 'manage_delivery'
  | 'manage_catering'
  | 'manage_contact'
  | 'manage_partnerships'
  | 'manage_settings'
  | 'manage_staff'
  | 'manage_financial'
  | 'view_audit';

type AuthorizationResult = {
  user: { id: string };
  member: { user_id: string; role: string; is_active: boolean };
};

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    return JSON.parse(atob(normalized));
  } catch {
    return null;
  }
}

export async function authorizeStaff(
  request: Request,
  admin: SupabaseClient,
  permission: StaffPermission,
): Promise<AuthorizationResult | { error: 'unauthorized' | 'assurance_required' | 'forbidden' | 'authorization_unavailable' }> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: 'unauthorized' };

  const authResult = await admin.auth.getUser(token);
  if (authResult.error || !authResult.data.user) return { error: 'unauthorized' };

  // getUser validates the signed token before its assurance claim is trusted.
  const claims = decodePayload(token);
  if (claims?.aal !== 'aal2') return { error: 'assurance_required' };

  const { data: member, error } = await admin
    .from('staff_members')
    .select('user_id, role, is_active, staff_permissions(permission)')
    .eq('user_id', authResult.data.user.id)
    .maybeSingle();
  if (error) return { error: 'authorization_unavailable' };
  if (!member?.is_active) return { error: 'forbidden' };

  const permissions = (member.staff_permissions || []).map((item: { permission: string }) => item.permission);
  if (member.role !== 'owner' && !permissions.includes(permission)) return { error: 'forbidden' };
  return { user: { id: authResult.data.user.id }, member };
}

export function authorizationResponse(result: { error: string }, out: (body: unknown, status?: number) => Response) {
  if (result.error === 'unauthorized') return out({ error: { code: 'unauthorized' } }, 401);
  if (result.error === 'assurance_required') return out({ error: { code: 'assurance_required', message: 'A verified staff MFA session is required.' } }, 403);
  if (result.error === 'authorization_unavailable') return out({ error: { code: 'authorization_unavailable' } }, 503);
  return out({ error: { code: 'forbidden' } }, 403);
}
