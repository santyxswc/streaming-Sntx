import { notFound } from 'next/navigation';
import DetailClient from './DetailClient';
import { isDetailSegment } from '@/lib/media';
import { getMediaBySlug } from '@/server/catalog/catalogRepository';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { type, slug } = await params;
  // Cualquier otro primer segmento (p. ej. /api/inexistente) no es una ficha: no se consulta el catálogo.
  if (!isDetailSegment(type)) return { title: 'No encontrado | streaming-Sntx' };
  const mediaType = type === 'peliculas' ? 'movie' : 'series';
  
  try {
    const item = await getMediaBySlug(mediaType, slug);
    
    if (item) {
      return {
        title: item.title,
        description: item.overview?.slice(0, 160) + '...',
        openGraph: {
          title: `${item.title} | streaming-Sntx`,
          description: item.overview,
          images: [item.backdrop || item.image],
        },
        twitter: {
          card: "summary_large_image",
          title: item.title,
          description: item.overview,
          images: [item.backdrop || item.image],
        }
      };
    }
  } catch (err) {
    console.error("Metadata error:", err);
  }

  return { title: 'Tráiler | streaming-Sntx' };
}

export default async function DetailPage({ params }) {
  const { type } = await params;
  if (!isDetailSegment(type)) notFound();
  return <DetailClient />;
}
