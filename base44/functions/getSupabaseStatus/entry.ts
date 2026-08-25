import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getSupabaseConnection, ADMIN_ENTITIES } from '../../shared/supabaseClient.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { projectRef } = await getSupabaseConnection(base44);

    return Response.json({
      connected: true,
      projectRef,
      entities: ADMIN_ENTITIES
    });
  } catch (error) {
    return Response.json({ connected: false, error: error.message });
  }
}