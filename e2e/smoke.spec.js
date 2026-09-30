import { test, expect } from '@playwright/test';

test.describe('API y cabeceras', () => {
  test('health responde ok', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  test('la web envía las cabeceras de seguridad', async ({ request }) => {
    const res = await request.get('/');
    const h = res.headers();
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-powered-by']).toBeUndefined();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['content-security-policy']).toContain("object-src 'none'");
    expect(h['content-security-policy']).not.toContain('unsafe-eval');
  });

  test('una ruta de API inexistente no revela detalles internos', async ({ request }) => {
    const res = await request.get('/api/no-existe');
    expect(res.status()).toBe(404);
    expect(await res.text()).not.toMatch(/node_modules|\/home\/|at .*\(.*:\d+:\d+\)/);
  });
});

test.describe('navegador', () => {
  test('la home pinta el catálogo sin violaciones de CSP ni errores de página', async ({ page }) => {
    const csp = [];
    const pageErrors = [];
    page.on('console', (m) => {
      if (m.type() === 'error' && /content security policy/i.test(m.text())) csp.push(m.text());
    });
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/');
    // El contenido llega por fetch desde /api/feed/home: si aparece un título del catálogo demo,
    // el flujo cliente -> API -> proveedor funciona de punta a punta.
    await expect(page.getByText('Origen').first()).toBeVisible();

    expect(csp, `Violaciones de CSP:\n${csp.join('\n')}`).toEqual([]);
    expect(pageErrors, `Errores de página:\n${pageErrors.join('\n')}`).toEqual([]);
  });

  test('se puede abrir un título desde la home', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('a[href^="/peliculas/"], a[href^="/series/"], a[href^="/anime/"]').first();
    await expect(card).toBeVisible();
    const href = await card.getAttribute('href');
    await card.click();
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    await expect(page.locator('body')).not.toContainText('Application error');
  });
});
