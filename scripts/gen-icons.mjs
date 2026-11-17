// يولّد أيقونات PNG من icon.svg باستخدام Playwright (مرة واحدة، أو لما تغيّر الأيقونة)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/icons/icon.svg', import.meta.url), 'utf8');
const out = (n) => new URL(`../public/icons/${n}`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1');

const browser = await chromium.launch();
const page = await browser.newPage();
async function render(name, size, { maskable = false, rounded = true } = {}) {
  await page.setViewportSize({ width: size, height: size });
  const inner = maskable
    ? `<div style="width:${size}px;height:${size}px;background:#0f766e;display:flex;align-items:center;justify-content:center"><div style="width:${size * 0.8}px;height:${size * 0.8}px">${svg}</div></div>`
    : `<div style="width:${size}px;height:${size}px">${rounded ? svg : svg.replace('rx="112"', 'rx="0"')}</div>`;
  await page.setContent(`<html><body style="margin:0;background:transparent">${inner}<style>svg{width:100%;height:100%;display:block}</style></body></html>`);
  await page.screenshot({ path: out(name), omitBackground: true });
}
await render('icon-192.png', 192);
await render('icon-512.png', 512);
await render('icon-maskable-512.png', 512, { maskable: true });
await render('apple-touch-icon.png', 180, { rounded: false });
await browser.close();
console.log('icons generated');
