import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, BookOpen, FileText, Headphones, Play, Clock, ChevronRight, Flag } from 'lucide-react';
import ReportDialog from '@/components/myriam/ReportDialog';
import { base44 } from '@/api/base44Client';
import { Ornament, GoldDivider } from '@/components/ui/marian';
import ReactMarkdown from 'react-markdown';

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

export default function ACAMFDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState(null);
  const [related, setRelated] = useState([]);
  const [category, setCategory] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await base44.entities.ACAMFContent.get(id);
        setContent(c);
        if (c.category_id) {
          const cats = await base44.entities.ACAMFCategory.filter({ id: c.category_id });
          setCategory(cats[0]);
        }
        if (c.related_content_ids?.length) {
          const all = await base44.entities.ACAMFContent.list();
          setRelated(all.filter((x) => c.related_content_ids.includes(x.id) && x.id !== id).slice(0, 3));
        }
      } catch (e) { /* ignore */ }
    })();
  }, [id]);

  if (!content) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/acamf')} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ChevronLeft className="h-4 w-4" /> ACAMF
      </button>

      {content.cover_url && (
        <img src={content.cover_url} alt="" className="h-52 w-full rounded-2xl object-cover" />
      )}

      <header>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {category && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">{category.name}</span>}
          {content.level && <span className="text-muted-foreground">{LEVEL_LABEL[content.level]}</span>}
          {content.duration && <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {content.duration}</span>}
        </div>
        <h1 className="mt-2 font-display text-3xl">{content.title}</h1>
        {content.subtitle && <p className="font-display text-lg italic text-muted-foreground">{content.subtitle}</p>}
        {content.author && <p className="mt-1 text-sm text-muted-foreground">por {content.author}</p>}
        <button onClick={() => setReportOpen(true)} className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"><Flag className="h-3 w-3" /> Denunciar conteúdo</button>
      </header>

      {content.description && <p className="text-sm leading-relaxed text-muted-foreground">{content.description}</p>}

      {/* Mídia */}
      {content.content_type === 'video' && (
        content.youtube_id ? (
          <div className="aspect-video overflow-hidden rounded-2xl">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${content.youtube_id}`}
              title={content.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : content.file_url ? (
          <video controls src={content.file_url} className="w-full rounded-2xl" />
        ) : null
      )}

      {content.content_type === 'audio' && content.file_url && (
        <audio controls src={content.file_url} className="w-full" />
      )}

      {(content.content_type === 'pdf' || content.content_type === 'ebook') && content.file_url && (
        <a href={content.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 hover:border-gold/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/15"><FileText className="h-5 w-5 text-gold" /></div>
          <span className="text-sm font-medium">Abrir {content.content_type === 'pdf' ? 'PDF' : 'E-book'}</span>
        </a>
      )}

      {content.content_type === 'imagem' && content.file_url && (
        <img src={content.file_url} alt="" className="w-full rounded-2xl" />
      )}

      {content.content && (
        <article className="prose prose-sm max-w-none">
          <ReactMarkdown>{content.content}</ReactMarkdown>
        </article>
      )}

      {/* Tags */}
      {content.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {content.tags.map((t, i) => (
            <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">#{t}</span>
          ))}
        </div>
      )}

      {/* Relacionados */}
      {related.length > 0 && (
        <div>
          <GoldDivider />
          <p className="mb-2 font-display text-lg">Conteúdos relacionados</p>
          <div className="space-y-2">
            {related.map((r) => (
              <Link key={r.id} to={`/acamf/${r.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-gold/40">
                {r.cover_url ? <img src={r.cover_url} className="h-10 w-10 rounded-lg object-cover" /> : <BookOpen className="h-5 w-5 text-muted-foreground" />}
                <p className="flex-1 text-sm">{r.title}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <GoldDivider />
      <Ornament className="text-gold" />

      <ReportDialog open={reportOpen} onClose={() => setReportOpen(false)} targetType="conteudo" targetId={content.id} />
    </div>
  );
}