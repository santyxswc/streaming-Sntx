import { describe, it, expect } from 'vitest';
import { detailPath, isDetailSegment } from '@/lib/media';

describe('ficha de título: primer segmento de la ruta', () => {
  it('acepta exactamente los segmentos que genera detailPath', () => {
    for (const type of ['movie', 'series', 'anime']) {
      const segment = detailPath({ type, id: 'x' }).split('/')[1];
      expect(isDetailSegment(segment)).toBe(true);
    }
  });

  it('rechaza cualquier otro segmento, incluidas las rutas de API inexistentes', () => {
    for (const segment of ['api', 'admin', 'movie', 'Peliculas', '', undefined, '..']) {
      expect(isDetailSegment(segment)).toBe(false);
    }
  });
});
