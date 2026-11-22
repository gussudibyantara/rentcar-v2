/** Read-only responsive smoke test. Discovers current and future sidebar routes. */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
let chromium;
try { ({ chromium } = require('playwright')); }
catch {
  try { ({ chromium } = require(path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'))); }
  catch { console.error('Playwright belum tersedia. Instal dengan pnpm add -D playwright, lalu jalankan ulang.'); process.exit(1); }
}
const base = process.env.TRAVELOS_TEST_URL || 'http://127.0.0.1:3002';
const widths = [320, 360, 390, 430, 600, 760, 761, 768, 820, 1024, 1025, 1100, 1101, 1280, 1440, 1920];
const landscapes = [{ width: 844, height: 390 }, { width: 1180, height: 820 }];
const output = path.resolve('output/responsive');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: process.env.TRAVELOS_BROWSER || 'chrome' });
  const errors = [], checks = [];
  try {
    const discovery = await browser.newPage();
    await discovery.goto(base, { waitUntil: 'networkidle' });
    const links = await discovery.locator('nav a[href^="/"]').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    const routes = [...new Set(['/', ...links, ...(process.env.TRAVELOS_TEST_ROUTES || '').split(',').filter(Boolean)])];
    await discovery.close();
    const sizes = [...widths.map(width => ({ width, height: 900 })), ...landscapes];
    for (const size of sizes) {
      const page = await browser.newPage({ viewport: size, reducedMotion: 'reduce' });
      page.on('pageerror', error => errors.push(`${size.width}px: ${error.message}`));
      const verify = async label => {
        const dimensions = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
        assert.ok(dimensions.document <= dimensions.viewport, `${label}: document overflow ${dimensions.document} > ${dimensions.viewport}`);
        checks.push({ label, ...size });
      };
      for (const route of routes) {
        const response = await page.goto(new URL(route, base).href, { waitUntil: 'networkidle' });
        assert.ok(response && response.ok(), `Route failed: ${route}`);
        await page.locator('main h1').waitFor();
        await page.locator('.loading-state').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('.error-banner').count(), 0, `Data load failed: ${route}`);
        await verify(route);
        if ([390, 820, 1440].includes(size.width)) await page.screenshot({ path: path.join(output, `${route.replaceAll('/', '') || 'dashboard'}-${size.width}.png`), animations: 'disabled' });
        if (route.split('?')[0] === '/calendar') {
          for (const mode of ['Hari', 'Bulan']) { await page.getByRole('tab', { name: mode, exact: true }).click(); await verify(`${route} ${mode}`); }
        }
        const fleetForm = { '/employees': 'Tambah karyawan', '/units': 'Tambah kendaraan', '/maintenance': 'Jadwalkan maintenance', '/inspections': 'Jadwalkan inspeksi', '/customers': 'Tambah pelanggan', '/expenses': 'Tambah pengeluaran', '/invoices': 'Buat invoice', '/partners': 'Tambah rekanan', '/settlements': 'Buat invoice rekanan' }[route.split('?')[0]];
        if (fleetForm && size.width <= 430 && await page.getByRole('button', { name: fleetForm, exact: true }).isEnabled()) {
          await page.getByRole('button', { name: fleetForm, exact: true }).click();
          await page.getByRole('dialog').waitFor(); await verify(`${route} form drawer`);
          await page.getByRole('button', { name: 'Batal', exact: true }).click();
        }
        if (route.split('?')[0] === '/bookings' && size.width <= 430) {
          await page.getByRole('button', { name: 'Booking baru', exact: true }).click();
          await page.getByRole('dialog').waitFor(); await verify('Booking form drawer');
          await page.getByRole('button', { name: 'Batal', exact: true }).click();
        }
      }
      console.log(`PASS ${size.width}×${size.height} · ${routes.join(', ')}`);
      await page.close();
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    const result = { checkedAt: new Date().toISOString(), routes, widths, landscapes, checks: checks.length, errors };
    await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2));
    console.log(`Responsive checks passed: ${checks.length}. Results: ${output}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
