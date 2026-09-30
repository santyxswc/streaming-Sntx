'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Coffee } from 'lucide-react';
import { openConsentPreferences } from '@/lib/consent';
import DonateModal from '@/features/donations/components/DonateModal';

export default function Footer() {
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const cafecitoUsername = process.env.NEXT_PUBLIC_CAFECITO_USERNAME;

  return (
    <footer className="px-4 md:px-12 py-12 border-t border-white/10 text-gray-400 text-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <p className="font-display">
          <span className="text-foreground font-bold">streaming<span className="text-secondary">-Sntx</span></span>
          {' '}© 2026. Una experiencia de streaming cinematográfica.
        </p>
        {cafecitoUsername && (
          <button
            onClick={() => setDonateModalOpen(true)}
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            <Coffee size={18} />
            ¿Te gusta streaming-Sntx? Apóyanos con un café.
          </button>
        )}
      </div>
      <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
        <p>Este producto usa la API de TMDB pero no está respaldado ni certificado por TMDB.</p>
        <nav aria-label="Legal" className="flex gap-4">
          <Link href="/privacidad" className="hover:text-gray-300 transition-colors">
            Privacidad
          </Link>
          <button type="button" onClick={openConsentPreferences} className="hover:text-gray-300 transition-colors">
            Preferencias de cookies
          </button>
        </nav>
      </div>
      <DonateModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
        cafecitoUsername={cafecitoUsername}
      />
    </footer>
  );
}
