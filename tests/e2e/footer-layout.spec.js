import {test, expect} from '@playwright/test';

const WIDTHS = [
  320, 360, 390, 480, 600, 700, 767, 768, 900, 1024, 1100, 1200, 1279, 1280,
  1320, 1440, 1572, 1728, 1920,
];

test.describe('footer layout', () => {
  test('never overflows the viewport horizontally', async ({page}) => {
    await page.goto('/');

    for (const width of WIDTHS) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(60);

      const {scrollWidth, offenders} = await page.evaluate((vw) => {
        const offenders = [...document.querySelectorAll('footer *')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.right > vw + 0.5 || r.left < -0.5;
          })
          .map((el) => `${el.tagName}.${String(el.className).split(' ')[0]}`)
          .slice(0, 3);
        return {scrollWidth: document.documentElement.scrollWidth, offenders};
      }, width);

      expect(
        scrollWidth,
        `horizontal overflow at ${width}px (offenders: ${offenders.join(', ') || 'none'})`,
      ).toBeLessThanOrEqual(width);
    }
  });

  test('matches the Figma desktop composition at 1728px', async ({page}) => {
    await page.setViewportSize({width: 1728, height: 1000});
    await page.goto('/');

    const footer = page.locator('footer').first();
    await expect(footer).toHaveCSS('padding', '60px 78px 48px');

    const main = page.locator('footer nav').locator('..');
    await expect(main).toHaveCSS(
      'grid-template-columns',
      '232px 232px 232px 232px 232px 232px',
    );

    const inner = page.locator('footer .max-w-site');
    expect((await inner.boundingBox()).width).toBe(1572);

    const panel = page.locator('footer section').first();
    await expect(panel).toHaveCSS('grid-template-columns', '573px 594px');
  });

  test('keeps the newsletter button inside its panel at every width', async ({
    page,
  }) => {
    await page.goto('/');

    for (const width of [768, 1024, 1280, 1320, 1380, 1440, 1572, 1728]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(60);

      const panel = await page.locator('footer section').first().boundingBox();
      const button = await page
        .locator('footer button[type="submit"]')
        .boundingBox();

      expect(
        button.x + button.width,
        `submit button overflows the newsletter panel at ${width}px`,
      ).toBeLessThanOrEqual(panel.x + panel.width);
    }
  });

  test('uses the Figma type scale on desktop', async ({page}) => {
    await page.setViewportSize({width: 1728, height: 1000});
    await page.goto('/');

    const heading = page.locator('footer section h2').first();
    await expect(heading).toHaveCSS('font-size', '32px');
    await expect(heading).toHaveCSS('line-height', '38.4px'); // 1.2
    await expect(heading).toHaveCSS('letter-spacing', '-0.64px'); // -2%

    const columnHeading = page.locator('footer nav h2').first();
    await expect(columnHeading).toHaveCSS('font-size', '22px');
    await expect(columnHeading).toHaveCSS('letter-spacing', '-0.22px');
  });

  test('stacks only below 768px', async ({page}) => {
    await page.goto('/');

    await page.setViewportSize({width: 768, height: 900});
    const contact = page.locator('footer section[aria-label]').last();
    await expect(contact).toHaveCSS('border-top-width', '0px');

    await page.setViewportSize({width: 390, height: 844});
    await expect(contact).toHaveCSS('border-top-width', '1px');
  });
});
