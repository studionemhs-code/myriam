export const ADMIN_ENTITIES = [
  'ACAMFContent', 'Course', 'PreparationDay', 'MarianCalendarEvent',
  'CollectiveJourney', 'CertificateTemplate', 'AssociationSettings',
  'FeatureFlag', 'AIAgent', 'NotificationSettings', 'WebhookAutomation',
  'CatalogProduct', 'StoreSettings', 'ShareLink', 'User'
];

const BUILTIN_COLS = ['_base44_id', 'id', 'created_date', 'updated_date', 'created_by_id'];

export async function getSupabaseConnection(base44) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');
  const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!projectsRes.ok) throw new Error('Falha ao listar projetos Supabase');
  const projects = await projectsRes.json();
  if (!projects || projects.length === 0) throw new Error('Nenhum projeto Supabase encontrado');
  return { accessToken, projectRef: projects[0].id };
}

export async function runSQL(base44, sql) {
  const { accessToken, projectRef } = await getSupabaseConnection(base44);
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase SQL error (${res.status}): ${errText}`);
  }
  return res.json();
}

function inferPgType(val) {
  if (val === null || val === undefined) return 'text';
  if (typeof val === 'boolean') return 'boolean';
  if (typeof val === 'number') return Number.isInteger(val) ? 'integer' : 'numeric';
  if (typeof val === 'object') return 'jsonb';
  if (typeof val === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return 'timestamptz';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return 'date';
    return 'text';
  }
  return 'text';
}

function escapeValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

function collectColumns(records) {
  const colSet = new Set(BUILTIN_COLS);
  for (const record of records) {
    for (const key of Object.keys(record)) {
      colSet.add(key);
    }
  }
  return Array.from(colSet);
}

export function generateDDL(tableName, records) {
  const cols = [
    '"_base44_id" text PRIMARY KEY',
    '"id" text',
    '"created_date" timestamptz',
    '"updated_date" timestamptz',
    '"created_by_id" text'
  ];
  const fieldTypes = {};
  for (const record of records) {
    for (const [key, val] of Object.entries(record)) {
      if (BUILTIN_COLS.includes(key)) continue;
      if (!fieldTypes[key]) fieldTypes[key] = inferPgType(val);
    }
  }
  for (const [name, type] of Object.entries(fieldTypes)) {
    cols.push(`"${name}" ${type}`);
  }
  return `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${cols.join(',\n  ')}\n);`;
}

export function generateAlterTable(tableName, record) {
  const statements = [];
  for (const [key, val] of Object.entries(record)) {
    if (BUILTIN_COLS.includes(key)) continue;
    const type = inferPgType(val);
    statements.push(`ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${key}" ${type};`);
  }
  return statements.join('\n');
}

export function generateBulkUpsert(tableName, records) {
  if (!records || records.length === 0) return null;
  const cols = collectColumns(records);
  const valuesStr = records.map(record =>
    `(${cols.map(col => {
      if (col === '_base44_id') return escapeValue(record.id);
      return escapeValue(record[col]);
    }).join(', ')})`
  ).join(', ');
  const updateCols = cols.filter(c => c !== '_base44_id').map(c => `"${c}" = EXCLUDED."${c}"`);
  return `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES ${valuesStr} ON CONFLICT ("_base44_id") DO UPDATE SET ${updateCols.join(', ')};`;
}

export function generateSingleUpsert(tableName, record) {
  return generateBulkUpsert(tableName, [record]);
}

export function generateDelete(tableName, recordId) {
  return `DELETE FROM "${tableName}" WHERE "_base44_id" = '${String(recordId).replace(/'/g, "''")}';`;
}