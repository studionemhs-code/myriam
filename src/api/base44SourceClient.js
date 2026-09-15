import { createClient } from '@base44/sdk';

// Mantém o destino da integração quando o build externo não define a variável.
export const base44Source = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID?.trim() || '6a874a7d3ea0948ad718c3b8'
});