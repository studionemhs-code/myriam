import React from 'react';

export default function MyriamIcon({ className = '' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Diamante arredondado (contorno fino) */}
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="3"
        transform="rotate(45 12 12)"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Cadeia de elos (círculo) */}
      <circle
        cx="12"
        cy="12"
        r="6.5"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Letra M estilizada (preenchida) */}
      <path
        d="M 7 16.5 L 8 8 L 10 8 L 12 12 L 14 8 L 16 8 L 17 16.5 L 15 16.5 L 14.5 10 L 12 14 L 9.5 10 L 9 16.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}