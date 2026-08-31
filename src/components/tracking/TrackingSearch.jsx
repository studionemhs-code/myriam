import React, { useState } from 'react';
import { Search } from 'lucide-react';

export default function TrackingSearch({ initialCode = '', loading, onSearch }) {
  const [code, setCode] = useState(initialCode);
  const submit = (event) => {
    event.preventDefault();
    if (code.trim()) onSearch(code.trim().toUpperCase());
  };
  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        value={code}
        onChange={(event) => setCode(event.target.value.toUpperCase())}
        placeholder="Ex: OP123456789BR"
        aria-label="Código de rastreio"
        className="min-w-0 flex-1 rounded-xl border border-input bg-background px-4 py-3 text-sm uppercase outline-none focus:border-primary"
      />
      <button disabled={loading || !code.trim()} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">
        <Search className="h-4 w-4" /> Rastrear
      </button>
    </form>
  );
}