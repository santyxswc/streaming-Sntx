import { withApiHandler, CachePolicy, badRequest, notFound } from '@/server/http/apiHandler';
import { trailerService } from '@/server/trailers/trailerService';

export const runtime = 'nodejs';

/**
 * GET /api/media/trailer?type=movie|series&id=<id del catálogo>
 * → { success, data: { trailers: [{ key, name, language, official, type }] } }
 */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const type = searchParams.get('type');
    const id = searchParams.get('id')?.trim();
    if (!id || (type !== 'movie' && type !== 'series')) {
      throw badRequest("Parámetros requeridos: id y type ('movie' | 'series')");
    }
    const data = await trailerService.getTrailersForMedia(type, id);
    if (!data) throw notFound('Título no encontrado');
    return data;
  },
  { id: 'media-trailer', limit: 40, cache: CachePolicy.day }
);
