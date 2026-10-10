# Tests

```bash
npm test            # both suites
npm run test:unit   # Jest, fast, no store needed
npm run test:e2e    # Playwright, needs a running preview
```

**41 unit tests and 177 browser tests.**

## Unit tests — `tests/unit`

These cover the things Shopify only tells you about when you upload, which the
theme linter doesn't check.

`schema.test.cjs` reads every section's schema and asserts the rules that actually
broke an upload here: a slider setting can have at most 101 steps, and its default
has to land exactly on one of them. It also checks that every setting has a label a
merchant would understand rather than a leftover variable name, that every section
has a preset so it can be added from the theme editor, that presets only reference
blocks that exist, and that the footer's section group points at real sections and
real setting names. That last one is the class of typo that silently renders a
column as nothing. It caught a missing preset the first time it ran.

`viewport-store.test.cjs` covers the piece of JavaScript the footer uses to decide
whether the accordion button is announced and focusable at the current screen
width. A mistake there is an accessibility bug rather than a visual one, so it's
worth pinning down.

## Browser tests — `tests/e2e`

Playwright, at three widths: **390px, 1024px and 1728px**. They run against a live
`shopify theme dev`, so they exercise the real Liquid against real store content
rather than a fixture.

**Footer accordions.** Open and close, only one column open at a time, operable by
keyboard, `aria-controls` resolving to the right panel, collapsed links kept out of
the tab order, the open/closed state removed above 768px, and reduced motion
honoured. One test samples the panel's height across animation frames to prove it
animates rather than snapping.

**Footer layout.** Sweeps 19 widths from 320 to 1920 checking nothing overflows the
screen, and separately checks the newsletter button stays inside its panel across
the whole 768–1728 band. It pins the desktop composition to the Figma: the
padding, six 232px columns, a 1572px content width, the newsletter panel's two
columns, and the type scale down to the -0.64px letter spacing.

**Footer accessibility.** One footer landmark rather than two, a real label bound to
the email input, the form posting to Shopify with the newsletter tag, an accessible
name on every social icon with the image hidden so nothing is read twice, a visible
focus ring on every interactive element, and 44×44px tap targets both at phone
width and under touch emulation.

**Testimonial.** The rating announced as a rating, the individual stars hidden, the
full five-star scale drawn with the remainder dimmed, and each awkward case: no
rating, no attribution, a very short quote, and a quote long enough that the card
has to grow around it. Plus the card geometry and type scale against the frame.

**Carousel.** Every card and control reachable by tab, the row itself focusable,
arrow keys stepping and Home/End jumping, real mouse dragging, previous and next
switching off at the ends, a disabled control that does nothing when clicked, the
carousel and slide roles, the arrow appearing only on cards that go somewhere, an
unlinked card still being complete, the image fallback, the title panels levelling
to the tallest, and reduced motion.

## What they caught

They have caught real problems:

- The width sweep found a horizontal overflow at 320px.
- The animation test proved the accordion was reaching full height in under half
  its stated duration, because a fixed height cap overshot the real content.
- Adding links to the carousel cards activated a focus test that had been skipping,
  and it failed at desktop only: Chromium won't scroll a focused element into view
  if any part of it is already visible, so the last card took focus with its ring
  off the edge of the screen.

Three lessons are baked into how these are written. Check tap targets in both
dimensions, not just height. Tab through the page rather than calling `focus()`,
because a focus ring the browser never draws isn't a focus ring. And assert the
thing you actually care about: a test that says the panel's height is above zero
passes happily while the panel is clipping its links.

## Running them

The browser tests need a preview running:

```bash
npm run dev          # in one terminal
npm run test:e2e     # in another
```

Each run writes its artifacts to a folder named after its process, so two runs at
once don't delete each other's traces.
