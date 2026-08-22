import { jsPDF } from 'jspdf';

const hexToRgb = (hex) => {
  if (!hex || !hex.startsWith('#')) return [103, 58, 183];
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return [r, g, b];
};

const formatDate = (d) => {
  const s = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d;
  try { return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); }
  catch { return ''; }
};

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const loadImage = (url) => new Promise((resolve) => {
  if (!url) { resolve(null); return; }
  // dataURL (drawn signature) — use directly without re-drawing via canvas
  if (url.startsWith('data:')) { resolve(url); return; }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    } catch { resolve(null); }
  };
  img.onerror = () => resolve(null);
  img.src = url;
});

const fillPlaceholders = (text, data) => {
  return stripHtml((text || '')
    .replace(/\{nome\}/g, data.name || '—')
    .replace(/\{email\}/g, data.email || '—')
    .replace(/\{data\}/g, formatDate(data.requestDate))
    .replace(/\{cidade\}/g, data.city || '—')
    .replace(/\{estado\}/g, data.state || '—')
    .replace(/\{telefone\}/g, data.phone || '—')
    .replace(/\{consagracao_data\}/g, data.consecration_date ? formatDate(data.consecration_date) : '—'));
};

const drawBorder = (doc, pageW, pageH, style, pr, pg, pb, ar, ag, ab, m) => {
  if (style === 'classic') {
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(2);
    doc.rect(m - 16, m - 16, pageW - (m - 16) * 2, pageH - (m - 16) * 2);
    doc.setLineWidth(0.5);
    doc.rect(m - 10, m - 10, pageW - (m - 10) * 2, pageH - (m - 10) * 2);
  } else if (style === 'modern') {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(4);
    doc.rect(m - 16, m - 16, pageW - (m - 16) * 2, pageH - (m - 16) * 2);
  } else {
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
    doc.rect(m - 10, m - 10, pageW - (m - 10) * 2, pageH - (m - 10) * 2);
  }
};

const drawSignature = (doc, sigImg, signature, m, sigY, pr, pg, pb) => {
  if (sigImg) {
    try { doc.addImage(sigImg, 'PNG', m, sigY - 35, 160, 40); } catch {}
  } else if (signature.type === 'typed' && signature.data) {
    doc.setFontSize(20); doc.setFont('helvetica', 'italic'); doc.setTextColor(pr, pg, pb);
    doc.text(signature.data, m + 80, sigY - 5, { align: 'center' });
  }
  doc.setDrawColor(120, 110, 130); doc.setLineWidth(0.5);
  doc.line(m, sigY, m + 200, sigY);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 90, 120);
  doc.text('Assinatura do Solicitante', m + 100, sigY + 14, { align: 'center' });
};

