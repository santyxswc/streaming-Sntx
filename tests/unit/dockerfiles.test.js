import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const lines = (file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

describe('.dockerignore', () => {
  const ignore = lines('.dockerignore');

  it('excluye los ficheros .env: contienen secretos reales', () => {
    expect(ignore).toContain('.env');
    expect(ignore).toContain('.env.*');
  });

  it('solo reincluye .env.example (sin secretos)', () => {
    expect(ignore.filter((l) => l.startsWith('!'))).toEqual(['!.env.example']);
  });

  it('excluye credenciales, control de versiones y dependencias locales', () => {
    for (const pattern of ['*.pem', 'serviceAccount*.json', '.git', 'node_modules', '.next']) {
      expect(ignore).toContain(pattern);
    }
  });

  it('no usa comillas (en .dockerignore serían parte del nombre)', () => {
    expect(ignore.filter((l) => /["']/.test(l))).toEqual([]);
  });
});

describe('Dockerfile', () => {
  const dockerfile = readFileSync('Dockerfile', 'utf8');

  it('fija la imagen base por digest', () => {
    expect(dockerfile).toMatch(/ARG NODE_IMAGE=node:[\w.-]+@sha256:[0-9a-f]{64}/);
  });

  it('no ejecuta el contenedor como root', () => {
    const runner = dockerfile.slice(dockerfile.lastIndexOf('AS runner'));
    // Numérico y distinto de 0: un orquestador puede verificar `runAsNonRoot`.
    const user = runner.match(/^USER (\S+)$/m)?.[1];
    expect(user).toMatch(/^[1-9]\d*(:[1-9]\d*)?$/);
  });

  it('no incrusta secretos: solo build args NEXT_PUBLIC_* (públicos por definición)', () => {
    const args = [...dockerfile.matchAll(/^ARG (\w+)/gm)].map((m) => m[1]);
    const allowed = /^(NODE_IMAGE|FORCE_HTTPS_HEADERS|NEXT_PUBLIC_\w+)$/;
    expect(args.filter((name) => !allowed.test(name))).toEqual([]);
  });

  it('la imagen final no incluye gestor de paquetes (npm, corepack, yarn)', () => {
    const runner = dockerfile.slice(dockerfile.lastIndexOf('AS runner'));
    expect(runner).toMatch(/rm -rf[^\n]*\/usr\/local\/lib\/node_modules/);
    expect(runner).toMatch(/\/usr\/local\/bin\/npm/);
    expect(runner).toMatch(/\/opt\/yarn-\*/);
  });

  it('incluye un HEALTHCHECK', () => {
    expect(dockerfile).toMatch(/^HEALTHCHECK /m);
  });
});
