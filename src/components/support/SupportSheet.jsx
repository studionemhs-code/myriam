import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Mail, Phone, Globe, LifeBuoy } from 'lucide-react';
import { useSupportSettings } from '@/hooks/useSupportSettings';

export default function SupportSheet({ open, onClose }) {
  const { settings, loading } = useSupportSettings();

  const contacts = [];
  if (settings?.whatsapp) {
    const num = settings.whatsapp.replace(/\D/g, '');
    contacts.push({
      icon: MessageCircle,
      label: 'WhatsApp',
      value: settings.whatsapp,
      href: `https://wa.me/${num}`,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    });
  }
  if (settings?.email) {
    contacts.push({
      icon: Mail,
      label: 'E-mail',
      value: settings.email,
      href: `mailto:${settings.email}`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    });
  }
  if (settings?.phone) {
    const num = settings.phone.replace(/\D/g, '');
    contacts.push({
      icon: Phone,
      label: 'Telefone',
      value: settings.phone,
      href: `tel:${num}`,
      color: 'text-gold',
      bg: 'bg-gold/10',
    });
  }
  if (settings?.site_url) {
    contacts.push({
      icon: Globe,
      label: 'Site de Ajuda',
      value: settings.site_url,
      href: settings.site_url,
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
      external: true,
    });
  }

  const visible = settings?.enabled !== false;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-[61] rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-gold" />
                <h2 className="font-display text-lg">Suporte</h2>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mx-auto mb-3 mt-2 h-1 w-10 rounded-full bg-muted" />

            <div className="px-5 pb-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
              ) : !visible ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  O suporte não está disponível no momento.
                </p>
              ) : contacts.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum contato de suporte cadastrado.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Precisa de ajuda? Entre em contato por um dos canais abaixo:
                  </p>
                  <div className="space-y-2">
                    {contacts.map((c, i) => {
                      const Icon = c.icon;
                      return (
                        <a
                          key={i}
                          href={c.href}
                          target={c.external ? '_blank' : undefined}
                          rel={c.external ? 'noopener noreferrer' : undefined}
                          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 transition hover:border-gold/40 hover:bg-muted/30"
                        >
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${c.bg}`}>
                            <Icon className={`h-5 w-5 ${c.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{c.label}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.value}</p>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}