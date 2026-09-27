'use client';
import { Sparkles } from 'lucide-react';
import AISearchPanel from './AISearchPanel';

export default function AISearchHome() {
  return (
    <section id="ai-search" className="px-4 md:px-12 py-8 md:py-12 scroll-mt-24">
      <div className="relative rounded-2xl md:rounded-[2rem] p-[1px] bg-gradient-to-br from-primary/60 via-white/10 to-secondary/60">
        <div className="relative rounded-2xl md:rounded-[2rem] bg-card-bg/95 backdrop-blur-xl p-5 md:p-10 overflow-hidden">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-[100px]" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-secondary/20 blur-[100px]" />

          <div className="relative flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-secondary" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-secondary">
              Motor semántico streaming-Sntx
            </span>
          </div>
          <h2 className="relative text-2xl md:text-4xl font-bold tracking-tight text-white mb-2 max-w-2xl">
            Pregúntale a la IA — encuentra tu título ideal sin saber el nombre
          </h2>
          <p className="relative text-sm md:text-base text-gray-400 max-w-2xl mb-6">
            Describe lo que sí recuerdas: un actor, una escena, el género o el año aproximado. El asistente busca en todo el catálogo por ti.
          </p>

          <div className="relative">
            <AISearchPanel />
          </div>
        </div>
      </div>
    </section>
  );
}
