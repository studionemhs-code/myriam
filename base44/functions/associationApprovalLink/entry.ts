import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Função pública (sem auth) para a autoridade certificadora:
// - action: "get"     → retorna dados da solicitação + configurações
// - action: "approve" → aprova ingresso, gera nº de inscrição, notifica usuário
// - action: "reject"  → rejeita ingresso, notifica usuário
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, token, authority_name, authority_note } = body;

    if (!token) {
      return Response.json({ error: 'Token não informado.' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.AssociationRequest.filter({ approval_token: token });
    if (!requests || requests.length === 0) {
      return Response.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }
    if (requests.length > 1) {
      return Response.json({ error: 'Token duplicado. Contate o administrador.' }, { status: 500 });
    }

    const request = requests[0];

    // ===== GET: retornar dados para a autoridade =====
    if (action === 'get') {
      const settings = await base44.asServiceRole.entities.AssociationSettings.list();
      return Response.json({
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
          certificate_pdf_url: request.certificate_pdf_url,
        },
        settings: settings[0] || null,
      });
    }

    // ===== Aprovar =====
    if (action === 'approve') {
      if (request.status === 'aprovado') {
        return Response.json({ error: 'Esta solicitação já foi aprovada.' }, { status: 400 });
      }
      if (request.status === 'rejeitado') {
        return Response.json({ error: 'Esta solicitação já foi rejeitada.' }, { status: 400 });
      }

      const approvedReqs = await base44.asServiceRole.entities.AssociationRequest.filter({ status: 'aprovado' });
      const seq = String(approvedReqs.length + 1).padStart(4, '0');
      const year = new Date().getFullYear();
      const inscriptionNumber = `AMRC-${year}-${seq}`;
      const approvedDate = new Date().toISOString().slice(0, 10);

      await base44.asServiceRole.entities.AssociationRequest.update(request.id, {
        status: 'aprovado',
        approved_date: approvedDate,
        inscription_number: inscriptionNumber,
        authority_status: 'aprovado',
        authority_name: authority_name || '',
        authority_note: authority_note || '',
        authority_decision_date: new Date().toISOString(),
      });

      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: request.user_id,
          category: 'associacao',
          title: 'Inscrição Aprovada!',
          body: `Sua inscrição na Associação Maria Rainha dos Corações foi aprovada pela autoridade certificadora. Nº ${inscriptionNumber}.`,
          link: '/associacao',
        });
      } catch { /* ignore */ }

      return Response.json({ ok: true, inscriptionNumber, approvedDate });
    }

    // ===== Rejeitar =====
    if (action === 'reject') {
      if (request.status !== 'pendente') {
        return Response.json({ error: 'Esta solicitação já foi decidida.' }, { status: 400 });
      }

      await base44.asServiceRole.entities.AssociationRequest.update(request.id, {
        status: 'rejeitado',
        authority_status: 'rejeitado',
        authority_name: authority_name || '',
        authority_note: authority_note || '',
        authority_decision_date: new Date().toISOString(),
        admin_note: authority_note || '',
      });

      try {
        await base44.asServiceRole.entities.Notification.create({
          user_id: request.user_id,
          category: 'associacao',
          title: 'Inscrição Não Aprovada',
          body: 'Sua solicitação de ingresso não foi aprovada pela autoridade certificadora.',
          link: '/associacao',
        });
      } catch { /* ignore */ }

      return Response.json({ ok: true });
    }

    // ===== Anexar certificado (após aprovação) =====
    // Apenas define o URL uma vez; não permite sobrescrever um certificado já anexado.
    // Re-anexamentos ficam a cargo do administrador (painel admin, via SDK com auth + RLS).
    if (action === 'attach_certificate') {
      if (request.status !== 'aprovado') {
        return Response.json({ error: 'Solicitação não está aprovada.' }, { status: 400 });
      }
      if (request.certificate_pdf_url) {
        return Response.json({ error: 'Certificado já foi anexado a esta solicitação.' }, { status: 400 });
      }
      if (!body.certificate_pdf_url || typeof body.certificate_pdf_url !== 'string') {
        return Response.json({ error: 'URL do certificado não informada.' }, { status: 400 });
      }
      await base44.asServiceRole.entities.AssociationRequest.update(request.id, {
        certificate_pdf_url: body.certificate_pdf_url,
      });
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}