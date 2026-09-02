import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ProductGrid from '@/components/cadeiazinha/ProductGrid';
import { fetchCep, buildWhatsAppMessage, newChain } from '@/lib/quoteUtils';
import { ChevronLeft, ChevronRight, Check, Search, Loader2, Plus, Trash2, MessageCircle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const inputCls = 'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary';

export default function QuoteForm({ catalog, settings }) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    whatsapp: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    chains: [newChain()],
    medallions: [],
    scapulars: [],
    notes: ''
  });

  const rawLabels = settings?.step_labels || ['Dados', 'Cadeiazinha', 'Medalhões', 'Escapulários', 'Revisão'];
  const stepLabels = [`${rawLabels[0]} e ${rawLabels[1]}`, rawLabels[2], rawLabels[3], rawLabels[4]];

  const set = (patch) => setForm({ ...form, ...patch });

  const lookupCep = async () => {
    setCepLoading(true);
    const data = await fetchCep(form.cep);
    setCepLoading(false);
    if (data) {
      set({ street: data.street, neighborhood: data.neighborhood, city: data.city, state: data.state });
      toast({ title: 'CEP encontrado', description: `${data.city}/${data.state}` });
    } else {
      toast({ title: 'CEP não encontrado', description: 'Verifique o CEP e tente novamente.', variant: 'destructive' });
    }
  };

  // Chain helpers
  const updateChain = (idx, patch) => {
    const chains = form.chains.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    set({ chains });
  };
  const addChain = () => set({ chains: [...form.chains, newChain()] });
  const removeChain = (idx) => set({ chains: form.chains.filter((_, i) => i !== idx) });

  // Medallion helpers
  const toggleMedallion = (slug) => {
    const exists = form.medallions.find((m) => m.id === slug);
    if (exists) {
      set({ medallions: form.medallions.filter((m) => m.id !== slug) });
    } else {
      set({ medallions: [...form.medallions, { id: slug, withChain: 'sem' }] });
    }
  };
  const setMedallionChain = (slug, withChain) => {
    set({ medallions: form.medallions.map((m) => (m.id === slug ? { ...m, withChain } : m)) });
  };

  // Scapular helpers
  const toggleScapular = (slug) => {
    const exists = form.scapulars.find((s) => s.id === slug);
    if (exists) {
      set({ scapulars: form.scapulars.filter((s) => s.id !== slug) });
    } else {
      set({ scapulars: [...form.scapulars, { id: slug, quantity: 1 }] });
    }
  };
  const setScapularQty = (slug, quantity) => {
    set({ scapulars: form.scapulars.map((s) => (s.id === slug ? { ...s, quantity: Math.max(1, Math.min(20, quantity)) } : s)) });
  };

  const dataComplete = () =>
    form.customerName.trim().length >= 2 &&
    form.whatsapp.replace(/\D/g, '').length >= 10 &&
    form.cep.trim() &&
    form.number.trim();

  const submit = async () => {
    if (!dataComplete()) {
      setStep(0);
      toast({
        title: 'Preencha seus dados',
        description: 'Para facilitar o atendimento e o envio do orçamento completo com frete, preencha nome, WhatsApp, CEP e número.',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: form.customerName,
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        cep: form.cep,
        street: form.street,
        number: form.number,
        complement: form.complement || '',
        neighborhood: form.neighborhood || '',
        city: form.city || '',
        state: form.state || '',
        chains: form.chains.filter((c) => c.model),
        medallions: form.medallions,
        scapulars: form.scapulars,
        notes: form.notes || '',
        status: 'novo'
      };
      await base44.entities.QuoteRequest.create(payload);

      // Abrir WhatsApp
      const message = buildWhatsAppMessage(payload, settings, catalog);
      const waNumber = settings?.whatsapp?.replace(/\D/g, '') || '';
      const waUrl = waNumber
        ? `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      setSubmitted(true);
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao enviar', description: e?.message || 'Não foi possível enviar sua solicitação. Tente novamente.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mt-4 font-display text-xl">Solicitação enviada!</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Recebemos seu pedido de orçamento e abrimos o WhatsApp da loja para finalizar o atendimento.
          Em breve entraremos em contato.
        </p>
        <button
          onClick={() => {
            setSubmitted(false);
            setStep(0);
            setForm({
              customerName: '', whatsapp: '', cep: '', street: '', number: '', complement: '',
              neighborhood: '', city: '', state: '', chains: [newChain()], medallions: [], scapulars: [], notes: ''
            });
          }}
          className="mt-6 rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted"
        >
          Nova solicitação
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex flex-1 flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition ${
                i < step ? 'bg-primary text-primary-foreground' : i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`mt-1.5 hidden text-[10px] sm:block ${i <= step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 h-1 rounded-full bg-muted">
          <div className="h-1 rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>
      </div>

      {/* Step 0: Dados + Cadeiazinha */}
      {step === 0 && (
        <div className="space-y-6">
          {/* Seção: Seus dados */}
          <div className="space-y-4">
            <h3 className="font-display text-lg">Seus dados</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Nome completo *</label>
                <input className={inputCls} value={form.customerName} onChange={(e) => set({ customerName: e.target.value })} maxLength={120} />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">WhatsApp *</label>
                <input className={inputCls} value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="(11) 99999-9999" maxLength={20} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">CEP *</label>
              <div className="flex gap-2">
                <input className={inputCls} value={form.cep} onChange={(e) => set({ cep: e.target.value })} placeholder="00000-000" maxLength={10} />
                <button type="button" onClick={lookupCep} disabled={cepLoading || form.cep.replace(/\D/g, '').length !== 8} className="flex items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-muted disabled:opacity-40">
                  {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rua</label>
                <input className={inputCls} value={form.street} onChange={(e) => set({ street: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Número *</label>
                <input className={inputCls} value={form.number} onChange={(e) => set({ number: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Complemento</label>
                <input className={inputCls} value={form.complement} onChange={(e) => set({ complement: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bairro</label>
                <input className={inputCls} value={form.neighborhood} onChange={(e) => set({ neighborhood: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cidade</label>
                  <input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">UF</label>
                  <input className={inputCls} value={form.state} onChange={(e) => set({ state: e.target.value })} maxLength={2} />
                </div>
              </div>
            </div>
          </div>

          {/* Divisor visual entre seções */}
          <div className="flex items-center gap-3 py-1">
            <div className="gold-line flex-1 opacity-40" />
          </div>

          {/* Seção: Monte sua cadeiazinha */}
          <div className="space-y-6">
            <h3 className="font-display text-lg">Monte sua cadeiazinha</h3>
            {form.chains.map((chain, idx) => (
              <div key={idx} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-display text-sm font-medium text-primary">Cadeiazinha {idx + 1}</span>
                  {form.chains.length > 1 && (
                    <button type="button" onClick={() => removeChain(idx)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Modelo da cadeia *</label>
                    <ProductGrid products={catalog.chains} selected={chain.model} onSelect={(slug) => updateChain(idx, { model: slug })} mode="single" />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tamanho</label>
                    <input className={inputCls} value={chain.size} onChange={(e) => updateChain(idx, { size: e.target.value })} placeholder="Ex: 50cm, 60cm..." />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medalha de brinde *</label>
                    <ProductGrid products={catalog.marian} selected={chain.freeMedal} onSelect={(slug) => updateChain(idx, { freeMedal: slug })} mode="single" emptyText="Nenhuma medalha mariana disponível." />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medalhas marianas adicionais</label>
                    <ProductGrid products={catalog.marian} selected={chain.marianMedals} onSelect={(slugs) => updateChain(idx, { marianMedals: slugs })} emptyText="Nenhuma disponível." />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medalhas em inox</label>
                    <ProductGrid products={catalog.inox} selected={chain.inoxMedals} onSelect={(slugs) => updateChain(idx, { inoxMedals: slugs })} emptyText="Nenhuma disponível." />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Medalhas de santos</label>
                    <ProductGrid products={catalog.saint} selected={chain.saintMedals} onSelect={(slugs) => updateChain(idx, { saintMedals: slugs })} emptyText="Nenhuma disponível." />
                  </div>
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pingentes</label>
                    <ProductGrid products={catalog.pendants} selected={chain.pendants} onSelect={(slugs) => updateChain(idx, { pendants: slugs })} emptyText="Nenhum disponível." />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addChain} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
              <Plus className="h-4 w-4" /> Adicionar outra cadeiazinha
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Medalhões */}
      {step === 1 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg">Medalhões</h3>
          <p className="text-sm text-muted-foreground">Selecione os medalhões e informe se deseja com ou sem corrente.</p>
          {catalog.medallions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum medalhão disponível.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {catalog.medallions.map((p) => {
                const sel = form.medallions.find((m) => m.id === p.slug);
                const outOfStock = !p.in_stock || p.stock_quantity === 0;
                return (
                  <div key={p.id} className={`overflow-hidden rounded-xl border-2 bg-card ${sel ? 'border-primary' : 'border-border'}`}>
                    <button
                      type="button"
                      onClick={() => toggleMedallion(p.slug)}
                      disabled={outOfStock}
                      className="block w-full text-left disabled:opacity-50"
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {p.image_url ? <img src={p.image_url} alt={p.label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>}
                        {outOfStock && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold uppercase text-white">Esgotado</span>}
                      </div>
                      <p className="truncate p-2 text-xs font-medium">{p.label}</p>
                    </button>
                    {sel && (
                      <div className="flex border-t border-border">
                        <button type="button" onClick={() => setMedallionChain(p.slug, 'com')} className={`flex-1 py-2 text-xs ${sel.withChain === 'com' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Com corrente</button>
                        <button type="button" onClick={() => setMedallionChain(p.slug, 'sem')} className={`flex-1 py-2 text-xs ${sel.withChain === 'sem' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>Sem corrente</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Escapulários */}
      {step === 2 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg">Escapulários</h3>
          <p className="text-sm text-muted-foreground">Selecione os escapulários e a quantidade desejada.</p>
          {catalog.scapulars.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhum escapulário disponível.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {catalog.scapulars.map((p) => {
                const sel = form.scapulars.find((s) => s.id === p.slug);
                const outOfStock = !p.in_stock || p.stock_quantity === 0;
                return (
                  <div key={p.id} className={`overflow-hidden rounded-xl border-2 bg-card ${sel ? 'border-primary' : 'border-border'}`}>
                    <button
                      type="button"
                      onClick={() => toggleScapular(p.slug)}
                      disabled={outOfStock}
                      className="block w-full text-left disabled:opacity-50"
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        {p.image_url ? <img src={p.image_url} alt={p.label} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>}
                        {outOfStock && <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold uppercase text-white">Esgotado</span>}
                      </div>
                      <p className="truncate p-2 text-xs font-medium">{p.label}</p>
                    </button>
                    {sel && (
                      <div className="flex items-center justify-center gap-2 border-t border-border p-2">
                        <button type="button" onClick={() => setScapularQty(p.slug, sel.quantity - 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm">−</button>
                        <span className="w-8 text-center text-sm font-medium">{sel.quantity}</span>
                        <button type="button" onClick={() => setScapularQty(p.slug, sel.quantity + 1)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-sm">+</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Revisão */}
      {step === 3 && (
        <div className="space-y-4">
          <h3 className="font-display text-lg">Revisão do pedido</h3>

          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Dados</h4>
            <p className="text-sm">{form.customerName}</p>
            <p className="text-sm text-muted-foreground">{form.whatsapp}</p>
            <p className="text-sm text-muted-foreground">{form.street}, {form.number} {form.complement}</p>
            <p className="text-sm text-muted-foreground">{form.neighborhood} - {form.city}/{form.state} · CEP {form.cep}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Cadeiazinhas ({form.chains.filter((c) => c.model).length})</h4>
            {form.chains.filter((c) => c.model).map((c, i) => (
              <div key={i} className="mb-2 text-sm">
                <span className="font-medium text-primary">Cadeiazinha {i + 1}:</span>{' '}
                <span className="text-muted-foreground">
                  {catalog.chains.find((p) => p.slug === c.model)?.label}
                  {c.size ? ` · ${c.size}` : ''}
                  {c.freeMedal ? ` · Brinde: ${catalog.marian.find((p) => p.slug === c.freeMedal)?.label}` : ''}
                </span>
              </div>
            ))}
            {form.chains.filter((c) => c.model).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma cadeiazinha selecionada.</p>}
          </div>

          {form.medallions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Medalhões</h4>
              {form.medallions.map((m) => (
                <p key={m.id} className="text-sm">{catalog.medallions.find((p) => p.slug === m.id)?.label} — {m.withChain === 'com' ? 'com corrente' : 'sem corrente'}</p>
              ))}
            </div>
          )}

          {form.scapulars.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Escapulários</h4>
              {form.scapulars.map((s) => (
                <p key={s.id} className="text-sm">{catalog.scapulars.find((p) => p.slug === s.id)?.label} — qtd: {s.quantity}</p>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Observações</label>
            <textarea className={inputCls} rows={3} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Alguma observação sobre seu pedido?" maxLength={1000} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2.5 text-sm disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={() => setStep(step + 1)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground"
          >
            Avançar <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm text-primary-foreground disabled:opacity-40"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Enviar e abrir WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}