import { describe, it, expect } from 'vitest';
import { IMAGE_HOSTS, imageRemotePatterns } from '../../src/config/imageHosts.mjs';

describe('imageRemotePatterns', () => {
  it('no admite comodines ni hosts arbitrarios', () => {
    for (const { hostname } of imageRemotePatterns) {
      expect(hostname).not.toContain('*');
    }
  });

  it('solo permite HTTPS', () => {
    expect(imageRemotePatterns.every((p) => p.protocol === 'https')).toBe(true);
  });

  it('cubre las fuentes de imágenes de la app', () => {
    expect(IMAGE_HOSTS).toEqual(
      expect.arrayContaining(['image.tmdb.org', 'static.tvmaze.com', 'cdn.cafecito.app'])
    );
  });

  it('genera un patrón por dominio', () => {
    expect(imageRemotePatterns).toHaveLength(IMAGE_HOSTS.length);
  });
});
