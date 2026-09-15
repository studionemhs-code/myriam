import { json, preflight, currentUser, admin } from '../_shared/utils.ts';
import { buildArchitectContext, completeArchitectGithub } from '../_shared/githubArchitect.ts';

Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const user = await currentUser(req);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    if (user.role !== 'admin') return json({ error: 'Apenas administradores podem usar o Modo Arquiteto.' }, 403);
    const payload = await req.json();
    const db = admin();
    if (payload.bootstrap === true) return json(await buildArchitectContext(db));
    if (!payload.conversation_id) return json({ error: 'Conversa obrigatória ausente.' }, 400);
    return json(await completeArchitectGithub(db, user, payload));
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});