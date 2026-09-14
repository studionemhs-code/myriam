import React from 'react';

export default function AgentUnreadBadge({ count }) {
  if (!count) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span className="pointer-events-none absolute -right-1 -top-1 z-10 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow ring-2 ring-background" aria-hidden="true">
      {label}
    </span>
  );
}