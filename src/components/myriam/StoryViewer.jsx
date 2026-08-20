import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const BACKGROUNDS = { marian: 'bg-marian', gold: 'bg-gold', deep: 'bg-deep' };

export default function StoryViewer({ group, currentUser, onClose }) {
  const [idx, setIdx] = useState(0);
  const story = group.items[idx];

  useEffect(() => {
    if (story && currentUser && !story.viewers?.includes(currentUser.id)) {
      base44.entities.MyriamStory.update(story.id, { viewers: [...(story.viewers || []), currentUser.id] });
    }
  }, [story, currentUser]);

  const next = () => (idx < group.items.length - 1 ? setIdx(idx + 1) : onClose());
  const prev = () => idx > 0 && setIdx(idx - 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      <button onClick={onClose} className="absolute right-4 top-4 z-20 text-white/70 hover:text-white"><X className="h-6 w-6" /></button>
      {idx > 0 && <button onClick={prev} className="absolute left-2 z-20 text-white/70 hover:text-white"><ChevronLeft className="h-8 w-8" /></button>}
      {idx < group.items.length - 1 && <button onClick={next} className="absolute right-2 z-20 text-white/70 hover:text-white"><ChevronRight className="h-8 w-8" /></button>}

      <div className="relative h-full w-full max-w-lg" onClick={next}>
        <div className="absolute left-4 right-4 top-4 z-10 flex gap-1">
          {group.items.map((_, i) => (
            <div key={i} className="h-0.5 flex-1 rounded-full bg-white/20">
              <div className={`h-full rounded-full bg-white transition-all ${i <= idx ? 'w-full' : 'w-0'}`} />
            </div>
          ))}
        </div>
        <div className="absolute left-4 top-8 z-10 flex items-center gap-2">
          {group.author_photo ? <img src={group.author_photo} className="h-8 w-8 rounded-full" /> : <div className="flex h-8 w-8 items-center justify-center rounded-full bg-marian text-xs text-white">{(group.author_name || 'A')[0]}</div>}
          <span className="text-sm text-white/90">{group.author_name}</span>
        </div>

        {story?.media_type === 'text' ? (
          <div className={`flex h-full items-center justify-center p-8 ${BACKGROUNDS[story.background_color] || 'bg-marian'}`}>
            <p className="text-center font-display text-2xl text-white">{story.text}</p>
          </div>
        ) : story?.media_type === 'video' ? (
          <video src={story.media_url} className="h-full w-full object-contain" autoPlay controls onClick={(e) => e.stopPropagation()} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <img src={story?.media_url} alt="" className="max-h-full max-w-full object-contain" />
            {story?.text && <p className="absolute bottom-20 left-0 right-0 p-4 text-center text-white">{story.text}</p>}
          </div>
        )}
      </div>
    </div>
  );
}