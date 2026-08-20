import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Headphones } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import AudioPlayer from '@/components/oracao/AudioPlayer';

const SIZES = ['text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'];

export default function ModoOracao() {
  const { day } = useParams();
  const dayNum = parseInt(day, 10);
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [dayData, setDayData] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(2);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const all = await base44.entities.PreparationDay.filter({ day_number: dayNum });
        setDayData(all[0] || null);
      } catch (e) {
        /* ignore */
      } finally {
        setLoaded(true);
      }
    })();
  }, [user, dayNum]);

  const exit = () => navigate(`/caminho/dia/${dayNum}`);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-deep via-deep to-primary text-primary-foreground">
      {/* Barra mínima */}
      <div className="flex items-center justify-between px-5 py-4">
        <button
          onClick={exit}
          className="flex items-center gap-1.5 text-sm text-primary-foreground/70 transition hover:text-primary-foreground"
        >
          <X className="h-5 w-5" /> Sair
        </button>
        <div className="flex items-center gap-1 rounded-full bg-primary-foreground/10 p-1">
          <button
            onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
            disabled={sizeIdx === 0}
            aria-label="Diminuir texto"
            className="flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground/80 transition hover:bg-primary-foreground/15 disabled:opacity-30"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSizeIdx((i) => Math.min(SIZES.length - 1, i + 1))}
            disabled={sizeIdx === SIZES.length - 1}
            aria-label="Aumentar texto"
            className="flex h-7 w-7 items-center justify-center rounded-full text-primary-foreground/80 transition hover:bg-primary-foreground/15 disabled:opacity-30"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Player de áudio (se houver) */}
      {dayData?.audio_url && (
        <div className="px-6 pb-2">
          <div className="mx-auto max-w-2xl">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-gold">
              <Headphones className="h-3.5 w-3.5" /> Áudio do dia
            </div>
            <AudioPlayer src={dayData.audio_url} />
          </div>
        </div>
      )}

      {/* Conteúdo formativo centralizado */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-16">
        <div className="w-full max-w-2xl text-center">
          <div className="ornament text-gold">✦</div>
          <p className="mt-3 text-xs uppercase tracking-[0.3em] text-gold">Dia {dayNum}</p>
          {dayData?.title && (
            <h1 className="mt-2 font-display text-2xl text-primary-foreground/90">{dayData.title}</h1>
          )}
          <div className="mx-auto my-6 h-px w-16 bg-gold/50" />

          {!loaded ? (
            <p className="font-display italic text-primary-foreground/60">Carregando...</p>
          ) : (
            <div className="space-y-8">
              {/* Texto formativo */}
              {dayData?.text && (
                <div
                  className={`prose-invert max-w-none text-left leading-relaxed text-primary-foreground/90 ${SIZES[sizeIdx]}`}
                  dangerouslySetInnerHTML={{ __html: dayData.text }}
                />
              )}

              {/* Oração */}
              {dayData?.prayer && (
                <div>
                  <div className="mx-auto mb-4 h-px w-12 bg-gold/40" />
                  <p className="text-xs uppercase tracking-[0.25em] text-gold">Oração</p>
                  <p className={`mt-3 whitespace-pre-line font-display italic leading-loose text-primary-foreground/95 ${SIZES[sizeIdx]}`}>
                    {dayData.prayer}
                  </p>
                </div>
              )}

              {!dayData?.text && !dayData?.prayer && (
                <p className="font-display italic text-primary-foreground/60">Não há conteúdo formativo cadastrado para este dia.</p>
              )}
            </div>
          )}

          <div className="mt-10 ornament text-gold/60">✦</div>
        </div>
      </div>
    </div>
  );
}