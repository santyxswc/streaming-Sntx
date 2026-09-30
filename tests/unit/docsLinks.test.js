import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

const files = ['README.md', 'SECURITY.md', ...readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => join('docs', f))];

// Enlaces relativos de Markdown: [texto](ruta) o [texto](ruta#ancla). Se ignoran URLs, anclas y mailto.
function relativeLinks(file) {
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  return [...text.matchAll(/\]\(([^)\s]+)\)/g)]
    .map((m) => m[1])
    .filter((href) => !/^(https?:|mailto:|#)/.test(href))
    .map((href) => href.split('#')[0])
    .filter(Boolean);
}

describe('documentación', () => {
  it.each(files)('%s: todos los enlaces relativos apuntan a un archivo que existe', (file) => {
    const broken = relativeLinks(file).filter((href) => !existsSync(normalize(join(dirname(file), href))));
    expect(broken).toEqual([]);
  });

  it('los documentos de seguridad se enlazan entre sí', () => {
    const security = readFileSync('SECURITY.md', 'utf8');
    for (const doc of ['THREAT_MODEL.md', 'security-audit.md', 'RUNBOOK.md']) {
      expect(security).toContain(`docs/${doc}`);
    }
  });
});
