import React from 'react';

// Ícone padrão do assistente IA — halo dourado com estrela mariana (SVG inline)
export default function FloatingAgentIcon({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="24" r="22" fill="url(#fa-halo)" />
      <path
        d="M24 9.5l3.2 6.5 7.1 1-5.1 5 1.2 7.1-6.4-3.4-6.4 3.4 1.2-7.1-5.1-5 7.1-1z"
        fill="#fff"
        stroke="#fff"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <defs>
        <radialGradient id="fa-halo" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#c9a14a" stopOpacity="0.95" />
          <stop offset="0.7" stopColor="#673ab7" stopOpacity="0.9" />
          <stop offset="1" stopColor="#4a1d8a" stopOpacity="0.85" />
        </radialGradient>
      </defs>
    </svg>
  );
}