export async function generateAssociationPdf({ settings, userData, signature, requestDate, journeyData }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const sigImg = (signature.type === 'drawn' || signature.type === 'uploaded') && signature.data
    ? await loadImage(signature.data) : null;

  const [pr, pg, pb] = hexToRgb(settings.primary_color);
  const [ar, ag, ab] = hexToRgb(settings.accent_color);
  const style = settings.border_style || 'classic';

  const data = { ...userData, requestDate };
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 56;
  const location = [userData.city, userData.state].filter(Boolean).join(', ');

  // ========== PÁGINA 1: SOLICITAÇÃO ==========
  doc.setFillColor(255, 252, 245);
  doc.rect(0, 0, pageW, pageH, 'F');
  drawBorder(doc, pageW, pageH, style, pr, pg, pb, ar, ag, ab, m);

  let y = m + 10;

  doc.setTextColor(ar, ag, ab); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  doc.text('✦', pageW / 2, y, { align: 'center' });
  y += 20;

  doc.setTextColor(pr, pg, pb); doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text(settings.request_title || 'Solicitação de Ingresso', pageW / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 80, y, pageW / 2 + 80, y);
  y += 22;

  if (settings.request_subtitle) {
    doc.setFontSize(12); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 90, 120);
    doc.text(settings.request_subtitle, pageW / 2, y, { align: 'center' });
    y += 28;
  }

  // Dados do solicitante
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 50, 70);
  doc.text('Dados do Solicitante', m, y);
  y += 16;

  doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 45, 60);
  const dataLines = [
    `Nome: ${userData.name || '—'}`,
    `E-mail: ${userData.email || '—'}`,
    userData.consecration_date ? `Data da Consagração: ${formatDate(userData.consecration_date)}` : null,
    userData.city ? `Cidade: ${userData.city}` : null,
    userData.state ? `Estado: ${userData.state}` : null,
    userData.phone ? `Telefone: ${userData.phone}` : null,
  ].filter(Boolean);
  dataLines.forEach((line) => { doc.text(line, m, y); y += 15; });
  y += 14;

  // Texto da solicitação
  doc.setFont('helvetica', 'bold'); doc.setTextColor(60, 50, 70);
  doc.text('Solicitação', m, y);
  y += 16;

  const bodyText = fillPlaceholders(settings.request_body_text, data);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 45, 60);
  const bodyLines = doc.splitTextToSize(bodyText, pageW - m * 2);
  bodyLines.forEach((line) => {
    if (y > pageH - 180) { doc.addPage('a4', 'portrait'); y = m; }
    doc.text(line, m, y);
    y += 14;
  });

  y += 20;

  // Data e local
  doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(100, 90, 120);
  doc.text(`${location || '—'}, ${formatDate(requestDate)}`, m, y);
  y += 36;

  const sigY = Math.max(y, pageH - 110);
  drawSignature(doc, sigImg, signature, m, sigY, pr, pg, pb);

  if (settings.footer_text) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
    doc.text(settings.footer_text, pageW / 2, pageH - 28, { align: 'center' });
  }

  // ========== JORNADA E CAMINHADA ==========
  if (journeyData) {
    y += 10;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.3);
    doc.line(m, y, pageW - m, y);
    y += 16;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(60, 50, 70);
    doc.text('Histórico de Caminhada', m, y);
    y += 16;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(50, 45, 60);

    if (journeyData.progress) {
      const { started_date, completed_date, current_day, completed_days, status } = journeyData.progress;
      const statusMap = { ativa: 'Em andamento', concluida: 'Concluída', pausada: 'Pausada' };
      if (started_date) { doc.text(`Início da preparação: ${formatDate(started_date)}`, m, y); y += 14; }
      if (current_day) { doc.text(`Progresso: Dia ${current_day} de 33 (${completed_days?.length || 0} dias concluídos)`, m, y); y += 14; }
      if (status) { doc.text(`Situação: ${statusMap[status] || status}`, m, y); y += 14; }
      if (completed_date) { doc.text(`Conclusão: ${formatDate(completed_date)}`, m, y); y += 14; }
    }

    if (journeyData.journeys && journeyData.journeys.length > 0) {
      y += 6;
      doc.setFont('helvetica', 'bold'); doc.text('Jornadas Coletivas Participadas:', m, y); y += 14;
      doc.setFont('helvetica', 'normal');
      journeyData.journeys.forEach((j) => {
        const line = `• ${j.title}${j.joined_date ? ` — Ingresso: ${formatDate(j.joined_date)}` : ''}${j.progress != null ? ` — Progresso: ${j.progress}%` : ''}`;
        const wrapped = doc.splitTextToSize(line, pageW - m * 2);
        wrapped.forEach((l) => {
          if (y > pageH - 180) { doc.addPage('a4', 'portrait'); y = m; }
          doc.text(l, m, y); y += 14;
        });
      });
    }

    y += 14;
    // re-draw signature area if it shifted
    const newSigY = Math.max(y, pageH - 110);
    // only redraw if we haven't overflowed into new page territory
    if (newSigY < pageH - 60) {
      doc.setFillColor(255, 252, 245);
      // re-position footer
    }
  }

  // ========== PÁGINA 2: TERMO DECLARATÓRIO ==========
  if (settings.declaration_text) {
    doc.addPage('a4', 'portrait');
    doc.setFillColor(255, 252, 245);
    doc.rect(0, 0, pageW, pageH, 'F');
    drawBorder(doc, pageW, pageH, style, pr, pg, pb, ar, ag, ab, m);

    let ay = m + 10;

    doc.setTextColor(ar, ag, ab); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text('✦', pageW / 2, ay, { align: 'center' });
    ay += 20;

    doc.setTextColor(pr, pg, pb); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Termo Declaratório', pageW / 2, ay, { align: 'center' });
    ay += 8;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
    doc.line(pageW / 2 - 70, ay, pageW / 2 + 70, ay);
    ay += 28;

    // Identificação
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
    const idLines = doc.splitTextToSize(
      `Eu, ${userData.name || '—'}, portador(a) do e-mail ${userData.email || '—'},` +
      `${userData.city || userData.state ? ` residente em ${location},` : ''}` +
      ' declaro sob as penas da lei que as informações fornecidas são verdadeiras e que li e compreendi integralmente o documento apresentado:',
      pageW - m * 2
    );
    idLines.forEach((line) => { doc.text(line, m, ay); ay += 15; });
    ay += 14;

    // Texto do termo
    const declText = fillPlaceholders(settings.declaration_text, data);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 45, 60);
    const declLines = doc.splitTextToSize(declText, pageW - m * 2);
    declLines.forEach((line) => {
      if (ay > pageH - 160) { doc.addPage('a4', 'portrait'); ay = m; }
      doc.text(line, m, ay);
      ay += 14;
    });

    ay += 20;

    doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.setTextColor(100, 90, 120);
    doc.text(`${location || '—'}, ${formatDate(requestDate)}`, m, ay);
    ay += 36;

    const aSigY = Math.max(ay, pageH - 110);
    drawSignature(doc, sigImg, signature, m, aSigY, pr, pg, pb);
    doc.text(userData.name || '—', m + 100, aSigY + 26, { align: 'center' });

    if (settings.footer_text) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
      doc.text(settings.footer_text, pageW / 2, pageH - 28, { align: 'center' });
    }
  }

  return doc;
}