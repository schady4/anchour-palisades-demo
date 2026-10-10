const store = process.env.SHOPIFY_STORE;
const token = process.env.SHOPIFY_ADMIN_TOKEN;
const apiVersion = process.env.SHOPIFY_API_VERSION || '2026-07';

if (!store || !token) {
  console.error(
    'Missing env. Set SHOPIFY_STORE and SHOPIFY_ADMIN_TOKEN, then re-run.',
  );
  process.exit(1);
}

if (!token.startsWith('shpat_') || token === 'shpat_xxx') {
  console.error(
    `SHOPIFY_ADMIN_TOKEN looks like a placeholder, not a real token.\n` +
      `Expected a value starting "shpat_" from:\n` +
      `  Settings → Apps and sales channels → Develop apps → your app\n` +
      `  → API credentials → Admin API access token`,
  );
  process.exit(1);
}

const MENUS = [
  {
    title: 'Footer Bank',
    handle: 'footer-bank',
    items: [
      'Checking',
      'Savings',
      'Certificate Accounts',
      'Money Market',
      'IRA',
      'Youth Accounts',
    ],
  },
  {
    title: 'Footer Borrow',
    handle: 'footer-borrow',
    items: [
      'Credit Cards',
      'Mortgages',
      'Home Equity Loans',
      'Auto Loans',
      'Recreational Loans',
      'Personal Loans',
      'Student Loans',
    ],
  },
  {
    title: 'Footer Services',
    handle: 'footer-services',
    items: [
      'Courtesy Pay',
      'Digital Banking',
      'Palisades Perks',
      'Refer-a-Friend',
      'Family Security Plan',
      'EasyPay',
      'Skip-a-Pay',
    ],
  },
  {
    title: 'Footer About',
    handle: 'footer-about',
    items: ['About Us', 'Community', 'Careers', 'Locations', 'Contact Us'],
  },
  {
    title: 'Footer Resources',
    handle: 'footer-resources',
    items: ['FAQs', 'Education Center', 'Blog', 'Publications'],
  },
  {
    title: 'Footer Legal',
    handle: 'footer-legal',
    items: [
      'Privacy & Security',
      'Legal Disclaimer',
      'Accessibility',
      'Website Privacy',
    ],
  },
];

async function admin(query, variables) {
  const response = await fetch(
    `https://${store}/admin/api/${apiVersion}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
    },
  );

  if (response.status === 401) {
    console.error(
      'Shopify rejected the token (401).\n' +
        '  • Check it was copied in full and has not been revoked\n' +
        '  • The app must be *installed* on the store, not just created',
    );
    process.exit(1);
  }

  if (response.status === 403) {
    console.error(
      'Token lacks permission (403).\n' +
        '  Enable the `write_online_store_navigation` Admin API scope on the\n' +
        '  app, then reinstall it — scope changes need a reinstall to apply.',
    );
    process.exit(1);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  if (body.errors) {
    throw new Error(JSON.stringify(body.errors, null, 2));
  }
  return body.data;
}

const EXISTING = `
  query Menus($query: String) {
    menus(first: 50, query: $query) {
      nodes { id handle title }
    }
  }
`;

const CREATE = `
  mutation MenuCreate($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
    menuCreate(title: $title, handle: $handle, items: $items) {
      menu { id handle title items { title } }
      userErrors { field message }
    }
  }
`;

const {menus} = await admin(EXISTING, {});
const byHandle = new Map(menus.nodes.map((m) => [m.handle, m]));

for (const menu of MENUS) {
  if (byHandle.has(menu.handle)) {
    console.log(`• ${menu.handle} — already exists, skipping`);
    continue;
  }

  const data = await admin(CREATE, {
    title: menu.title,
    handle: menu.handle,
    items: menu.items.map((title) => ({title, type: 'FRONTPAGE'})),
  });

  const {menuCreate} = data;
  if (menuCreate.userErrors.length) {
    console.error(`✗ ${menu.handle}`);
    for (const e of menuCreate.userErrors) {
      console.error(`    ${e.field?.join('.') ?? ''} ${e.message}`);
    }
    continue;
  }

  console.log(
    `✓ ${menuCreate.menu.handle} — ${menuCreate.menu.items.length} items`,
  );
}

console.log('\nDone. Reload the theme preview to see the link columns.');
