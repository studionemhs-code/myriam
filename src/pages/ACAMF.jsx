import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, FileText, Video, Headphones, Image as ImageIcon, File, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { PageHeader } from '@/components/ui/marian';

const TYPE_ICON = {
  texto: FileText, pdf: FileText, ebook: BookOpen, audio: Headphones, video: Video, imagem: ImageIcon
};
const TYPE_LABEL = {
  texto: 'Artigo', pdf: 'PDF', ebook: 'E-book', audio: 'Áudio', video: 'Vídeo', imagem: 'Imagem'
};
const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

export default function ACAMF() {
  const [contents, setContents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat, setActiveCat] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, cats] = await Promise.all([
          base44.entities.ACAMFContent.filter({ status: 'publicado' }, '-published_date', 50),
          base44.entities.ACAMFCategory.list('sort_order', 50)
        ]);
        setContents(c);
        setCategories(cats);
      } catch (e) { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const filtered = activeCat === 'all' ? contents : contents.filter((c) => c.category_id === activeCat);

  return (
    <div>
      <PageHeader title="ACAMF" subtitle="Academia Mariana de Formação" icon={BookOpen} />

      {/* Categorias */}
      <div className="no-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        <button onClick={() => setActiveCat('all')} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${activeCat === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
          Todos
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${activeCat === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" /></div>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 font-display text-lg">Conteúdos em breve</p>
          <p className="text-sm text-muted-foreground">A ACAMF está sendo alimentada pelo administrador.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((c) => {
          const Icon = TYPE_ICON[c.content_type] || FileText;
          const cat = categories.find((x) => x.id === c.category_id);
          return (
            <Link key={c.id} to={`/acamf/${c.id}`} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:border-gold/40 hover:shadow-md">
              {c.cover_url ? (
                <div className="h-32 overflow-hidden">
                  <img src={c.cover_url} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary/10 to-gold/10">
                  <Icon className="h-10 w-10 text-primary/40" />
                </div>
              )}
              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">
                    <Icon className="h-3 w-3" /> {TYPE_LABEL[c.content_type]}
                  </span>
                  {c.level && <span className="text-[10px] uppercase text-gold">{LEVEL_LABEL[c.level]}</span>}
                </div>
                <p className="mt-2 font-display text-lg leading-tight">{c.title}</p>
                {c.subtitle && <p className="text-sm text-muted-foreground">{c.subtitle}</p>}
                <div className="mt-auto flex items-center justify-between pt-3">
                  <span className="text-xs text-muted-foreground">{cat?.name || c.author || ''}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}