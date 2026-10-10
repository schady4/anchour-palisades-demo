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
    'SHOPIFY_ADMIN_TOKEN looks like a placeholder, not a real token.',
  );
  process.exit(1);
}

const TYPE = 'testimonial';

const DEFINITION = {
  name: 'Testimonial',
  type: TYPE,
  access: {storefront: 'PUBLIC_READ'},
  displayNameKey: 'quote',
  fieldDefinitions: [
    {
      key: 'quote',
      name: 'Quote',
      type: 'multi_line_text_field',
      required: true,
      description: 'The testimonial itself. Quotation marks are added by the theme.',
    },
    {
      key: 'author_name',
      name: 'Author name',
      type: 'single_line_text_field',
      description: 'Leave empty to hide the attribution line.',
    },
    {
      key: 'author_detail',
      name: 'Author detail',
      type: 'single_line_text_field',
      description: 'Shown after the name, e.g. “Palisades CU Member”.',
    },
    {
      key: 'rating',
      name: 'Rating',
      type: 'number_integer',
      description: 'Out of 5. Leave empty to hide the stars.',
      validations: [
        {name: 'min', value: '1'},
        {name: 'max', value: '5'},
      ],
    },
  ],
};

const ENTRIES = [
  {
    handle: 'shabsai-u',
    fields: {
      quote:
        '“My wife and I had the pleasure of coming in to PCU for a home equity loan and working with Ms. Ellen Brooks. We couldn’t be happier!!!! If there was an opportunity to leave a 10-star review, we would!!”',
      author_name: 'Shabsai U',
      author_detail: 'Palisades CU Member',
      rating: '5',
    },
  },
  {
    handle: 'short-quote',
    fields: {
      quote: '“Best credit union around.”',
      author_name: 'Dana R',
      author_detail: 'Member since 2011',
      rating: '4',
    },
  },
  {
    handle: 'long-quote-no-rating',
    fields: {
      quote:
        '“I have been a member of Palisades Credit Union for well over a decade now, and in that time they have helped me finance two cars, refinance my home, and set up college savings accounts for both of my children. What keeps me coming back is not the rates, though those are genuinely competitive, but the fact that every single person I have dealt with has treated me like a neighbour rather than an account number. When my hours were cut back a few years ago they worked with me on a payment plan without making me feel like a problem to be managed. I have recommended them to my sister, two colleagues and most of my street, and every one of them has thanked me for it.”',
      author_name: 'Marguerite L',
      author_detail: 'Palisades CU Member',
    },
  },
  {
    handle: 'anonymous',
    fields: {
      quote: '“Switching here was the easiest financial decision I have made.”',
      rating: '5',
    },
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
    console.error('Shopify rejected the token (401). Is the app installed?');
    process.exit(1);
  }
  if (response.status === 403) {
    console.error(
      'Token lacks permission (403). Enable write_metaobject_definitions and\n' +
        'write_metaobjects, then reinstall the app — scope changes need it.',
    );
    process.exit(1);
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${await response.text()}`);
  }

  const body = await response.json();
  if (body.errors) throw new Error(JSON.stringify(body.errors, null, 2));
  return body.data;
}

const FIND_DEFINITION = `
  query Definition($type: String!) {
    metaobjectDefinitionByType(type: $type) { id type }
  }
`;

const CREATE_DEFINITION = `
  mutation DefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      metaobjectDefinition { id type }
      userErrors { field message }
    }
  }
`;

const UPSERT_ENTRY = `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { id handle }
      userErrors { field message }
    }
  }
`;

const existing = await admin(FIND_DEFINITION, {type: TYPE});

if (existing.metaobjectDefinitionByType) {
  console.log(`• definition "${TYPE}" already exists, leaving it alone`);
} else {
  const {metaobjectDefinitionCreate: result} = await admin(CREATE_DEFINITION, {
    definition: DEFINITION,
  });
  if (result.userErrors.length) {
    for (const e of result.userErrors) {
      console.error(`✗ definition: ${e.field?.join('.') ?? ''} ${e.message}`);
    }
    process.exit(1);
  }
  console.log(`✓ created definition "${result.metaobjectDefinition.type}"`);
}

for (const entry of ENTRIES) {
  const {metaobjectUpsert: result} = await admin(UPSERT_ENTRY, {
    handle: {type: TYPE, handle: entry.handle},
    metaobject: {
      fields: Object.entries(entry.fields).map(([key, value]) => ({
        key,
        value,
      })),
    },
  });

  if (result.userErrors.length) {
    console.error(`✗ ${entry.handle}`);
    for (const e of result.userErrors) {
      console.error(`    ${e.field?.join('.') ?? ''} ${e.message}`);
    }
    continue;
  }
  console.log(`✓ ${result.metaobject.handle}`);
}

console.log('\nDone. Pick one in the theme editor: Testimonial → Testimonial.');
