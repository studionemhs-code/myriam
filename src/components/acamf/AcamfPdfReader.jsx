import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { X, ChevronLeft, ChevronRight, Loader2, StickyNote, MessageCircle, ZoomIn, ZoomOut, BookOpen, ScrollText } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import ContentNotes from '@/components/acamf/ContentNotes';
import ContentComments from '@/components/acamf/ContentComments';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function AcamfPdfReader({ url, open, onClose, contentId, contentTitle }) {
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const pdfRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1);
  const [viewMode, setViewMode] = useState('paginated'); // 'paginated' | 'continuous'
  const [panel, setPanel] = useState(null);
  const { user } = useCurrentUser();

  const panState = useRef({ startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0, panning: false });

  const renderPageInto = useCallback(async (pageNum, target) => {
    if (!pdfRef.current || !target) return;
    const page = await pdfRef.current.getPage(pageNum);
    const containerWidth = (scrollRef.current?.clientWidth || 320) - 24;
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
    canvas.className = 'rounded-lg shadow-sm bg-white';
    canvas.dataset.pageNum = String(pageNum);
    target.appendChild(canvas);
    await page.render({ canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
  }, [scale]);

  const renderPaginated = useCallback(async (pageNum) => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    await renderPageInto(pageNum, containerRef.current);
  }, [renderPageInto]);

  const renderContinuous = useCallback(async () => {
    if (!pdfRef.current || !containerRef.current || !numPages) return;
    setRendering(true);
    const container = containerRef.current;
    container.innerHTML = '';
    for (let i = 1; i <= numPages; i++) {
      const wrapper = document.createElement('div');
      wrapper.className = 'mb-4 flex justify-center';
      container.appendChild(wrapper);
      await renderPageInto(i, wrapper);
    }
    setRendering(false);
  }, [numPages, renderPageInto]);

  // Load PDF
  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setScale(1);
    (async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        if (cancelled) return;
        pdfRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (e) {
        if (!cancelled) setError('Não foi possível carregar o documento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; pdfRef.current = null; };
  }, [open, url]);

  // Render paginated (re-renders on page/scale change)
  useEffect(() => {
    if (!open || !pdfRef.current || loading || viewMode !== 'paginated') return;
    renderPaginated(currentPage);
  }, [scale, currentPage, open, viewMode, loading, renderPaginated]);

  // Render continuous — only on scale/viewMode change, NOT on currentPage (which is driven by scroll)
  useEffect(() => {
    if (!open || !pdfRef.current || loading || viewMode !== 'continuous') return;
    renderContinuous();
  }, [scale, open, viewMode, loading, renderContinuous]);

  // Mouse drag panning (desktop) — document-level listeners so drag works outside the container
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!panState.current.panning || !scrollRef.current) return;
      scrollRef.current.scrollLeft = panState.current.scrollLeft - (e.clientX - panState.current.startX);
      scrollRef.current.scrollTop = panState.current.scrollTop - (e.clientY - panState.current.startY);
    };
    const handleMouseUp = () => { panState.current.panning = false; };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Track current page in continuous mode via scroll
  const handleScroll = useCallback(() => {
    if (viewMode !== 'continuous' || !scrollRef.current || !containerRef.current) return;
    const el = scrollRef.current;
    const center = el.scrollTop + el.clientHeight / 2;
    const canvases = containerRef.current.querySelectorAll('canvas');
    for (let i = 0; i < canvases.length; i++) {
      const top = canvases[i].offsetTop;
      const bottom = top + canvases[i].offsetHeight;
      if (center >= top && center < bottom) {
        setCurrentPage(i + 1);
        break;
      }
    }
  }, [viewMode]);

  if (!open) return null;

  const goPrev = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const goNext = () => currentPage < numPages && setCurrentPage(currentPage + 1);

  // Touch panning for paginated mode
  const onTouchStart = (e) => {
    if (!scrollRef.current) return;
    const t = e.touches[0];
    panState.current = {
      startX: t.clientX,
      startY: t.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
    };
  };
  const onTouchMove = (e) => {
    if (!scrollRef.current) return;
    const t = e.touches[0];
    const dx = t.clientX - panState.current.startX;
    const dy = t.clientY - panState.current.startY;
    scrollRef.current.scrollLeft = panState.current.scrollLeft - dx;
    scrollRef.current.scrollTop = panState.current.scrollTop - dy;
  };
  const onTouchEnd = (e) => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const scrolled = el.scrollLeft !== panState.current.scrollLeft || el.scrollTop !== panState.current.scrollTop;
    // If no scroll happened (content fits), treat as swipe to change page
    if (!scrolled) {
      const t = e.changedTouches[0];
      const dx = t.clientX - panState.current.startX;
      if (Math.abs(dx) > 60) {
        if (dx > 0) goPrev();
        else goNext();
      }
    }
  };

  // Mouse drag start (desktop panning)
  const onMouseDown = (e) => {
    if (!scrollRef.current) return;
    panState.current = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollRef.current.scrollLeft,
      scrollTop: scrollRef.current.scrollTop,
      panning: true,
    };
  };

  const isPaginated = viewMode === 'paginated';

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
        <div className="flex flex-1 flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-center gap-2 border-b border-border bg-card/50 px-3 py-1.5">
            {/* View mode toggle */}
            <div className="flex items-center rounded-lg border border-border p-0.5">
              <button
                onClick={() => setViewMode('paginated')}
                className={`rounded-md p-1 transition ${isPaginated ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                aria-label="Modo paginado"
                title="Passar páginas"
              >
                <BookOpen className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode('continuous')}
                className={`rounded-md p-1 transition ${!isPaginated ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                aria-label="Modo contínuo"
                title="Rolar para baixo"
              >
                <ScrollText className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mx-1 h-4 w-px bg-border" />
            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.25))} className="rounded-lg p-1 hover:bg-muted" aria-label="Diminuir zoom">
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale((s) => Math.min(2.5, s + 0.25))} className="rounded-lg p-1 hover:bg-muted" aria-label="Aumentar zoom">
              <ZoomIn className="h-4 w-4" />
            </button>
            {isPaginated && (
              <>
                <div className="mx-1 h-4 w-px bg-border" />
                <button onClick={goPrev} disabled={currentPage <= 1} className="rounded-lg p-1 hover:bg-muted disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">{currentPage} / {numPages}</span>
                <button onClick={goNext} disabled={currentPage >= numPages} className="rounded-lg p-1 hover:bg-muted disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* PDF canvas */}
          <div
            ref={scrollRef}
            className={`relative flex-1 overflow-auto bg-muted/30 p-3 ${isPaginated ? 'cursor-grab active:cursor-grabbing' : ''}`}
            onTouchStart={isPaginated ? onTouchStart : undefined}
            onTouchMove={isPaginated ? onTouchMove : undefined}
            onTouchEnd={isPaginated ? onTouchEnd : undefined}
            onMouseDown={isPaginated ? onMouseDown : undefined}
            onScroll={handleScroll}
            style={{ touchAction: isPaginated ? 'none' : 'auto', WebkitOverflowScrolling: 'touch' }}
          >
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
            {rendering && (
              <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                <Loader2 className="h-3 w-3 animate-spin" /> Renderizando...
              </div>
            )}
            <div ref={containerRef} className="mx-auto w-fit" />
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