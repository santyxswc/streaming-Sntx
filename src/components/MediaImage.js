'use client';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * <img> seguro: Next.js/React lanza un warning y algunos navegadores
 * un request roto cuando src="" (string vacío). Si no hay imagen,
 * renderiza un placeholder oscuro con el título en vez de un <img> vacío.
 */
export default function MediaImage({ src, alt, className, ...props }) {
  if (!src) {
    return (
      <div
        className={cn(
          'w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/10 to-black/40 text-gray-500 p-3 text-center',
          className
        )}
      >
        <Film size={28} className="opacity-40 shrink-0" />
        {alt && (
          <span className="text-[11px] font-bold uppercase tracking-wide line-clamp-2 opacity-70">
            {alt}
          </span>
        )}
      </div>
    );
  }

  return (
    <img src={src} alt={alt} className={className} referrerPolicy="no-referrer" {...props} />
  );
}
