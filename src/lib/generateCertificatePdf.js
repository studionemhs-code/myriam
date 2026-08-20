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
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return ''; }
};

const tipoLabel = (t) => ({
  preparacao: 'Consagração Total',
  jornada: 'Jornada de Consagração',
  renovacao: 'Renovação da Consagração'
}[t] || 'Consagração');

const loadImage = (url) => new Promise((resolve) => {
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

const stripHtml = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

export async function generateCertificatePdf({ template, userData, signature, issueDate, certificateType, journeyTitle }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const [pr, pg, pb] = hexToRgb(template.primary_color);
  const [ar, ag, ab] = hexToRgb(template.accent_color);

  // Fundo
  doc.setFillColor(255, 252, 245);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Borda
  const style = template.border_style || 'classic';
  if (style === 'classic') {
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(3);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);
    doc.setLineWidth(1);
    doc.rect(margin + 8, margin + 8, pageW - margin * 2 - 16, pageH - margin * 2 - 16);
  } else if (style === 'modern') {
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(6);
    doc.rect(margin, margin, pageW - margin * 2, pageH - margin * 2);
  } else {
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(1);
    doc.rect(margin + 4, margin + 4, pageW - margin * 2 - 8, pageH - margin * 2 - 8);
  }

  let y = 85;

  // Ornamento
  doc.setTextColor(ar, ag, ab); doc.setFontSize(14); doc.setFont('helvetica', 'normal');
  doc.text('✦', pageW / 2, y, { align: 'center' });
  y += 22;

  // Título
  doc.setTextColor(pr, pg, pb); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(template.title || 'Certificado', pageW / 2, y, { align: 'center' });
  y += 28;

  // Subtítulo
  if (template.subtitle) {
    doc.setFontSize(13); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 90, 120);
    doc.text(template.subtitle, pageW / 2, y, { align: 'center' });
    y += 22;
  }

  // "Concedemos a"
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 70, 90);
  doc.text('Concedemos a', pageW / 2, y, { align: 'center' });
  y += 28;

  // Nome
  doc.setFontSize(32); doc.setFont('helvetica', 'bold'); doc.setTextColor(pr, pg, pb);
  doc.text(userData.name || '—', pageW / 2, y, { align: 'center' });
  y += 12;
  doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
  const nameW = Math.min(doc.getTextWidth(userData.name || '—') + 60, 350);
  doc.line(pageW / 2 - nameW / 2, y, pageW / 2 + nameW / 2, y);
  y += 28;

  // Texto principal
  const body = stripHtml((template.body_text || '')
    .replace(/\{nome\}/g, userData.name || '')
    .replace(/\{data\}/g, formatDate(issueDate))
    .replace(/\{tipo\}/g, tipoLabel(certificateType))
    .replace(/\{jornada\}/g, journeyTitle || ''));

  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
  const lines = doc.splitTextToSize(body, pageW - margin * 2 - 100);
  lines.forEach((line) => {
    doc.text(line, pageW / 2, y, { align: 'center' });
    y += 16;
  });

  y += 10;
  doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 90, 120);
  doc.text(formatDate(issueDate), pageW / 2, y, { align: 'center' });

  // Assinaturas
  const sigY = pageH - 90;
  const sigUserX = pageW * 0.28;
  const sigIssuerX = pageW * 0.72;

  // Assinatura do usuário
  if (signature.type === 'uploaded' && signature.data) {
    const imgData = await loadImage(signature.data);
    if (imgData) {
      try { doc.addImage(imgData, 'PNG', sigUserX - 60, sigY - 35, 120, 35); } catch {}
    }
  } else if (signature.type === 'typed' && signature.data) {
    doc.setFontSize(22); doc.setFont('helvetica', 'italic'); doc.setTextColor(pr, pg, pb);
    doc.text(signature.data, sigUserX, sigY - 5, { align: 'center' });
  }

  doc.setDrawColor(120, 110, 130); doc.setLineWidth(0.5);
  doc.line(sigUserX - 90, sigY, sigUserX + 90, sigY);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 90, 120);
  doc.text('Assinatura do Consagrado', sigUserX, sigY + 14, { align: 'center' });

  // Assinatura do emissor
  if (template.issuer_signature_url) {
    const imgData = await loadImage(template.issuer_signature_url);
    if (imgData) {
      try { doc.addImage(imgData, 'PNG', sigIssuerX - 60, sigY - 35, 120, 35); } catch {}
    }
  }
  doc.line(sigIssuerX - 90, sigY, sigIssuerX + 90, sigY);
  doc.text(template.issuer_name || 'Theotokos', sigIssuerX, sigY + 14, { align: 'center' });

  // Rodapé
  if (template.footer_text) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
    doc.text(template.footer_text, pageW / 2, pageH - 22, { align: 'center' });
  }

  return doc;
}