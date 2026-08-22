// Helpers de salvamento de PDF (jsPDF) compatíveis com mobile.
// No mobile, o doc.save() do jsPDF falha porque é executado após chamadas
// assíncronas (fora do gesto do toque). Por isso, no mobile expomos a URL
// do blob para o usuário tocar em um link real (gesto válido).

export function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

// Tenta o download/open automático. Usado no desktop (gesto ainda válido
// pois não há problema) e como fallback. Retorna a blob URL criada quando
// o download automático não pôde ser confirmado (mobile), para o caller
// poder exibir um link; caso contrário retorna null.
export function downloadPdf(doc, fileName) {
  if (!isMobile()) {
    doc.save(fileName);
    return null;
  }
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    // popup bloqueado — retorna a url para o caller mostrar um link
    return url;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return null;
}

// Cria uma blob URL a partir do doc jsPDF (para exibir link no mobile).
export function blobUrlFromDoc(doc) {
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}