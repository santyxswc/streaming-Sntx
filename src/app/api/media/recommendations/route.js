import { withApiHandler, CachePolicy, badRequest } from '@/server/http/apiHandler';
import { getRecommendationsForItem } from '@/server/catalog/catalogRepository';

export const runtime = 'nodejs';

/** GET /api/media/recommendations?itemId=&type= — más títulos del mismo tipo. */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const itemId = searchParams.get('itemId');
    const type = searchParams.get('type');
    if (!itemId || !type) throw badRequest('Parámetros requeridos: itemId y type');
    return getRecommendationsForItem({ id: itemId, type: type === 'series' ? 'series' : 'movie' }, 60);
  },
  { id: 'media-recommendations', limit: 30, cache: CachePolicy.hour }
);
