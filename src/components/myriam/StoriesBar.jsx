import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import StoryComposer from './StoryComposer';
import StoryViewer from './StoryViewer';

export default function StoriesBar() {
  const { user } = useCurrentUser();
  const [stories, setStories] = useState([]);
  const [composing, setComposing] = useState(false);
  const [viewing, setViewing] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.MyriamStory.list('-created_date', 50);
      setStories(list);
    } catch (e) { /* ignore */ }
  };
  useEffect(() => { load(); }, []);

  const byAuthor = {};
  stories.forEach((s) => {
    if (!byAuthor[s.created_by_id]) byAuthor[s.created_by_id] = { author_name: s.author_name, author_photo: s.author_photo, items: [] };
    byAuthor[s.created_by_id].items.push(s);
  });
  const groups = Object.values(byAuthor);

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-5 flex gap-3 overflow-x-auto px-4 pb-1">
        <button onClick={() => setComposing(true)} className="flex shrink-0 flex-col items-center gap-1">
          <div className="relative h-16 w-16">
            <div className="flex h-full w-full items-center justify-center rounded-full border-2 border-dashed border-gold/50 bg-muted">
              <Plus className="h-6 w-6 text-gold" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">Seu story</span>
        </button>
        {groups.map((g, i) => (
          <button key={i} onClick={() => setViewing(g)} className="flex shrink-0 flex-col items-center gap-1">
            <div className="rounded-full bg-gradient-to-br from-gold to-marian p-0.5">
              <div className="overflow-hidden rounded-full border-2 border-card">
                {g.author_photo ? (
                  <img src={g.author_photo} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marian text-sm text-white">{(g.author_name || 'A')[0]}</div>
                )}
              </div>
            </div>
            <span className="max-w-16 truncate text-[10px] text-muted-foreground">{(g.author_name || 'Alma').split(' ')[0]}</span>
          </button>
        ))}
      </div>
      {composing && <StoryComposer user={user} onClose={() => setComposing(false)} onPosted={load} />}
      {viewing && <StoryViewer group={viewing} currentUser={user} onClose={() => setViewing(null)} />}
    </>
  );
}