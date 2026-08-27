import { jsPDF } from 'jspdf';

const hexToRgb = (hex) => {
  if (!hex || !hex.startsWith('#')) return [103, 58, 183];
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return [r, g, b];
};

const formatDate = (d) => {
  if (!d) return '—';
  const s = typeof d === 'string' && d.length === 10 ? d + 'T00:00:00' : d;
  try {
    return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return '—'; }
};

const loadImage = (url) => new Promise((resolve) => {
  if (!url) { resolve(null); return; }
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

const fillPlaceholders = (text, data) => stripHtml((text || '')
  .replace(/\{nome\}/g, data.userName || '—')
  .replace(/\{codigo\}/g, data.uniqueCode || '—')
  .replace(/\{vendedor\}/g, data.sellerName || '—')
  .replace(/\{data_compra\}/g, formatDate(data.purchaseDate))
  .replace(/\{data_recebimento\}/g, formatDate(data.receiptDate))
  .replace(/\{data\}/g, formatDate(data.issueDate)));

export async function generateWarrantyPdf({ settings, cadeiazinha, userName, issueDate }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const data = {
    userName,
    uniqueCode: cadeiazinha.unique_code,
    sellerName: cadeiazinha.seller_name,
    purchaseDate: cadeiazinha.purchase_date,
    receiptDate: cadeiazinha.receipt_date,
    issueDate: issueDate || new Date().toISOString().slice(0, 10)
  };

  // Pré-carregar imagens
  const logoImg = settings.logo_url ? await loadImage(settings.logo_url) : null;
  const sigImg = settings.signature_url ? await loadImage(settings.signature_url) : null;
  const photoImg = cadeiazinha.photos?.[0] ? await loadImage(cadeiazinha.photos[0]) : null;

  const [pr, pg, pb] = hexToRgb(settings.primary_color);
  const [ar, ag, ab] = hexToRgb(settings.accent_color);
  const style = settings.border_style || 'classic';

  // ========== PÁGINA 1: CERTIFICADO DE GARANTIA VITALÍCIA ==========
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  // Fundo
  doc.setFillColor(255, 252, 245);
  doc.rect(0, 0, pageW, pageH, 'F');

  // Borda
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

  let y = 70;

  // Logo
  if (logoImg) {
    try { doc.addImage(logoImg, 'PNG', pageW / 2 - 35, y, 70, 70); } catch {}
    y += 80;
  } else {
    doc.setTextColor(ar, ag, ab); doc.setFontSize(14); doc.setFont('helvetica', 'normal');
    doc.text('✦', pageW / 2, y, { align: 'center' });
    y += 22;
  }

  // Título
  doc.setTextColor(pr, pg, pb); doc.setFontSize(24); doc.setFont('helvetica', 'bold');
  doc.text(settings.cert_title || 'Certificado de Garantia Vitalícia', pageW / 2, y, { align: 'center' });
  y += 28;

  // "Concedemos a"
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 70, 90);
  doc.text('Concedido a', pageW / 2, y, { align: 'center' });
  y += 28;

  // Nome
  doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(pr, pg, pb);
  doc.text(data.userName || '—', pageW / 2, y, { align: 'center' });
  y += 10;
  doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
  const nameW = Math.min(doc.getTextWidth(data.userName || '—') + 60, 350);
  doc.line(pageW / 2 - nameW / 2, y, pageW / 2 + nameW / 2, y);
  y += 26;

  // Texto principal do certificado
  const bodyText = fillPlaceholders(settings.cert_body_text, data);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
  const bodyLines = doc.splitTextToSize(bodyText, pageW - margin * 2 - 100);
  bodyLines.forEach((line) => {
    doc.text(line, pageW / 2, y, { align: 'center' });
    y += 15;
  });

  y += 8;

  // Dados da compra em duas colunas
  const colY = y;
  const leftX = margin + 60;
  const rightX = pageW / 2 + 40;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(ar, ag, ab);
  doc.text('Código único:', leftX, colY);
  doc.text('Vendedor:', rightX, colY);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
  doc.text(data.uniqueCode || '—', leftX + 70, colY);
  doc.text(data.sellerName || '—', rightX + 55, colY);

  doc.setFont('helvetica', 'bold'); doc.setTextColor(ar, ag, ab);
  doc.text('Data da compra:', leftX, colY + 16);
  doc.text('Data do recebimento:', rightX, colY + 16);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
  doc.text(formatDate(data.purchaseDate), leftX + 70, colY + 16);
  doc.text(formatDate(data.receiptDate), rightX + 85, colY + 16);

  // Foto do produto (canto direito)
  if (photoImg) {
    try {
      const photoX = pageW - margin - 110;
      const photoY = 90;
      doc.setDrawColor(ar, ag, ab); doc.setLineWidth(1);
      doc.rect(photoX - 4, photoY - 4, 108, 108);
      doc.addImage(photoImg, 'PNG', photoX, photoY, 100, 100);
    } catch {}
  }

  // Assinatura do emissor
  const sigY = pageH - 80;
  const sigX = pageW / 2;
  if (sigImg) {
    try { doc.addImage(sigImg, 'PNG', sigX - 60, sigY - 35, 120, 35); } catch {}
  }
  doc.setDrawColor(120, 110, 130); doc.setLineWidth(0.5);
  doc.line(sigX - 90, sigY, sigX + 90, sigY);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 90, 120);
  doc.text(settings.issuer_name || 'Theotokos', sigX, sigY + 14, { align: 'center' });

  // Rodapé
  if (settings.footer_text) {
    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
    doc.text(settings.footer_text, pageW / 2, pageH - 22, { align: 'center' });
  }

  // ========== PÁGINA 2: TERMO DE GARANTIA VITALÍCIA ==========
  if (settings.term_text && settings.term_text.trim()) {
    doc.addPage('a4', 'portrait');
    const pW = doc.internal.pageSize.getWidth();
    const pH = doc.internal.pageSize.getHeight();
    const m = 56;

    // Fundo
    doc.setFillColor(255, 252, 245);
    doc.rect(0, 0, pW, pH, 'F');

    // Borda
    if (style === 'classic') {
      doc.setDrawColor(ar, ag, ab); doc.setLineWidth(2);
      doc.rect(m - 16, m - 16, pW - (m - 16) * 2, pH - (m - 16) * 2);
      doc.setLineWidth(0.5);
      doc.rect(m - 10, m - 10, pW - (m - 10) * 2, pH - (m - 10) * 2);
    } else if (style === 'modern') {
      doc.setDrawColor(pr, pg, pb); doc.setLineWidth(4);
      doc.rect(m - 16, m - 16, pW - (m - 16) * 2, pH - (m - 16) * 2);
    } else {
      doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
      doc.rect(m - 10, m - 10, pW - (m - 10) * 2, pH - (m - 10) * 2);
    }

    let ay = m + 10;

    // Ornamento
    doc.setTextColor(ar, ag, ab); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
    doc.text('✦', pW / 2, ay, { align: 'center' });
    ay += 20;

    // Título
    doc.setTextColor(pr, pg, pb); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
    doc.text('Termo de Garantia Vitalícia', pW / 2, ay, { align: 'center' });
    ay += 8;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.5);
    doc.line(pW / 2 - 80, ay, pW / 2 + 80, ay);
    ay += 28;

    // Identificação
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 50, 70);
    const idLines = doc.splitTextToSize(
      `Eu, ${data.userName || '—'}, portador(a) do código único ${data.uniqueCode || '—'}, ` +
      `adquiri minha cadeiazinha Theotokos com ${data.sellerName ? `o vendedor ${data.sellerName}` : ''} ` +
      `em ${formatDate(data.purchaseDate)}${data.receiptDate ? `, recebida em ${formatDate(data.receiptDate)}` : ''}.`,
      pW - m * 2
    );
    idLines.forEach((line) => { doc.text(line, m, ay); ay += 15; });
    ay += 14;

    // Texto do termo
    const termText = fillPlaceholders(settings.term_text, data);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(50, 45, 60);
    const termLines = doc.splitTextToSize(termText, pW - m * 2);
    termLines.forEach((line) => {
      if (ay > pH - 120) { doc.addPage('a4', 'portrait'); ay = m; }
      doc.text(line, m, ay);
      ay += 14;
    });

    ay += 24;

    // Data e local
    doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 90, 120);
    doc.text(`Emitido em ${formatDate(data.issueDate)}`, m, ay);
    ay += 36;

    // Assinatura do emissor
    const aSigY = Math.max(ay, pH - 100);
    if (sigImg) {
      try { doc.addImage(sigImg, 'PNG', m, aSigY - 30, 140, 35); } catch {}
    }
    doc.setDrawColor(120, 110, 130); doc.setLineWidth(0.5);
    doc.line(m, aSigY, m + 200, aSigY);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 90, 120);
    doc.text(settings.issuer_name || 'Theotokos', m + 100, aSigY + 14, { align: 'center' });

    // Rodapé
    if (settings.footer_text) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(140, 130, 150);
      doc.text(settings.footer_text, pW / 2, pH - 28, { align: 'center' });
    }
  }

  return doc;
}