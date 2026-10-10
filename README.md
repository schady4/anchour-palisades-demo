# Palisades Credit Union — Shopify theme sections

Three sections from the Figma file, built as a working Shopify theme: a footer, a
testimonial, and a promo carousel.

All three are finished and running on the development store as an unpublished
theme, *Palisades — Footer (demo)*.

The home page shows each section the way the comp does. The testimonial's awkward
cases (a very long quote, no star rating, no attribution) are on a separate test
page at `/?view=cases`, so they don't clutter the designed page.

## Time spent

Roughly **7 hours** across two days. These are estimates rather than tracked time,
and testing and store setup ran alongside the building rather than after it.

| Work | Hours |
| --- | --- |
| Theme setup, Tailwind pipeline, fonts and Figma tokens | 0.75 |
| Section 01 — footer | 3 |
| Section 02 — testimonial | 1 |
| Section 03 — promo carousel | 1.75 |
| Store content, tests and this README | 0.5 |
| **Total** | **7** |

The footer took the longest. Most of that time went on the mobile accordion: the
open and close animation, and keeping the screen reader state in step with a
layout that stops being an accordion at 768px.

---

## How to run it

```bash
npm install     # installs the build tools and copies Alpine.js into assets/
npm run dev     # starts the stylesheet compiler and a local preview together
```

`npm run dev` prints a local address, usually `http://127.0.0.1:9292`. Open it and
the theme is running against real store data. Edit anything in `sections/` or
`snippets/` and the page updates on its own.

The store it connects to is set in `shopify.theme.toml`. To point it elsewhere:

```bash
shopify theme dev --store your-store.myshopify.com
```

Add `--store-password <password>` if the storefront is password protected.

Note that the preview only watches local files. It does not know when something
changes in the Shopify admin, so after editing a menu or a testimonial you need to
reload the page yourself.

The theme installs and renders with nothing set up in the admin. Nothing is
hardcoded and nothing breaks when content is missing. To fill the content in, see
**[docs/store-setup.md](docs/store-setup.md)**.

| Command | What it does |
| --- | --- |
| `npm run css` | compiles the stylesheet once |
| `npm run css:build` | same, minified — run before `shopify theme push` |
| `npm test` | runs both test suites |
| `npx shopify theme check` | Shopify's own theme linter |

## Where things are

| Path | What's in it |
| --- | --- |
| `sections/footer-palisades.liquid` | Section 01, the footer |
| `sections/testimonial.liquid` | Section 02 |
| `sections/promo-carousel.liquid` | Section 03 |
| `snippets/` | the smaller pieces the sections reuse |
| `assets/theme.js` | all of the JavaScript |
| `src/styles/main.css` | the stylesheet source, compiled to `assets/theme.css` |
| `scripts/` | the script that copies Alpine.js into `assets/` on install |
| `tests/` | the test suites |

---

## What I started from, and why

**Shopify's Skeleton theme.**

Dawn would also have worked, but it includes a lot of its own CSS. I would have
spent time overriding those styles before writing any of my own. Skeleton has very
little styling, so Tailwind handles all of it.

I did have to drop part of Skeleton. It builds its pages with two Liquid tags,
`{% block %}` and `{% partial %}`, and this store's version of Liquid doesn't
support them. The first upload rejected every file that used them with
`Unknown tag 'block'`. I swapped Skeleton's layout and templates for plain Liquid
and carried on. Skeleton only runs on stores that have those tags enabled.

The footer loads through a *section group*, which is a small Shopify file
(`sections/footer-group.json`) that places a section on every page of the store at
once. It stays fully editable in the theme editor,
and it also has a preset, so it can be dropped onto a single page instead if
someone wants that.

## How Tailwind is wired up

The stylesheet I write is `src/styles/main.css`. The build compiles it to
`assets/theme.css`, and the compiled file is the only one Shopify ever sees. `src/`
sits outside the theme folders so that the input and the output are never in the
same place.

Tailwind doesn't know to look inside Liquid files, so the top of `main.css` lists
the folders to scan.

**The Figma variables are set up as real Tailwind tokens**, not pasted in as
one-off values. Colours, type sizes, corner radii and the page width are each
defined once, which is why the markup reads `bg-forest`, `text-heading-s`,
`max-w-site`. Updating a token updates everywhere it is used.

I reached for one-off values in four places, all of them single measurements from
the frame rather than anything on a scale: the newsletter panel's two column
widths, the input and button row, the disclaimer's maximum width, and the
accordion's row count. I did not think those warranted scale names.

Where the Figma was one to three pixels off a scale step, I snapped to the step.
59px of padding became 60, 53px became 52, 17px and 15px gaps became 16, 30px
became 32. The difference is not visible, and it keeps one-off pixel values out of
the stylesheet.

