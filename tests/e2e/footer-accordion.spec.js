import {test, expect} from '@playwright/test';

const MOBILE = {width: 390, height: 844};
const DESKTOP = {width: 1440, height: 1000};

test.describe('footer accordions', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/');
    await page.locator('footer nav').scrollIntoViewIfNeeded();
  });

  test('collapses into accordions below 768px and expands above', async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE);
    const chevron = page.locator('.footer-accordion-icon').first();
    await expect(chevron).toBeVisible();

    await page.setViewportSize({width: 768, height: 900});
    await expect(chevron).toBeHidden();
  });

  test('opens and closes a column on click', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const second = page.locator('footer nav > div').nth(1);
    const button = second.getByRole('button');
    const panel = second.locator('.footer-panel-collapse');

    await expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(await panel.boundingBox()).toMatchObject({height: 0});

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect
      .poll(async () => (await panel.boundingBox()).height)
      .toBeGreaterThan(0);

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect
      .poll(async () => (await panel.boundingBox()).height)
      .toBe(0);
  });

  test('keeps only one column open at a time', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const buttons = page.locator('footer nav > div').getByRole('button');

    await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'true');

    await buttons.nth(2).click();
    await expect(buttons.nth(2)).toHaveAttribute('aria-expanded', 'true');
    await expect(buttons.nth(0)).toHaveAttribute('aria-expanded', 'false');

    const expanded = await page
      .locator('footer nav [aria-expanded="true"]')
      .count();
    expect(expanded).toBe(1);
  });

  test('animates the panel rather than snapping open', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const second = page.locator('footer nav > div').nth(1);
    const panel = second.locator('.footer-panel-collapse');

    await expect(panel).toHaveCSS('transition-property', 'max-height');

    const heights = await second.evaluate(async (column) => {
      const el = column.querySelector('.footer-panel-collapse');
      const samples = [];
      column.querySelector('button').click();

      await new Promise((resolve) => {
        const started = performance.now();
        const tick = () => {
          samples.push(el.getBoundingClientRect().height);
          if (performance.now() - started < 600) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });

      return samples;
    });

    const settled = heights[heights.length - 1];
    expect(settled).toBeGreaterThan(0);

    const intermediate = heights.filter((h) => h > 0 && h < settled - 1);
    expect(
      intermediate.length,
      `expected intermediate heights, saw: ${[...new Set(heights)].join(', ')}`,
    ).toBeGreaterThan(2);
  });

  test('never clips the links in an open panel', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const columns = page.locator('footer nav > div');

    await expect(page.locator('.footer-accordion-icon').first()).toBeVisible();
    await expect
      .poll(() => columns.first().getByRole('button').getAttribute('aria-expanded'))
      .not.toBeNull();

    for (let i = 0; i < (await columns.count()); i++) {
      const column = columns.nth(i);
      const button = column.getByRole('button');

      if ((await button.getAttribute('aria-expanded')) !== 'true') {
        await button.click();
      }
      await expect(button).toHaveAttribute('aria-expanded', 'true');

      await expect
        .poll(() =>
          column
            .locator('.footer-panel-collapse')
            .evaluate((el) => el.scrollHeight - el.clientHeight),
        )
        .toBeLessThanOrEqual(1);

      const panelBox = await column
        .locator('.footer-panel-collapse')
        .boundingBox();
      const lastLink = column.locator('ul a').last();
      const linkBox = await lastLink.boundingBox();

      expect(
        Math.round(linkBox.y + linkBox.height),
        `last link clipped in column ${i}`,
      ).toBeLessThanOrEqual(Math.round(panelBox.y + panelBox.height) + 1);
    }
  });

  test('is operable by keyboard', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const second = page.locator('footer nav > div').nth(1);
    const button = second.getByRole('button');

    await button.focus();
    await expect(button).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  test('points aria-controls at the panel it controls', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const columns = page.locator('footer nav > div');

    for (let i = 0; i < (await columns.count()); i++) {
      const id = await columns.nth(i).getByRole('button').getAttribute('aria-controls');
      expect(id).toBeTruthy();
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }
  });

  test('keeps collapsed links out of the tab order', async ({page}) => {
    await page.setViewportSize(MOBILE);
    const closedPanel = page
      .locator('footer nav > div')
      .nth(1)
      .locator('.footer-panel-collapse');

    await expect
      .poll(() => closedPanel.getAttribute('inert'))
      .not.toBeNull();
  });

  test('stops announcing a collapsed control on desktop', async ({page}) => {
    await page.setViewportSize(DESKTOP);
    const button = page.locator('footer nav > div').first().getByRole('button');

    await expect
      .poll(() => button.getAttribute('aria-expanded'))
      .toBeNull();
    await expect(button).toHaveAttribute('tabindex', '-1');

    const panels = page.locator('footer nav .footer-panel-collapse');
    for (let i = 0; i < (await panels.count()); i++) {
      expect((await panels.nth(i).boundingBox()).height).toBeGreaterThan(0);
      await expect
        .poll(() => panels.nth(i).getAttribute('inert'))
        .toBeNull();
    }
  });

  test('respects prefers-reduced-motion', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.setViewportSize(MOBILE);
    await page.reload();

    const panel = page
      .locator('footer nav > div')
      .nth(1)
      .locator('.footer-panel-collapse');
    await expect(panel).toHaveCSS('transition-duration', '0s');
  });
});
