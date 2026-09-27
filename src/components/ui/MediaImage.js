'use client';
import Image from 'next/image';
import { Film } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente de imagen optimizado con Next.js Image y fallback a placeholder.
 */
export default function MediaImage({ src, alt = '', className, width, height, priority = false, ...props }) {
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

  const isFilled = !width && !height;

  return (
    <Image
      src={src}
      alt={alt || ''}
      className={className}
      fill={isFilled}
      width={width}
      height={height}
      sizes={isFilled ? '(max-width: 768px) 160px, (max-width: 1200px) 240px, 360px' : undefined}
      priority={priority}
      unoptimized
      {...props}
    />
  );
}
