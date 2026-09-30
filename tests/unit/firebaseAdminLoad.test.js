import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

/*
 * Regresión del Preview de Vercel (2026-09-30): firebase-admin 14 → jwks-rsa 4 → jose 6 (solo ESM).
 * jwks-rsa hace `require('jose')`, que exige require(esm); el runtime de Vercel no lo tiene, así
 * que toda ruta que cargaba `firebase-admin/auth` respondía 500. Aquí se desactiva require(esm)
 * para reproducirlo también en local y en CI.
 */
describe('firebase-admin/auth sin require(esm)', () => {
  it('se puede cargar como en el runtime de Vercel', () => {
    const out = execFileSync(
      process.execPath,
      [
        '--no-experimental-require-module',
        '-e',
        "const { getAuth } = require('firebase-admin/auth'); require('jwks-rsa'); console.log(typeof getAuth);",
      ],
      { encoding: 'utf8', cwd: process.cwd() }
    );
    expect(out.trim()).toBe('function');
  });
});
