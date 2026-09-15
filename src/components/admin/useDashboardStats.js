import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabase/client';
import { BookOpen, Sparkles, Users, Flag, Heart, CalendarDays, Leaf } from 'lucide-react';

const cards = [
  ['ACAMF Conteúdos', 'acamf_contents', BookOpen, '/admin/acamf'],
  ['Dias de Preparação', 'preparation_days', Sparkles, '/admin/dias'],
  ['Usuários', 'profiles', Users, '/admin/usuarios'],
  ['Relatórios Pendentes', 'reports', Flag, '/admin/relatorios', 'pendente'],
  ['Intenções Ativas', 'prayer_intentions', Heart, '/intencoes', 'ativo'],
  ['Eventos do Calendário', 'marian_calendar_events', CalendarDays, '/admin/calendario'],
  ['Jornadas Coletivas', 'collective_journeys', Leaf, '/admin/jornadas']
];
export default function useDashboardStats() {
  return useQuery({ queryKey: ['admin-dashboard-counts'], refetchInterval: 10000, refetchOnWindowFocus: 'always', refetchOnMount: 'always', queryFn: async () => {
    const entries = await Promise.all(cards.map(async ([label, table, icon, to, status]) => {
      let query = supabase.from(table).select('id', { count: 'exact', head: true });
      if (status) query = query.eq('status', status);
      const { count, error } = await query;
      if (error) throw new Error('Não foi possível atualizar os indicadores.');
      return [label, { count: count ?? 0, icon, to }];
    }));
    return Object.fromEntries(entries);
  } });
}