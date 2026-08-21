import React from 'react';
import { X } from 'lucide-react';
import PrivacyVideoPlayer from '@/components/PrivacyVideoPlayer';

// Modal que exibe o vídeo anexado a uma notificação (YouTube ou arquivo enviado).
export default function NotificationVideoModal({ notification, onClose }) {
  if (!notification) return null;
  const hasVideo = notification.youtube_id || notification.video_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-3 top-3 z-10 text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
        <h3 className="mb-1 pr-8 font-display text-lg">{notification.title}</h3>
        {notification.body && <p className="mb-3 text-sm text-muted-foreground">{notification.body}</p>}

        {hasVideo ? (
          <div className="overflow-hidden rounded-xl border border-border bg-black">
            {notification.youtube_id ? (
              <PrivacyVideoPlayer videoId={notification.youtube_id} title={notification.title} />
            ) : (
              <video controls src={notification.video_url} className="aspect-video w-full" />
            )}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Esta notificação não possui vídeo.</p>
        )}
      </div>
    </div>
  );
}