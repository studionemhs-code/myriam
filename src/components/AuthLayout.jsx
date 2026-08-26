import React from "react";
import { Instagram } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const STORAGE = "https://strrnkxrpyjyaewfpiwh.supabase.co/storage/v1/object/public/uploads/brand";
const BG_IMAGE_DESKTOP = `${STORAGE}/auth-bg-desktop.png`;
const BG_IMAGE_MOBILE = `${STORAGE}/auth-bg-mobile.png`;

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none lg:hidden"
        style={{ backgroundImage: `url(${BG_IMAGE_MOBILE})` }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center opacity-40 pointer-events-none lg:block"
        style={{ backgroundImage: `url(${BG_IMAGE_DESKTOP})` }}
      />
      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>
      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-2">
            <Logo size="xl" variant="light" subtitle={false} stacked />
          </div>
          <p className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Consagrar, Conectar e Conscientizar</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">by Theotokos Artigos Católicos</p>
          <a
            href="https://instagram.com/loja.theotokos"
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition"
          >
            <Instagram className="h-3.5 w-3.5" />
            @loja.theotokos
          </a>
        </div>
      </div>
    </div>
  );
}