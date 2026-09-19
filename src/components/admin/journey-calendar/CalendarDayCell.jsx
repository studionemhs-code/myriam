import React from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, BookOpen, Hand, FileText, Music, Video, Image as ImageIcon } from 'lucide-react';

const typeIcons = {
  acamf: BookOpen,
  prayer: Hand,
  journey_library: FileText,
  inline: FileText,
  texto: FileText,
  pdf: FileText,
  audio: Music,
  video: Video,
  imagem: ImageIcon
};

const getStepIcon = (s) => {
  if (s.content_source === 'acamf') return BookOpen;
  if (s.content_source === 'prayer') return Hand;
  if (s.content_source === 'journey_library') return FileText;
  if (s.content_source === 'inline') return typeIcons[s.content_data?.content_type] || FileText;
  return FileText;
};

export default function CalendarDayCell({ date, dateStrValue, inMonth, inRange, isToday, steps, onStepClick, onDayClick }) {
  return (
    <Droppable droppableId={dateStrValue}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          onClick={() => onDayClick(dateStrValue)}
          className={`min-h-[56px] rounded-lg border p-1 transition sm:min-h-[72px] ${
            !inMonth
              ? 'border-transparent bg-muted/10 opacity-40'
              : inRange
                ? 'border-gold/40 bg-gold/5'
                : 'border-border bg-card'
          } ${snapshot.isDraggingOver ? 'ring-2 ring-primary/50' : ''} ${isToday ? 'ring-1 ring-primary/30' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-medium ${inMonth ? (isToday ? 'text-primary' : 'text-foreground') : 'text-muted-foreground/50'}`}>
              {date.getDate()}
            </span>
            {inMonth && steps.length === 0 && (
              <Plus className="h-2.5 w-2.5 text-muted-foreground/30" />
            )}
          </div>
          <div className="mt-0.5 space-y-0.5">
            {steps.map((s, i) => {
              const Icon = getStepIcon(s);
              return (
                <Draggable key={`step|${s._index}`} draggableId={`step|${s._index}`} index={i}>
                  {(prov) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      {...prov.dragHandleProps}
                      onClick={(e) => { e.stopPropagation(); onStepClick(s); }}
                      className="flex cursor-pointer items-center gap-1 rounded bg-primary/10 px-1 py-0.5 text-[9px] hover:bg-primary/20 sm:text-[10px]"
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0 text-primary" />
                      <span className="truncate">{s.title}</span>
                    </div>
                  )}
                </Draggable>
              );
            })}
          </div>
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}