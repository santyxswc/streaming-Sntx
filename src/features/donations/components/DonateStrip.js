'use client';
import { useState } from 'react';
import { Coffee, MousePointerClick } from 'lucide-react';
import DonateModal from '@/features/donations/components/DonateModal';

export default function DonateStrip() {
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const cafecitoUsername = process.env.NEXT_PUBLIC_CAFECITO_USERNAME;

  if (!cafecitoUsername) return null;

  return (
    <>
      <button
        onClick={() => setDonateModalOpen(true)}
        className="group relative z-20 w-full flex items-center justify-center gap-2 py-3 px-4 transition-colors border-y border-white/5 bg-background/95 hover:bg-amber-500/5 backdrop-blur-sm"
        aria-label="Apoyar a streaming-Sntx con una donación"
      >
        <Coffee size={16} className="shrink-0 text-amber-400 opacity-90" />
        <span className="text-sm font-medium">
          <span className="text-amber-400">¿Te gusta streaming-Sntx?</span>
          <span className="text-gray-400 group-hover:text-gray-300 transition-colors"> Apóyanos con un café.</span>
        </span>
        <MousePointerClick size={14} className="shrink-0 text-gray-500 group-hover:text-amber-400/80 transition-colors animate-pulse" />
      </button>
      <DonateModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
        cafecitoUsername={cafecitoUsername}
      />
    </>
  );
}
