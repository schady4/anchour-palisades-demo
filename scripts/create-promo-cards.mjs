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

const TYPE = 'promo_card';

const DEFINITION = {
  name: 'Promo card',
  type: TYPE,
  access: {storefront: 'PUBLIC_READ'},
  displayNameKey: 'title',
  fieldDefinitions: [
    {
      key: 'title',
      name: 'Title',
      type: 'single_line_text_field',
      required: true,
    },
    {
      key: 'image',
      name: 'Image',
      type: 'file_reference',
      description: 'Optional. A coloured panel is shown if left empty.',
      validations: [{name: 'file_type_options', value: '["Image"]'}],
    },
    {
      key: 'url',
      name: 'Link',
      type: 'url',
      description: 'Optional. The whole card becomes clickable.',
    },
    {
      key: 'accent',
      name: 'Arrow colour',
      type: 'single_line_text_field',
      validations: [
        {name: 'choices', value: '["orange","green","lilac"]'},
      ],
    },
  ],
};

const ENTRIES = [
  {handle: 'choose-bank-account', fields: {title: 'How to choose the right bank account', accent: 'orange'}},
  {handle: 'emergency-fund', fields: {title: 'Tips for building an emergency fund', accent: 'lilac'}},
  {handle: 'checking-vs-savings', fields: {title: 'Checking vs. savings, explained', accent: 'green'}},
  {handle: 'certificate-accounts', fields: {title: 'How certificate accounts work', accent: 'orange'}},
  {handle: 'home-equity', fields: {title: 'Home Equity', accent: 'lilac'}},
  {handle: 'building-credit', fields: {title: 'Building credit from scratch', accent: 'green'}},
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

console.log('\nDone. In the theme editor: Promo carousel → Cards → pick and reorder.');
