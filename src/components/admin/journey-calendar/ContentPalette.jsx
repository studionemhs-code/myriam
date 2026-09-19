import React, { useState } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Search, BookOpen, Hand, FileText, Music, Video, Image as ImageIcon, Loader2 } from 'lucide-react';

const typeIcons = { texto: FileText, pdf: FileText, audio: Music, video: Video, imagem: ImageIcon };
const typeLabels = { texto: 'Texto', pdf: 'PDF', audio: 'Áudio', video: 'Vídeo', imagem: 'Imagem' };

export default function ContentPalette({ contents, prayers, journeyLib, loading }) {
  const [tab, setTab] = useState('acamf');
  const [search, setSearch] = useState('');

  const tabs = [
    { id: 'acamf', label: 'ACAMF', icon: BookOpen, items: contents, type: 'acamf', getSub: (c) => c.content_type },
    { id: 'prayer', label: 'Orações', icon: Hand, items: prayers, type: 'prayer', getSub: () => 'texto' },
    { id: 'library', label: 'Biblioteca', icon: FileText, items: journeyLib, type: 'library', getSub: (c) => c.content_type }
  ];

  const activeTab = tabs.find((t) => t.id === tab);
  const filtered = (activeTab.items || []).filter((c) =>
    !search || (c.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full shrink-0 lg:w-72">
      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-1">
          <h4 className="font-display text-sm">Biblioteca de conteúdos</h4>
          <p className="text-[10px] text-muted-foreground">Arraste para uma data do calendário</p>
        </div>

        {/* Tabs */}
        <div className="mb-2 flex gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  tab === t.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                <Icon className="h-3 w-3" /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-input bg-background py-1.5 pl-7 pr-2 text-xs outline-none focus:border-primary"
          />
        </div>

        {/* Items */}
        <Droppable droppableId="palette" isDropDisabled>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="max-h-64 space-y-1 overflow-y-auto"
            >
              {loading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : filtered.length === 0 ? (
                <p className="py-6 text-center text-xs text-muted-foreground">Nenhum item encontrado</p>
              ) : (
                filtered.map((item, i) => {
                  const sub = activeTab.getSub(item);
                  const Icon = typeIcons[sub] || FileText;
                  return (
                    <Draggable key={`${activeTab.type}|${item.id}`} draggableId={`palette|${activeTab.type}|${item.id}`} index={i}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`flex cursor-grab items-center gap-2 rounded-lg border border-border bg-background p-2 transition ${
                            snap.isDragging ? 'shadow-lg ring-2 ring-primary/40' : 'hover:border-primary/30'
                          }`}
                        >
                          {item.cover_url ? (
                            <img src={item.cover_url} alt="" className="h-7 w-7 shrink-0 rounded object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted">
                              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{item.title}</p>
                            <span className="text-[10px] text-muted-foreground">{typeLabels[sub] || sub}</span>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}