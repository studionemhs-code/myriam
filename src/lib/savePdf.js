// Salva/abre um PDF (jsPDF) de forma compatível com mobile.
// No mobile, o doc.save() do jsPDF frequentemente falha porque é executado
// após chamadas assíncronas (fora do gesto do toque). Abriremos o PDF em uma
// nova aba via blob URL; se o popup for bloqueado, navegamos para o blob.
export function downloadPdf(doc, fileName) {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  if (!isMobile) {
    doc.save(fileName);
    return;
  }
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    // Fallback final: salva normalmente
    try { doc.save(fileName); } catch {}
  }
}