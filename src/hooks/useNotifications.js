import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

// Hook reativo para as notificações do usuário atual.
// Compartilha a mesma query key entre AppLayout (badge) e a página de Notificações,
// mantendo o contador sincronizado via invalidação do react-query.
export function useNotifications() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const queryKey = ['notifications', user?.id];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.Notification.filter({ user_id: user.id }, '-created_date', 50),
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n) => !n.read);
      if (!unread.length) return;
      await base44.entities.Notification.bulkUpdate(unread.map((n) => ({ id: n.id, read: true })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead: (id) => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
  };
}