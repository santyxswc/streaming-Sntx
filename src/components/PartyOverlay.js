'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Link, Check, ExternalLink, Play, Pause, RefreshCw, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function PartyOverlay({ 
  partyId, 
  isPlaying, 
  currentTime, 
  isHost, 
  onTogglePlay, 
  onSyncManual, 
  onClose,
  item 
}) {
  const [copied, setCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?party=${partyId}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute top-8 right-8 z-[60] flex flex-col items-end gap-4">
      {/* Main Status Badge */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-4 bg-black/60 backdrop-blur-xl border border-white/10 p-2 pl-4 rounded-2xl shadow-2xl"
      >
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Cine Compartido</span>
          <span className="text-xs font-bold text-gray-300">Sala: <span className="text-white">{partyId}</span></span>
        </div>
        
        <div className="flex items-center gap-2 pr-2">
          <button 
            onClick={() => setShowInvite(!showInvite)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-premium border border-white/5"
            title="Invitar amigos"
          >
            <Users size={18} />
          </button>
          
          {isHost && (
            <button 
              onClick={onTogglePlay}
              className="p-2.5 bg-primary/20 hover:bg-primary/40 text-primary rounded-xl transition-premium border border-primary/20"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}

          {!isHost && (
             <button 
              onClick={onSyncManual}
              className="p-2.5 bg-green-500/20 hover:bg-green-500/40 text-green-500 rounded-xl transition-premium border border-green-500/20"
              title="Resincronizar con el anfitrión"
            >
              <RefreshCw size={18} className={cn(!isPlaying && "animate-spin")} />
            </button>
          )}

          <button 
            onClick={onClose}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-premium border border-white/5"
          >
            <X size={18} />
          </button>
        </div>
      </motion.div>

      {/* Invite Modal Overlay (Small) */}
      <AnimatePresence>
        {showInvite && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="w-80 bg-[#181818] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent" />
            
            <h4 className="text-lg font-black uppercase tracking-tighter mb-1">Invitar amigos</h4>
            <p className="text-xs text-gray-500 mb-6 font-medium">Cualquiera con el link podrá ver {item?.title} contigo.</p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-2 pl-4">
                <input 
                  type="text" 
                  readOnly 
                  value={partyId}
                  className="bg-transparent flex-1 text-sm text-gray-400 outline-none font-mono"
                />
                <button 
                  onClick={copyLink}
                  className={cn(
                    "p-3 rounded-lg transition-all duration-300",
                    copied ? "bg-green-500 text-white" : "bg-primary text-white hover:scale-105"
                  )}
                >
                  {copied ? <Check size={16} /> : <Link size={16} />}
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 justify-center">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 Sincronización Activa
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Host Control Bar (Scrubber) */}
      <AnimatePresence>
        {isHost && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs bg-black/40 backdrop-blur-md border border-white/10 p-4 rounded-2xl"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Control de Tiempo</span>
              <span className="text-[10px] font-bold text-primary font-mono">{formatTime(currentTime)}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="7200" // Hard limit for slider, actual would be video duration if known
              value={currentTime}
              onChange={(e) => onSyncManual(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[8px] text-gray-500 mt-2 italic">* Los amigos se sincronizarán con este tiempo.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
