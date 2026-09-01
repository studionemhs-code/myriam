import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, Flower2, RefreshCw, Leaf, Heart, BookOpen, Sparkles, Gift, Bot } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import AssociationRequestButton from '@/components/associacao/AssociationRequestButton';
import NotificationVideoModal from '@/components/notifications/NotificationVideoModal';
import { PageHeader, EmptyState } from '@/components/ui/marian';
import { formatDate } from '@/lib/marianDates';

const categoryMeta = {
  caminho: { icon: Flower2, label: 'Caminho' },
  renovacao: { icon: RefreshCw, label: 'Renovação' },
  myriam: { icon: Leaf, label: 'Myriam' },
  intencoes: { icon: Heart, label: 'Intenções' },
  acamf: { icon: BookOpen, label: 'ACAMF' },
  jornadas: { icon: Sparkles, label: 'Jornadas' },
  novidades: { icon: Gift, label: 'Novidades' },
  assistente_ia: { icon: Bot, label: 'Assistente IA' },
};

export default function Notificacoes() {
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();
  const [videoNotification, setVideoNotification] = useState(null);

  const hasVideo = (n) => !!(n.youtube_id || n.video_url);

  const handleClick = (n) => {
    if (!n.read) markRead(n.id);
    if (hasVideo(n)) {
      setVideoNotification(n);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notificações"
        subtitle={unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? 'não lida' : 'não lidas'}` : 'Tudo em dia'}
        icon={Bell}
      />

      {unreadCount > 0 && (
        <button
          onClick={markAllRead}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-muted"
        >
          <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como lidas
        </button>
      )}

      <div className="mb-4">
        <AssociationRequestButton />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sem notificações"
          subtitle="Quando uma nova jornada coletiva começar, você será avisado aqui."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = categoryMeta[n.category] || { icon: Bell, label: 'Aviso' };
            const Icon = meta.icon;
            const inner = (
              <div
                className={`flex gap-3 rounded-xl border p-4 transition ${
                  n.read ? 'border-border bg-card' : 'border-gold/40 bg-gold/5'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    n.read ? 'bg-muted text-muted-foreground' : 'bg-gold/15 text-gold'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium leading-tight">{n.title}</p>
                    {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />}
                    {(n.youtube_id || n.video_url) && (
                      <span className="ml-auto shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        ▶ Vídeo
                      </span>
                    )}
                  </div>
                  {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
                    <span>{meta.label}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span>{formatDate(n.created_date)}</span>
                  </div>
                </div>
              </div>
            );
            const hasVid = hasVideo(n);
            return n.link && !hasVid ? (
              <Link key={n.id} to={n.link} onClick={() => !n.read && markRead(n.id)} className="block">
                {inner}
              </Link>
            ) : (
              <button key={n.id} onClick={() => handleClick(n)} className="block w-full text-left">
                {inner}
              </button>
            );
          })}
        </div>
      )}

      <NotificationVideoModal notification={videoNotification} onClose={() => setVideoNotification(null)} />
    </div>
  );
}