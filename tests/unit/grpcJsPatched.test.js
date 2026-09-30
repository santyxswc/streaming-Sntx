import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/*
 * Alertas de Dependabot #1, #2, #7 y #8 (2026-09-30): @grpc/grpc-js < 1.13.6.
 * firebase 12.x lo fija en ~1.9.x, así que Dependabot no puede subirlo solo; se fuerza con
 * `overrides`. Este test falla si algún package-lock vuelve a resolver una copia vulnerable.
 */
const MIN = [1, 13, 6];

const atLeast = (version, min) => {
  const parts = version.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (parts[i] !== min[i]) return parts[i] > min[i];
  }
  return true;
};

const grpcVersions = (lockPath) => {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  return Object.entries(lock.packages)
    .filter(([path]) => path.endsWith('node_modules/@grpc/grpc-js'))
    .map(([path, pkg]) => ({ path, version: pkg.version }));
};

describe.each(['package-lock.json', 'desktop/package-lock.json'])('%s', (lockPath) => {
  it('no resuelve @grpc/grpc-js por debajo de 1.13.6', () => {
    const copies = grpcVersions(lockPath);
    expect(copies.length).toBeGreaterThan(0);
    const vulnerable = copies.filter(({ version }) => !atLeast(version, MIN));
    expect(vulnerable).toEqual([]);
  });
});
