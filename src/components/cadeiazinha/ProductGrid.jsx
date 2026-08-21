import React from 'react';
import { Check } from 'lucide-react';

// Grid de seleção de produtos
// mode: 'single' (seleção única) | 'multi' (seleção múltipla)
export default function ProductGrid({ products, selected, onSelect, mode = 'multi', emptyText = 'Nenhum produto disponível.' }) {
  if (!products || products.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  }

  const isSelected = (slug) => {
    if (mode === 'single') return selected === slug;
    return (selected || []).includes(slug);
  };

  const handleClick = (slug) => {
    if (mode === 'single') {
      onSelect(selected === slug ? '' : slug);
    } else {
      if ((selected || []).includes(slug)) {
        onSelect((selected || []).filter((s) => s !== slug));
      } else {
        onSelect([...(selected || []), slug]);
      }
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => {
        const sel = isSelected(p.slug);
        const outOfStock = !p.in_stock || p.stock_quantity === 0;
        const lowStock = p.stock_quantity !== null && p.stock_quantity !== undefined && p.stock_quantity > 0 && p.stock_quantity <= 3;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => handleClick(p.slug)}
            disabled={outOfStock}
            className={`relative overflow-hidden rounded-xl border-2 bg-card text-left transition ${
              sel ? 'border-primary ring-2 ring-primary/20' : outOfStock ? 'border-border opacity-50' : 'border-border hover:border-primary/40'
            }`}
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              {p.image_url ? (
                <img src={p.image_url} alt={p.label} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
              )}
              {outOfStock && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-[10px] font-semibold uppercase text-white">
                  Esgotado
                </span>
              )}
              {!outOfStock && lowStock && (
                <span className="absolute right-1 top-1 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-semibold text-deep">
                  {p.stock_quantity} rest.
                </span>
              )}
              {sel && (
                <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium">{p.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}