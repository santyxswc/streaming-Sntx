import { withApiHandler, CachePolicy, badRequest, notFound } from '@/server/http/apiHandler';
import { episodeService } from '@/server/episodes/episodeService';

export const runtime = 'nodejs';

/** GET /api/media/episodes?showId=&season= — episodios de una temporada. */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const showId = searchParams.get('showId');
    if (!showId) throw badRequest('Parámetro requerido: showId');
    const data = await episodeService.getSeason(showId, searchParams.get('season') || '1');
    if (!data) throw notFound('Serie no encontrada');
    return data;
  },
  { id: 'media-episodes', limit: 40, cache: CachePolicy.hour }
);
