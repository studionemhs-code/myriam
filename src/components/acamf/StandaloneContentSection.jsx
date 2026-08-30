import React from 'react';
import { Link } from 'react-router-dom';
import { Play, Lock, FileText, Music, Video, Image as ImageIcon, BookOpen, Headphones } from 'lucide-react';

const LEVEL_LABEL = { iniciante: 'Iniciante', intermediario: 'Intermediário', aprofundamento: 'Aprofundamento' };

const TYPE_ICON = {
  pdf: FileText,
  ebook: BookOpen,
  audio: Headphones,
  video: Video,
  imagem: ImageIcon,
  texto: FileText,
};

const TYPE_LABEL = {
  pdf: 'PDF',
  ebook: 'E-book',
  audio: 'Áudio',
  video: 'Vídeo',
  imagem: 'Imagem',
  texto: 'Texto',
};

export function StandaloneContentSection({ title, accent, items, userAccess, onLockedClick }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-7 w-1 rounded-full" style={{ backgroundColor: accent }} />
        <h2 className="font-display text-xl text-foreground lg:text-2xl">{title}</h2>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-4 lg:-mx-8 lg:px-8">
        {items.map((item) => (
          <StandaloneContentCard
            key={item.id}
            item={item}
            locked={!userAccess.includes(item.level || 'iniciante')}
            onLockedClick={() => onLockedClick(item)}
          />
        ))}
      </div>
    </div>
  );
}

function StandaloneContentCard({ item, locked, onLockedClick }) {
  const Icon = TYPE_ICON[item.content_type] || FileText;
  const typeLabel = TYPE_LABEL[item.content_type] || 'Arquivo';

  const cardInner = (
    <div className={`relative flex h-44 w-36 shrink-0 flex-col overflow-hidden rounded-xl bg-muted shadow-md transition duration-300 group-hover:scale-[1.05] group-hover:shadow-xl sm:w-40 ${locked ? 'grayscale' : ''}`}>
      {(item.cover_url || item.image_url) ? (
        <div className="relative h-20 w-full overflow-hidden">
          <img src={item.cover_url || item.image_url} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 backdrop-blur-sm">
            <Icon className="h-3 w-3 text-white" />
            <span className="text-[9px] font-medium uppercase tracking-wider text-white">{typeLabel}</span>
          </div>
        </div>
      ) : (
        <div className="relative flex h-20 w-full items-center justify-center bg-gradient-to-br from-primary/20 to-deep">
          <Icon className="h-8 w-8 text-primary/60" />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 backdrop-blur-sm">
            <Icon className="h-3 w-3 text-white" />
            <span className="text-[9px] font-medium uppercase tracking-wider text-white">{typeLabel}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col p-2.5">
        <p className="font-display text-xs font-semibold leading-tight text-foreground line-clamp-2">{item.title}</p>
        {item.author && <p className="mt-1 text-[10px] text-muted-foreground line-clamp-1">{item.author}</p>}
        <div className="mt-auto flex items-center gap-1.5 pt-1">
          {item.level && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-primary">
              {LEVEL_LABEL[item.level]}
            </span>
          )}
        </div>
      </div>

      {locked ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
            <Lock className="h-4 w-4 text-white" />
          </div>
        </div>
      ) : (
        <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/25 opacity-0 backdrop-blur-md transition duration-300 group-hover:opacity-100">
          <Play className="h-3.5 w-3.5 fill-white text-white" />
        </div>
      )}
    </div>
  );

  if (locked) {
    return (
      <button onClick={onLockedClick} className="group relative block text-left">
        {cardInner}
      </button>
    );
  }
  return (
    <Link to={`/acamf/${item.id}`} className="group relative block">
      {cardInner}
    </Link>
  );
}