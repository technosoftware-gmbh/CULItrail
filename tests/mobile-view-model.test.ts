/**
 * The decisions behind the mobile layout, none of which need a phone.
 *
 * The time-badge classifier is the one that matters most: the stat row and
 * the chip row both consult it, so a badge it misclassifies either appears
 * twice or disappears entirely.
 */
import { describe, expect, it } from 'vitest';
import { mergeSettings } from '../src/settings/validate';
import { CustomBadge } from '../src/settings/types';
import { toPlainText } from '../src/shared/plain-text';
import { formatIsoDate } from '../src/meals/view-model/format-date';
import { readSourceLink } from '../src/meals/view-model/source-link';
import { isMobileHandledElsewhere, timeBadgeKind } from '../src/meals/view-model/time-badges';

const settings = mergeSettings({});

function badge(overrides: Partial<CustomBadge> = {}): CustomBadge {
  return {
    type: 'badge',
    property: '',
    color: 'default',
    valueType: 'auto',
    splitArray: false,
    enabled: true,
    builtin: false,
    ...overrides,
  };
}

describe('toPlainText', () => {
  it('keeps the words and drops the markup', () => {
    expect(toPlainText('A **quick** weeknight *risotto* with `arborio` rice.')).toBe(
      'A quick weeknight risotto with arborio rice.'
    );
  });

  it('keeps the text of a link and drops its target', () => {
    expect(toPlainText('Adapted from [Serious Eats](https://example.com/risotto).')).toBe(
      'Adapted from Serious Eats.'
    );
  });

  it('keeps a wikilink alias when there is one, and the target otherwise', () => {
    expect(toPlainText('See [[Risotto Base|the base meal]].')).toBe('See the base meal.');
    expect(toPlainText('See [[Risotto Base]].')).toBe('See Risotto Base.');
  });

  it('drops images entirely, in either syntax', () => {
    // An image is a link with a `!` in front, so handling links first would
    // leave a stray exclamation mark and the alt text behind.
    expect(toPlainText('![The dish](risotto.jpg) Serve hot.')).toBe('Serve hot.');
    expect(toPlainText('![[risotto.jpg]] Serve hot.')).toBe('Serve hot.');
  });

  it('collapses paragraphs into one line', () => {
    // This feeds a snippet clamped to a couple of lines. A paragraph break
    // rendered as a break would make it taller than the space reserved.
    expect(toPlainText('First line.\n\nSecond line.')).toBe('First line. Second line.');
  });

  it('strips heading hashes without eating the heading', () => {
    expect(toPlainText('## About this meal\n\nIt rests overnight.')).toBe(
      'About this meal It rests overnight.'
    );
  });

  it('is empty for empty input', () => {
    expect(toPlainText('   \n  ')).toBe('');
  });
});

describe('formatIsoDate', () => {
  it('renders an ISO date in the reader locale', () => {
    const rendered = formatIsoDate('2026-07-28');
    expect(rendered).not.toBe('2026-07-28');
    expect(rendered).toContain('2026');
  });

  it('returns anything that is not a plain ISO date unchanged', () => {
    // A note can hold "sometime last winter" in a date field, and showing
    // that back beats showing nothing or "Invalid Date".
    expect(formatIsoDate('sometime last winter')).toBe('sometime last winter');
    expect(formatIsoDate('2026-07-28T09:00')).toBe('2026-07-28T09:00');
  });

  it('does not slip to the previous day', () => {
    // A bare date string parses as UTC, which renders as the day before in a
    // western timezone. Parsing at local midnight is what avoids it.
    expect(formatIsoDate('2026-01-01')).toContain('2026');
  });
});

describe('readSourceLink', () => {
  it('shows a URL by its hostname', () => {
    expect(readSourceLink('https://www.seriouseats.com/risotto-meal')).toEqual({
      href: 'https://www.seriouseats.com/risotto-meal',
      label: 'www.seriouseats.com',
    });
  });

  it('shows a hand-written source as itself, with nothing to click', () => {
    expect(readSourceLink("Grandma's blue notebook")).toEqual({
      href: null,
      label: "Grandma's blue notebook",
    });
  });

  it('survives something that starts like a URL but is not one', () => {
    // `new URL()` throws rather than returning null, so an unguarded parse
    // takes the whole meal view down with it.
    const result = readSourceLink('https://');
    expect(result?.href).toBeNull();
    expect(result?.label).toBe('https://');
  });

  it('is null for nothing at all', () => {
    expect(readSourceLink(null)).toBeNull();
    expect(readSourceLink('   ')).toBeNull();
  });
});

describe('timeBadgeKind', () => {
  it('recognises the reheat time by its configured property', () => {
    expect(timeBadgeKind(badge({ property: 'reheatTime' }), settings)).toBe('cook');
  });

  it('recognises it through its aliases, and ignores case', () => {
    // A badge somebody made themselves against `cook:` is still the reheat
    // badge, and belongs in the stat row rather than the chip row.
    expect(timeBadgeKind(badge({ property: 'cook' }), settings)).toBe('cook');
    expect(timeBadgeKind(badge({ property: 'COOK_TIME' }), settings)).toBe('cook');
  });

  it('leaves a badge against a retired time property to the chip row', () => {
    // A vault whose saved badge list still names prepTime or totalTime keeps
    // rendering that badge, because a saved list wins outright over the
    // defaults. It becomes an ordinary chip rather than claiming a column in a
    // stat row built for one figure.
    expect(timeBadgeKind(badge({ property: 'prepTime' }), settings)).toBeNull();
    expect(timeBadgeKind(badge({ property: 'totalTime' }), settings)).toBeNull();
    expect(
      timeBadgeKind(badge({ formula: '(prepTime || 0) + (reheatTime || 0) || null' }), settings)
    ).toBeNull();
  });

  it('is null for an ordinary badge, and for one with no property at all', () => {
    expect(timeBadgeKind(badge({ property: 'diet' }), settings)).toBeNull();
    expect(timeBadgeKind(badge({ property: '   ' }), settings)).toBeNull();
    expect(timeBadgeKind(badge({ type: 'separator' }), settings)).toBeNull();
  });

  it('follows a renamed property setting', () => {
    const renamed = mergeSettings({ reheatTimeProperty: 'aufwaermzeit' });
    expect(timeBadgeKind(badge({ property: 'aufwaermzeit' }), renamed)).toBe('cook');
  });
});

describe('isMobileHandledElsewhere', () => {
  it('covers the reheat time and last-eaten', () => {
    // Last-eaten is shown on the meal card at the top, so a chip repeating
    // it would say the same thing twice on a screen with no room for it.
    for (const property of ['reheatTime', 'lastEaten']) {
      expect(isMobileHandledElsewhere(badge({ property }), settings)).toBe(true);
    }
  });

  it('leaves every other badge to the chip row', () => {
    expect(isMobileHandledElsewhere(badge({ property: 'diet' }), settings)).toBe(false);
    expect(isMobileHandledElsewhere(badge({ property: 'servings' }), settings)).toBe(false);
  });
});
