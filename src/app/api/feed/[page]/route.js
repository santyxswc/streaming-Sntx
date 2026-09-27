import { withApiHandler, CachePolicy, notFound } from '@/server/http/apiHandler';
import { feedService } from '@/server/feed/feedService';

export const runtime = 'nodejs';

/**
 * GET /api/feed/:page  (home | movies | series)
 * → { success, data: { featured, sections: [{ id, title, type, ranked, items }], generatedAt } }
 */
export const GET = withApiHandler(
  async (_request, { params }) => {
    const { page } = await params;
    const feed = await feedService.getFeed(page);
    if (!feed) throw notFound('Página de feed no encontrada');
    return feed;
  },
  { id: 'feed', limit: 30, cache: CachePolicy.hour }
);
