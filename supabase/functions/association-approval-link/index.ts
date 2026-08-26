import { json, preflight, admin } from '../_shared/utils.ts';

// Função pública (sem auth) para a autoridade certificadora.
Deno.serve(async (req) => {
  const pf = preflight(req); if (pf) return pf;
  try {
    const db = admin();
    const body = await req.json().catch(() => ({}));
    const { action, token, authority_name, authority_note } = body;
    if (!token) return json({ error: 'Token não informado.' }, 400);

    const { data: requests } = await db.from('association_requests').select('*').eq('approval_token', token);
    if (!requests || requests.length === 0) return json({ error: 'Link inválido ou expirado.' }, 404);
    if (requests.length > 1) return json({ error: 'Token duplicado. Contate o administrador.' }, 500);

    const request = requests[0];

    const TOKEN_TTL_DAYS = 30;
    const created = request.created_date ? new Date(request.created_date) : null;
    const isExpired = created && (Date.now() - created.getTime() > TOKEN_TTL_DAYS * 86400000);
    if (isExpired && action !== 'get') {
      return json({ error: 'Link expirado. Solicite um novo link ao administrador.' }, 410);
    }

    if (action === 'get') {
      const { data: settings } = await db.from('association_settings').select('*').limit(1);
      return json({
        request: {
          id: request.id,
          user_name: request.user_name,
          user_email: request.user_email,
          user_data: request.user_data,
          personal_data: request.personal_data,
          signature_type: request.signature_type,
          signature_data: request.signature_data,
          pdf_url: request.pdf_url,
          request_date: request.request_date,
          status: request.status,
          authority_status: request.authority_status,
          authority_name: request.authority_name,
          authority_note: request.authority_note,
          authority_decision_date: request.authority_decision_date,
          inscription_number: request.inscription_number,
          approved_date: request.approved_date,
          certificate_pdf_url: request.certificate_pdf_url
        },
        settings: settings?.[0] || null
      });
    }

    if (action === 'approve') {
      if (request.status === 'aprovado') return json({ error: 'Esta solicitação já foi aprovada.' }, 400);
      if (request.status === 'rejeitado') return json({ error: 'Esta solicitação já foi rejeitada.' }, 400);

      const { count } = await db.from('association_requests')
        .select('id', { count: 'exact', head: true }).eq('status', 'aprovado');
      const seq = String((count || 0) + 1).padStart(4, '0');
      const inscriptionNumber = `AMRC-${new Date().getFullYear()}-${seq}`;
      const approvedDate = new Date().toISOString().slice(0, 10);

      await db.from('association_requests').update({
        status: 'aprovado',
        approved_date: approvedDate,
        inscription_number: inscriptionNumber,
        authority_status: 'aprovado',
        authority_name: authority_name || '',
        authority_note: authority_note || '',
        authority_decision_date: new Date().toISOString()
      }).eq('id', request.id);

      await db.from('notifications').insert({
        user_id: request.user_id,
        category: 'associacao',
        title: 'Inscrição Aprovada!',
        body: `Sua inscrição na Associação Maria Rainha dos Corações foi aprovada pela autoridade certificadora. Nº ${inscriptionNumber}.`,
        link: '/associacao'
      });

      return json({ ok: true, inscriptionNumber, approvedDate });
    }

    if (action === 'reject') {
      if (request.status !== 'pendente') return json({ error: 'Esta solicitação já foi decidida.' }, 400);

      await db.from('association_requests').update({
        status: 'rejeitado',
        authority_status: 'rejeitado',
        authority_name: authority_name || '',
        authority_note: authority_note || '',
        authority_decision_date: new Date().toISOString(),
        admin_note: authority_note || ''
      }).eq('id', request.id);

      await db.from('notifications').insert({
        user_id: request.user_id,
        category: 'associacao',
        title: 'Inscrição Não Aprovada',
        body: 'Sua solicitação de ingresso não foi aprovada pela autoridade certificadora.',
        link: '/associacao'
      });

      return json({ ok: true });
    }

    if (action === 'attach_certificate') {
      if (request.status !== 'aprovado') return json({ error: 'Solicitação não está aprovada.' }, 400);
      if (request.certificate_pdf_url) return json({ error: 'Certificado já foi anexado a esta solicitação.' }, 400);
      if (!body.certificate_pdf_url || typeof body.certificate_pdf_url !== 'string') {
        return json({ error: 'URL do certificado não informada.' }, 400);
      }
      await db.from('association_requests')
        .update({ certificate_pdf_url: body.certificate_pdf_url }).eq('id', request.id);
      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (error) {
    return json({ error: (error as Error).message }, 500);
  }
});