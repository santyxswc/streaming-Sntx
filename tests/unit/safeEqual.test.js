import { describe, it, expect } from 'vitest';
import { safeEqual } from '@/server/shared/safeEqual';

describe('safeEqual', () => {
  it('acepta secretos idénticos', () => {
    expect(safeEqual('s3cr3t-clave', 's3cr3t-clave')).toBe(true);
  });

  it('rechaza secretos distintos, incluso con la misma longitud', () => {
    expect(safeEqual('s3cr3t-clave', 's3cr3t-claVe')).toBe(false);
  });

  it('rechaza longitudes distintas sin lanzar', () => {
    expect(safeEqual('corta', 'mucho-mas-larga')).toBe(false);
  });

  it('rechaza valores ausentes', () => {
    expect(safeEqual(null, 'x')).toBe(false);
    expect(safeEqual('x', undefined)).toBe(false);
    expect(safeEqual(null, null)).toBe(false);
  });

  it('compara texto con caracteres no ASCII', () => {
    expect(safeEqual('contraseña', 'contraseña')).toBe(true);
    expect(safeEqual('contraseña', 'contrasena')).toBe(false);
  });
});
