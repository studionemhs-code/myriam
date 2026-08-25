import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSQL, generateSingleUpsert, generateDelete, generateAlterTable } from '../../shared/supabaseClient.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { entity_name, record_id, operation } = body;

    if (!entity_name || !record_id || !operation) {
      return Response.json({ error: 'entity_name, record_id, operation são obrigatórios' }, { status: 400 });
    }

    // Check if sync is enabled for this entity
    const configs = await base44.asServiceRole.entities.SupabaseSyncConfig.filter({ entity_name });
    if (configs.length > 0 && !configs[0].enabled) {
      return Response.json({ ok: true, skipped: true });
    }

    const tableName = entity_name.toLowerCase();

    if (operation === 'delete') {
      await runSQL(base44, generateDelete(tableName, record_id));
    } else {
      const record = await base44.asServiceRole.entities[entity_name].get(record_id);
      // Add any new columns before upsert
      const alterSql = generateAlterTable(tableName, record);
      if (alterSql) await runSQL(base44, alterSql);
      const sql = generateSingleUpsert(tableName, record);
      if (sql) await runSQL(base44, sql);
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}