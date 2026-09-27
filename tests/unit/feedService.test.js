import { describe, it, expect, vi } from 'vitest';
import { createFeedService, mergeCatalogItem } from '@/server/feed/feedService';

const candidate = (n, extra = {}) => ({ id: `tmdb-${n}`, title: `T${n}`, backdrop: `b${n}`, overview: `o${n}`, ...extra });

function setup({ candidates, inCatalog, withTrailer, pages }) {
  const deps = {
    source: { getCandidates: vi.fn(async (section) => candidates[section.id] ?? []) },
    catalog: {
      getMediaByIds: vi.fn(async (_type, ids) =>
        ids.filter((id) => inCatalog.includes(id)).map((id) => ({ id, title: `cat-${id}`, genres: [] }))
      ),
    },
    trailers: {
      getTrailersForItem: vi.fn(async (item) => ({
        trailers: withTrailer.includes(item.id) ? [{ key: `key-${item.id}` }] : [],
      })),
    },
    pages,
  };
  return { deps, service: createFeedService(deps) };
}

const page = (sections, featuredFrom = [sections[0].id]) => ({
  p: { featured: { from: featuredFrom, limit: 5 }, sections },
});

describe('feedService', () => {
  it('solo muestra títulos del catálogo con tráiler, en el orden de la fuente', async () => {
    const { service } = setup({
      candidates: { a: [candidate(1), candidate(2), candidate(3), candidate(4)] },
      inCatalog: ['tmdb-1', 'tmdb-2', 'tmdb-4'],
      withTrailer: ['tmdb-2', 'tmdb-3', 'tmdb-4'],
      pages: page([{ id: 'a', title: 'A', type: 'movie' }]),
    });
    const feed = await service.getFeed('p');
    expect(feed.sections[0].items.map((i) => i.id)).toEqual(['tmdb-2', 'tmdb-4']);
    expect(feed.sections[0].items[0].trailer).toBe('key-tmdb-2');
  });

  it('no repite títulos entre filas de la misma página', async () => {
    const shared = [candidate(1), candidate(2)];
    const { service } = setup({
      candidates: { a: shared, b: [...shared, candidate(3)] },
      inCatalog: ['tmdb-1', 'tmdb-2', 'tmdb-3'],
      withTrailer: ['tmdb-1', 'tmdb-2', 'tmdb-3'],
      pages: page([{ id: 'a', title: 'A', type: 'movie' }, { id: 'b', title: 'B', type: 'movie' }]),
    });
    const feed = await service.getFeed('p');
    expect(feed.sections[1].items.map((i) => i.id)).toEqual(['tmdb-3']);
  });

  it('respeta el límite por fila y omite filas vacías', async () => {
    const many = Array.from({ length: 10 }, (_, i) => candidate(i));
    const ids = many.map((c) => c.id);
    const { service } = setup({
      candidates: { a: many, empty: [] },
      inCatalog: ids,
      withTrailer: ids,
      pages: page([{ id: 'a', title: 'A', type: 'movie', limit: 3 }, { id: 'empty', title: 'E', type: 'movie' }]),
    });
    const feed = await service.getFeed('p');
    expect(feed.sections).toHaveLength(1);
    expect(feed.sections[0].items).toHaveLength(3);
  });

  it('el destacado exige backdrop y sinopsis', async () => {
    const { service } = setup({
      candidates: { a: [candidate(1, { backdrop: '' }), candidate(2)] },
      inCatalog: ['tmdb-1', 'tmdb-2'],
      withTrailer: ['tmdb-1', 'tmdb-2'],
      pages: page([{ id: 'a', title: 'A', type: 'movie' }]),
    });
    const feed = await service.getFeed('p');
    expect(feed.featured.map((i) => i.id)).toEqual(['tmdb-2']);
  });

  it('una sección que falla no tumba la página', async () => {
    const { service, deps } = setup({
      candidates: { ok: [candidate(1)] },
      inCatalog: ['tmdb-1'],
      withTrailer: ['tmdb-1'],
      pages: page([{ id: 'broken', title: 'X', type: 'movie' }, { id: 'ok', title: 'OK', type: 'movie' }], ['ok']),
    });
    deps.source.getCandidates.mockImplementationOnce(async () => {
      throw new Error('TMDB caído');
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const feed = await service.getFeed('p');
    expect(feed.sections.map((s) => s.id)).toEqual(['ok']);
  });

  it('comparte el cálculo entre peticiones simultáneas y devuelve null en páginas desconocidas', async () => {
    const { service, deps } = setup({
      candidates: { a: [candidate(1)] },
      inCatalog: ['tmdb-1'],
      withTrailer: ['tmdb-1'],
      pages: page([{ id: 'a', title: 'A', type: 'movie' }]),
    });
    await Promise.all([service.getFeed('p'), service.getFeed('p')]);
    expect(deps.source.getCandidates).toHaveBeenCalledTimes(1);
    expect(await service.getFeed('toString')).toBeNull();
  });

  it('mergeCatalogItem rellena solo los campos vacíos del catálogo', () => {
    const merged = mergeCatalogItem(
      { id: 'x', title: 'Catálogo', backdrop: '', rating: '0.0', genres: [] },
      { backdrop: 'tmdb-bd', rating: '8.1', genres: ['Drama'], title: 'Fuente' }
    );
    expect(merged).toMatchObject({ title: 'Catálogo', backdrop: 'tmdb-bd', rating: '8.1', genres: ['Drama'] });
  });
});
