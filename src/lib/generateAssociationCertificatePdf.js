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
    .replace(/\{nome\}/g, data.nome || '—')
    .replace(/\{numero\}/g, data.numero || '—')
    .replace(/\{data\}/g, formatDate(data.data)));
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

export async function generateAssociationCertificatePdf({ settings, userName, inscriptionNumber, approvedDate }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const m = 56;

  const [pr, pg, pb] = hexToRgb(settings.cert_primary_color || settings.primary_color);
  const [ar, ag, ab] = hexToRgb(settings.cert_accent_color || settings.accent_color);
  const style = settings.cert_border_style || settings.border_style || 'classic';

  doc.setFillColor(255, 252, 245);
  doc.rect(0, 0, pageW, pageH, 'F');
  drawBorder(doc, pageW, pageH, style, pr, pg, pb, ar, ag, ab, m);

  let y = m + 25;

  // Logo
  const logoImg = await loadImage(settings.cert_logo_url);
  if (logoImg) {
    try { doc.addImage(logoImg, 'PNG', pageW / 2 - 40, y, 80, 80); } catch {}
    y += 100;
  } else {
    doc.setTextColor(ar, ag, ab); doc.setFontSize(28); doc.setFont('helvetica', 'normal');
    doc.text('✦', pageW / 2, y, { align: 'center' });
    y += 30;
  }

  // Title
  doc.setTextColor(pr, pg, pb); doc.setFontSize(26); doc.setFont('helvetica', 'bold');
  doc.text(settings.cert_title || 'Certificado de Ingresso', pageW / 2, y, { align: 'center' });
  y += 10;
  doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 100, y, pageW / 2 + 100, y);
  y += 28;

  // Subtitle
  if (settings.cert_subtitle) {
    doc.setFontSize(13); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 90, 120);
    doc.text(settings.cert_subtitle, pageW / 2, y, { align: 'center' });
    y += 35;
  }

  // Body text
  const data = { nome: userName, numero: inscriptionNumber, data: approvedDate };
  const bodyText = fillPlaceholders(settings.cert_body_text || '', data);
  doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 45, 60);
  const bodyLines = doc.splitTextToSize(bodyText, pageW - m * 2 - 20);
  bodyLines.forEach((line) => {
    doc.text(line, pageW / 2, y, { align: 'center' });
    y += 18;
  });

  y += 25;

  // Inscription number box
  doc.setFillColor(ar, ag, ab);
  doc.roundedRect(pageW / 2 - 90, y, 180, 30, 5, 5, 'FD');
  doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text(`Nº ${inscriptionNumber}`, pageW / 2, y + 19, { align: 'center' });
  y += 55;

  // Date
  doc.setFont('helvetica', 'italic'); doc.setFontSize(11); doc.setTextColor(100, 90, 120);
  doc.text(`Emitido em ${formatDate(approvedDate)}`, pageW / 2, y, { align: 'center' });
  y += 60;

  // Signature
  const sigImg = await loadImage(settings.cert_signature_url);
  if (sigImg) {
    try { doc.addImage(sigImg, 'PNG', pageW / 2 - 60, y - 38, 120, 40); } catch {}
  }
  doc.setDrawColor(120, 110, 130); doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 100, y, pageW / 2 + 100, y);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 90, 120);
  doc.text(settings.cert_issuer_name || settings.issuer_name || 'Associação Maria Rainha dos Corações', pageW / 2, y + 14, { align: 'center' });

  // Footer
  if (settings.cert_footer_text || settings.footer_text) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
    doc.text(settings.cert_footer_text || settings.footer_text, pageW / 2, pageH - 28, { align: 'center' });
  }

  return doc;
}