import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Heart, BookOpen, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const PRAYER_CATEGORY_LABELS = {
  saude: 'Saúde',
  familia: 'Família',
  trabalho: 'Trabalho',
  conversao: 'Conversão',
  gratidao: 'Gratidão',
  outros: 'Outros'
};

export default function AdminGlobalSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], intentions: [], contents: [] });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ users: [], intentions: [], contents: [] });
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      const term = q.toLowerCase();
      try {
        const [users, intentions, contents, categories] = await Promise.all([
          base44.entities.User.list('-created_date', 100),
          base44.entities.PrayerIntention.list('-created_date', 50),
          base44.entities.ACAMFContent.list('-created_date', 100),
          base44.entities.ACAMFCategory.list('-created_date', 50)
        ]);

        const catNameById = {};
        (categories || []).forEach((c) => { catNameById[c.id] = c.name; });

        setResults({
          users: (users || []).filter((u) =>
            (u.full_name || '').toLowerCase().includes(term) ||
            (u.email || '').toLowerCase().includes(term) ||
            (u.display_name || '').toLowerCase().includes(term)
          ).slice(0, 5),
          intentions: (intentions || []).filter((i) =>
            (i.text || '').toLowerCase().includes(term) ||
            (i.category || '').toLowerCase().includes(term) ||
            (PRAYER_CATEGORY_LABELS[i.category] || '').toLowerCase().includes(term)
          ).slice(0, 5),
          contents: (contents || []).filter((c) => {
            const catName = catNameById[c.category_id] || c.category_id || '';
            return (c.title || '').toLowerCase().includes(term) ||
              catName.toLowerCase().includes(term);
          }).slice(0, 5)
        });
      } catch {
        // ignore — results stay empty
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasResults = results.users.length > 0 || results.intentions.length > 0 || results.contents.length > 0;

  const go = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Buscar usuários, intenções, ACAMF..."
          className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm outline-none focus:border-primary"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
          {loading && <div className="px-4 py-3 text-sm text-muted-foreground">Buscando...</div>}
          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum resultado encontrado.</div>
          )}
          {!loading && hasResults && (
            <div className="py-2">
              {results.users.length > 0 && (
                <div className="mb-2">
                  <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Usuários</p>
                  {results.users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => go('/admin/usuarios')}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.display_name || u.full_name || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.intentions.length > 0 && (
                <div className="mb-2">
                  <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Intenções de Oração</p>
                  {results.intentions.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => go('/intencoes')}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      <Heart className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{i.text}</p>
                        <p className="text-xs text-muted-foreground">{PRAYER_CATEGORY_LABELS[i.category] || i.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {results.contents.length > 0 && (
                <div>
                  <p className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">Conteúdos ACAMF</p>
                  {results.contents.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => go('/admin/acamf')}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-muted"
                    >
                      <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{c.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.category_id || 'Sem categoria'}</p>
                      </div>
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