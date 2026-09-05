import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/api/supabase';
import { base44 } from '@/api/base44Client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCatalog } from '@/hooks/useCatalog';
import QuoteForm from '@/components/cadeiazinha/QuoteForm';
import RegisterInviteBanner from '@/components/cadeiazinha/RegisterInviteBanner';
import Logo from '@/components/Logo';
import { PageHeader } from '@/components/ui/marian';
import { Sparkles, ArrowLeft, LinkIcon } from 'lucide-react';

export default function SolicitarCadeiazinha() {
  const { user, loading: userLoading } = useCurrentUser();
  const { catalog, settings, loading, error } = useCatalog();
  const token = new URLSearchParams(window.location.search).get('s');
  const [linkOk, setLinkOk] = useState(null);

  useEffect(() => {
    if (!token) { setLinkOk(false); return; }
    (async () => {
      const links = await base44.entities.ShareLink.filter({ token, active: true });
      const ok = links.length > 0;
      setLinkOk(ok);
      if (ok) void supabase.rpc('increment_share_link_visit', { p_token: token });
    })();
  }, [token]);

  const ready = !loading && !userLoading && linkOk !== null;
  const allowed = !!user || linkOk;

  let body;
  if (!ready) {
    body = (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  } else if (!allowed) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <LinkIcon className="h-8 w-8 text-muted-foreground" />
        <p className="mt-4 font-display text-lg">Link indisponível</p>
        <p className="mt-2 text-sm text-muted-foreground">Este link de orçamento não está ativo. Fale com a loja para receber um novo.</p>
        <Link to="/login" className="mt-6 text-sm text-primary underline">Entrar no app</Link>
      </div>
    );
  } else if (error || !catalog) {
    body = (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <p className="font-display text-lg">Não foi possível carregar o catálogo</p>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente em instantes.</p>
      </div>
    );
  } else {
    body = (
      <>
        <PageHeader title="Solicite sua cadeiazinha" subtitle="Monte sua peça personalizada e receba o orçamento no WhatsApp" icon={Sparkles} />
        <QuoteForm catalog={catalog} settings={settings} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {ready && !user && allowed && <RegisterInviteBanner />}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4">
        <Logo size="sm" variant="light" to={user ? '/' : undefined} />
        {user && (
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao app
          </Link>
        )}
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">{body}</main>
    </div>
  );
}