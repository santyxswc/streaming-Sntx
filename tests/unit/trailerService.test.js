import { describe, it, expect, vi } from 'vitest';
import { createTrailerService } from '@/server/trailers/trailerService';

const video = (key, type, language, official = true) => ({ key, name: key, type, language, official });

function setup({ item, videos = [], configured = true } = {}) {
  const deps = {
    catalog: { getMediaBySlug: vi.fn(async () => item ?? null) },
    videos: {
      isConfigured: () => configured,
      getVideos: vi.fn(async () => videos),
      findByExternalId: vi.fn(async () => ({ id: 99 })),
      findIdByTitle: vi.fn(async () => 77),
    },
  };
  return { deps, service: createTrailerService(deps) };
}

describe('trailerService', () => {
  it('prioriza el tráiler guardado y luego ordena oficial-español-inglés', async () => {
    const { service } = setup({
      item: { id: 'x', trailer: 'https://youtu.be/storedKey01', externalIds: { tmdb: '1' } },
      videos: [video('teaserEs001', 'Teaser', 'es'), video('trailerEn01', 'Trailer', 'en'), video('trailerEs01', 'Trailer', 'es')],
    });
    const { trailers } = await service.getTrailersForMedia('movie', 'x');
    expect(trailers.map((t) => t.key)).toEqual(['storedKey01', 'trailerEs01', 'trailerEn01', 'teaserEs001']);
  });

  it('resuelve el id de TMDB vía IMDb cuando no lo tiene', async () => {
    const { service, deps } = setup({ item: { id: 'y', externalIds: { imdb: 'tt1' } }, videos: [video('abcdefghijk', 'Trailer', 'en')] });
    await service.getTrailersForMedia('series', 'y');
    expect(deps.videos.findByExternalId).toHaveBeenCalledWith('tt1', 'imdb_id');
    expect(deps.videos.getVideos).toHaveBeenCalledWith('series', '99');
  });

  it('recurre a título + año como último recurso', async () => {
    const { service, deps } = setup({ item: { id: 'z', title: 'Título', year: '2020' } });
    await service.getTrailersForMedia('movie', 'z');
    expect(deps.videos.findIdByTitle).toHaveBeenCalledWith('movie', 'Título', '2020');
    expect(deps.videos.getVideos).toHaveBeenCalledWith('movie', '77');
  });

  it('usa ids tmdb-<id> sin consultar el catálogo y cachea el resultado', async () => {
    const { service, deps } = setup({ videos: [video('abcdefghijk', 'Trailer', 'es')] });
    await service.getTrailersForMedia('movie', 'tmdb-5');
    await service.getTrailersForMedia('movie', 'tmdb-5');
    expect(deps.catalog.getMediaBySlug).not.toHaveBeenCalled();
    expect(deps.videos.getVideos).toHaveBeenCalledTimes(1);
  });

  it('devuelve null si el título no existe', async () => {
    const { service } = setup({ item: null });
    expect(await service.getTrailersForMedia('movie', 'nope')).toBeNull();
  });
});
