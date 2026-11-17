// Verificación automática: abre la escena en Chrome headless, recoge errores/avisos y guarda una captura.
// Uso:  npm run check            (vista normal)
//       npm run check -- "?cam=14,6,30,0,3,-10"   (query opcional, p. ej. otro punto de vista)
// Variables opcionales: CHECK_URL, CHROME_PATH, CHECK_WAIT (ms de espera tras cargar).
import { chromium } from 'playwright-core';
import { mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'check');
const outFile = join(outDir, 'captura.png');

const baseUrl = process.env.CHECK_URL ?? 'http://localhost:5173';
const url = baseUrl + (process.argv[2] ?? '');
const chromePath = process.env.CHROME_PATH ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const wait = Number(process.env.CHECK_WAIT ?? 4000);

if (!existsSync(chromePath)) {
  console.error(`✗ No encuentro Chrome en: ${chromePath} (usa CHROME_PATH)`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
rmSync(outFile, { force: true }); // evita dar por buena una captura de una ejecución anterior

const problems = [];
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  // WebGL por software si no hay GPU disponible en headless.
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(`[console.${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`[requestfailed] ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`[http ${r.status()}] ${r.url()}`);
  });

  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(wait);

  const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
  if (!hasCanvas) problems.push('[check] No hay <canvas>: la escena no llegó a crear el renderer WebGL');

  await page.screenshot({ path: outFile });
} catch (e) {
  problems.push(`[check] ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
}

if (problems.length) {
  console.error(`✗ ${problems.length} problema(s) en ${url}:`);
  for (const p of problems) console.error('  ' + p);
  console.error(existsSync(outFile) ? `Captura: ${outFile}` : 'No se pudo guardar captura.');
  process.exit(1);
}
console.log(`✓ Sin errores ni avisos en ${url}`);
console.log(`Captura: ${outFile}`);
