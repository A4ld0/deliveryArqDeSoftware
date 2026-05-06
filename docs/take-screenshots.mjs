/**
 * E4 Delivery — Script automático de screenshots
 * Uso: node docs/take-screenshots.mjs
 */

import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, 'screenshots');
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const CREDS = {
  client:     { email: process.env.CLIENT_EMAIL     || 'alanvareli@gmail.com',    password: process.env.CLIENT_PASS     || 'Hola12' },
  restaurant: { email: process.env.RESTAURANT_EMAIL || 'restaurante1@gmail.com',  password: process.env.RESTAURANT_PASS || 'restaurante1' },
  driver:     { email: process.env.DRIVER_EMAIL     || 'alan.varela@iteso.mx',    password: process.env.DRIVER_PASS     || 'Hola12' },
  admin:      { email: process.env.ADMIN_EMAIL      || 'alanvareli@gmail.com',    password: process.env.ADMIN_PASS      || 'Hola12' },
};

const BASE     = 'http://localhost:4200';
const DESKTOP  = { width: 1440, height: 900 };
const MOBILE   = { width: 390,  height: 844 };

// Navega y espera a que la UI cargue
async function go(page, url) {
  await page.goto(url, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1600);
}

// Guarda screenshot
async function shot(page, name) {
  const path = join(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false });
  console.log(`  ✓  ${name}.png`);
}

// Login y espera redirección
async function login(page, creds) {
  await go(page, `${BASE}/auth/login`);
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);
}

// ─────────────────────────────────────────────────────────────
const browser = await chromium.launch({ headless: true });

try {

  // ── 1. Páginas de autenticación ──────────────────────────
  console.log('\n📸 Autenticación');
  {
    const page = await browser.newPage();

    await page.setViewportSize(DESKTOP);
    await go(page, `${BASE}/auth/login`);
    await shot(page, '01-login-desktop');

    await page.setViewportSize(MOBILE);
    await go(page, `${BASE}/auth/login`);
    await shot(page, '01-login-mobile');

    await page.setViewportSize(DESKTOP);
    await go(page, `${BASE}/auth/register`);
    await shot(page, '02-registro');

    await page.close();
  }

  // ── 2. Flujo Cliente ─────────────────────────────────────
  console.log('\n📸 Cliente');
  {
    const page = await browser.newPage();
    await page.setViewportSize(DESKTOP);
    await login(page, CREDS.client);

    // Home: lista de restaurantes
    await go(page, `${BASE}/`);
    await shot(page, '03-cliente-home-desktop');

    await page.setViewportSize(MOBILE);
    await go(page, `${BASE}/`);
    await shot(page, '03-cliente-home-mobile');
    await page.setViewportSize(DESKTOP);

    // Detalle de restaurante + carrito
    try {
      // Clic en el primer restaurante visible
      const card = page.locator('article, .card, [class*="restaurant"], [class*="card"]').filter({ hasText: /\$|menú|ver|pedir/i }).first();
      if (await card.count() > 0) {
        await card.click();
      } else {
        // Fallback: URL directa del primer restaurante
        await go(page, `${BASE}/restaurants/1`);
      }
      await page.waitForTimeout(1500);
      await shot(page, '04-cliente-restaurante');

      // Agregar productos
      const addBtn = page.locator('button').filter({ hasText: /agregar|\+|añadir/i }).first();
      if (await addBtn.count() > 0) {
        await addBtn.click(); await page.waitForTimeout(500);
        const addBtn2 = page.locator('button').filter({ hasText: /agregar|\+|añadir/i }).nth(1);
        if (await addBtn2.count() > 0) { await addBtn2.click(); await page.waitForTimeout(400); }
        await shot(page, '05-cliente-restaurante-con-carrito');
      }

      // Ir al checkout
      const goCheckout = page.locator('button, a').filter({ hasText: /checkout|pagar|ver carrito|ir a pagar/i }).first();
      if (await goCheckout.count() > 0) {
        await goCheckout.click();
        await page.waitForTimeout(2000);
        await shot(page, '06-cliente-checkout');

        // Mobile checkout
        await page.setViewportSize(MOBILE);
        await page.waitForTimeout(600);
        await shot(page, '06-cliente-checkout-mobile');
        await page.setViewportSize(DESKTOP);
      }
    } catch (e) {
      console.log('    ⚠ Restaurante/carrito:', e.message);
    }

    // Mis pedidos
    await go(page, `${BASE}/orders`);
    await shot(page, '07-cliente-mis-pedidos-desktop');

    await page.setViewportSize(MOBILE);
    await go(page, `${BASE}/orders`);
    await shot(page, '07-cliente-mis-pedidos-mobile');
    await page.setViewportSize(DESKTOP);

    // Perfil
    await go(page, `${BASE}/profile`);
    await shot(page, '08-cliente-perfil');

    await page.close();
  }

  // ── 3. Flujo Restaurante ─────────────────────────────────
  console.log('\n📸 Restaurante');
  {
    const page = await browser.newPage();
    await page.setViewportSize(DESKTOP);
    await login(page, CREDS.restaurant);

    await go(page, `${BASE}/restaurant/dashboard`);
    await shot(page, '09-restaurante-dashboard');

    await go(page, `${BASE}/restaurant/orders`);
    await shot(page, '10-restaurante-pedidos');

    await page.setViewportSize(MOBILE);
    await go(page, `${BASE}/restaurant/orders`);
    await shot(page, '10-restaurante-pedidos-mobile');
    await page.setViewportSize(DESKTOP);

    await go(page, `${BASE}/restaurant/products`);
    await shot(page, '11-restaurante-menu');

    await go(page, `${BASE}/restaurant/settings`);
    await shot(page, '12-restaurante-configuracion');

    await page.close();
  }

  // ── 4. Flujo Repartidor ──────────────────────────────────
  console.log('\n📸 Repartidor');
  {
    const page = await browser.newPage();
    await page.setViewportSize(DESKTOP);
    await login(page, CREDS.driver);

    await go(page, `${BASE}/driver/dashboard`);
    await shot(page, '13-repartidor-dashboard-desktop');

    await page.setViewportSize(MOBILE);
    await go(page, `${BASE}/driver/dashboard`);
    await shot(page, '13-repartidor-dashboard-mobile');
    await page.setViewportSize(DESKTOP);

    await go(page, `${BASE}/driver/history`);
    await shot(page, '14-repartidor-historial');

    await go(page, `${BASE}/driver/profile`);
    await shot(page, '15-repartidor-perfil');

    await page.close();
  }

  // ── 5. Flujo Admin ───────────────────────────────────────
  console.log('\n📸 Admin');
  {
    const page = await browser.newPage();
    await page.setViewportSize(DESKTOP);
    await login(page, CREDS.admin);

    await go(page, `${BASE}/admin`);
    await shot(page, '16-admin-dashboard-top');

    // Scroll para capturar sección de usuarios
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    await page.waitForTimeout(400);
    await shot(page, '16-admin-dashboard-usuarios');

    await page.close();
  }

  console.log(`\n✅ Listo — screenshots en:  docs/screenshots/\n`);

} catch (err) {
  console.error('\n❌ Error inesperado:', err.message);
} finally {
  await browser.close();
}
