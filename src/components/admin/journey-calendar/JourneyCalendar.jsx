import React, { useState, useEffect, useMemo } from 'react';
import { DragDropContext } from '@hello-pangea/dnd';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import ContentPalette from './ContentPalette';
import CalendarGrid from './CalendarGrid';
import StepEditPanel from './StepEditPanel';

const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function JourneyCalendar({ form, set, contents, prayers, journeyLib, loadingContents }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = form.start_date ? new Date(form.start_date + 'T00:00:00') : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [editingStep, setEditingStep] = useState(null);
  const [inlineDate, setInlineDate] = useState(null);

  // Backward compat: assign dates to steps without one
  useEffect(() => {
    const steps = form.steps || [];
    if (steps.length > 0 && steps.some((s) => !s.date)) {
      const base = form.start_date ? new Date(form.start_date + 'T00:00:00') : new Date();
      const updated = steps.map((s, i) =>
        s.date ? s : { ...s, date: dateStr(new Date(base.getTime() + i * 86400000)) }
      );
      set('steps', updated);
    }
  }, []);

  const stepsByDate = useMemo(() => {
    const map = {};
    (form.steps || []).forEach((s, i) => {
      const key = s.date || '';
      if (!map[key]) map[key] = [];
      map[key].push({ ...s, _index: i });
    });
    return map;
  }, [form.steps]);

  const createStepFromPalette = (type, id, date) => {
    if (type === 'acamf') {
      const c = contents.find((x) => x.id === id);
      return { title: c?.title || 'Conteúdo ACAMF', description: '', content_source: 'acamf', content_id: id, date };
    }
    if (type === 'prayer') {
      const p = prayers.find((x) => x.id === id);
      return { title: p?.title || 'Oração', description: '', content_source: 'prayer', prayer_id: id, date };
    }
    if (type === 'library') {
      const c = journeyLib.find((x) => x.id === id);
      return { title: c?.title || 'Conteúdo de jornada', description: '', content_source: 'journey_library', journey_content_id: id, date };
    }
    return null;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === 'palette') {
      const parts = draggableId.split('|');
      const type = parts[1];
      const id = parts.slice(2).join('|');
      const newStep = createStepFromPalette(type, id, destination.droppableId);
      if (newStep) set('steps', [...(form.steps || []), newStep]);
    } else if (source.droppableId !== destination.droppableId) {
      const stepIndex = parseInt(draggableId.split('|')[1], 10);
      const updated = [...(form.steps || [])];
      if (updated[stepIndex]) {
        updated[stepIndex] = { ...updated[stepIndex], date: destination.droppableId };
        set('steps', updated);
      }
    }
  };

  const updateStep = (index, patch) => {
    const updated = [...(form.steps || [])];
    updated[index] = { ...updated[index], ...patch };
    set('steps', updated);
  };

  const removeStep = (index) => {
    set('steps', (form.steps || []).filter((_, i) => i !== index));
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => {
    const t = new Date();
    setViewMonth(new Date(t.getFullYear(), t.getMonth(), 1));
  };

  const monthLabel = viewMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const totalSteps = (form.steps || []).length;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-base">
              <CalendarDays className="h-4 w-4 text-gold" /> Calendário da jornada
            </h3>
            <div className="flex items-center gap-1">
              <button onClick={goToday} className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted">Hoje</button>
              <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <span className="min-w-[130px] text-center text-sm font-medium capitalize">{monthLabel}</span>
              <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          {form.start_date && form.end_date && (
            <p className="mb-2 text-xs text-muted-foreground">
              Período da jornada: <span className="font-medium text-gold">{form.start_date}</span> até <span className="font-medium text-gold">{form.end_date}</span> · {totalSteps} etapa(s)
            </p>
          )}

          <CalendarGrid
            viewMonth={viewMonth}
            stepsByDate={stepsByDate}
            startDate={form.start_date}
            endDate={form.end_date}
            onStepClick={(step) => setEditingStep(step)}
            onDayClick={(date) => setInlineDate(date)}
          />
        </div>

        {/* Palette */}
        <ContentPalette
          contents={contents}
          prayers={prayers}
          journeyLib={journeyLib}
          loading={loadingContents}
        />
      </div>

      {editingStep && (
        <StepEditPanel
          step={editingStep}
          contents={contents}
          prayers={prayers}
          journeyLib={journeyLib}
          onSave={(patch) => { updateStep(editingStep._index, patch); setEditingStep(null); }}
          onRemove={() => { removeStep(editingStep._index); setEditingStep(null); }}
          onClose={() => setEditingStep(null)}
        />
      )}

      {inlineDate && (
        <StepEditPanel
          step={{ date: inlineDate, content_source: 'inline', title: '', description: '', content_data: {} }}
          isNewInline
          contents={contents}
          prayers={prayers}
          journeyLib={journeyLib}
          onSave={(patch) => { set('steps', [...(form.steps || []), patch]); setInlineDate(null); }}
          onClose={() => setInlineDate(null)}
        />
      )}
    </DragDropContext>
  );
}