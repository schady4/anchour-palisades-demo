# Store setup

Some of what these sections render lives in the store rather than the theme, and
none of it travels in a theme export. A fresh install needs three things:

| What | Where it lives | Used by |
| --- | --- | --- |
| Six navigation menus | Content → Menus | Footer link columns and legal row |
| A `testimonial` metaobject and entries | Content → Metaobjects | Testimonial |
| A `promo_card` metaobject and entries | Content → Metaobjects | Promo carousel |

**All three are optional to install the theme.** Nothing hardcodes them and nothing
errors without them. A link column with no menu is skipped, and the testimonial and
carousel hide themselves until content is chosen. You get a working theme straight
away and fill the content in afterwards.

All of it is created by hand in the Shopify admin. The CLI can create neither
menus nor metaobject definitions, so there's no faster route, and nothing here
needs credentials or tooling beyond the admin itself. Work through the three
reference sections below in order.

## Reference: menus

Create these under Content → Menus. The handles are only the defaults pre-wired
into `sections/footer-group.json`. Use these handles and the footer is configured
on arrival; name them anything else and you pick each one once in the theme editor
instead. **No handle is hardcoded.**

| Handle | Items |
| --- | --- |
| `footer-bank` | Checking · Savings · Certificate Accounts · Money Market · IRA · Youth Accounts |
| `footer-borrow` | Credit Cards · Mortgages · Home Equity Loans · Auto Loans · Recreational Loans · Personal Loans · Student Loans |
| `footer-services` | Courtesy Pay · Digital Banking · Palisades Perks · Refer-a-Friend · Family Security Plan · EasyPay · Skip-a-Pay |
| `footer-about` | About Us · Community · Careers · Locations · Contact Us |
| `footer-resources` | FAQs · Education Center · Blog · Publications |
| `footer-legal` | Privacy & Security · Legal Disclaimer · Accessibility · Website Privacy |

Two things to know. Shopify builds a menu's handle from its title once, when it's
created, and renaming it later doesn't change the handle. And the links point at
the home page rather than `#`, because Shopify requires a valid destination and
rejects a bare fragment.

## Reference: testimonial

Settings → Custom data → Metaobjects → Add definition. Entries then appear under
Content → Metaobjects. Name it `Testimonial` and check the type reads
`testimonial`, then add four fields:

| Field | Type | Notes |
| --- | --- | --- |
| `quote` | Multi-line text | Required. Include your own quotation marks; the theme adds none. |
| `author_name` | Single line text | Optional. The attribution line hides without it. |
| `author_detail` | Single line text | Optional, such as "Palisades CU Member". |
| `rating` | Integer | Optional, 1–5. The stars hide without it. |

Under **Storefronts**, tick **Make available to the Storefront API**. The theme
can't read the entries otherwise.

Add at least one entry and pick it in the theme editor. Worth adding a few that
cover the cases the section has to survive: a short quote, a very long one, one
with no rating, and one with no attribution.

## Reference: promo card

Same route. Name it `Promo card`, check the type reads `promo_card`, and add four
fields:

| Field | Type | Notes |
| --- | --- | --- |
| `title` | Single line text | Required. |
| `image` | File | Optional, images only. A coloured panel shows without one. |
| `url` | URL | Optional. The whole card becomes clickable. |
| `accent` | Single line text | The arrow colour. Add a list of choices: `orange`, `green`, `lilac`. |

Tick **Make available to the Storefront API** here too.

When you add the link field, watch the **key** rather than the name. Shopify builds
the key from whatever you type, once, and you can't change it afterwards. "URL"
gives you `url` and "Link" gives you `link`. The theme reads either, so both work,
but anything else won't and the only symptom is cards that render without being
clickable.

Images are uploaded under Content → Files and then picked per card. That's
deliberate: it's what lets the theme generate a real `srcset` for each one.

Once the entries exist, open the carousel in the theme editor and pick the cards
you want, in the order you want them.
