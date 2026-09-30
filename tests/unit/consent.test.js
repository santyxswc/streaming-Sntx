import { describe, it, expect } from 'vitest';
import { CONSENT_KEY, readConsent, writeConsent } from '@/lib/consent';

const memoryStorage = (initial = {}) => {
  const data = { ...initial };
  return { getItem: (k) => (k in data ? data[k] : null), setItem: (k, v) => void (data[k] = v), data };
};

describe('consentimiento de analítica', () => {
  it('sin decisión previa devuelve null (hay que preguntar)', () => {
    expect(readConsent(memoryStorage())).toBeNull();
  });

  it('guarda y recupera granted y denied', () => {
    const storage = memoryStorage();
    writeConsent('granted', storage);
    expect(storage.data[CONSENT_KEY]).toBe('granted');
    expect(readConsent(storage)).toBe('granted');
    writeConsent('denied', storage);
    expect(readConsent(storage)).toBe('denied');
  });

  it('ignora valores manipulados o de versiones antiguas: vuelve a preguntar', () => {
    for (const value of ['yes', 'true', '1', '', '{"a":1}', 'GRANTED']) {
      expect(readConsent(memoryStorage({ [CONSENT_KEY]: value }))).toBeNull();
    }
  });

  it('no acepta guardar valores que no sean granted o denied', () => {
    expect(() => writeConsent('quizá', memoryStorage())).toThrow();
  });

  it('si el almacenamiento falla (modo privado), no rompe la página', () => {
    const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(readConsent(broken)).toBeNull();
    expect(() => writeConsent('denied', broken)).not.toThrow();
  });

  it('sin almacenamiento devuelve null', () => {
    expect(readConsent(null)).toBeNull();
  });
});
