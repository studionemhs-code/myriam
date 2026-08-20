import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const old = await base44.asServiceRole.entities.MyriamStory.list('-created_date', 500);
    const oldIds = old.filter((s) => new Date(s.created_date) < cutoff).map((s) => s.id);
    if (oldIds.length) {
      await base44.asServiceRole.entities.MyriamStory.deleteMany({ id: { $in: oldIds } });
    }
    return Response.json({ ok: true, deleted: oldIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}