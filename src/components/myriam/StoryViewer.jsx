import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BACKGROUNDS = { marian: 'bg-marian', gold: 'bg-gold', deep: 'bg-deep' };
const MAX_DURATION = 30; // segundos — teto por story
const IMAGE_DURATION = 7; // segundos para imagem/texto (estilo Instagram)
const HOLD_DELAY = 200; // ms para diferenciar tap de press-and-hold (pausa)

export default function StoryViewer({ group, currentUser, onClose, onStoryDeleted }) {
  const [idx, setIdx] = useState(0);
  const [items, setItems] = useState(group.items);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(IMAGE_DURATION);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  const rafRef = useRef(null);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);
  const holdTimer = useRef(null);
  const didHold = useRef(false);

  const story = items[idx];

  useEffect(() => {
    if (story && currentUser && !story.viewers?.includes(currentUser.id)) {
      base44.entities.MyriamStory.update(story.id, { viewers: [...(story.viewers || []), currentUser.id] });
    }
  }, [story, currentUser]);

  const goNext = useCallback(() => {
    setIdx((prev) => {
      if (prev < items.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  }, [items.length, onClose]);

  const goPrev = () => setIdx((i) => Math.max(0, i - 1));

  // Reseta o progresso ao trocar de story
  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (story?.media_type === 'video') {
      setMediaLoading(true);
      setDuration(MAX_DURATION);
    } else if (story?.media_type === 'text') {
      setMediaLoading(false);
      setDuration(IMAGE_DURATION);
    } else {
      setMediaLoading(true);
      setDuration(IMAGE_DURATION);
    }
  }, [idx, story?.media_type]);

  // Loop de animação da barra de progresso
  useEffect(() => {
    if (paused || mediaLoading) return;
    startRef.current = performance.now() - elapsedRef.current * 1000;

    const tick = (now) => {
      const elapsed = (now - startRef.current) / 1000;
      elapsedRef.current = elapsed;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        goNext();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, mediaLoading, duration, goNext]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const deleteStory = async (storyId) => {
    if (!confirm('Excluir este story?')) return;
    try {
      await base44.entities.MyriamStory.delete(storyId);
      const remaining = items.filter((s) => s.id !== storyId);
      setItems(remaining);
      if (onStoryDeleted) onStoryDeleted(storyId);
      if (remaining.length === 0) { onClose(); return; }
      if (idx >= remaining.length) setIdx(remaining.length - 1);
    } catch (e) { alert('Erro ao excluir.'); }
  };

  const isAuthor = story?.created_by_id === currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';

  const onVideoMeta = (e) => {
    const d = e.target.duration;
    if (d && isFinite(d)) setDuration(Math.min(d, MAX_DURATION));
    setMediaLoading(false);
  };

  // Tap avança; press-and-hold pausa (estilo Instagram)
  const handleDown = () => {
    didHold.current = false;
    holdTimer.current = setTimeout(() => {
      didHold.current = true;
      setPaused(true);
    }, HOLD_DELAY);
  };
  const handleUp = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (didHold.current) {
      setPaused(false);
    } else {
      goNext();
    }
  };
  const handleLeave = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
    if (didHold.current) setPaused(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <button onClick={onClose} className="absolute right-4 top-4 z-20 text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
      {story && (isAuthor || isAdmin) && (
        <button onClick={() => deleteStory(story.id)} className="absolute right-14 top-4 z-20 text-white/70 hover:text-red-400" title="Excluir story">
          <Trash2 className="h-6 w-6" />
        </button>
      )}
      {idx > 0 && <button onClick={goPrev} className="absolute left-2 z-20 text-white/70 hover:text-white"><ChevronLeft className="h-8 w-8" /></button>}
      {idx < group.items.length - 1 && <button onClick={goNext} className="absolute right-2 z-20 text-white/70 hover:text-white"><ChevronRight className="h-8 w-8" /></button>}

      <div
        className="relative h-full w-full max-w-lg select-none"
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerLeave={handleLeave}
      >
        {/* Barras de progresso estilo Instagram */}
        <div className="absolute left-4 right-4 top-4 z-10 flex gap-1">
          {group.items.map((_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-75 ease-linear"
                style={{ width: i < idx ? '100%' : i === idx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        <div className="absolute left-4 top-8 z-10 flex items-center gap-2">
          {group.author_photo ? <img src={group.author_photo} className="h-8 w-8 rounded-full" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-marian text-xs text-white">{(group.author_name || 'A')[0]}</div>}
          <span className="text-sm text-white/90">{group.author_name}</span>
        </div>

        {/* Spinner de carregamento da mídia */}
        {mediaLoading && story?.media_type !== 'text' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}

        {story?.media_type === 'text' ? (
          <div className={`flex h-full items-center justify-center p-8 ${BACKGROUNDS[story.background_color] || 'bg-marian'}`}>
            <p className="text-center font-display text-2xl text-white">{story.text}</p>
          </div>
        ) : story?.media_type === 'video' ? (
          <video
            src={story.media_url}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            onLoadedMetadata={onVideoMeta}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <img src={story?.media_url} alt="" className="max-h-full max-w-full object-contain" onLoad={() => setMediaLoading(false)} />
            {story?.text && <p className="absolute bottom-20 left-0 right-0 p-4 text-center text-white">{story.text}</p>}
          </div>
        )}
      </div>
    </div>
  );
}