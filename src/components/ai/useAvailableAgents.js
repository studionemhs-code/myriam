import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function useAvailableAgents() {
  return useQuery({ queryKey: ['available-ai-agents'], refetchInterval: 15000, refetchOnWindowFocus: 'always', queryFn: async () => {
    const { data } = await base44.functions.invoke('listActiveAgents', {});
    return { agents: data.agents || [], floatingMain: data.floatingMain || null };
  } });
}