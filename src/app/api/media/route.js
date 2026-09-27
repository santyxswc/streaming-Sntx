import { withApiHandler, CachePolicy } from '@/server/http/apiHandler';
import { getMediaSorted } from '@/server/catalog/catalogRepository';

export const runtime = 'nodejs';

const MAX_COUNT = 100;

/** GET /api/media — listado paginado del catálogo con filtros y orden. */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const count = Math.min(Math.max(parseInt(searchParams.get('count') || '20', 10) || 20, 1), MAX_COUNT);
    return getMediaSorted(
      searchParams.get('type') || 'movie',
      searchParams.get('sortField') || 'scrapedAt',
      searchParams.get('sortOrder') || 'desc',
      count,
      searchParams.get('lastId'),
      searchParams.get('genre'),
      searchParams.get('year'),
      searchParams.get('country')
    );
  },
  { id: 'media-list', limit: 30, cache: CachePolicy.hour }
);
