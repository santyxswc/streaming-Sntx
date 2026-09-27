import { withApiHandler, CachePolicy, badRequest, notFound } from '@/server/http/apiHandler';
import { getMediaBySlug } from '@/server/catalog/catalogRepository';
import { getTmdbMedia } from '@/server/integrations/tmdb';

export const runtime = 'nodejs';

/** GET /api/media/detail?type=movie|series&slug=<id> — ficha de un título. */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const type = searchParams.get('type');
    const slug = searchParams.get('slug');
    if (!type || !slug) throw badRequest('Parámetros requeridos: type y slug');

    // Los resultados de /api/media/multi-search usan `tmdb-<id>` y pueden no
    // existir en el catálogo local: se sirven directo desde TMDB.
    const data = slug.startsWith('tmdb-')
      ? await getTmdbMedia(type, slug.slice('tmdb-'.length))
      : await getMediaBySlug(type, slug);
    if (!data) throw notFound();
    return data;
  },
  { id: 'media-detail', limit: 20, cache: CachePolicy.hour }
);
