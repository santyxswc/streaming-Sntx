'use client';
import { memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, Coffee } from 'lucide-react';

const CAFECITO_BUTTON_IMGS = {
  default: 'https://cdn.cafecito.app/imgs/buttons/button_5.png',
  retina: 'https://cdn.cafecito.app/imgs/buttons/button_5_2x.png',
  high: 'https://cdn.cafecito.app/imgs/buttons/button_5_3.75x.png',
};

function DonateModal({ isOpen, onClose, cafecitoUsername }) {
  if (!isOpen || !cafecitoUsername) return null;

  const cafecitoUrl = `https://cafecito.app/${cafecitoUsername}`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg my-auto flex flex-col bg-[#181818] border border-white/10 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl shrink-0"
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
            aria-label="Cerrar"
          >
            <CloseIcon size={22} className="sm:w-6 sm:h-6" />
          </button>

          <div className="flex flex-col overflow-hidden">
            <div className="flex flex-col items-center text-center p-3 sm:p-5 pb-2 border-b border-white/5 shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center mb-2 sm:mb-3">
                <Coffee size={20} className="sm:w-6 sm:h-6 text-amber-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-tighter mb-1 text-white">
                Donar un café a streaming-Sntx ☕
              </h3>
              <p className="text-gray-400 text-xs max-w-sm leading-relaxed">
                Tu donación nos ayuda a seguir ofreciendo streaming-Sntx gratis para todos, sin anuncios que interrumpan tu película o serie. Cada aporte suma para que sigas disfrutando de la experiencia gratuita 💜
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-6 sm:p-8 bg-white/5">
              <a
                href={cafecitoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-transform hover:scale-105 active:scale-95"
              >
                <Image
                  src={CAFECITO_BUTTON_IMGS.default}
                  alt="Invitame un café en cafecito.app"
                  width={192}
                  height={40}
                  className="h-auto w-auto max-w-full"
                  unoptimized
                />
              </a>
            </div>
            <div className="p-2 sm:p-3 text-center border-t border-white/5 shrink-0">
              <a
                href={cafecitoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-500 hover:text-amber-400 transition-colors"
              >
                Abrir en Cafecito en nueva pestaña
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default memo(DonateModal);
