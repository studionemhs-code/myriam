// Abertura segura de checkout externo e retorno ao app.
// Plataformas externas raramente permitem iframe; abrimos em nova aba/Custom Tab
// e o usuário volta pela página /pagamento/retorno, que confirma a liberação.

const EMAIL_PARAM = { hotmart: 'email', kiwify: 'email', ticto: 'email', stripe: 'prefilled_email', infinitepay: 'email' };

export function buildCheckoutUrl(product, integration, user) {
  if (!product?.checkout_url) return null;
  try {
    const url = new URL(product.checkout_url);
    const param = EMAIL_PARAM[integration?.platform] || 'email';
    if (user?.email && !url.searchParams.has(param)) url.searchParams.set(param, user.email);
    return url.toString();
  } catch {
    return product.checkout_url;
  }
}

export function openCheckout(product, integration, user, returnTo) {
  const url = buildCheckoutUrl(product, integration, user);
  if (!url) return false;
  sessionStorage.setItem('checkout_return_to', returnTo || window.location.pathname);
  sessionStorage.setItem('checkout_product_id', product.id);
  const win = window.open(url, '_blank', 'noopener,noreferrer');
  if (!win) window.location.href = url;
  return true;
}