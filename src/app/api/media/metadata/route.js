import { withApiHandler, CachePolicy } from '@/server/http/apiHandler';
import { getFilterMetadata } from '@/server/catalog/catalogRepository';

export const runtime = 'nodejs';

/** GET /api/media/metadata?type= — años y países disponibles para filtros. */
export const GET = withApiHandler(
  (_request, { searchParams }) => getFilterMetadata(searchParams.get('type') || 'movie'),
  { id: 'media-metadata', limit: 60, cache: CachePolicy.hour }
);
