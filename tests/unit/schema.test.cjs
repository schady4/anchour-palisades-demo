const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const sectionsDir = path.join(root, 'sections');

const liquidSections = fs
  .readdirSync(sectionsDir)
  .filter((f) => f.endsWith('.liquid'));

function readSchema(file) {
  const src = fs.readFileSync(path.join(sectionsDir, file), 'utf8');
  const match = src.match(/\{%\s*schema\s*%\}([\s\S]*?)\{%\s*endschema\s*%\}/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

describe('section schemas', () => {
  it.each(liquidSections)('%s has a parseable schema', (file) => {
    expect(() => readSchema(file)).not.toThrow();
    expect(readSchema(file)).not.toBeNull();
  });

  describe.each(liquidSections)('%s', (file) => {
    const schema = readSchema(file);
    const settings = (schema?.settings ?? []).filter((s) => s.type !== 'header');
    const blockSettings = (schema?.blocks ?? []).flatMap((b) => b.settings ?? []);
    const all = [...settings, ...blockSettings];

    it('names the section', () => {
      expect(typeof schema.name).toBe('string');
      expect(schema.name.length).toBeGreaterThan(0);
    });

    it('gives every setting an id and a merchant-readable label', () => {
      for (const setting of all) {
        expect(setting.id).toBeTruthy();
        expect(setting.label).toBeTruthy();
        expect(setting.label).not.toMatch(/_/);
      }
    });

    it('uses unique setting ids', () => {
      const ids = settings.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps range settings within Shopify limits', () => {
      for (const setting of all.filter((s) => s.type === 'range')) {
        const {min, max, step, default: value, id} = setting;
        const steps = (max - min) / step;
        expect(Number.isInteger(steps)).toBe(true);
        expect(steps).toBeLessThanOrEqual(101);
        expect((value - min) % step).toBe(0);
        expect(value).toBeGreaterThanOrEqual(min);
        expect(value).toBeLessThanOrEqual(max);
        expect(id).toBeTruthy();
      }
    });

    it('can be added from the theme editor', () => {
      expect(Array.isArray(schema.presets)).toBe(true);
      expect(schema.presets.length).toBeGreaterThan(0);
    });

    it('only presets block types the section declares', () => {
      const declared = new Set((schema.blocks ?? []).map((b) => b.type));
      for (const preset of schema.presets ?? []) {
        for (const block of preset.blocks ?? []) {
          expect(declared.has(block.type)).toBe(true);
        }
      }
    });

    it('stays inside Shopify block limits', () => {
      for (const preset of schema.presets ?? []) {
        const counts = {};
        for (const block of preset.blocks ?? []) {
          counts[block.type] = (counts[block.type] ?? 0) + 1;
        }
        for (const blockDef of schema.blocks ?? []) {
          if (blockDef.limit && counts[blockDef.type]) {
            expect(counts[blockDef.type]).toBeLessThanOrEqual(blockDef.limit);
          }
        }
      }
    });
  });
});

describe('section groups', () => {
  const groups = fs
    .readdirSync(sectionsDir)
    .filter((f) => f.endsWith('.json'));

  it('has at least one group', () => {
    expect(groups.length).toBeGreaterThan(0);
  });

  it.each(groups)('%s references sections and blocks that exist', (file) => {
    const group = JSON.parse(
      fs.readFileSync(path.join(sectionsDir, file), 'utf8'),
    );

    for (const [key, section] of Object.entries(group.sections)) {
      const sectionFile = `${section.type}.liquid`;
      expect(liquidSections).toContain(sectionFile);

      const schema = readSchema(sectionFile);
      const declared = new Set((schema.blocks ?? []).map((b) => b.type));
      const settingIds = new Set(
        (schema.settings ?? []).filter((s) => s.id).map((s) => s.id),
      );

      for (const block of Object.values(section.blocks ?? {})) {
        expect(declared.has(block.type)).toBe(true);
      }

      for (const id of Object.keys(section.settings ?? {})) {
        expect(settingIds.has(id)).toBe(true);
      }

      expect(group.order).toContain(key);
    }
  });
});
