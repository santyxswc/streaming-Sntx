// Se ejecuta contra el emulador de Firestore: `npm run test:rules`.
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

let env;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-sntx',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext('alice').firestore();
const bob = () => env.authenticatedContext('bob').firestore();
const anon = () => env.unauthenticatedContext().firestore();
const watchlist = (db, uid = 'alice') => doc(db, 'users', uid, 'userData', 'watchlist');
const items = (n) => Array.from({ length: n }, (_, i) => ({ id: `tmdb-${i}`, title: `Título ${i}` }));

// Deja un documento preparado saltándose las reglas (como haría el servidor).
const seed = (path, data) =>
  env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), path), data));

describe('favoritos: users/{uid}/userData/watchlist', () => {
  it('el dueño puede crear su lista', async () => {
    await assertSucceeds(setDoc(watchlist(alice()), { items: items(3) }));
  });

  it('el dueño puede guardar una lista vacía', async () => {
    await assertSucceeds(setDoc(watchlist(alice()), { items: [] }));
  });

  it('el dueño puede leerla y actualizarla con merge (como hace la app)', async () => {
    await seed('users/alice/userData/watchlist', { items: items(2) });
    await assertSucceeds(getDoc(watchlist(alice())));
    await assertSucceeds(setDoc(watchlist(alice()), { items: items(5) }, { merge: true }));
  });

  it('el dueño puede borrarla', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1) });
    await assertSucceeds(deleteDoc(watchlist(alice())));
  });

  it('sin sesión no se puede leer ni escribir', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1) });
    await assertFails(getDoc(watchlist(anon())));
    await assertFails(setDoc(watchlist(anon()), { items: [] }));
  });

  it('otro usuario no puede leer, escribir ni borrar la lista ajena', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1) });
    await assertFails(getDoc(watchlist(bob())));
    await assertFails(setDoc(watchlist(bob()), { items: [] }));
    await assertFails(deleteDoc(watchlist(bob())));
  });
});

describe('favoritos: validación de datos', () => {
  it('rechaza campos que no sean `items` al crear', async () => {
    await assertFails(setDoc(watchlist(alice()), { items: [], relleno: 'x'.repeat(1000) }));
  });

  it('rechaza un documento sin `items`', async () => {
    await assertFails(setDoc(watchlist(alice()), { otra: 1 }));
    await assertFails(setDoc(watchlist(alice()), {}));
  });

  it('rechaza un `items` que no sea una lista', async () => {
    await assertFails(setDoc(watchlist(alice()), { items: 'no-soy-una-lista' }));
    await assertFails(setDoc(watchlist(alice()), { items: { a: 1 } }));
    await assertFails(setDoc(watchlist(alice()), { items: 42 }));
  });

  it('admite exactamente 500 favoritos y rechaza 501', async () => {
    await assertSucceeds(setDoc(watchlist(alice()), { items: items(500) }));
    await assertFails(setDoc(watchlist(alice()), { items: items(501) }));
  });

  it('rechaza añadir un campo extra al actualizar con merge', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1) });
    await assertFails(setDoc(watchlist(alice()), { items: items(1), relleno: 'x' }, { merge: true }));
  });

  it('sigue permitiendo actualizar `items` en documentos antiguos que ya tenían otro campo', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1), campoAntiguo: true });
    await assertSucceeds(setDoc(watchlist(alice()), { items: items(4) }, { merge: true }));
  });

  it('rechaza actualizar dejando el documento sin `items`', async () => {
    await seed('users/alice/userData/watchlist', { items: items(1) });
    await assertFails(setDoc(watchlist(alice()), { otra: 1 }, { merge: true }));
  });
});

describe('el espacio del usuario no sirve de almacenamiento arbitrario', () => {
  it('no permite crear otros documentos bajo su ruta', async () => {
    await assertFails(setDoc(doc(alice(), 'users', 'alice'), { x: 1 }));
    await assertFails(setDoc(doc(alice(), 'users', 'alice', 'userData', 'otro'), { x: 1 }));
    await assertFails(setDoc(doc(alice(), 'users', 'alice', 'basura', 'a'), { x: 1 }));
  });

  it('no permite subcolecciones anidadas ni addDoc', async () => {
    await assertFails(setDoc(doc(alice(), 'users', 'alice', 'userData', 'watchlist', 'sub', 'a'), { x: 1 }));
    await assertFails(addDoc(collection(alice(), 'users', 'alice', 'userData'), { x: 1 }));
  });

  it('tampoco permite leer otros documentos de su ruta', async () => {
    await seed('users/alice/userData/otro', { x: 1 });
    await assertFails(getDoc(doc(alice(), 'users', 'alice', 'userData', 'otro')));
  });
});

describe('catálogo público y regla por defecto', () => {
  it.each(['movies', 'series'])('%s: cualquiera puede leer, nadie puede escribir', async (col) => {
    await seed(`${col}/x`, { title: 'X' });
    await assertSucceeds(getDoc(doc(anon(), col, 'x')));
    await assertSucceeds(getDoc(doc(alice(), col, 'x')));
    await assertFails(setDoc(doc(alice(), col, 'x'), { title: 'Y' }));
    await assertFails(deleteDoc(doc(alice(), col, 'x')));
    await assertFails(setDoc(doc(anon(), col, 'nuevo'), { title: 'Z' }));
  });

  it('cualquier otra colección está bloqueada', async () => {
    await seed('metadata/filtros', { x: 1 });
    await assertFails(getDoc(doc(alice(), 'metadata', 'filtros')));
    await assertFails(setDoc(doc(alice(), 'otra', 'cosa'), { x: 1 }));
  });
});
