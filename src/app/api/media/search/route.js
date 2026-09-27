import { withApiHandler, CachePolicy } from '@/server/http/apiHandler';
import { searchCatalog } from '@/server/catalog/catalogRepository';

export const runtime = 'nodejs';

/** GET /api/media/search?q= — búsqueda en el catálogo. */
export const GET = withApiHandler(
  async (_request, { searchParams }) => {
    const q = searchParams.get('q')?.trim();
    return q ? searchCatalog(q) : [];
  },
  { id: 'media-search', limit: 10, cache: CachePolicy.short }
);
