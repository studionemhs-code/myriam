import React, { useEffect, useState } from 'react';
import { StickyNote, Trash2, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COLORS = {
  gold: 'border-gold/40 bg-gold/5',
  blue: 'border-blue-400/40 bg-blue-50 dark:bg-blue-950/30',
  green: 'border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/30',
  pink: 'border-pink-400/40 bg-pink-50 dark:bg-pink-950/30'
};

export default function ContentNotes({ contentId, pageNumber, user }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [color, setColor] = useState('gold');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadNotes = async () => {
    if (!user || !contentId) return;
    try {
      const list = await base44.entities.ContentNote.filter({ content_id: contentId }, '-created_date');
      setNotes(list);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { loadNotes(); }, [contentId, user]);

  const addNote = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.ContentNote.create({
        content_id: contentId,
        page_number: pageNumber || null,
        text: text.trim(),
        color
      });
      setNotes([created, ...notes]);
      setText('');
    } catch (e) { /* ignore */ }
    setSaving(false);
  };

  const deleteNote = async (id) => {
    try {
      await base44.entities.ContentNote.delete(id);
      setNotes(notes.filter((n) => n.id !== id));
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-gold" />
          <h3 className="font-display text-sm">Minhas anotações</h3>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">Privadas · só você vê</p>
      </div>

      {/* Composer */}
      <div className="border-b border-border p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Anotação ${pageNumber ? `sobre a pág. ${pageNumber}` : ''}...`}
          rows={3}
          className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Object.keys(COLORS).map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border-2 transition ${color === c ? 'ring-2 ring-offset-1 ring-primary' : ''} ${COLORS[c].split(' ')[0]}`}
                aria-label={c}
              />
            ))}
          </div>
          <button
            onClick={addNote}
            disabled={!text.trim() || saving}
            className="inline-flex items-center gap-1 rounded-lg bg-gold px-3 py-1.5 text-xs font-medium text-deep disabled:opacity-40"
          >
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Salvar
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : notes.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma anotação ainda. Use as notas para fixar o aprendizado.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className={`rounded-lg border p-2.5 text-sm ${COLORS[n.color] || COLORS.gold}`}>
              {n.page_number && (
                <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pág. {n.page_number}</span>
              )}
              <p className="whitespace-pre-wrap break-words">{n.text}</p>
              <button
                onClick={() => deleteNote(n.id)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" /> Excluir
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}