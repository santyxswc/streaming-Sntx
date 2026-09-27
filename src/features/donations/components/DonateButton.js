'use client';
import { Coffee } from 'lucide-react';

export default function DonateButton({ onClick, variant = 'navbar' }) {
  const cafecitoUsername = process.env.NEXT_PUBLIC_CAFECITO_USERNAME;

  if (!cafecitoUsername) return null;

  const baseClasses = 'flex items-center gap-2 rounded-full text-xs font-black uppercase tracking-widest transition-all border border-amber-500/50 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300';

  if (variant === 'drawer') {
    return (
      <button
        onClick={onClick}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg hover:bg-white/10 text-white font-medium text-left"
        aria-label="Abrir modal de donaciones"
      >
        <Coffee size={20} className="text-amber-400 shrink-0" />
        Apóyanos
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} px-4 py-2 hover:scale-105 active:scale-95`}
      aria-label="Abrir modal de donaciones"
    >
      <Coffee size={16} className="shrink-0" />
      <span className="hidden md:inline">Apóyanos</span>
    </button>
  );
}
