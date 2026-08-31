import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Cria os triggers ausentes na tabela journey_contents para popular
// created_by_id (com auth.uid()) e updated_date automaticamente.
// Função administrativa de uso único — roda DDL via Management API do Supabase.

const DDL = `
CREATE OR REPLACE FUNCTION set_created_by_journey_contents()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by_id IS NULL THEN
    NEW.created_by_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_created_by_journey_contents ON journey_contents;
CREATE TRIGGER trg_set_created_by_journey_contents
BEFORE INSERT ON journey_contents
FOR EACH ROW EXECUTE FUNCTION set_created_by_journey_contents();

CREATE OR REPLACE FUNCTION set_updated_date_journey_contents()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_date_journey_contents ON journey_contents;
CREATE TRIGGER trg_set_updated_date_journey_contents
BEFORE UPDATE ON journey_contents
FOR EACH ROW EXECUTE FUNCTION set_updated_date_journey_contents();
`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    // Descobre o project ref automaticamente.
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const projects = await projectsRes.json();
    const project = Array.isArray(projects) ? projects[0] : null;
    if (!project || !project.id) {
      return Response.json({ error: 'Nenhum projeto Supabase encontrado' }, { status: 500 });
    }
    const ref = project.id;

    // Executa o DDL.
    const sqlRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: DDL })
    });

    const sqlText = await sqlRes.text();
    if (!sqlRes.ok) {
      return Response.json({ error: 'Falha ao executar DDL', status: sqlRes.status, body: sqlText }, { status: 500 });
    }

    return Response.json({ success: true, project: ref, message: 'Triggers criados em journey_contents' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}