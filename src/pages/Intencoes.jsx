import React, { useEffect, useState } from 'react';
import { Heart, Plus, X, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { PageHeader } from '@/components/ui/marian';
import { formatDate } from '@/lib/marianDates';
import { notifyUser } from '@/lib/notify';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = {
  saude: 'Saúde', familia: 'Família', trabalho: 'Trabalho', conversao: 'Conversão', gratidao: 'Gratidão', outros: 'Outros'
};

export default function Intencoes() {
  const { user, loading } = useCurrentUser();
  const [intentions, setIntentions] = useState([]);
  const [prayedIds, setPrayedIds] = useState(new Set());
  const [prayingId, setPrayingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('outros');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const list = await base44.entities.PrayerIntention.filter({ status: 'ativo' }, '-created_date', 50);
      setIntentions(list);
    } catch (e) { /* ignore */ }
  };

  const loadPrayed = async () => {
    if (!user) return;
    try {
      const mine = await base44.entities.PrayerInteraction.filter({ created_by_id: user.id }, '-created_date', 200);
      setPrayedIds(new Set(mine.map((m) => m.intention_id)));
    } catch (e) { /* ignore */ }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!loading) loadPrayed(); }, [loading, user]);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const created = await base44.entities.PrayerIntention.create({ text, category, image_url: image || undefined, status: 'ativo', prayer_count: 0 });
      try {
        await base44.functions.invoke('notifyNewIntention', { intention_id: created.id, text });
      } catch (e) { /* não bloqueia a publicação */ }
      setText(''); setCategory('outros'); setImage(''); setShowForm(false);
      load();
    } catch (e) {
      toast({ title: 'Erro ao publicar', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const pray = async (intention) => {
    if (!user) {
      toast({ title: 'Aguarde', description: 'Carregando seu perfil...', variant: 'destructive' });
      return;
    }
    if (prayedIds.has(intention.id)) {
      toast({ title: 'Você já rezou por esta intenção. Obrigado!' });
      return;
    }
    setPrayingId(intention.id);
    try {
      await base44.entities.PrayerInteraction.create({ intention_id: intention.id, prayed: true });
      await base44.entities.PrayerIntention.update(intention.id, { prayer_count: (intention.prayer_count || 0) + 1 });
      setPrayedIds((prev) => new Set(prev).add(intention.id));
      setIntentions((prev) => prev.map((i) => i.id === intention.id ? { ...i, prayer_count: (i.prayer_count || 0) + 1 } : i));
      if (intention.created_by_id !== user.id) {
        try {
          await notifyUser({ user_id: intention.created_by_id, category: 'intencoes', title: 'Alguém rezou pela sua intenção', body: intention.text.slice(0, 100), link: '/intencoes', related_id: intention.id });
        } catch (e) { /* não bloqueia */ }
      }
      toast({ title: 'Rezamos juntos! 🙏', description: 'Sua oração foi registrada.' });
    } catch (e) {
      toast({ title: 'Erro ao registrar', description: e?.message || 'Tente novamente.', variant: 'destructive' });
    } finally {
      setPrayingId(null);
    }
  };

  return (
    <div>
      <PageHeader title="Intenções de Oração" subtitle="Pedidos de intercessão da comunidade" icon={Heart} />

      <button
        onClick={() => setShowForm((v) => !v)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground"
      >
        {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Publicar uma intenção</>}
      </button>

      {showForm && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Compartilhe seu pedido de oração..."
            className="w-full rounded-xl border border-input bg-background p-3 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <button key={k} onClick={() => setCategory(k)} className={`rounded-full px-3 py-1 text-xs ${category === k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {v}
              </button>
            ))}
          </div>
          <button onClick={submit} disabled={saving || !text.trim()} className="mt-3 w-full rounded-xl bg-gold py-2.5 text-sm font-medium text-deep disabled:opacity-40">
            {saving ? 'Publicando...' : 'Publicar intenção'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {intentions.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Heart className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 font-display text-lg">Nenhuma intenção ainda</p>
            <p className="text-sm text-muted-foreground">Seja o primeiro a pedir oração da comunidade.</p>
          </div>
        )}
        {intentions.map((i) => {
          const alreadyPrayed = prayedIds.has(i.id);
          const isPraying = prayingId === i.id;
          return (
            <div key={i.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-gold/15 px-2 py-0.5 text-gold">{CATEGORIES[i.category]}</span>
                <span>{formatDate(i.created_date)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed">{i.text}</p>
              {i.image_url && <img src={i.image_url} alt="" className="mt-2 h-40 rounded-xl object-cover" />}
              <button
                onClick={() => pray(i)}
                disabled={isPraying || alreadyPrayed}
                className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm transition disabled:opacity-60 ${alreadyPrayed ? 'bg-gold/15 text-gold' : 'bg-muted hover:bg-gold/15'}`}
              >
                <Heart className={`h-4 w-4 ${alreadyPrayed ? 'fill-gold text-gold' : 'text-gold'}`} />
                {isPraying ? 'Registrando...' : alreadyPrayed ? 'Rezei por esta intenção' : 'Rezar por esta intenção'}
              </button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                <Users className="mr-1 inline h-3 w-3" /> {i.prayer_count || 0} {i.prayer_count === 1 ? 'pessoa rezou' : 'pessoas rezaram'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}