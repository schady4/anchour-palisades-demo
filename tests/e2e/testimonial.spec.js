import {test, expect} from '@playwright/test';

const CASE = {
  default: '[id$="__t-default"]',
  short: '[id$="__t-short"]',
  long: '[id$="__t-long"]',
  anon: '[id$="__t-anon"]',
};

test.describe('testimonial', () => {
  test.beforeEach(async ({page}) => {
    await page.goto('/?view=cases');
  });

  test('renders the quote and attribution', async ({page}) => {
    const section = page.locator(CASE.default);
    await expect(section.locator('blockquote')).toContainText(
      'home equity loan',
    );
    await expect(section.getByText(/Shabsai U/)).toBeVisible();
    await expect(section.getByText(/Palisades CU Member/)).toBeVisible();
  });

  test('announces the rating as a rating, not decoration', async ({page}) => {
    const rating = page.locator(CASE.default).getByRole('img', {
      name: /Rated \d out of 5/,
    });
    await expect(rating).toHaveCount(1);
    await expect(rating).toHaveAccessibleName('Rated 5 out of 5');
  });

  test('hides the individual stars from assistive tech', async ({page}) => {
    const stars = page.locator(`${CASE.default} [role="img"] img`);
    await expect(stars).toHaveCount(5);

    for (let i = 0; i < 5; i++) {
      await expect(stars.nth(i)).toHaveAttribute('aria-hidden', 'true');
      await expect(stars.nth(i)).toHaveAttribute('alt', '');
    }
  });

  test('draws the full five-star scale, dimming the remainder', async ({
    page,
  }) => {
    const stars = page.locator(`${CASE.short} [role="img"] img`);
    await expect(stars).toHaveCount(5);

    for (let i = 0; i < 4; i++) {
      await expect(stars.nth(i)).toHaveCSS('opacity', '1');
    }
    await expect(stars.nth(4)).toHaveCSS('opacity', '0.25');
  });

  test('omits the rating entirely when there is none', async ({page}) => {
    const section = page.locator(CASE.long);
    await expect(section).toBeVisible();
    await expect(section.getByRole('img', {name: /Rated/})).toHaveCount(0);
    await expect(section.locator('blockquote')).toBeVisible();
  });

  test('omits the attribution when there is none', async ({page}) => {
    const section = page.locator(CASE.anon);
    await expect(section).toBeVisible();
    await expect(section.locator('blockquote')).toBeVisible();
    await expect(section.getByText('|')).toHaveCount(0);
    const paragraphs = await section.locator('p').allTextContents();
    expect(paragraphs.every((t) => t.trim().length > 0)).toBe(true);
  });

  test('keeps a very long quote inside the card', async ({page}) => {
    const section = page.locator(CASE.long);
    const card = section.locator('section > div').first();
    const quote = section.locator('blockquote');

    const cardBox = await card.boundingBox();
    const quoteBox = await quote.boundingBox();

    expect(quoteBox.x).toBeGreaterThanOrEqual(cardBox.x - 1);
    expect(quoteBox.x + quoteBox.width).toBeLessThanOrEqual(
      cardBox.x + cardBox.width + 1,
    );
    expect(cardBox.height).toBeGreaterThan(quoteBox.height);
  });

  test('handles a very short quote without collapsing', async ({page}) => {
    const section = page.locator(CASE.short);
    const card = section.locator('section > div').first();
    const box = await card.boundingBox();

    expect(box.height).toBeGreaterThan(200);
    await expect(section.locator('blockquote')).toBeVisible();
  });

  test('hides the decorative artwork from assistive tech', async ({page}) => {
    const decorations = page.locator(`${CASE.default} [aria-hidden="true"]`);
    expect(await decorations.count()).toBeGreaterThan(0);

    const section = page.locator(CASE.default);
    await expect(section.locator('img[alt]:not([alt=""])')).toHaveCount(0);
  });

  test('leaves the spacing the comp asks for below the card', async ({
    page,
  }) => {
    const gap = async () =>
      page.evaluate(() => {
        const cards = document.querySelectorAll(
          '.testimonial-section section > div',
        );
        const card = cards[cards.length - 1];
        const footer = document.querySelector('footer');
        return Math.round(
          footer.getBoundingClientRect().top -
            card.getBoundingClientRect().bottom,
        );
      });

    await page.setViewportSize({width: 1728, height: 1400});
    await page.goto('/?view=cases');
    expect(await gap()).toBe(112);

    await page.setViewportSize({width: 390, height: 1400});
    await page.goto('/?view=cases');
    expect(await gap()).toBe(36);
  });

  test('never overflows the viewport', async ({page}) => {
    for (const width of [320, 390, 768, 1024, 1280, 1728]) {
      await page.setViewportSize({width, height: 900});
      await page.waitForTimeout(60);

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(scrollWidth, `overflow at ${width}px`).toBeLessThanOrEqual(width);
    }
  });

  test('matches the card spec from Figma', async ({page}) => {
    await page.setViewportSize({width: 1728, height: 1400});
    await page.goto('/?view=cases');

    const card = page.locator(`${CASE.default} section > div`);

    const box = await card.boundingBox();
    expect(Math.round(box.width)).toBe(1572);
    expect(Math.round(box.x)).toBe(78);
    await expect(card).toHaveCSS('border-top-left-radius', '16px');
    await expect(card).toHaveCSS('padding-top', '120px');
    await expect(card).toHaveCSS('padding-bottom', '120px');
    await expect(card).toHaveCSS('row-gap', '48px');

    const quote = page.locator(`${CASE.default} blockquote`);
    await expect(quote).toHaveCSS('max-width', '1044px');
    await expect(quote).toHaveCSS('text-align', 'center');
  });

  test('keeps the decorations out of the card grid', async ({page}) => {
    await page.setViewportSize({width: 1728, height: 1400});
    await page.goto('/?view=cases');

    const deco = page.locator(
      `${CASE.default} section > div > [aria-hidden="true"]`,
    );
    await expect(deco).toHaveCSS('position', 'absolute');

    const rows = await page.evaluate(() => {
      const card = document.querySelector(
        '[id$="__t-default"] section > div',
      );
      return [...card.children].filter(
        (el) => getComputedStyle(el).position !== 'absolute',
      ).length;
    });
    expect(rows).toBe(2); // the label and the content block, nothing else
  });

  test('uses the Figma type scale', async ({page}) => {
    await page.setViewportSize({width: 1728, height: 1000});
    await page.goto('/?view=cases');

    const section = page.locator(CASE.default);
    const quote = section.locator('blockquote');
    await expect(quote).toHaveCSS('font-size', '42px');
    await expect(quote).toHaveCSS('line-height', '58.8px'); // 1.4

    const label = section.locator('h2');
    await expect(label).toHaveCSS('font-size', '20px');
    await expect(label).toHaveCSS('letter-spacing', '1.6px'); // 8%
    await expect(label).toHaveCSS('text-transform', 'uppercase');
  });
});
