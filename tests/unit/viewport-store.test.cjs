/**
 * @jest-environment jsdom
 */

const fs = require('node:fs');
const path = require('node:path');

const themeJs = fs.readFileSync(
  path.resolve(__dirname, '../../assets/theme.js'),
  'utf8',
);

function bootAlpine({matches}) {
  const listeners = [];
  window.matchMedia = jest.fn().mockReturnValue({
    matches,
    addEventListener: (_event, handler) => listeners.push(handler),
  });

  const stores = {};
  const components = {};
  window.Alpine = {
    store(name, value) {
      if (value === undefined) return stores[name];
      stores[name] = value;
      if (typeof value.init === 'function') value.init();
      return value;
    },
    data(name, factory) {
      components[name] = factory;
    },
  };

  window.eval(themeJs);
  document.dispatchEvent(new Event('alpine:init'));

  return {
    stores,
    components,
    fire: (value) => listeners.forEach((h) => h({matches: value})),
  };
}

afterEach(() => {
  delete window.Alpine;
  jest.resetAllMocks();
});

test('registers a viewport store', () => {
  const {stores} = bootAlpine({matches: false});
  expect(stores.viewport).toBeDefined();
});

test('tracks the 768px breakpoint used by the accordions', () => {
  bootAlpine({matches: false});
  expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)');
});

test('starts false below the breakpoint', () => {
  const {stores} = bootAlpine({matches: false});
  expect(stores.viewport.desktop).toBe(false);
});

test('starts true at or above the breakpoint', () => {
  const {stores} = bootAlpine({matches: true});
  expect(stores.viewport.desktop).toBe(true);
});

test('updates when the viewport crosses the breakpoint', () => {
  const {stores, fire} = bootAlpine({matches: false});
  expect(stores.viewport.desktop).toBe(false);

  fire(true);
  expect(stores.viewport.desktop).toBe(true);

  fire(false);
  expect(stores.viewport.desktop).toBe(false);
});

test('registers the promo carousel component', () => {
  const {components} = bootAlpine({matches: true});
  expect(typeof components.promoCarousel).toBe('function');
});

test('carousel starts at the beginning of the row', () => {
  const {components} = bootAlpine({matches: true});
  const carousel = components.promoCarousel();
  expect(carousel.atStart).toBe(true);
  expect(carousel.atEnd).toBe(false);
});
