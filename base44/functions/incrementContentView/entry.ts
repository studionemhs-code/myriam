import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const contentId = payload.content_id;
    if (!contentId) return Response.json({ error: 'content_id required' }, { status: 400 });

    const content = await base44.asServiceRole.entities.ACAMFContent.get(contentId);
    if (!content) return Response.json({ error: 'Content not found' }, { status: 404 });

    const newCount = (content.view_count || 0) + 1;
    await base44.asServiceRole.entities.ACAMFContent.update(contentId, { view_count: newCount });
    return Response.json({ view_count: newCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}