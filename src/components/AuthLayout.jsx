import React from "react";
import { Instagram } from "lucide-react";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const BG_IMAGE_DESKTOP = "https://media.base44.com/images/public/6a874a7d3ea0948ad718c3b8/74db67cd0_23a05438-04ed-418c-9255-2eb6f3b8fb7a.png";
const BG_IMAGE_MOBILE = "https://media.base44.com/images/public/6a874a7d3ea0948ad718c3b8/64d95bf77_ChatGPTImage21deagode202615_27_02.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background px-4 py-8 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.18] pointer-events-none lg:hidden"
        style={{ backgroundImage: `url(${BG_IMAGE_MOBILE})` }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center opacity-[0.18] pointer-events-none lg:block"
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