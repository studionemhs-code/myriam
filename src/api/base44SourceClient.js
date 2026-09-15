import { createClient } from '@base44/sdk';

export const base44Source = createClient({
  appId: import.meta.env.VITE_BASE44_APP_ID
});