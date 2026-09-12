import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, AlignLeft, Timer, Sun, Moon, Palette, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useReadingPrefs } from '@/hooks/useReadingPrefs';

const THEMES = {
  sepia: { bg: '#f4ecd8', text: '#5b4636', accent: '#8a6d3b', muted: '#9c8b6f' },
  dark: { bg: '#1a1a1a', text: '#d4d4d4', accent: '#c9a961', muted: '#888' },
  light: { bg: '#ffffff', text: '#2a2a2a', accent: '#663399', muted: '#999' },
};

const THEME_ICONS = { sepia: Palette, dark: Moon, light: Sun };

export default function ReadingMode({ open, title, contentHtml, contentMarkdown, prayerText, onClose }) {
  const { prefs, update, reset } = useReadingPrefs();
  const [restMsg, setRestMsg] = useState(false);
  const scrollRef = useRef(null);
  const timerRef = useRef(null);

  // Timer de descanso para os olhos
  useEffect(() => {
    if (!open || !prefs.timerEnabled) return;
    setRestMsg(false);
    timerRef.current = setInterval(() => {
      setRestMsg(true);
    }, prefs.timerMinutes * 60 * 1000);
    return () => clearInterval(timerRef.current);
  }, [open, prefs.timerEnabled, prefs.timerMinutes]);

  // Reset scroll ao abrir
  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [open]);

  const theme = THEMES[prefs.theme] || THEMES.sepia;
  const fontSize = `${1.0625 * prefs.fontScale}rem`;
  const lineHeightStr = String(prefs.lineHeight);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[70] flex flex-col"
          style={{ background: theme.bg, color: theme.text }}
        >
          {/* Toolbar minimalista */}
          <div
            className="flex items-center gap-1 px-3 py-2.5 sm:px-4"
            style={{ borderBottom: `1px solid ${theme.accent}22` }}
          >
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition hover:opacity-70"
              style={{ color: theme.text }}
            >
              <X className="h-4 w-4" /> Sair
            </button>

            <div className="ml-auto flex items-center gap-1">
              {/* Tema */}
              <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: `${theme.accent}15` }}>
                {Object.entries(THEMES).map(([key, t]) => {
                  const Icon = THEME_ICONS[key];
                  return (
                    <button
                      key={key}
                      onClick={() => update({ theme: key })}
                      className="flex h-7 w-7 items-center justify-center rounded-full transition"
                      style={prefs.theme === key ? { background: theme.accent, color: theme.bg } : { color: theme.muted }}
                      aria-label={`Tema ${key}`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>

              {/* Fonte */}
              <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: `${theme.accent}15` }}>
                <button
                  onClick={() => update({ fontScale: Math.max(0.8, +(prefs.fontScale - 0.1).toFixed(1)) })}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-sm transition hover:opacity-70"
                  style={{ color: theme.text }}
                  aria-label="Diminuir fonte"
                >
                  <Type className="h-3.5 w-3.5" />
                </button>
                <span className="px-0.5 text-xs tabular-nums" style={{ color: theme.muted }}>
                  {prefs.fontScale.toFixed(1)}
                </span>
                <button
                  onClick={() => update({ fontScale: Math.min(1.8, +(prefs.fontScale + 0.1).toFixed(1)) })}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:opacity-70"
                  style={{ color: theme.text }}
                  aria-label="Aumentar fonte"
                >
                  <Type className="h-4 w-4" />
                </button>
              </div>

              {/* Espaçamento */}
              <div className="flex items-center gap-0.5 rounded-full p-0.5" style={{ background: `${theme.accent}15` }}>
                {[1.5, 1.8, 2.1].map((lh) => (
                  <button
                    key={lh}
                    onClick={() => update({ lineHeight: lh })}
                    className="flex h-7 w-7 items-center justify-center rounded-full transition"
                    style={Math.abs(prefs.lineHeight - lh) < 0.05 ? { background: theme.accent, color: theme.bg } : { color: theme.muted }}
                    aria-label={`Espaçamento ${lh}`}
                  >
                    <AlignLeft className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              {/* Timer */}
              <button
                onClick={() => update({ timerEnabled: !prefs.timerEnabled })}
                className="flex h-7 items-center gap-1 rounded-full px-2.5 text-xs transition"
                style={prefs.timerEnabled ? { background: theme.accent, color: theme.bg } : { background: `${theme.accent}15`, color: theme.muted }}
                aria-label="Timer de descanso"
              >
                <Timer className="h-3.5 w-3.5" />
                {prefs.timerEnabled ? `${prefs.timerMinutes}min` : 'Off'}
              </button>
            </div>
          </div>

          {/* Timer sub-bar (quando ativo) */}
          {prefs.timerEnabled && (
            <div className="flex items-center gap-2 px-4 py-1.5 text-xs" style={{ background: `${theme.accent}10`, color: theme.muted }}>
              <Timer className="h-3 w-3" />
              <span>Lembrete de descanso a cada {prefs.timerMinutes} min</span>
              <div className="ml-auto flex items-center gap-1">
                {[5, 10, 15, 20].map((m) => (
                  <button
                    key={m}
                    onClick={() => update({ timerMinutes: m })}
                    className="rounded-full px-2 py-0.5 text-[10px] transition"
                    style={prefs.timerMinutes === m ? { background: theme.accent, color: theme.bg } : {}}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conteúdo */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto max-w-2xl px-6 py-8 sm:px-8 sm:py-12">
              {title && (
                <h1 className="mb-6 font-display text-2xl sm:text-3xl" style={{ color: theme.text }}>
                  {title}
                </h1>
              )}

              <div
                className="rich-text"
                style={{
                  fontSize,
                  lineHeight: lineHeightStr,
                  color: theme.text,
                }}
              >
                {contentMarkdown ? (
                  <ReactMarkdown>{contentMarkdown}</ReactMarkdown>
                ) : contentHtml ? (
                  <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
                ) : null}
              </div>

              {prayerText && (
                <div className="mt-8" style={{ borderTop: `1px solid ${theme.accent}30`, paddingTop: '1.5rem' }}>
                  <p className="mb-3 text-xs uppercase tracking-[0.25em]" style={{ color: theme.accent }}>
                    Oração
                  </p>
                  <p
                    className="whitespace-pre-line font-display italic"
                    style={{ fontSize, lineHeight: lineHeightStr, color: theme.text }}
                  >
                    {prayerText}
                  </p>
                </div>
              )}

              <div className="mt-12 text-center text-xs" style={{ color: theme.muted }}>
                <span className="ornament" style={{ color: theme.accent }}>✦</span>
              </div>
            </div>
          </div>

          {/* Notificação de descanso */}
          <AnimatePresence>
            {restMsg && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2"
              >
                <div
                  className="flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl"
                  style={{ background: theme.accent, color: theme.bg }}
                >
                  <Timer className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">Hora de descansar os olhos</p>
                    <p className="text-xs opacity-80">Olhe para longe por alguns segundos 🌿</p>
                  </div>
                  <button
                    onClick={() => setRestMsg(false)}
                    className="ml-2 rounded-full p-1.5 transition hover:opacity-70"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}