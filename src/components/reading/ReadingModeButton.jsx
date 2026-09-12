import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import ReadingMode from '@/components/reading/ReadingMode';

// Botão flutuante que ativa o Modo Leitura imersivo.
// Props: title, contentHtml, contentMarkdown, prayerText
export default function ReadingModeButton({ title, contentHtml, contentMarkdown, prayerText, className = '' }) {
  const [open, setOpen] = useState(false);

  const hasContent = contentHtml || contentMarkdown || prayerText;
  if (!hasContent) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-gold/40 hover:text-foreground ${className}`}
      >
        <BookOpen className="h-3.5 w-3.5" /> Modo Leitura
      </button>
      <ReadingMode
        open={open}
        title={title}
        contentHtml={contentHtml}
        contentMarkdown={contentMarkdown}
        prayerText={prayerText}
        onClose={() => setOpen(false)}
      />
    </>
  );
}