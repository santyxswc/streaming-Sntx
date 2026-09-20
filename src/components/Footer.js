'use client';
import { useState } from 'react';
import { Coffee } from 'lucide-react';
import DonateModal from './DonateModal';

export default function Footer() {
  const [donateModalOpen, setDonateModalOpen] = useState(false);
  const cafecitoUsername = process.env.NEXT_PUBLIC_CAFECITO_USERNAME;

  return (
    <footer className="px-4 md:px-12 py-12 border-t border-secondary text-gray-400 text-sm">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <p>© 2026 Luvana Library. Una experiencia de streaming cinematográfica.</p>
        {cafecitoUsername && (
          <button
            onClick={() => setDonateModalOpen(true)}
            className="flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            <Coffee size={18} />
            ¿Te gusta Luvana? Apóyanos con un café.
          </button>
        )}
      </div>
      <DonateModal
        isOpen={donateModalOpen}
        onClose={() => setDonateModalOpen(false)}
        cafecitoUsername={cafecitoUsername}
      />
    </footer>
  );
}
