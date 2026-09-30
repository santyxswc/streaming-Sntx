import { describe, it, expect } from 'vitest';
import { stripHtml, sanitizeForLog, isTvmazeUrl } from '@/lib/text.mjs';

describe('stripHtml', () => {
  it('quita etiquetas simples', () => {
    expect(stripHtml('<p>Hola <b>mundo</b></p>')).toBe('Hola mundo');
  });

  it('no deja etiquetas cuando se anidan para esquivar una sola pasada', () => {
    for (const evil of ['<<b>script>alert(1)<</b>/script>', '<scr<b>ipt>x</scr</b>ipt>', '<<a>img src=x onerror=alert(1)>']) {
      const out = stripHtml(evil);
      expect(out).not.toMatch(/[<>]/);
    }
  });

  it('elimina < o > sueltos que no forman una etiqueta', () => {
    expect(stripHtml('5 < 6')).toBe('5  6');
    expect(stripHtml('7 > 2')).toBe('7  2');
  });

  it('un par < ... > se interpreta como etiqueta y se elimina entero', () => {
    expect(stripHtml('5 < 6 y 7 > 2')).toBe('5  2');
  });

  it('tolera valores vacíos y no textuales', () => {
    expect(stripHtml(null)).toBe('');
    expect(stripHtml(undefined)).toBe('');
    expect(stripHtml('')).toBe('');
    expect(stripHtml(42)).toBe('42');
  });
});

describe('sanitizeForLog', () => {
  it('sustituye saltos de línea y caracteres de control: no se pueden falsificar líneas de log', () => {
    const forged = 'busqueda\n[ERROR] sesión de admin iniciada\r\n\t\u0000fin';
    const out = sanitizeForLog(forged);
    expect(out).not.toMatch(/[\r\n\t\u0000]/);
    expect(out).toContain('busqueda');
  });

  it('neutraliza los separadores Unicode de línea', () => {
    expect(sanitizeForLog('a\u2028b\u2029c')).toBe('a b c');
  });

  it('acota la longitud', () => {
    const out = sanitizeForLog('x'.repeat(5000), 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('…')).toBe(true);
  });

  it('acepta valores no textuales', () => {
    expect(sanitizeForLog(undefined)).toBe('');
    expect(sanitizeForLog(12)).toBe('12');
  });
});

describe('isTvmazeUrl', () => {
  it.each([
    'https://www.tvmaze.com/shows/1/x',
    'http://tvmaze.com/shows/1',
    'https://api.tvmaze.com/shows?page=1',
    'https://tvmaze.com',
    'https://tvmaze.com:443/x',
  ])('acepta %s', (url) => expect(isTvmazeUrl(url)).toBe(true));

  it.each([
    'https://evil.com/?u=tvmaze.com',
    'https://tvmaze.com.evil.io/x',
    'https://eviltvmaze.com/x',
    'https://evil.com/tvmaze.com',
    'https://tvmaze.com@evil.com/x',
    'ftp://tvmaze.com/x',
    '',
    null,
    undefined,
    42,
  ])('rechaza %s', (url) => expect(isTvmazeUrl(url)).toBe(false));
});
