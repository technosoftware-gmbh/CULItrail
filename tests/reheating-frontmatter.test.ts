/**
 * The dish stating how to reheat itself in its own properties.
 *
 * The case this exists for is the whole library rather than an edge: in the
 * vault this was built against, one meal note of 133 carried a reheating
 * section and none resolved an instruction at all, because the supplier's
 * wording carries `{temp}` and `{time}` and nothing filled them. These tests
 * pin the two halves of the fix: that frontmatter becomes an ordinary entry in
 * the existing merge, and that a body section still overrides it per appliance.
 */
import { describe, expect, it } from 'vitest';
import { mergeSettings } from '../src/settings/validate';
import { readMealMeta } from '../src/meals/parser/meal-meta';
import { parseReheatSection } from '../src/meals/reheating/parse-section';
import { dishEntries, frontmatterEntries } from '../src/meals/reheating/from-frontmatter';
import { resolveReheating } from '../src/meals/reheating/resolve';
import type { ApplianceEntry } from '../src/meals/reheating/types';

const settings = mergeSettings({});

/** Tom Tasty's real boilerplate, which is what made this necessary. */
const SUPPLIER = [
  '# Reheating',
  '',
  '## Steamer',
  'Remove the clear plastic wrap from the dish. Use the reheat function at {temp} and heat it',
  'for about {time}.',
].join('\n');

const supplierEntries = (): ApplianceEntry[] => parseReheatSection(SUPPLIER, settings);

const meta = (front: Record<string, unknown>) => readMealMeta(front, settings);

describe('frontmatter as an appliance entry', () => {
  it('carries the values and no prose, which is what the merge already has a row for', () => {
    const entries = frontmatterEntries(
      meta({ reheatAppliance: 'steamer', reheatTemp: '95 °C', reheatTime: 25 }),
      settings
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].applianceId).toBe('steamer');
    expect(entries[0].steps).toEqual([]);
    expect(entries[0].temp).toBe('95 °C');
    // Minutes in the note, words at render: the note stores a language-free
    // number and the wording is decided here.
    expect(entries[0].time).toBe('25 min');
  });

  it('fills the supplier tokens, which is the point of the whole change', () => {
    const resolved = resolveReheating(
      frontmatterEntries(
        meta({ reheatAppliance: 'steamer', reheatTemp: '95 °C', reheatTime: 25 }),
        settings
      ),
      supplierEntries(),
      settings
    );

    expect(resolved).toHaveLength(1);
    const text = resolved[0].steps.join(' ');
    expect(text).toContain('95 °C');
    expect(text).toContain('25 min');
    expect(text).not.toContain('{temp}');
    expect(text).not.toContain('{time}');
  });

  it('offers nothing when the note names no appliance', () => {
    // A temperature with no appliance resolves against no heading, so there is
    // no wording to fill and no label to render. Picking the supplier's only
    // appliance would be the plugin answering a question the note declined to.
    expect(frontmatterEntries(meta({ reheatTemp: '95 °C', reheatTime: 25 }), settings)).toEqual([]);
  });

  it('offers nothing for an appliance with neither figure', () => {
    expect(frontmatterEntries(meta({ reheatAppliance: 'steamer' }), settings)).toEqual([]);
  });

  it('withholds the appliance when only one of two tokens can be filled', () => {
    // The rule this feature was built around, reached the new way: the wording
    // names both a temperature and a time, so a note stating only the time
    // would produce "at  for about 25 min".
    const resolved = resolveReheating(
      frontmatterEntries(meta({ reheatAppliance: 'steamer', reheatTime: 25 }), settings),
      supplierEntries(),
      settings
    );

    expect(resolved).toEqual([]);
  });

  it('takes the appliance id however the note spells it, in either language', () => {
    const entries = frontmatterEntries(
      meta({ reheatAppliance: 'Dampfgarer', reheatTemp: '95 °C' }),
      settings
    );
    expect(entries[0].applianceId).toBe('steamer');
  });

  it('keeps an appliance nobody configured, labelled as written', () => {
    const entries = frontmatterEntries(
      meta({ reheatAppliance: 'Air fryer', reheatTemp: '200 °C' }),
      settings
    );
    expect(entries[0].unknown).toBe(true);
    expect(entries[0].label).toBe('Air fryer');
  });

  it('reads a microwave stating watts, which is why the field is not a number', () => {
    const entries = frontmatterEntries(
      meta({ reheatAppliance: 'microwave', reheatTemp: '800 W', reheatTime: 6 }),
      settings
    );
    expect(entries[0].temp).toBe('800 W');
  });
});

describe('a body section over the properties', () => {
  const body = [
    '# Reheating',
    '',
    '## Steamer',
    'Pierce the film first. 95 degrees, 25 minutes.',
  ].join('\n');

  it('lets the section win for the appliance it names', () => {
    const entries = dishEntries(
      parseReheatSection(body, settings),
      meta({ reheatAppliance: 'steamer', reheatTemp: '95 °C', reheatTime: 25 }),
      settings
    );

    expect(entries).toHaveLength(1);
    expect(entries[0].steps.join(' ')).toContain('Pierce the film');
  });

  it('keeps both when they name different appliances', () => {
    // Not all-or-nothing, which is the part worth pinning: a rule reading
    // "frontmatter unless a section exists" would make writing one appliance by
    // hand silently delete the one in the properties.
    const entries = dishEntries(
      parseReheatSection(body, settings),
      meta({ reheatAppliance: 'microwave', reheatTemp: '800 W', reheatTime: 6 }),
      settings
    );

    expect(entries.map((entry) => entry.applianceId).sort()).toEqual(['microwave', 'steamer']);
  });

  it('is just the section when the properties say nothing', () => {
    const entries = dishEntries(parseReheatSection(body, settings), meta({}), settings);
    expect(entries.map((entry) => entry.applianceId)).toEqual(['steamer']);
  });
});
