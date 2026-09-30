import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { mediaTypeFromPath } from '../../desktop/src/lib/mediaRoute.ts';

/*
 * Regresión (2026-09-30): App.tsx define `peliculas/:slug` y `series/:slug`, pero DetailPage leía
 * `type` de useParams(). Siempre era undefined, loadDetail salía sin hacer nada y la pantalla se
 * quedaba en "Iniciando transmisión" para siempre al abrir cualquier título.
 */
describe('rutas de detalle del escritorio', () => {
  const app = readFileSync('desktop/src/App.tsx', 'utf8');
  const detail = readFileSync('desktop/src/pages/DetailPage.tsx', 'utf8');

  it('DetailPage solo lee de useParams parámetros que existen en sus rutas', () => {
    const routes = [...app.matchAll(/path="([^"]+)"\s+element=\{<DetailPage/g)].map((m) => m[1]);
    expect(routes.length).toBeGreaterThan(0);

    const destructured = detail.match(/const \{([^}]+)\} = useParams/)?.[1] ?? '';
    const used = destructured.split(',').map((s) => s.trim()).filter(Boolean);

    for (const route of routes) {
      const params = [...route.matchAll(/:(\w+)/g)].map((m) => m[1]);
      for (const name of used) expect(params, `${route} no define :${name}`).toContain(name);
    }
  });

  it('deduce el tipo de medio a partir de la URL', () => {
    expect(mediaTypeFromPath('/peliculas/tmdb-1263337')).toBe('movie');
    expect(mediaTypeFromPath('/series/tmdb-1')).toBe('series');
    expect(mediaTypeFromPath('/')).toBeNull();
  });
});
