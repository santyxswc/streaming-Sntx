import { describe, it, expect } from 'vitest';
import { MAX_QUERY_LENGTH, parseSearchQuery, parseAiPrediction } from '@/lib/aiSearch';

describe('parseSearchQuery', () => {
  it('devuelve la consulta recortada', () => {
    expect(parseSearchQuery('  un tren en la nieve  ')).toBe('un tren en la nieve');
  });

  it.each([undefined, null, 42, {}, ['x'], true, '', '   '])('rechaza %j', (value) => {
    expect(() => parseSearchQuery(value)).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('acepta exactamente el máximo y rechaza uno más', () => {
    expect(parseSearchQuery('a'.repeat(MAX_QUERY_LENGTH))).toHaveLength(MAX_QUERY_LENGTH);
    expect(() => parseSearchQuery('a'.repeat(MAX_QUERY_LENGTH + 1))).toThrow(
      expect.objectContaining({ status: 400 })
    );
  });
});

describe('parseAiPrediction', () => {
  const valid = {
    titleSpanish: 'Rompenieves',
    titleOriginal: 'Snowpiercer',
    type: 'movie',
    year: '2013',
    explanation: 'Un tren en un mundo helado.',
  };

  it('normaliza una respuesta válida', () => {
    expect(parseAiPrediction(JSON.stringify(valid))).toEqual(valid);
  });

  it.each(['no es json', '', 'null', '[]', '"texto"', '42'])('devuelve null ante %j', (raw) => {
    expect(parseAiPrediction(raw)).toBeNull();
  });

  it('devuelve null si no hay ningún título', () => {
    expect(parseAiPrediction(JSON.stringify({ type: 'movie', year: '2013' }))).toBeNull();
  });

  it('ignora tipos inesperados en los títulos', () => {
    const out = parseAiPrediction(JSON.stringify({ titleSpanish: { a: 1 }, titleOriginal: 'Snowpiercer' }));
    expect(out.titleSpanish).toBe('');
    expect(out.titleOriginal).toBe('Snowpiercer');
  });

  it('solo admite movie o series como tipo', () => {
    expect(parseAiPrediction(JSON.stringify({ ...valid, type: 'collection' })).type).toBe('series');
    expect(parseAiPrediction(JSON.stringify({ ...valid, type: 'movie' })).type).toBe('movie');
  });

  it('acota el texto que llega del modelo', () => {
    const out = parseAiPrediction(
      JSON.stringify({ ...valid, explanation: 'x'.repeat(5000), year: '20131234567' })
    );
    expect(out.explanation.length).toBeLessThanOrEqual(200);
    expect(out.year).toBe('2013');
  });
});
