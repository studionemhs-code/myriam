import React, { useRef, useEffect, useState } from 'react';
import { Eraser } from 'lucide-react';

export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#673ab7';
    ctx.lineWidth = 2.5;
    ctxRef.current = ctx;
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
    setDrawing(true);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    if (!hasContent) setHasContent(true);
  };

  const stop = () => {
    if (!drawing) return;
    setDrawing(false);
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      if (dataUrl.length > 2000) {
        onChange?.(dataUrl);
      }
    } catch { /* ignore */ }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
    onChange?.(null);
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={stop}
        className="h-40 w-full touch-none rounded-xl border-2 border-dashed border-border bg-white cursor-crosshair"
      />
      {hasContent && (
        <button onClick={clear} className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive">
          <Eraser className="h-4 w-4" /> Limpar assinatura
        </button>
      )}
    </div>
  );
}