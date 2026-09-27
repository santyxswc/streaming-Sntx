'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import AISearchPanel from './AISearchPanel';

export default function AISearch({ isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] bg-[#141414] rounded-[2rem] md:rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col"
          >
            <div className="p-4 md:p-8 flex items-center justify-between border-b border-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <Sparkles size={24} className="text-white fill-white/20" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight leading-none">Pregúntale a la IA</h2>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Encuentra un título sin saber el nombre</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
              <AISearchPanel onResultNavigate={onClose} autoFocus />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
