/**
 * A built-in badge that a later version stopped shipping.
 *
 * The mirror of `badge-label-rename.test.ts` next door, and the same symptom
 * reached from the other side: a header printing `BADGES.BUILTIN.TOTAL` where a
 * word should be. There it was a key renamed under a badge that still existed;
 * here it is a badge whose key went away with it.
 *
 * A saved `headerBadges` list wins outright over the defaults, so deleting a
 * built-in from `defaults.ts` removes it from a fresh vault and from no other.
 * Every vault that had ever opened the badge editor kept rendering Prep and
 * Total after the reheating properties replaced them, under labels the
 * translation tables no longer had. Found in a real vault, the same way the
 * rename was.
 *
 * **The fixture is that vault's real saved list**, verbatim out of its
 * `data.json`, because a hand-written one agrees with whatever the code does.
 */
import { describe, expect, it } from 'vitest';
import { mergeSettings } from '../src/settings/validate';
import { DEFAULT_SETTINGS } from '../src/settings/defaults';
import type { CustomBadge } from '../src/settings/types';

/** Verbatim, including the two this version no longer ships. */
const SAVED_HEADER = [
  {
    type: 'badge',
    property: 'diet',
    labelKey: 'badges.builtin.diet',
    icon: 'leaf',
    color: 'green',
    valueType: 'auto',
    splitArray: true,
    enabled: true,
    builtin: true,
  },
  {
    type: 'badge',
    property: 'prepTime',
    labelKey: 'badges.builtin.prep',
    icon: 'clock',
    color: 'default',
    valueType: 'minutes',
    splitArray: false,
    enabled: true,
    builtin: true,
  },
  {
    type: 'badge',
    property: 'reheatTime',
    labelKey: 'badges.builtin.cook',
    icon: 'clock',
    color: 'default',
    valueType: 'minutes',
    splitArray: false,
    enabled: true,
    builtin: true,
  },
  {
    type: 'badge',
    property: 'total',
    labelKey: 'badges.builtin.total',
    icon: 'clock',
    color: 'default',
    valueType: 'minutes',
    splitArray: false,
    enabled: true,
    formula: '(prepTime || 0) + (reheatTime || 0) || null',
    builtin: true,
  },
  {
    type: 'badge',
    property: 'lastEaten',
    labelKey: 'badges.builtin.lastEaten',
    icon: 'calendar-check',
    color: 'default',
    valueType: 'auto',
    splitArray: false,
    enabled: true,
    builtin: true,
  },
  {
    type: 'badge',
    property: '',
    derived: 'eatingStreak',
    labelKey: 'badges.builtin.streak',
    icon: 'flame',
    color: 'yellow',
    valueType: 'auto',
    splitArray: false,
    enabled: true,
    builtin: true,
  },
];

const keysOf = (badges: CustomBadge[]): string[] =>
  badges.map((badge) => badge.derived ?? badge.labelKey ?? badge.property);

describe('a saved header naming built-ins this version dropped', () => {
  it('drops them, so no label resolves to its own key', () => {
    const badges = mergeSettings({ headerBadges: SAVED_HEADER }).headerBadges;

    expect(keysOf(badges)).not.toContain('badges.builtin.prep');
    expect(keysOf(badges)).not.toContain('badges.builtin.total');
  });

  it('keeps every built-in that still ships, in the order it was saved', () => {
    const badges = mergeSettings({ headerBadges: SAVED_HEADER }).headerBadges;

    expect(keysOf(badges)).toEqual([
      'badges.builtin.diet',
      'badges.builtin.cook',
      'badges.builtin.lastEaten',
      'eatingStreak',
    ]);
  });

  it('every surviving label resolves against the shipped defaults', () => {
    // The assertion that would have caught this before it shipped: a key no
    // table has is a key the header prints raw.
    const shipped = new Set(
      DEFAULT_SETTINGS.headerBadges.map(
        (badge) => badge.derived ?? badge.labelKey ?? badge.property
      )
    );
    for (const key of keysOf(mergeSettings({ headerBadges: SAVED_HEADER }).headerBadges)) {
      expect(shipped, key).toContain(key);
    }
  });

  it('leaves a badge somebody made themselves against the same property', () => {
    // Without `builtin: true` it is their row, not ours, and it renders under
    // their own label rather than a missing key. Dropping it would be deleting
    // an arrangement to tidy up after ourselves.
    const badges = mergeSettings({
      headerBadges: [
        ...SAVED_HEADER,
        { type: 'badge', property: 'prepTime', label: 'Vorbereitung', enabled: true },
      ],
    }).headerBadges;

    const mine = badges.filter((badge) => !badge.builtin);
    expect(mine).toHaveLength(1);
    expect(mine[0].label).toBe('Vorbereitung');
    expect(mine[0].property).toBe('prepTime');
  });

  it('does not strand a vault that had already lost them', () => {
    // Idempotent: a list this has already cleaned validates unchanged, rather
    // than the defaults being restored over it.
    const once = mergeSettings({ headerBadges: SAVED_HEADER }).headerBadges;
    const twice = mergeSettings({ headerBadges: once }).headerBadges;
    expect(keysOf(twice)).toEqual(keysOf(once));
  });

  it('leaves a header of nothing but retired built-ins empty, not restocked', () => {
    // Everything it held is gone, which is not the same as corrupt data: the
    // corrupt-input branch restores the defaults, and this must not reach it.
    const badges = mergeSettings({
      headerBadges: SAVED_HEADER.filter((badge) =>
        ['badges.builtin.prep', 'badges.builtin.total'].includes(badge.labelKey)
      ),
    }).headerBadges;

    expect(keysOf(badges)).not.toContain('badges.builtin.prep');
    expect(keysOf(badges)).not.toContain('badges.builtin.total');
  });
});
