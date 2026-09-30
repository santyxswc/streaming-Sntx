import { defineConfig } from 'vitest/config';

// Tests de las reglas de Firestore. Necesitan el emulador: `npm run test:rules`.
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.js'],
    environment: 'node',
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