## Who edits what

None of the content in these three sections is written into the Liquid.

**Footer links come from Shopify's navigation menus.** Each column has a setting
where you pick a menu, and the links are managed under Content → Menus like any
other menu on the store. Dawn works the same way, so it should be familiar. The
alternative is nested blocks in the theme editor, which puts the navigation in a
theme settings file where someone looking at the store's menus would not find it,
and no other section can reuse it.

**Everything else in the footer is a section setting.** Headings, phone number,
routing number, logo, social links. Those are all one-off, site-wide items that
belong to the theme, so a metaobject would add a step in the admin without much
benefit.

**The testimonial and the carousel cards are metaobjects.** A metaobject is a
reusable content record you create in the admin with named fields, a bit like a
small custom content type. I used them here for two reasons. The content is
repeatable and has named fields (quote, author, rating; title, image, link). And it
is not tied to one section, so the same testimonial can be used on a landing page
and a product page and edited in one place. Section settings would put it in a
theme settings file, where it is not visible in the admin, cannot be reused, and
would be lost if someone deleted the section.

The split is content against presentation. The quote, the author, the card title
and image are metaobject fields. The section label, background colour and spacing
are section settings, since those apply to one placement rather than to the
content.

Two things to watch. Neither gives an error:

- A metaobject section setting stores the entry's **handle**, not its ID. Paste an
  ID and Shopify saves it, then never finds the entry, and the section renders
  nothing.
- Shopify builds a field's **key** from the name you type, once, when the field is
  created. "URL" gives you `url` and "Link" gives you `link`, and renaming the
  field afterwards does not change the key. I read the wrong one for a while, so
  the cards rendered but were not clickable, with no error shown. The code accepts
  either key now.

### What happens when content is missing

| Situation | What you get |
| --- | --- |
| Footer column with no menu | the column is skipped |
| No social links added | the row hides |
| No logo uploaded | falls back to the bundled vector |
| Copyright line left empty | this year plus the store name |
| Very short quote | the card keeps its padding instead of collapsing |
| Very long quote | the card grows; the quote stays capped and centred |
| No star rating | the stars are left out entirely |
| No attribution | the line and its separator both disappear |
| No testimonial chosen | the section renders nothing |
| Card with no image | falls back to a brand-coloured panel |
| Card with no link | renders as plain content, and the arrow is hidden |

The arrow is hidden on an unlinked card so it does not suggest a link that is not
there.

**The stars are treated as a rating rather than decoration.** The group is marked
up as an image labelled "Rated 4 out of 5", and the individual stars are hidden
from screen readers so nothing is read out twice. All five are drawn, with the ones
above the rating dimmed, so the total is clear. The Figma only shows 5 out of 5, so
the dimming is my addition.

## Breakpoints

The Figma gives 1728px and 392px. Everything between is a judgement call. The
700–1200 range is where I spent most of the time.

I used two Tailwind breakpoints, **768px** and **1280px**, and did not add any
custom ones. The content needed its changes at roughly those widths anyway.

**Most of the change happens at 768px.** Below it everything is stacked and
centred and the footer columns are accordions. At and above it the footer columns
open out, the contact block moves to the right, and the logo and legal row sit side
by side. I first had the stacked version running to 1280px, which left a lot of
empty space through the tablet range. Once there is room for two columns of links,
there is room for the rest of the desktop layout.

So the 700–1200 band gets the desktop layout at tablet proportions:

- **Footer:** links in 2 columns from 768px and 3 from 1024px, in a grid with the
  contact block beside them rather than under it. Mobile type sizes hold to 1280px.
- **Testimonial:** the page gutter opens from 24px to 40px and the quote's maximum
  width goes from 20rem to 44rem, so it is not a narrow column in the middle of a
  wide card. Type stays at mobile sizes and the card keeps its smaller corner
  radius until 1280px.
- **Carousel:** the gutter opens to 40px and the cards grow from 281px to 320px.
  The heading, description and button stay stacked until 1280px, since there is not
  enough width to put the button beside the heading. The fade at the right edge is
  desktop only, where it shows that the row continues past the edge.

**Why 1280px for full desktop:** six 232px footer columns need about 1570px of
content width to hold their Figma proportions. Below roughly 1280 the columns get
narrow enough that longer labels like "Certificate Accounts" begin to wrap, so I
kept three wider columns instead. From 1280 up, the desktop type scale takes over
and the page gutter opens to 78px. At 1728px this matches the frame.

One bug to note. The legal row does not wrap its links, and between 768 and 1023px
the logo plus four links were wider than the screen and stretched the whole page
sideways. Fixed by letting that column shrink and wrap. A test now sweeps 19
widths from 320 to 1920 checking that nothing overflows.

## Accessibility

