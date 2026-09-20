'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X as CloseIcon, Copy, Check, Facebook, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ShareModal = ({ isOpen, onClose, item }) => {
  const [copied, setCopied] = useState(false);
  
  if (!isOpen) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = `Mira ${item.title} en Luvana`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const socialLinks = [
    { 
      name: 'WhatsApp', 
      icon: <MessageCircle className="w-6 h-6" />, 
      color: 'bg-[#25D366]',
      url: `https://web.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}` 
    },
    { 
      name: 'Facebook', 
      icon: <Facebook className="w-6 h-6" />, 
      color: 'bg-[#1877F2]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` 
    },
    { 
      name: 'X (Twitter)', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ), 
      color: 'bg-black border border-white/20',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareTitle)}&url=${encodeURIComponent(shareUrl)}` 
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-2xl"
        >
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-gray-400 hover:text-white transition-premium"
          >
            <CloseIcon size={24} />
          </button>

          <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Compartir</h3>
          <p className="text-gray-400 text-sm mb-8">Comparte esta experiencia cinematográfica con tus amigos.</p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            {socialLinks.map((social) => (
              <a 
                key={social.name}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 group"
              >
                <div className={cn(
                  "p-4 rounded-2xl text-white shadow-lg transition-premium group-hover:scale-110 group-active:scale-95",
                  social.color
                )}>
                  {social.icon}
                </div>
                <span className="text-[10px] font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-[0.2em] text-center">
                  {social.name}
                </span>
              </a>
            ))}
          </div>

          <div className="space-y-4">
            <label className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">Copiar enlace</label>
            <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-2xl p-2 pl-4">
              <input 
                type="text" 
                readOnly 
                value={shareUrl}
                className="bg-transparent flex-1 text-sm text-gray-300 outline-none truncate"
              />
              <button 
                onClick={copyToClipboard}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all duration-300",
                  copied ? "bg-green-500 text-white" : "bg-primary text-white hover:bg-primary/80"
                )}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShareModal;
