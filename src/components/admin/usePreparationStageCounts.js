import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabase/client';

export default function usePreparationStageCounts(phases) {
  return useQuery({ queryKey: ['admin-preparation-stages'], refetchInterval: 10000, refetchOnWindowFocus: 'always', refetchOnMount: 'always', queryFn: async () => {
    return Promise.all(phases.map(async (phase) => {
      const { count, error } = await supabase.from('user_progress').select('id', { count: 'exact', head: true })
        .eq('status', 'ativa').gte('current_day', phase.min).lte('current_day', phase.max);
      if (error) throw new Error('Não foi possível atualizar o gráfico.');
      return { name: phase.name, full: phase.full, range: phase.range, usuarios: count ?? 0 };
    }));
  } });
}