import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, X, ChevronLeft, ChevronRight, Type, BookOpen, Clock, Check, SkipForward, SkipBack } from 'lucide-react';
import { supabaseEntities } from '@/api/supabase/entities';
import { getPlayableAudioUrl, isAudioDownloaded } from '@/lib/offlineAudio';

const PROGRESS_COLOR = '#2E7DFF';
const RING_BG = '#1C1C1C';
const LOOP_SECONDS = 300; // embeds/sem áudio: o círculo preenche a cada 5min

const TIMER_PRESETS = [5, 10, 15, 30];

function detectType(url) {
  if (!url) return 'none';
  const u = url.toLowerCase();
  if (u.includes('soundcloud.com')) return 'soundcloud';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('spotify.com')) return 'spotify';
  return 'audio';
}
function getYouTubeId(url) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function fmtHMS(totalSeconds) {
  if (!totalSeconds || isNaN(totalSeconds)) totalSeconds = 0;
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ImmersiveAudioPrayer({
  open,
  onClose,
  title,
  audioUrl,
  youtubeId,
  coverUrl,
  textHtml,
  prayerText,
  dayLabel,
  prayerId,
  prayerTitle,
  source = 'oracoes',
  onComplete,
  queue,
  onNext,
  onPrev
}) {
  const [gallery, setGallery] = useState([]);
  const [bgUrl, setBgUrl] = useState(coverUrl || null);
  const [showText, setShowText] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const [showEmbed, setShowEmbed] = useState(false);

  // áudio nativo
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioSrc, setAudioSrc] = useState(audioUrl);
  const [offline, setOffline] = useState(false);

  // cronômetro (embed / sem áudio)
  const [stopwatch, setStopwatch] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);

  // timer de desligamento
  const [timerTotal, setTimerTotal] = useState(null); // segundos definidos
  const [timerLeft, setTimerLeft] = useState(null); // segundos restantes
  const [showTimer, setShowTimer] = useState(false);
  const [customMin, setCustomMin] = useState('');

  // conclusão
  const sessionStart = useRef(Date.now());
  const [completed, setCompleted] = useState(false);
  const [savingSession, setSavingSession] = useState(false);

  const ytId = youtubeId || (audioUrl && detectType(audioUrl) === 'youtube' ? getYouTubeId(audioUrl) : null);
  const audioType = youtubeId ? 'youtube' : detectType(audioUrl);
  const isEmbed = ['soundcloud', 'youtube', 'spotify'].includes(audioType);
  const hasAudio = !!(youtubeId || audioUrl);
  const useStopwatch = isEmbed || !hasAudio;
  const hasQueue = Array.isArray(queue) && queue.length > 1;

  // carrega galeria
  useEffect(() => {
    if (!open) return;
    supabaseEntities.PrayerGalleryImage.filter({ is_active: true }, 'sort_order', 50)
      .then(setGallery)
      .catch(() => setGallery([]));
  }, [open]);

  // resolve áudio offline e verifica disponibilidade
  useEffect(() => {
    if (!open || !audioUrl || useStopwatch) { setAudioSrc(audioUrl); setOffline(false); return; }
    let blobUrl = null;
    let cancelled = false;
    (async () => {
      const dl = await isAudioDownloaded(audioUrl).catch(() => false);
      if (cancelled) return;
      setOffline(!!dl);
      const playable = await getPlayableAudioUrl(audioUrl).catch(() => audioUrl);
      if (cancelled) { if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl); return; }
      if (playable && playable.startsWith('blob:')) blobUrl = playable;
      setAudioSrc(playable);
    })();
    return () => {
      cancelled = true;
      if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
    };
  }, [open, audioUrl, useStopwatch]);

  // reset ao abrir / trocar de oração
  useEffect(() => {
    if (!open) return;
    setBgUrl(coverUrl || null);
    setShowText(false);
    setFontScale(1);
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
    setStopwatch(0);
    setStopwatchRunning(false);
    setShowEmbed(false);
    setTimerTotal(null);
    setTimerLeft(null);
    setShowTimer(false);
    setCompleted(false);
    setSavingSession(false);
    setCustomMin('');
    sessionStart.current = Date.now();
  }, [open, coverUrl, prayerId]);

  // eventos de áudio nativo
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || useStopwatch) return;
    const onTime = () => setCurrent(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
    };
  }, [useStopwatch, open, audioSrc]);

  // ticker do cronômetro
  useEffect(() => {
    if (!open || !useStopwatch || !stopwatchRunning) return;
    const id = setInterval(() => setStopwatch((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [open, useStopwatch, stopwatchRunning]);

  // ticker do timer de desligamento
  useEffect(() => {
    if (!open || timerLeft === null || timerLeft <= 0) return;
    const id = setInterval(() => setTimerLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(id);
  }, [open, timerLeft]);

  // ao zerar o timer, pausa tudo
  useEffect(() => {
    if (timerLeft === null || timerLeft > 0) return;
    setTimerLeft(null);
    setTimerTotal(null);
    if (useStopwatch) {
      setStopwatchRunning(false);
    } else if (audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
    }
  }, [timerLeft, useStopwatch]);

  // limpa áudio ao fechar
  useEffect(() => {
    if (!open && audioRef.current) audioRef.current.pause();
  }, [open]);

  const togglePlay = useCallback(() => {
    if (completed) return;
    if (useStopwatch) {
      setStopwatchRunning((r) => !r);
      if (isEmbed) setShowEmbed(true);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [useStopwatch, isEmbed, playing, completed]);

  const startTimer = (minutes) => {
    const secs = Math.max(1, Math.round(minutes * 60));
    setTimerTotal(secs);
    setTimerLeft(secs);
    setShowTimer(false);
    setCustomMin('');
  };
  const cancelTimer = () => { setTimerLeft(null); setTimerTotal(null); };

  const handleComplete = async () => {
    if (completed || savingSession) return;
    setSavingSession(true);
    const elapsed = Math.max(1, Math.round((Date.now() - sessionStart.current) / 1000));
    try {
      if (prayerId) {
        await supabaseEntities.PrayerSession.create({
          prayer_id: String(prayerId),
          prayer_title: prayerTitle || title || '',
          source,
          completed_at: new Date().toISOString(),
          duration_seconds: elapsed
        });
      }
    } catch (e) {
      /* ignore — ainda assim confirmamos ao usuário */
    } finally {
      setSavingSession(false);
      setCompleted(true);
      if (useStopwatch) setStopwatchRunning(false);
      else if (audioRef.current) { audioRef.current.pause(); setPlaying(false); }
      onComplete?.({ prayerId, durationSeconds: elapsed });
    }
  };

  const isPlaying = useStopwatch ? stopwatchRunning : playing;
  const progressRatio = useStopwatch
    ? (stopwatch % LOOP_SECONDS) / LOOP_SECONDS
    : duration ? current / duration : 0;
  const displayTime = useStopwatch ? stopwatch : current;

  // geometria do círculo
  const R = 120;
  const STROKE = 8;
  const C = 2 * Math.PI * R;
  const dash = C * Math.min(1, Math.max(0, progressRatio));
  const textFontSize = `${fontScale}rem`;

  const backgrounds = [
    ...(coverUrl ? [{ url: coverUrl, label: 'Capa' }] : []),
    ...gallery.map((g) => ({ url: g.image_url, label: g.label || 'Fundo' }))
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[80] flex flex-col bg-black"
        >
          {/* Fundo */}
          <div className="absolute inset-0">
            {bgUrl ? (
              <img src={bgUrl} alt="" className="h-full w-full object-cover opacity-40" />
            ) : (
              <div className="h-full w-full bg-gradient-to-b from-deep via-deep to-black" />
            )}
            <div className="absolute inset-0 bg-black/55" />
          </div>

          {/* Barra superior */}
          <div className="relative z-10 flex items-center justify-between px-4 py-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80 backdrop-blur transition hover:bg-white/20"
            >
              <X className="h-4 w-4" /> Sair
            </button>
            <div className="flex items-center gap-1.5">
              {/* Timer */}
              <button
                onClick={() => { setShowText(false); setShowTimer((s) => !s); }}
                className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs backdrop-blur transition ${timerTotal ? 'bg-[#2E7DFF] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {timerLeft !== null ? fmtHMS(timerLeft) : 'Timer'}
              </button>
              {(textHtml || prayerText) && (
                <button
                  onClick={() => { setShowText((s) => !s); setShowTimer(false); }}
                  className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-xs backdrop-blur transition ${showText ? 'bg-white/25 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                >
                  <BookOpen className="h-3.5 w-3.5" /> Texto
                </button>
              )}
              <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5 backdrop-blur">
                <button
                  onClick={() => setFontScale((f) => Math.max(0.8, +(f - 0.1).toFixed(1)))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:text-white"
                  aria-label="Diminuir fonte"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <Type className="h-3 w-3 text-white/50" />
                <button
                  onClick={() => setFontScale((f) => Math.min(1.6, +(f + 0.1).toFixed(1)))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/70 hover:text-white"
                  aria-label="Aumentar fonte"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Timer panel */}
          <AnimatePresence>
            {showTimer && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="relative z-10 mx-4 mb-2 rounded-2xl bg-white/10 p-4 backdrop-blur"
              >
                <div className="flex flex-wrap gap-2">
                  {TIMER_PRESETS.map((m) => (
                    <button
                      key={m}
                      onClick={() => startTimer(m)}
                      className="rounded-full bg-white/15 px-4 py-2 text-sm text-white transition hover:bg-[#2E7DFF]"
                    >
                      {m} min
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={customMin}
                    onChange={(e) => setCustomMin(e.target.value)}
                    placeholder="Minutos personalizados"
                    className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 outline-none"
                  />
                  <button
                    onClick={() => customMin && startTimer(parseInt(customMin, 10))}
                    disabled={!customMin}
                    className="shrink-0 rounded-lg bg-[#2E7DFF] px-4 py-2 text-sm text-white disabled:opacity-40"
                  >
                    Definir
                  </button>
                </div>
                {timerTotal !== null && (
                  <button
                    onClick={cancelTimer}
                    className="mt-3 text-xs text-white/60 underline hover:text-white"
                  >
                    Cancelar timer atual
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conteúdo principal */}
          <div className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-4 pb-4">
            {/* Título */}
            <div className="mt-2 text-center">
              {dayLabel && (
                <p className="text-xs uppercase tracking-[0.3em] text-gold">{dayLabel}</p>
              )}
              {title && (
                <h1 className="mt-1.5 font-display text-xl text-white/90 sm:text-2xl">{title}</h1>
              )}
              {offline && (
                <p className="mt-1 text-[10px] uppercase tracking-wider text-[#2E7DFF]">Disponível offline</p>
              )}
            </div>

            {/* Círculo + tempo */}
            <div className="relative my-6 flex items-center justify-center">
              <svg width="280" height="280" viewBox="0 0 280 280" className="drop-shadow-[0_0_25px_rgba(46,125,255,0.25)]">
                <circle cx="140" cy="140" r={R} fill={RING_BG} stroke="#2a2a2a" strokeWidth="1" />
                <circle cx="140" cy="140" r={R} fill="none" stroke="#2a2a2a" strokeWidth={STROKE} />
                <circle
                  cx="140" cy="140" r={R} fill="none"
                  stroke={completed ? '#34d399' : PROGRESS_COLOR}
                  strokeWidth={STROKE} strokeLinecap="round"
                  strokeDasharray={`${dash} ${C - dash}`}
                  transform="rotate(-90 140 140)"
                  style={{ transition: useStopwatch ? 'stroke-dasharray 1s linear' : 'stroke-dasharray 0.25s linear' }}
                />
              </svg>
              {completed ? (
                <div className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 backdrop-blur">
                  <Check className="h-8 w-8 text-emerald-300" />
                </div>
              ) : (
                <button
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur transition hover:bg-white/20"
                  aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
                >
                  {isPlaying ? <Pause className="h-7 w-7 text-white" /> : <Play className="h-7 w-7 translate-x-0.5 text-white" />}
                </button>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono tabular-nums tracking-wider text-white" style={{ fontSize: '1.75rem', marginTop: '3.5rem' }}>
                  {fmtHMS(displayTime)}
                </span>
                {!useStopwatch && duration > 0 && !completed && (
                  <span className="mt-1 font-mono text-xs text-white/40">{fmtHMS(duration)}</span>
                )}
                {completed && (
                  <span className="mt-1 text-xs text-emerald-300/80">Oração concluída</span>
                )}
              </div>
            </div>

            {/* Áudio nativo oculto */}
            {!useStopwatch && audioSrc && (
              <audio ref={audioRef} src={audioSrc} preload="metadata" className="hidden" />
            )}

            {/* Player externo (embed) */}
            {isEmbed && showEmbed && !completed && (
              <div className="mb-4 w-full max-w-md">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-white/50">Player externo</span>
                  <button onClick={() => setShowEmbed(false)} className="text-white/40 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                </div>
                {audioType === 'soundcloud' && (
                  <iframe src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(audioUrl)}&color=%232E7DFF&auto_play=true`} width="100%" height="120" scrolling="no" frameBorder="no" allow="autoplay" title="SoundCloud" />
                )}
                {audioType === 'youtube' && ytId && (
                  <div className="aspect-video w-full overflow-hidden rounded-xl">
                    <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} width="100%" height="100%" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="YouTube" />
                  </div>
                )}
                {audioType === 'spotify' && (
                  <iframe src={audioUrl.replace('open.spotify.com/', 'open.spotify.com/embed/')} width="100%" height="120" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media" title="Spotify" />
                )}
              </div>
            )}

            {/* Texto da oração */}
            <AnimatePresence>
              {showText && (textHtml || prayerText) && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full max-w-2xl">
                  {textHtml && (
                    <div className="rich-text rounded-2xl bg-white/5 p-5 text-white/85 backdrop-blur" style={{ fontSize: textFontSize, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: textHtml }} />
                  )}
                  {prayerText && (
                    <div className="mt-4 rounded-2xl border border-gold/20 bg-gold/5 p-5">
                      <p className="mb-2 text-xs uppercase tracking-[0.25em] text-gold">Oração</p>
                      <p className="whitespace-pre-line font-display italic text-white/90" style={{ fontSize: textFontSize, lineHeight: 1.8 }}>{prayerText}</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Seletor de fundo */}
            {backgrounds.length > 0 && !completed && (
              <div className="mt-6 w-full max-w-md">
                <p className="mb-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/40">Fundo</p>
                <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto pb-1">
                  {backgrounds.map((bg, i) => (
                    <button key={i} onClick={() => setBgUrl(bg.url)} className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${bgUrl === bg.url ? 'border-[#2E7DFF]' : 'border-white/20 hover:border-white/40'}`} title={bg.label}>
                      <img src={bg.url} alt={bg.label} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Barra de ações inferior */}
          <div className="relative z-10 px-4 pb-5 pt-2">
            {completed ? (
              <div className="flex items-center justify-center gap-3">
                {hasQueue && onNext && (
                  <button onClick={onNext} className="flex items-center gap-2 rounded-full bg-[#2E7DFF] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#2563eb]">
                    <SkipForward className="h-4 w-4" /> Próxima oração
                  </button>
                )}
                <button onClick={onClose} className="rounded-full bg-white/10 px-6 py-3 text-sm text-white/80 backdrop-blur transition hover:bg-white/20">
                  Sair
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                {hasQueue && onPrev && (
                  <button onClick={onPrev} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition hover:bg-white/20" aria-label="Anterior">
                    <SkipBack className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={handleComplete}
                  disabled={savingSession}
                  className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-6 py-3 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> {savingSession ? 'Salvando...' : 'Concluída'}
                </button>
                {hasQueue && onNext && (
                  <button onClick={onNext} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/70 backdrop-blur transition hover:bg-white/20" aria-label="Próxima">
                    <SkipForward className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}