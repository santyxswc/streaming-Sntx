import { describe, it, expect } from 'vitest';
import { parseYoutubeId, youtubeEmbedUrl } from '@/lib/youtube';
import { detailPath } from '@/lib/media';

describe('parseYoutubeId', () => {
  it.each([
    ['dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extrae el id de %s', (input, expected) => {
    expect(parseYoutubeId(input)).toBe(expected);
  });

  it.each([null, '', 'esto no es un id', 'https://example.com/video', 42])('devuelve null para %s', (input) => {
    expect(parseYoutubeId(input)).toBeNull();
  });
});

describe('youtubeEmbedUrl', () => {
  it('usa el dominio sin cookies y fusiona parámetros', () => {
    const url = new URL(youtubeEmbedUrl('dQw4w9WgXcQ', { autoplay: 1 }));
    expect(url.hostname).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/dQw4w9WgXcQ');
    expect(url.searchParams.get('autoplay')).toBe('1');
    expect(url.searchParams.get('rel')).toBe('0');
  });
});

describe('detailPath', () => {
  it('mapea el tipo a la ruta de la ficha', () => {
    expect(detailPath({ id: 'tmdb-1', type: 'movie' })).toBe('/peliculas/tmdb-1');
    expect(detailPath({ id: 'arcane', type: 'series' })).toBe('/series/arcane');
  });
});
