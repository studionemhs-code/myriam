import { supabase } from './supabaseClient';
import { ENTITY_TABLES, ARRAY_FIELDS } from './entityTables';

const stripPrefix = (key) => key.replace(/^data\./, '');

const unwrap = ({ data, error }) => {
  if (error) {
    const err = new Error(error.message);
    err.status = error.code === 'PGRST116' ? 404 : 400;
    err.details = error.details;
    throw err;
  }
  return data;
};

// Aplica um filtro no estilo Base44/Mongo sobre um query builder do Supabase.
function applyFilter(builder, query = {}) {
  for (const [rawKey, value] of Object.entries(query)) {
    const key = stripPrefix(rawKey);

    if (key === '$or' && Array.isArray(value)) {
      const parts = value.flatMap((cond) =>
        Object.entries(cond).map(([k, v]) => `${stripPrefix(k)}.eq.${v}`)
      );
      builder = builder.or(parts.join(','));
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [op, opValue] of Object.entries(value)) {
        switch (op) {
          case '$in':
            builder = ARRAY_FIELDS.has(key)
              ? builder.overlaps(key, opValue)
              : builder.in(key, opValue);
            break;
          case '$nin': builder = builder.not(key, 'in', `(${opValue.join(',')})`); break;
          case '$ne': builder = builder.neq(key, opValue); break;
          case '$gt': builder = builder.gt(key, opValue); break;
          case '$gte': builder = builder.gte(key, opValue); break;
          case '$lt': builder = builder.lt(key, opValue); break;
          case '$lte': builder = builder.lte(key, opValue); break;
          case '$exists': builder = opValue ? builder.not(key, 'is', null) : builder.is(key, null); break;
          case '$contains': builder = builder.contains(key, opValue); break;
          default: break;
        }
      }
      continue;
    }

    if (ARRAY_FIELDS.has(key)) {
      builder = builder.contains(key, Array.isArray(value) ? value : [value]);
    } else if (value === null) {
      builder = builder.is(key, null);
    } else {
      builder = builder.eq(key, value);
    }
  }
  return builder;
}

function applySort(builder, sort) {
  if (!sort) return builder.order('created_date', { ascending: false });
  if (typeof sort === 'object') {
    for (const [field, dir] of Object.entries(sort)) {
      builder = builder.order(field, { ascending: dir !== -1 && dir !== 'desc' });
    }
    return builder;
  }
  const desc = sort.startsWith('-');
  return builder.order(desc ? sort.slice(1) : sort, { ascending: !desc });
}

// Converte operadores de update do Mongo ($set, $inc, ...) num objeto simples.
function flattenUpdate(data) {
  if (!data || typeof data !== 'object') return data;
  const ops = Object.keys(data).filter((k) => k.startsWith('$'));
  if (!ops.length) return data;
  const out = {};
  for (const op of ops) {
    if (op === '$set') Object.assign(out, data[op]);
    else if (op === '$unset') for (const k of Object.keys(data[op])) out[k] = null;
    else if (op === '$currentDate') for (const k of Object.keys(data[op])) out[k] = new Date().toISOString();
  }
  return out;
}

export function createEntityApi(entityName) {
  const table = ENTITY_TABLES[entityName] || entityName.toLowerCase();
  const from = () => supabase.from(table);

  return {
    tableName: table,

    async list(sort = '-created_date', limit = 500, skip = 0) {
      let q = applySort(from().select('*'), sort);
      if (limit) q = q.range(skip, skip + limit - 1);
      return unwrap(await q) || [];
    },

    async filter(query = {}, sort = '-created_date', limit = 500, skip = 0) {
      let q = applyFilter(from().select('*'), query);
      q = applySort(q, sort);
      if (limit) q = q.range(skip, skip + limit - 1);
      return unwrap(await q) || [];
    },

    async get(id) {
      return unwrap(await from().select('*').eq('id', id).single());
    },

    async create(data) {
      return unwrap(await from().insert(data).select().single());
    },

    async bulkCreate(rows) {
      return unwrap(await from().insert(rows).select()) || [];
    },

    async update(id, data) {
      return unwrap(await from().update(flattenUpdate(data)).eq('id', id).select().single());
    },

    async bulkUpdate(rows) {
      const out = [];
      for (const { id, ...rest } of rows) {
        out.push(unwrap(await from().update(rest).eq('id', id).select().single()));
      }
      return out;
    },

    async updateMany(query, data) {
      const rows = unwrap(await applyFilter(from().select('id'), query)) || [];
      if (!rows.length) return { has_more: false, updated: 0 };
      await from().update(flattenUpdate(data)).in('id', rows.map((r) => r.id));
      return { has_more: false, updated: rows.length };
    },

    async delete(id) {
      unwrap(await from().delete().eq('id', id));
      return { success: true };
    },

    async deleteMany(query) {
      const rows = unwrap(await applyFilter(from().select('id'), query)) || [];
      if (!rows.length) return { deleted: 0 };
      unwrap(await from().delete().in('id', rows.map((r) => r.id)));
      return { deleted: rows.length };
    },

    schema() {
      return Promise.resolve({ type: 'object', properties: {} });
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`realtime:${table}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          const type = payload.eventType === 'INSERT' ? 'create'
            : payload.eventType === 'UPDATE' ? 'update' : 'delete';
          const record = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
          callback({ id: record?.id, type, data: record });
        })
        .subscribe();
      return () => supabase.removeChannel(channel);
    }
  };
}

export const entities = Object.keys(ENTITY_TABLES).reduce((acc, name) => {
  acc[name] = createEntityApi(name);
  return acc;
}, {});