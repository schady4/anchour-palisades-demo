import {test, expect} from '@playwright/test';

const SECTION = '.promo-carousel-section';
const PREV = `${SECTION} button:has-text("Previous")`;
const NEXT = `${SECTION} button:has-text("Next")`;

test.describe('promo carousel', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await page.locator(SECTION).scrollIntoViewIfNeeded();
  });

  test('renders a card for every entry the merchant picked', async ({page}) => {
    const cards = page.locator(`${SECTION} [data-promo-card]`);
    expect(await cards.count()).toBeGreaterThan(1);

    for (let i = 0; i < (await cards.count()); i++) {
      await expect(cards.nth(i)).toBeVisible();
    }
  });

  test('reaches every card and control by keyboard', async ({page}) => {
    const reachable = await page.evaluate(async () => {
      const section = document.querySelector('.promo-carousel-section');
      const expected = [
        ...section.querySelectorAll('a, button:not([disabled])'),
      ];

      const seen = new Set();
      let guard = 0;
      document.body.focus();
      while (guard++ < 60) {
        const current = document.activeElement;
        if (section.contains(current)) seen.add(current);
        const focusables = [
          ...document.querySelectorAll(
            'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
          ),
        ].filter((el) => el.offsetParent !== null || el === current);
        const index = focusables.indexOf(current);
        const next = focusables[index + 1];
        if (!next) break;
        next.focus();
      }

      return {
        expected: expected.length,
        reached: expected.filter((el) => seen.has(el)).length,
      };
    });

    expect(reachable.reached).toBe(reachable.expected);
  });

  test('a linked card is one link, and an unlinked card is no link', async ({
    page,
  }) => {
    const cards = page.locator(`${SECTION} [data-promo-card]`);

    for (let i = 0; i < (await cards.count()); i++) {
      const anchors = await cards.nth(i).locator('a').count();
      expect(anchors).toBeLessThanOrEqual(1);

      if (anchors === 1) {
        const href = await cards.nth(i).locator('a').getAttribute('href');
        expect(href).toBeTruthy();
      }
    }
  });

  test('scrolls a focused card fully into view', async ({page}) => {
    const links = page.locator(`${SECTION} [data-promo-card] a`);
    const count = await links.count();
    test.skip(count === 0, 'no card has a link, so no card is focusable');

    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);

    await scroller.focus();
    for (let i = 0; i < count; i++) await page.keyboard.press('Tab');
    await expect(links.last()).toBeFocused();

    await expect
      .poll(() =>
        scroller.evaluate((el) => {
          const card = [...el.querySelectorAll('[data-promo-card]')].pop();
          const port = el.getBoundingClientRect();
          const inset = parseFloat(getComputedStyle(el).paddingRight) || 0;
          return Math.round(
            card.getBoundingClientRect().right - (port.right - inset),
          );
        }),
      )
      .toBeLessThanOrEqual(1);

    expect(await scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('prev is disabled at the start and next at the end', async ({page}) => {
    const prev = page.locator(PREV);
    const next = page.locator(NEXT);
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);

    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });

    await expect(prev).toBeEnabled();
    await expect(next).toBeDisabled();
  });

  test('the next button advances the row', async ({page}) => {
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    const before = await scroller.evaluate((el) => el.scrollLeft);

    await page.locator(NEXT).click();
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(before);
  });

  test('a disabled control cannot be activated', async ({page}) => {
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    await expect(page.locator(PREV)).toBeDisabled();

    await page.locator(PREV).click({force: true}).catch(() => {});
    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);
  });

  test('respects prefers-reduced-motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.reload();
    await page.locator(SECTION).scrollIntoViewIfNeeded();

    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    await expect(scroller).toHaveCSS('scroll-behavior', 'auto');

    await page.locator(NEXT).click();
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);
  });

  test('names the controls for assistive tech', async ({page}) => {
    await expect(page.locator(PREV)).toHaveAccessibleName(/Previous/);
    await expect(page.locator(NEXT)).toHaveAccessibleName(/Next/);

    const icons = page.locator(`${SECTION} button img`);
    for (let i = 0; i < (await icons.count()); i++) {
      await expect(icons.nth(i)).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('falls back to a panel when a card has no image', async ({page}) => {
    const cards = page.locator(`${SECTION} [data-promo-card]`);

    for (let i = 0; i < (await cards.count()); i++) {
      const card = cards.nth(i);
      const covers = await card.locator('img.object-cover').count();
      const panels = await card
        .locator(':scope > :first-child > div[aria-hidden="true"]')
        .count();
      expect(covers + panels, `card ${i} has no backdrop`).toBe(1);
    }

    const box = await cards.first().boundingBox();
    expect(box.height).toBeGreaterThan(200);
  });

  test('matches the Figma card geometry', async ({page}) => {
    const card = page.locator(`${SECTION} [data-promo-card]`).first();
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);

    await page.setViewportSize({width: 1728, height: 900});
    let box = await card.boundingBox();
    expect(Math.round(box.width)).toBe(381);
    expect(Math.round(box.height)).toBe(392);
    await expect(scroller).toHaveCSS('column-gap', '16px');

    await page.setViewportSize({width: 390, height: 800});
    box = await card.boundingBox();
    expect(Math.round(box.width)).toBe(281);
    expect(Math.round(box.height)).toBe(289);
  });

  test('the scroller itself is reachable by keyboard', async ({page}) => {
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);

    await expect(scroller).toHaveAttribute('tabindex', '0');
    await scroller.focus();
    await expect(scroller).toBeFocused();
  });

  test('arrow keys step the row, Home and End jump to the edges', async ({
    page,
  }) => {
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    await scroller.focus();

    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(0);

    await page.keyboard.press('ArrowLeft');
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeLessThanOrEqual(1);

    await page.keyboard.press('End');
    await expect
      .poll(() =>
        scroller.evaluate((el) => el.scrollWidth - el.clientWidth - el.scrollLeft),
      )
      .toBeLessThanOrEqual(1);

    await page.keyboard.press('Home');
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeLessThanOrEqual(1);
  });

  test('can be dragged with a mouse', async ({page}) => {
    const scroller = page.locator(`${SECTION} [data-promo-scroller]`);
    const box = await scroller.boundingBox();
    const y = box.y + box.height / 2;

    expect(await scroller.evaluate((el) => el.scrollLeft)).toBe(0);

    await page.mouse.move(box.x + box.width - 60, y);
    await page.mouse.down();
    for (let x = 60; x <= 260; x += 40) {
      await page.mouse.move(box.x + box.width - 60 - x, y);
    }
    await page.mouse.up();

    await expect
      .poll(() => scroller.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(50);
  });

  test('announces itself as a carousel of slides', async ({page}) => {
    const group = page.locator(`${SECTION} [aria-roledescription="carousel"]`);
    await expect(group).toHaveCount(1);
    await expect(group).toHaveAttribute('role', 'group');
    expect(await group.getAttribute('aria-label')).toBeTruthy();

    const cards = page.locator(`${SECTION} [data-promo-card]`);
    const total = await cards.count();

    for (let i = 0; i < total; i++) {
      await expect(cards.nth(i)).toHaveAttribute(
        'aria-roledescription',
        'slide',
      );
      await expect(cards.nth(i)).toHaveAttribute(
        'aria-label',
        `${i + 1} of ${total}`,
      );
    }
  });

  test('the controls point at the row they control', async ({page}) => {
    const scrollerId = await page
      .locator(`${SECTION} [data-promo-scroller]`)
      .getAttribute('id');
    expect(scrollerId).toBeTruthy();

    await expect(page.locator(PREV)).toHaveAttribute(
      'aria-controls',
      scrollerId,
    );
    await expect(page.locator(NEXT)).toHaveAttribute(
      'aria-controls',
      scrollerId,
    );
  });

  test('every linked card has an accessible name', async ({page}) => {
    const links = page.locator(`${SECTION} [data-promo-card] a`);

    for (let i = 0; i < (await links.count()); i++) {
      const name = await links.nth(i).evaluate((el) =>
        (el.getAttribute('aria-label') || el.textContent || '').trim(),
      );
      expect(name.length, `card link ${i} has no accessible name`).toBeGreaterThan(0);
    }
  });

  test('the arrow only appears on a card that goes somewhere', async ({
    page,
  }) => {
    const cards = page.locator(`${SECTION} [data-promo-card]`);

    for (let i = 0; i < (await cards.count()); i++) {
      const card = cards.nth(i);
      const linked = (await card.locator('a').count()) === 1;
      const arrows = await card.locator('img[src*="promo-arrow"]').count();

      expect(arrows, `card ${i} linked=${linked} arrows=${arrows}`).toBe(
        linked ? 1 : 0,
      );
    }
  });

  test('an unlinked card is still a complete card', async ({page}) => {
    const cards = page.locator(`${SECTION} [data-promo-card]`);

    for (let i = 0; i < (await cards.count()); i++) {
      const card = cards.nth(i);
      if ((await card.locator('a').count()) > 0) continue;

      const box = await card.boundingBox();
      expect(box.height).toBeGreaterThan(200);
      expect(await card.locator('span').first().textContent()).not.toBe('');
    }
  });

  test('levels the title panels to the tallest', async ({page}) => {
    const measure = () =>
      page.evaluate(() => {
        const panels = [...document.querySelectorAll('[data-promo-text]')];
        const applied = panels.map((p) =>
          Math.round(p.getBoundingClientRect().height),
        );

        const natural = panels.map((p) => {
          const previous = p.style.minHeight;
          p.style.minHeight = '';
          const height = Math.round(p.getBoundingClientRect().height);
          p.style.minHeight = previous;
          return height;
        });

        return {applied, natural};
      });

    for (const width of [1728, 1024, 390]) {
      await page.setViewportSize({width, height: 900});
      await page.goto('/');
      await page.waitForTimeout(400);

      const {applied, natural} = await measure();
      expect(applied.length).toBeGreaterThan(1);

      expect(
        new Set(applied).size,
        `panels differ at ${width}px: ${applied.join(', ')}`,
      ).toBe(1);

      expect(applied[0], `not the tallest at ${width}px`).toBe(
        Math.max(...natural),
      );
    }
  });

  test('never pushes the page into horizontal overflow', async ({page}) => {
    for (const width of [320, 390, 768, 1024, 1280, 1728]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(60);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(scrollWidth, `page overflows at ${width}px`).toBeLessThanOrEqual(
        width,
      );
    }
  });
});
