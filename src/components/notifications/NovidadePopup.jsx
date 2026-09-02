import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, Sparkles } from 'lucide-react';

// Pop-up de novidade exibido no login quando há uma notificação não lida
// da categoria "novidades". Recebe as notificações do AppLayout (mesma
// instância de useNotifications) para evitar uma segunda busca de usuário.
// O estado "lida" (read) no banco é a fonte da verdade: ao fechar, marcamos
// como lida. Um Set local evita reexibir a mesma novidade antes do refetch.
export default function NovidadePopup({ notifications = [], markRead }) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    if (current) return;
    const unread = notifications.filter(
      (n) => n.category === 'novidades' && !n.read && !dismissed.has(n.id)
    );
    if (!unread.length) return;
    setCurrent(unread[0]);
  }, [notifications, current, dismissed]);

  const dismiss = async (id, redirectTo) => {
    // Marca como lida no banco (fonte da verdade) e localmente (evita reexibir).
    setDismissed((prev) => { const next = new Set(prev); next.add(id); return next; });
    setCurrent(null);
    if (markRead) { try { await markRead(id); } catch { /* ignore */ } }
    if (redirectTo) navigate(redirectTo);
  };

  if (!current) return null;
  const hasFeature = !!current.link;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => dismiss(current.id)} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border bg-deep px-5 py-3 text-primary-foreground">
          <Sparkles className="h-4 w-4 text-gold" />
          <span className="font-display text-sm">Novidade Theotokos</span>
          <button
            onClick={() => dismiss(current.id)}
            className="ml-auto rounded-lg p-1 text-primary-foreground/70 hover:bg-sidebar-accent hover:text-primary-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <h2 className="font-display text-lg text-foreground">{current.title}</h2>
          {current.body && (
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{current.body}</p>
          )}

          {current.youtube_id && (
            <div className="mt-3 aspect-video overflow-hidden rounded-lg">
              <iframe
                src={`https://www.youtube.com/embed/${current.youtube_id}`}
                title={current.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {current.video_url && !current.youtube_id && (
            <div className="mt-3 overflow-hidden rounded-lg">
              <video src={current.video_url} controls className="w-full" />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-border px-5 py-3">
          <button
            onClick={() => dismiss(current.id)}
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted"
          >
            Fechar
          </button>
          {hasFeature && (
            <button
              onClick={() => dismiss(current.id, current.link)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gold px-4 py-2.5 text-sm font-medium text-deep transition hover:bg-gold/90"
            >
              Ver funcionalidade <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}