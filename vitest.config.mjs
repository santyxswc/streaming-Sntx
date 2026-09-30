import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.js', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.js'],
    // Requieren el emulador de Firestore: se ejecutan con `npm run test:rules`.
    exclude: ['tests/rules/**', 'node_modules/**'],
    environment: 'node',
    // Solo se mide la lógica de servidor (los componentes React no tienen pruebas de
    // navegador). Los umbrales son un suelo anti-regresión justo por debajo de la medición
    // actual: súbelos cuando añadas pruebas, nunca los bajes para que pase un cambio.
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/server/**', 'src/config/**', 'src/app/api/**'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
      thresholds: { statements: 31, branches: 22, functions: 31, lines: 33 },
    },
  },
});
