import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runSQL, generateDDL, generateBulkUpsert, ADMIN_ENTITIES } from '../../shared/supabaseClient.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { entity_name } = body;

    if (!entity_name || !ADMIN_ENTITIES.includes(entity_name)) {
      return Response.json({ error: 'Entidade inválida' }, { status: 400 });
    }

    // Update or create config to "migrando"
    const configs = await base44.asServiceRole.entities.SupabaseSyncConfig.filter({ entity_name });
    let configId = configs[0]?.id;
    if (configId) {
      await base44.asServiceRole.entities.SupabaseSyncConfig.update(configId, { status: 'migrando', errors: '' });
    } else {
      const created = await base44.asServiceRole.entities.SupabaseSyncConfig.create({ entity_name, status: 'migrando', enabled: true });
      configId = created.id;
    }

    const tableName = entity_name.toLowerCase();

    // Read all records
    const allRecords = await base44.asServiceRole.entities[entity_name].list('-created_date', 10000);

    if (allRecords.length === 0) {
      await base44.asServiceRole.entities.SupabaseSyncConfig.update(configId, {
        status: 'sincronizado',
        total_records: 0,
        last_sync: new Date().toISOString(),
        errors: ''
      });
      return Response.json({ ok: true, migrated: 0, errors: '' });
    }

    // Create table if not exists, inferring types from records
    await runSQL(base44, generateDDL(tableName, allRecords));

    // Bulk upsert in batches of 50
    const batchSize = 50;
    let errors = '';
    for (let i = 0; i < allRecords.length; i += batchSize) {
      const batch = allRecords.slice(i, i + batchSize);
      try {
        const sql = generateBulkUpsert(tableName, batch);
        if (sql) await runSQL(base44, sql);
      } catch (e) {
        errors += `Batch ${i}: ${e.message}\n`;
      }
    }

    // Update config with result
    await base44.asServiceRole.entities.SupabaseSyncConfig.update(configId, {
      status: errors ? 'erro' : 'sincronizado',
      total_records: allRecords.length,
      last_sync: new Date().toISOString(),
      errors
    });

    return Response.json({ ok: true, migrated: allRecords.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}