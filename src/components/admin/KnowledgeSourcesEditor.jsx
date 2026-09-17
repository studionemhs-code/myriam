import React, { useState } from 'react';
import { Loader2, X, Globe, Youtube, Instagram, Headphones, Plus, RotateCw, ChevronDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Field, inputCls } from '@/components/admin/ui';
import { invokeEdgeFunction } from '@/api/supabase/storageAndFunctions';

const SOURCE_TYPES = [
  { type: 'site', label: 'Site', icon: Globe, placeholder: 'https://exemplo.com/artigo', color: 'text-blue-500' },
  { type: 'youtube', label: 'YouTube', icon: Youtube, placeholder: 'https://www.youtube.com/watch?v=...', color: 'text-red-500' },
  { type: 'instagram', label: 'Instagram', icon: Instagram, placeholder: 'https://www.instagram.com/p/...', color: 'text-pink-500' },
  { type: 'audio', label: 'Áudio', icon: Headphones, placeholder: 'https://exemplo.com/audio.mp3', color: 'text-purple-500' }
];

export default function KnowledgeSourcesEditor({ sources, onChange }) {
  const [activeType, setActiveType] = useState('site');
  const [urlInput, setUrlInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(null);

  const activeConfig = SOURCE_TYPES.find((s) => s.type === activeType);

  const addAndProcess = async () => {
    if (!urlInput.trim()) return;
    setProcessing(true);
    const newSource = {
      type: activeType,
      url: urlInput.trim(),
      label: labelInput.trim() || urlInput.trim(),
      extracted_content: '',
      status: 'processing',
      error_message: '',
      processed_at: null
    };
    const newIdx = sources.length;
    onChange([...sources, newSource]);
    setUrlInput('');
    setLabelInput('');

    try {
      const result = await invokeEdgeFunction('process-knowledge-source', { type: activeType, url: newSource.url });
      const extracted = result?.data?.extracted_content || '';
      const updated = [...sources, newSource];
      updated[newIdx] = {
        ...newSource,
        extracted_content: extracted,
        status: 'ready',
        processed_at: new Date().toISOString()
      };
      onChange(updated);
    } catch (err) {
      const updated = [...sources, newSource];
      updated[newIdx] = {
        ...newSource,
        status: 'error',
        error_message: err.message || 'Erro ao processar fonte'
      };
      onChange(updated);
    } finally {
      setProcessing(false);
    }
  };

  const removeSource = (idx) => {
    onChange(sources.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const reprocess = async (idx) => {
    const source = sources[idx];
    const updated = [...sources];
    updated[idx] = { ...source, status: 'processing', error_message: '' };
    onChange(updated);

    try {
      const result = await invokeEdgeFunction('process-knowledge-source', { type: source.type, url: source.url });
      const extracted = result?.data?.extracted_content || '';
      updated[idx] = {
        ...source,
        extracted_content: extracted,
        status: 'ready',
        error_message: '',
        processed_at: new Date().toISOString()
      };
    } catch (err) {
      updated[idx] = { ...source, status: 'error', error_message: err.message || 'Erro ao reprocessar' };
    }
    onChange(updated);
  };

  const StatusBadge = ({ status }) => {
    if (status === 'processing') return <span className="flex items-center gap-1 text-xs text-amber-600"><Loader2 className="h-3 w-3 animate-spin" /> Processando</span>;
    if (status === 'ready') return <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" /> Pronto</span>;
    if (status === 'error') return <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" /> Erro</span>;
    return <span className="text-xs text-muted-foreground">Pendente</span>;
  };

  return (
    <div className="space-y-3">
      {/* Seletor de tipo */}
      <div className="flex flex-wrap gap-2">
        {SOURCE_TYPES.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => setActiveType(s.type)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                activeType === s.type ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${s.color}`} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Input de URL + rótulo */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className={inputCls}
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder={activeConfig?.placeholder}
          disabled={processing}
        />
        <input
          className={inputCls}
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          placeholder="Rótulo (ex: Artigo sobre Montfort)"
          disabled={processing}
        />
        <button
          type="button"
          onClick={addAndProcess}
          disabled={processing || !urlInput.trim()}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {processing ? 'Processando...' : 'Adicionar'}
        </button>
      </div>

      {/* Lista de fontes */}
      {sources.length > 0 && (
        <div className="space-y-1.5">
          {sources.map((source, idx) => {
            const Icon = SOURCE_TYPES.find((s) => s.type === source.type)?.icon || Globe;
            const isExpanded = expandedIdx === idx;
            return (
              <div key={idx} className="rounded-lg border border-border bg-muted/30">
                <div className="flex items-center gap-2 px-3 py-2">
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{source.label}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{source.url}</p>
                  </div>
                  <StatusBadge status={source.status} />
                  <div className="flex items-center gap-1">
                    {source.extracted_content && (
                      <button
                        type="button"
                        onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ver conteúdo"
                      >
                        <ChevronDown className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                    {source.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => reprocess(idx)}
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Reprocessar"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSource(idx)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {source.status === 'error' && source.error_message && (
                  <div className="border-t border-border/50 px-3 py-1.5 text-[10px] text-destructive">
                    {source.error_message}
                  </div>
                )}
                {isExpanded && source.extracted_content && (
                  <div className="max-h-48 overflow-y-auto border-t border-border/50 px-3 py-2">
                    <pre className="whitespace-pre-wrap break-words text-[10px] leading-relaxed text-muted-foreground">{source.extracted_content}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}