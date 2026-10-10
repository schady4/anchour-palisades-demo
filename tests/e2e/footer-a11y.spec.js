import {test, expect} from '@playwright/test';

test.describe('footer accessibility', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
  });

  test('exposes exactly one contentinfo landmark', async ({page}) => {
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
  });

  test('associates a real label with the email input', async ({page}) => {
    const input = page.locator('footer input[type="email"]');
    const id = await input.getAttribute('id');
    expect(id).toBeTruthy();

    const label = page.locator(`footer label[for="${id}"]`);
    await expect(label).toHaveCount(1);
    expect((await label.textContent()).trim().length).toBeGreaterThan(0);

    await expect(input).toHaveAttribute('name', 'contact[email]');
  });

  test('posts to Shopify rather than being decorative', async ({page}) => {
    const form = page.locator('footer form');
    await expect(form).toHaveAttribute('action', /\/contact/);
    await expect(form).toHaveAttribute('method', /post/i);
    await expect(
      form.locator('input[name="contact[tags]"]'),
    ).toHaveAttribute('value', 'newsletter');
  });

  test('gives every social icon an accessible name', async ({page}) => {
    const links = page.locator('footer section[aria-label] ul a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const name = (await links.nth(i).textContent()).trim();
      expect(name.length).toBeGreaterThan(0);
      await expect(links.nth(i).locator('img')).toHaveAttribute('alt', '');
    }
  });

  test('gives every interactive element a visible focus ring', async ({page}) => {
    const expected = await page.evaluate(() => {
      const els = [
        ...document.querySelectorAll('footer a[href], footer button, footer input'),
      ];
      els.forEach((el, i) => el.setAttribute('data-focus-audit', String(i)));

      return els
        .filter(
          (el) =>
            el.type !== 'hidden' &&
            !el.closest('[inert]') &&
            el.tabIndex >= 0 &&
            el.getBoundingClientRect().width > 0,
        )
        .map((el) => el.dataset.focusAudit);
    });

    expect(expected.length).toBeGreaterThan(5);

    const seen = new Map();
    for (let i = 0; i < 200 && seen.size < expected.length; i++) {
      await page.keyboard.press('Tab');
      const hit = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el.dataset?.focusAudit === undefined) return null;
        const style = getComputedStyle(el);
        return {
          id: el.dataset.focusAudit,
          ring:
            style.outlineStyle === 'solid' &&
            parseFloat(style.outlineWidth) >= 2,
          label: `${el.tagName}"${(el.textContent || el.name || '')
            .trim()
            .slice(0, 24)}"`,
        };
      });
      if (hit) seen.set(hit.id, hit);
    }

    const unreached = expected.filter((id) => !seen.has(id));
    expect(unreached, `${unreached.length} element(s) never reached`).toEqual([]);

    const ringless = [...seen.values()].filter((v) => !v.ring).map((v) => v.label);
    expect(ringless, `no focus ring on: ${ringless.join(', ')}`).toEqual([]);
  });

  test('meets 44x44 tap targets at phone width', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.goto('/');

    const small = await collectSmallTargets(page);
    expect(small, `under 44x44: ${small.join(' | ')}`).toEqual([]);
  });

  test('meets 44x44 tap targets on a touch device', async ({browser}) => {
    const context = await browser.newContext({
      viewport: {width: 390, height: 844},
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.goto('/');

    const small = await collectSmallTargets(page);
    expect(small, `under 44x44: ${small.join(' | ')}`).toEqual([]);

    await context.close();
  });

  test('labels the footer navigation', async ({page}) => {
    await expect(page.locator('footer nav[aria-label]')).toHaveCount(1);
  });

  test('renders headings as real headings', async ({page}) => {
    const headings = page.locator('footer h2');
    expect(await headings.count()).toBeGreaterThan(0);
  });
});

async function collectSmallTargets(page) {
  const small = [];

  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || !el.closest('footer')) return null;
      const r = el.getBoundingClientRect();
      return {
        label: `${el.tagName}"${(el.textContent || '').trim().slice(0, 20)}"`,
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    });

    if (info && (info.width < 44 || info.height < 44)) {
      const entry = `${info.label} ${info.width}x${info.height}`;
      if (!small.includes(entry)) small.push(entry);
    }
  }

  return small;
}
