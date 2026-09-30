import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// rateLimit() y rateLimitKey() son asíncronos: sin `await` devuelven una Promise,
// que siempre es truthy, y la ruta respondería con basura en cada petición.
function sourceFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(js|mjs)$/.test(name) ? [path] : [];
  });
}

describe('uso de rateLimit', () => {
  it('toda llamada a rateLimit/rateLimitKey lleva await', () => {
    const offenders = [];
    for (const file of sourceFiles('src')) {
      if (file.endsWith(join('http', 'rateLimit.js'))) continue;
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\brateLimit(Key)?\(/.test(line) && !/await\s+rateLimit(Key)?\(/.test(line)) {
            offenders.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
