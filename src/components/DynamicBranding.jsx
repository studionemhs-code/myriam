import React, { useEffect } from 'react';
import { usePersonalizationSettings } from '@/hooks/usePersonalizationSettings';

/**
 * Atualiza dinamicamente o favicon e o título da aba do navegador
 * conforme as configurações de personalização definidas pelo admin.
 */
export default function DynamicBranding() {
  const { settings } = usePersonalizationSettings();

  useEffect(() => {
    if (!settings) return;
    if (settings.favicon_url) {
      document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach((el) => {
        el.setAttribute('href', settings.favicon_url);
      });
    }
  }, [settings]);

  return null;
}