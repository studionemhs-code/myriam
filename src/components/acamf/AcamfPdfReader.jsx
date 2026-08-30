import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, ChevronLeft, ChevronRight, Loader2, StickyNote, MessageCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ContentNotes from '@/components/acamf/ContentNotes';
import ContentComments from '@/components/acamf/ContentComments';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function AcamfPdfReader({ url, open, onClose, contentId, contentTitle }) {
  const containerRef = useRef(null);
  const pdfRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [panel, setPanel] = useState(null); // null | 'notes' | 'comments'
  const { user } = useCurrentUser();

  const renderPage = useCallback(async (pageNum) => {
    if (!pdfRef.current || !containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    const page = await pdfRef.current.getPage(pageNum);
    const containerWidth = container.clientWidth || 320;
    const base = page.getViewport({ scale: 1 });
    const fitScale = Math.min(2, Math.max(0.5, containerWidth / base.width));
    const finalScale = fitScale * scale;
    const viewport = page.getViewport({ scale: finalScale });
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    canvas.className = 'rounded-lg shadow-sm bg-white mx-auto';
    container.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
  }, [scale]);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
        await renderPage(1);
      } catch (e) {
        if (!cancelled) setError('Não foi possível carregar o documento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; pdfRef.current = null; };
  }, [open, url]);

  useEffect(() => {
    if (open && pdfRef.current && currentPage) {
      renderPage(currentPage);
    }
  }, [scale, currentPage, open, renderPage]);

  if (!open) return null;

  const goPrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goNext = () => currentPage < numPages && setCurrentPage(currentPage + 1);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2.5">
        <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Fechar">
          <X className="h-5 w-5" />
        </button>
        <h2 className="flex-1 truncate font-display text-sm">{contentTitle || 'Documento'}</h2>
        <button
          onClick={() => setPanel(panel === 'notes' ? null : 'notes')}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${panel === 'notes' ? 'bg-gold text-deep' : 'hover:bg-muted text-muted-foreground'}`}
        >
          <StickyNote className="h-4 w-4" /> Notas
        </button>
        <button
          onClick={() => setPanel(panel === 'comments' ? null : 'comments')}
          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${panel === 'comments' ? 'bg-gold text-deep' : 'hover:bg-muted text-muted-foreground'}`}
        >
          <MessageCircle className="h-4 w-4" /> Comentários
        </button>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* PDF area */}
        <div className="flex flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-center gap-3 border-b border-border bg-card/50 px-3 py-1.5">
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} className="rounded-lg p-1 hover:bg-muted" aria-label="Diminuir zoom">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(2.5, s + 0.25))} className="rounded-lg p-1 hover:bg-muted" aria-label="Aumentar zoom">
              <ZoomIn className="h-4 w-4" />
            </button>
            <div className="mx-2 h-4 w-px bg-border" />
            <button onClick={goPrev} disabled={currentPage <= 1} className="rounded-lg p-1 hover:bg-muted disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs tabular-nums text-muted-foreground">{currentPage} / {numPages}</span>
            <button onClick={goNext} disabled={currentPage >= numPages} className="rounded-lg p-1 hover:bg-muted disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* PDF canvas */}
          <div className="flex-1 overflow-auto bg-muted/30 p-3">
            {loading && (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
            <div ref={containerRef} className="mx-auto max-w-2xl" />
          </div>
        </div>

        {/* Side panel — overlay on mobile, sidebar on desktop */}
        {panel && (
          <aside className="absolute inset-0 z-10 flex w-full flex-col border-l border-border bg-card sm:relative sm:inset-auto sm:w-80 sm:max-w-sm">
            <button
              onClick={() => setPanel(null)}
              className="border-b border-border px-4 py-2 text-xs text-muted-foreground hover:text-foreground sm:hidden"
            >
              ← Voltar ao documento
            </button>
            {panel === 'notes' && (
              <ContentNotes contentId={contentId} pageNumber={currentPage} user={user} />
            )}
            {panel === 'comments' && (
              <ContentComments contentId={contentId} user={user} />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}