- **The footer accordions** are real buttons inside the heading. Each says whether
  it's open and points at the panel it controls. They work by mouse and by
  keyboard, in both directions.
- **The accordion only exists on mobile.** From 768px up the button leaves the tab
  order and its open/closed state is removed, rather than announcing a control that
  no longer collapses anything. A small piece of JavaScript mirrors the 768px
  breakpoint so that what screen readers are told matches what is on screen.
- **Focus is visible on every interactive element.** Nothing hides an outline.
- **Tap targets are at least 44×44px on mobile**, applied by screen width and on
  touch devices, and released at 768px where the desktop link spacing needs to be
  tighter.
- **The email input has a real label**, tied to the input by id. It's hidden
  visually, because the design uses the placeholder as the prompt, but it's there
  for screen readers and the wording is editable.
- **Social icons carry their name** in a hidden span, with the image itself hidden
  from screen readers so the name isn't read twice.
- **The carousel row can be focused and scrolled** with the arrow keys, Home and
  End. The cards are only focusable when a merchant has linked them, so without
  this a keyboard user would not be able to move the row. Previous and next switch
  off at the ends, and a focused card is scrolled fully into view.
- **Reduced motion is honoured**: the accordion opens instantly and the carousel
  jumps rather than scrolling smoothly.
- **Without JavaScript** every accordion panel renders open, rather than becoming
  unreachable.

## Images

The logo goes through Shopify's `image_url` and `image_tag` with a real `srcset`,
a `sizes` hint matching the width it changes at, and explicit `width` and `height`
so nothing jumps as the page loads. The carousel card images do the same across
six widths from 281px to 762px.

If no logo is uploaded, the bundled vector is used instead, which needs no `srcset`
because it is resolution independent. The same fallback applies if a merchant
uploads an SVG, since Shopify's CDN cannot resize vector files and the `srcset`
would be the same URL six times.

Social icons and arrows are theme assets rather than merchant content, so they load
through `asset_url`.

## Fonts

The design uses **TT Commons Pro** and **TT Hoves Pro**, both commercially
licensed, so I substituted:

| Figma | Substitute | Why |
| --- | --- | --- |
| TT Commons Pro | **Hanken Grotesk** | geometric sans, similar aperture and x-height |
| TT Hoves Pro | **Inter** | neo-grotesque, close to the body text's tighter shapes |

The real families are listed first in the font stack, so dropping the licensed
files into `assets/` is all it would take to pick them up.

The **sizes, weights, line heights and letter spacing come from the Figma variables
exactly** and are registered as Tailwind tokens. The newsletter heading computes
to 32px with a 38.4px line height and -0.64px letter spacing, column headings to
22px, and links to 14px on a 21px line.

Both are variable fonts, served from `assets/` rather than Google Fonts, so there
is no third-party request at runtime.

## Other libraries

**Alpine.js 3.17.4** handles the accordion state and the carousel controls. It
keeps the state in a few attributes in the markup rather than a component class and
a set of listeners. It is copied into `assets/` by a script on install rather than
loaded from a CDN, so the version is pinned and the file is served from Shopify
with everything else.

Nothing else. I did consider a library for the carousel. I wrote it by hand
because the row is an ordinary horizontally scrolling element with CSS scroll
snapping, so the browser already handles the scrolling, the snapping and the
momentum. That leaves about sixty lines: step by one card, switch the controls off
at the ends, drag with a mouse, and bring a focused card into view. Most carousel
libraries replace the browser's scrolling with their own, which changes how it
feels on touch, and I would have been relying on their handling of keyboard focus
and reduced motion.

## Tests

`npm test` runs both suites: **41 unit tests and 177 browser tests**. The browser
tests run against a live `shopify theme dev`, so they exercise the real Liquid
against real store data rather than a fixture, at three screen widths.

What they cover and why, including the bugs they caught, is in
**[docs/testing.md](docs/testing.md)**.

## Things that only showed up on the real store

- **Skeleton's `{% block %}` and `{% partial %}` tags aren't supported by this
  store**, covered above.
- **Skeleton's `base.css` and `critical.css` aren't in a cascade layer, and CSS
  outside a layer beats anything inside one** no matter how specific. Tailwind v4
  puts its utilities in a layer, so `base.css` was winning: the footer was laying
  out as a flex row instead of a grid, and the privacy link was rendering near-black
  on the dark panel. Both files were demo styling for blocks I had already removed,
  so they are gone and `theme.css` is now the only stylesheet. Something to check
  when adding Tailwind v4 to an existing theme.
- **Content edited in the admin doesn't appear immediately.** Storefront pages are
  cached, and editing a metaobject doesn't clear the cache for a page that happens
  to use it. A hard reload gets past it. If a change never appears at all, the
  cause is usually a draft entry or a field key that does not match, and reloading
  will not help.
