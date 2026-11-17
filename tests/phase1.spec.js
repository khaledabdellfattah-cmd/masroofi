import { test, expect } from '@playwright/test';

/** بيتأكد إن مفيش أي عنصر ظاهر خارج عرض الشاشة (360px) */
async function expectNoOverflow(page, label) {
  const bad = await page.evaluate(() => {
    const W = document.documentElement.clientWidth;
    const out = [];
    if (document.documentElement.scrollWidth > W) out.push(`page scrollWidth=${document.documentElement.scrollWidth}`);
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (getComputedStyle(el).visibility === 'hidden') continue;
      if (r.right > W + 1 || r.left < -1) out.push(`${el.tagName}.${el.className} [${Math.round(r.left)}→${Math.round(r.right)}]`);
    }
    return out.slice(0, 8);
  });
  expect(bad, `overflow on: ${label}`).toEqual([]);
}

function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

async function onboard(page) {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /أهلًا/ })).toBeVisible();
  await expect(page.getByTestId('salary')).toHaveValue('24000');
  await expect(page.getByTestId('payday')).toHaveValue('5');
  await expectNoOverflow(page, 'onboarding 1');
  await page.getByRole('button', { name: 'التالي' }).click();
  await expect(page.getByTestId('budget-diff')).toContainText('مظبوط');
  await expectNoOverflow(page, 'onboarding 2');
  await page.getByRole('button', { name: 'التالي' }).click();
  await expect(page.getByText('صندوق الأمان')).toBeVisible();
  await expectNoOverflow(page, 'onboarding 3');
  await page.getByRole('button', { name: /يلا نبدأ/ }).click();
  await expect(page.getByTestId('hero')).toBeVisible();
}

async function addExpense(page, amount, cat) {
  await page.getByTestId('fab').click();
  for (const d of String(amount)) await page.getByRole('button', { name: d, exact: true }).click();
  await page.getByRole('radio', { name: new RegExp(cat) }).click();
  await page.getByRole('button', { name: /^حفظ/ }).click();
}

test('المرحلة 1: الإعداد، الرئيسية، تسجيل المصاريف، التحذيرات، السجل', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-17T10:00:00'));
  const errors = trackErrors(page);
  await onboard(page);

  // الرئيسية: الدورة 5 نوفمبر → 4 ديسمبر، فاضل 18 يوم
  const hero = page.getByTestId('hero');
  await expect(hero).toContainText('10,500'); // معيشتي + خروجات + هدايا + لبس
  await expect(page.getByText('18', { exact: true })).toBeVisible();
  await expect(page.getByTestId('today')).toContainText('389'); // (5500+1500)/18
  await expect(page.getByTestId('week')).toContainText('الأسبوع 2');
  await expectNoOverflow(page, 'home');
  await page.screenshot({ path: 'test-results/home.png', fullPage: true });

  // إضافة مصروف في 3 لمسات (بعد كتابة المبلغ)
  await page.getByTestId('fab').click();
  await expectNoOverflow(page, 'add sheet');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'test-results/add-sheet.png' });
  await page.getByRole('button', { name: 'قفل' }).click();
  await addExpense(page, 150, 'معيشتي');
  await expect(page.getByText('اتسجل 150 ج في معيشتي')).toBeVisible();
  await expect(hero).toContainText('10,350');

  // مصروف سريع + تراجع
  await page.getByTestId('quick').filter({ hasText: 'مواصلات' }).click();
  await expect(hero).toContainText('10,330');
  await page.locator('.toast').filter({ hasText: 'اتسجل 20 ج' }).getByRole('button', { name: 'تراجع' }).click();
  await expect(hero).toContainText('10,350');

  // تنبيه 80%
  await addExpense(page, 1400, 'خروجات');
  await expect(page.getByText(/خروجات وعزومات وصل 93%/)).toBeVisible();

  // عدّى الحد → يسأل آخد منين، ويقترح اللبس بس (مش أهلك ولا التبرع)
  await addExpense(page, 200, 'خروجات');
  const dlg = page.getByRole('dialog', { name: /عدّيت حد خروجات/ });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: /من لبس/ })).toBeVisible();
  await expect(dlg.getByText(/أهلك|تبرع|صندوق/)).toHaveCount(0);
  await expectNoOverflow(page, 'cover sheet');
  await dlg.getByRole('button', { name: /من لبس/ }).click();
  await expect(page.getByText(/اتنقل 100 ج من لبس/)).toBeVisible();
  await expect(page.getByTestId('over-banner')).toHaveCount(0);

  // هدايا تعدّي ومناخدش من حتة → شريط أحمر
  await addExpense(page, 600, 'هدايا');
  await page.getByRole('dialog').getByRole('button', { name: 'سيبها كده' }).click();
  await expect(page.getByTestId('over-banner')).toContainText('هدايا');
  await expectNoOverflow(page, 'home with banner');
  await page.screenshot({ path: 'test-results/home-over.png', fullPage: true });

  // السجل: بحث، حذف، تراجع
  await page.getByRole('button', { name: 'السجل' }).click();
  const rows = page.getByTestId('exp-row');
  await expect(rows).toHaveCount(4);
  await expectNoOverflow(page, 'history');
  await page.getByTestId('search').fill('150');
  await expect(rows).toHaveCount(1);
  await page.getByTestId('search').fill('');
  await rows.filter({ hasText: 'هدايا' }).click();
  await expect(page.getByRole('dialog', { name: 'تعديل مصروف' })).toBeVisible();
  await page.getByRole('button', { name: /حذف/ }).click();
  await expect(rows).toHaveCount(3);
  await page.locator('.toast').filter({ hasText: 'اتحذف' }).getByRole('button', { name: 'تراجع' }).click();
  await expect(rows).toHaveCount(4);
  await page.getByRole('button', { name: /فلاتر/ }).click();
  await expectNoOverflow(page, 'history filters');

  // التعديل
  await rows.filter({ hasText: 'معيشتي' }).click();
  await page.getByRole('button', { name: 'امسح' }).click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: /^حفظ/ }).click();
  await expect(rows.filter({ hasText: 'معيشتي' })).toContainText('155');

  // الصناديق والإعدادات والثيم
  await page.getByRole('button', { name: 'الصناديق' }).click();
  await expect(page.getByText('صندوق الأمان')).toBeVisible();
  await expectNoOverflow(page, 'funds');
  await page.getByRole('button', { name: 'الإعدادات' }).click();
  await expectNoOverflow(page, 'settings');
  await page.getByRole('button', { name: 'غامق' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'الرئيسية' }).click();
  await expect(page.getByTestId('hero')).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'test-results/home-dark.png' });

  // البيانات بتفضل بعد الريفريش
  await page.reload();
  await expect(page.getByTestId('hero')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  expect(errors).toEqual([]);
});

test('بيشتغل offline بعد أول فتحة', async ({ page, context }) => {
  const errors = trackErrors(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: /أهلًا/ })).toBeVisible();
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise((r) => navigator.serviceWorker.addEventListener('controllerchange', r, { once: true }));
    return !!reg.active;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: /أهلًا/ })).toBeVisible();
  const fontOk = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "IBM Plex Sans Arabic"', 'مصروفي');
  });
  expect(fontOk).toBe(true);
  expect(errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e))).toEqual([]);
});
