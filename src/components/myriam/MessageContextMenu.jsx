import React, { useState, useRef, useEffect } from 'react';
import { Reply, Edit2, Trash2, Copy } from 'lucide-react';

export default function MessageContextMenu({ message, isMine, onReply, onEdit, onDelete, onClose, children }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      let left = children ? 0 : Math.min(vw - 180, rect.left);
      let top = rect.top - 60;
      if (top < 10) top = rect.bottom + 10;
      setPos({ top, left });
    }
  }, []);

  const copyText = () => {
    if (message.text) navigator.clipboard?.writeText(message.text);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-border bg-popover py-1 shadow-xl"
        style={{ top: pos.top, left: pos.left }}
      >
        <button onClick={() => { onReply(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted">
          <Reply className="h-4 w-4 text-muted-foreground" /> Responder
        </button>
        {message.text && (
          <button onClick={copyText} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted">
            <Copy className="h-4 w-4 text-muted-foreground" /> Copiar
          </button>
        )}
        {isMine && message.text && (
          <button onClick={() => { onEdit(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted">
            <Edit2 className="h-4 w-4 text-muted-foreground" /> Editar
          </button>
        )}
        {isMine && (
          <button onClick={() => { onDelete(); onClose(); }} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        )}
      </div>
    </>
  );
}