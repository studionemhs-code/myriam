import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Check, Lock, BookOpen, FileText, Music, Video, Image as ImageIcon } from 'lucide-react';

const typeIcons = { texto: FileText, pdf: FileText, audio: Music, video: Video, imagem: ImageIcon };

function StepContent({ content }) {
  if (!content?.data) return null;
  const { type, data } = content;

  if (type === 'acamf') {
    return (
      <Link to={`/acamf/${data.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 hover:border-gold/40">
        {data.cover_url ? <img src={data.cover_url} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
        <div className="flex-1">
          <p className="text-sm font-medium">{data.title}</p>
          <p className="text-xs text-muted-foreground">Conteúdo ACAMF · Toque para abrir</p>
        </div>
        <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
      </Link>
    );
  }

  const ct = data.content_type || 'texto';
  const Icon = typeIcons[ct] || FileText;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      {data.cover_url && <img src={data.cover_url} alt="" className="mb-3 h-32 w-full rounded-lg object-cover" />}
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {type === 'inline' ? 'Conteúdo da etapa' : 'Biblioteca de jornada'}
        </p>
      </div>
      {data.content && <div className="rich-text text-sm" dangerouslySetInnerHTML={{ __html: data.content }} />}
      {ct === 'audio' && data.audio_url && <audio controls src={data.audio_url} className="mt-3 w-full" />}
      {ct === 'video' && data.youtube_id && (
        <div className="mt-3 aspect-video w-full overflow-hidden rounded-lg">
          <iframe src={`https://youtube.com/embed/${data.youtube_id}`} className="h-full w-full" allowFullScreen title={data.title} />
        </div>
      )}
      {(ct === 'pdf' || ct === 'imagem') && data.file_url && (
        <a href={data.file_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-gold/40">
          <FileText className="h-4 w-4 text-gold" /> Abrir {ct === 'pdf' ? 'PDF' : 'imagem'}
        </a>
      )}
    </div>
  );
}

export default function JourneyStepCard({ step, index, done, locked, busy, isOpen, content, onToggleOpen, onComplete, onUndo }) {
  return (
    <div className={`overflow-hidden rounded-xl border transition ${
      done ? 'border-gold/40 bg-gold/5' : locked ? 'border-border/50 bg-muted/20' : 'border-border bg-card'
    }`}>
      <button
        onClick={() => !locked && onToggleOpen()}
        disabled={locked}
        className="flex w-full gap-3 p-4 text-left"
      >
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
          done ? 'bg-gold text-deep' : locked ? 'border border-border text-muted-foreground/40' : 'border-2 border-gold/50 text-gold'
        }`}>
          {done ? <Check className="h-5 w-5" /> : locked ? <Lock className="h-4 w-4" /> : index + 1}
        </span>
        <span className="flex-1 pt-0.5">
          <span className={`block font-medium ${done ? 'text-gold' : locked ? 'text-muted-foreground' : ''}`}>{step.title}</span>
          {step.description && <span className="mt-0.5 block text-sm text-muted-foreground">{step.description}</span>}
          {locked && <span className="mt-1 block text-xs text-muted-foreground">Conclua a etapa anterior para desbloquear</span>}
          {!locked && !done && !isOpen && <span className="mt-1 block text-xs text-gold">Toque para abrir a etapa</span>}
        </span>
        {!locked && <ChevronLeft className={`mt-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? '-rotate-90' : ''}`} />}
      </button>

      {isOpen && !locked && (
        <div className="space-y-4 px-4 pb-4">
          <StepContent content={content} />

          {done ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gold">
                <Check className="h-4 w-4" /> Etapa concluída
              </span>
              <button onClick={onUndo} disabled={busy} className="text-xs text-muted-foreground underline disabled:opacity-50">
                Desmarcar
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-center">
              <p className="text-xs text-muted-foreground">Já leu, assistiu ou escutou todo o conteúdo desta etapa?</p>
              <button
                onClick={onComplete}
                disabled={busy}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-3 text-sm font-medium text-deep disabled:opacity-50"
              >
                {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Check className="h-4 w-4" />}
                {busy ? 'Salvando...' : 'Concluir etapa'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}