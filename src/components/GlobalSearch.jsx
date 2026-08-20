import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, User, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ content: [], users: [] });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ content: [], users: [] });
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [allContent, usersRes] = await Promise.all([
          base44.entities.ACAMFContent.list('-updated_date', 100),
          base44.functions.invoke('searchUsers', { query })
        ]);
        const q = query.toLowerCase();
        const content = (allContent || [])
          .filter((c) => c.status === 'publicado')
          .filter((c) =>
            (c.title || '').toLowerCase().includes(q) ||
            (c.description || '').toLowerCase().includes(q) ||
            (c.tags || []).some((t) => t.toLowerCase().includes(q))
          )
          .slice(0, 5);
        const users = ((usersRes.data && usersRes.data.users) || []).slice(0, 5);
        setResults({ content, users });
      } catch (e) {
        setResults({ content: [], users: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path) => {
    setOpen(false);
    setQuery('');
    setResults({ content: [], users: [] });
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar conteúdos ou membros..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(''); setResults({ content: [], users: [] }); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
          ) : results.content.length === 0 && results.users.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
          ) : (
            <div className="py-2">
              {results.content.length > 0 && (
                <div>
                  <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conteúdos ACAMF</p>
                  {results.content.map((c) => (
                    <button key={c.id} onClick={() => go(`/acamf/${c.id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent">
                      <BookOpen className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.title}</p>
                        {c.subtitle && <p className="truncate text-xs text-muted-foreground">{c.subtitle}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.users.length > 0 && (
                <div className={results.content.length > 0 ? 'mt-2 border-t border-border' : ''}>
                  <p className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Membros</p>
                  {results.users.map((u) => (
                    <button key={u.id} onClick={() => go(`/perfil/${u.id}`)} className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-accent">
                      {u.photo_url ? (
                        <img src={u.photo_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10"><User className="h-4 w-4 text-primary" /></div>
                      )}
                      <p className="flex-1 truncate text-sm font-medium">{u.full_name}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}