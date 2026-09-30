import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/*
 * Alertas de Dependabot #5 (tauri < 2.11.1) y #6 (serde_with < 3.21.0), 2026-09-30.
 * Ojo con tauri 2.11.x: su Cargo.lock puede resolver tauri-runtime 2.12.0, que rompe la compilación
 * (tipos de Monitor); el PR #28 de Dependabot cayó ahí. Por eso se pide tauri >= 2.12.0 y que
 * tauri, tauri-runtime y tauri-runtime-wry vayan a la misma versión.
 */
const lock = readFileSync('desktop/src-tauri/Cargo.lock', 'utf8');

const versionOf = (name) => {
  const match = lock.match(new RegExp(`\\[\\[package\\]\\]\\nname = "${name}"\\nversion = "([^"]+)"`));
  return match?.[1];
};

const atLeast = (version, min) => {
  const a = version.split('.').map(Number);
  const b = min.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
};

describe('desktop/src-tauri/Cargo.lock', () => {
  it('serde_with no es vulnerable (>= 3.21.0)', () => {
    expect(atLeast(versionOf('serde_with'), '3.21.0')).toBe(true);
  });

  it('tauri no es vulnerable y va alineado con su runtime', () => {
    const tauri = versionOf('tauri');
    expect(atLeast(tauri, '2.11.1')).toBe(true);
    expect(versionOf('tauri-runtime')).toBe(tauri);
    expect(versionOf('tauri-runtime-wry')).toBe(tauri);
  });

  it('los plugins de Rust y los paquetes npm de Tauri están en la misma versión', () => {
    // `tauri dev` aborta con "Found version mismatched Tauri packages" si difieren (major.minor).
    const npmLock = JSON.parse(readFileSync('desktop/package-lock.json', 'utf8'));
    const npmVersion = npmLock.packages['node_modules/@tauri-apps/plugin-opener'].version;
    const minor = (v) => v.split('.').slice(0, 2).join('.');
    expect(minor(versionOf('tauri-plugin-opener'))).toBe(minor(npmVersion));
  });
});
