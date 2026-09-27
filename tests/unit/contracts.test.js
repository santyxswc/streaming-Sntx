import { describe, it, expect } from 'vitest';
import { CATALOG_PROVIDERS, CATALOG_CONTRACT } from '@/server/catalog/catalogRepository';
import { CHAT_PROVIDERS, MESSAGES_CONTRACT, PROFILES_CONTRACT } from '@/server/chat/chatRepository';

// Principio de sustitución de Liskov: cualquier proveedor debe poder
// reemplazar a otro sin que las rutas lo noten.
describe('contratos de proveedores', () => {
  it.each(Object.entries(CATALOG_PROVIDERS))('catálogo %s implementa el contrato completo', (_name, provider) => {
    for (const fn of CATALOG_CONTRACT) expect(provider[fn], fn).toBeTypeOf('function');
  });

  it.each(Object.entries(CHAT_PROVIDERS))('chat %s implementa mensajes y perfiles', (_name, { messages, profiles }) => {
    for (const fn of MESSAGES_CONTRACT) expect(messages[fn], fn).toBeTypeOf('function');
    for (const fn of PROFILES_CONTRACT) expect(profiles[fn], fn).toBeTypeOf('function');
  });

  it('el proveedor demo devuelve por lotes solo los ids existentes', async () => {
    const [first] = await CATALOG_PROVIDERS.demo.getMediaSorted('movie', 'scrapedAt', 'desc', 1);
    const found = await CATALOG_PROVIDERS.demo.getMediaByIds('movie', [first.id, 'no-existe']);
    expect(found.map((i) => i.id)).toEqual([first.id]);
  });
});
