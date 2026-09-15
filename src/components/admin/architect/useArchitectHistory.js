import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabase/client';

export const PAGE_SIZE = 25;
export default function useArchitectHistory(tab, page) {
  return useQuery({
    queryKey: ['architect-history', tab, page],
    queryFn: async () => {
      const pending = tab === 'pending';
      let request = pending
        ? supabase.from('agent_conversations').select('id,agent_id,agent_name,pending_action', { count: 'exact' }).not('pending_action', 'is', null).order('updated_date', { ascending: false })
        : supabase.from('architect_audit_log').select('*', { count: 'exact' }).order('created_at', { ascending: false }).order('id');
      const { data, count, error } = await request.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      if (error) throw error;
      const ids = [...new Set((data || []).map(row => row.agent_id))];
      const agents = ids.length ? await supabase.from('ai_agents').select('id,name').in('id', ids) : { data: [] };
      if (agents.error) throw agents.error;
      const names = Object.fromEntries((agents.data || []).map(agent => [agent.id, agent.name]));
      const rows = (data || []).map(row => pending ? {
        id: row.id, agent_name: row.agent_name || names[row.agent_id] || row.agent_id,
        action_summary: row.pending_action.summary, created_at: row.pending_action.requested_at,
        operation: row.pending_action.args?.operation || row.pending_action.tool,
        table_name: row.pending_action.args?.table, pending: true,
      } : { ...row, agent_name: names[row.agent_id] || row.agent_id });
      return { rows, count: count || 0 };
    },
  });
}