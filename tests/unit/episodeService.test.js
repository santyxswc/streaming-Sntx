import { describe, it, expect, vi } from 'vitest';
import { createEpisodeService, tmdbResolver, tvmazeResolver } from '@/server/episodes/episodeService';

describe('episodeService', () => {
  it('delega en el primer resolvedor que reconoce el id', async () => {
    const a = { match: () => null, getSeason: vi.fn() };
    const b = { match: (id) => id.toUpperCase(), getSeason: vi.fn(async () => ({ posts: [], seasons: ['1'] })) };
    const service = createEpisodeService([a, b]);
    expect(await service.getSeason('abc', '2')).toEqual({ posts: [], seasons: ['1'] });
    expect(a.getSeason).not.toHaveBeenCalled();
    expect(b.getSeason).toHaveBeenCalledWith('ABC', '2');
  });

  it('pasa al siguiente resolvedor si uno falla', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failing = { match: (id) => id, getSeason: async () => { throw new Error('caído'); } };
    const ok = { match: (id) => id, getSeason: async () => ({ posts: [1], seasons: ['1'] }) };
    expect(await createEpisodeService([failing, ok]).getSeason('x')).toEqual({ posts: [1], seasons: ['1'] });
  });

  it('reconoce los formatos de id de TMDB y TVmaze', () => {
    expect(tmdbResolver.match('tmdb-1396')).toBe('1396');
    expect(tmdbResolver.match('tvmaze-28')).toBeNull();
    expect(tvmazeResolver.match('tvmaze-28')).toBe('28');
    expect(tvmazeResolver.match('californication-tvmaze-28')).toBe('28');
  });
});
