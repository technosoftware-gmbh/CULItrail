/**
 * Taking `prepTime` and `totalTime` off a vault's meal notes.
 *
 * A meal is bought ready-made, so preparation describes nothing and a total
 * over one component only restated it. What makes this suite different from
 * the two strip scripts beside it is that the values are **not** dead by
 * construction: a note written while the plugin still had a cooking half may
 * state a real preparation time, so the script's job is as much to refuse as to
 * delete, and most of what is pinned below is the refusal.
 *
 * Counted in the vault this was built against: 133 meal notes, all carrying
 * both keys, 243 of those key occurrences blank and 23 stating something.
 *
 * **Both fixtures are real notes**, copied out of `Essen/Mahlzeiten`, because a
 * hand-written fixture agrees with whatever the code does.
 *
 * - `Linsensalat mit gebackenem Feta` is the ordinary case: both keys present
 *   and blank, with a reheat time between them that must survive.
 * - `Älpler Magronen mit Speck` states both, and states them inconsistently
 *   (35 + 35 recorded as a total of 35), which is what the fields had become.
 */
import { describe, expect, it } from 'vitest';
import { applyStrip, planNoteStrip } from '../scripts/strip-meal-times';

const LINSENSALAT = `---
type: meal
created: 2026-09-10T15:48
prepTime:
reheatTime: 25
totalTime:
servings: 1
price: 18
supplier: "[[Tom Tasty AG]]"
diet: Vegetarisch & Vegan
---
`;

const AELPLER = `---
type: meal
servings: 1
prepTime: 35
reheatTime: 35
totalTime: 35
calories: 1100
serving_size: 440g
---

Bewährt und einfach gut.
`;

describe('planning what a note would lose', () => {
  it('counts a blank key as blank and a stated one as stated', () => {
    const blank = planNoteStrip(LINSENSALAT);
    expect(blank.blank.map((hit) => hit.key)).toEqual(['prepTime', 'totalTime']);
    expect(blank.stated).toEqual([]);

    const stated = planNoteStrip(AELPLER);
    expect(stated.blank).toEqual([]);
    expect(stated.stated.map((hit) => `${hit.key}=${hit.value}`)).toEqual([
      'prepTime=35',
      'totalTime=35',
    ]);
  });

  it('never plans the reheat time, which is the one that stays', () => {
    for (const note of [LINSENSALAT, AELPLER]) {
      const plan = planNoteStrip(note);
      const keys = [...plan.blank, ...plan.stated, ...plan.refused].map((hit) => hit.key);
      expect(keys).not.toContain('reheatTime');
    }
  });

  it('finds a foreign convention too, since the parser used to read those aliases', () => {
    const plan = planNoteStrip(['---', 'yield: 6', 'prep: 10', 'cook: 45', '---'].join('\n'));
    expect(plan.stated.map((hit) => hit.key)).toEqual(['prep']);
  });

  it('refuses a key whose value runs past one line rather than guessing', () => {
    // Neither of these ever has a block value, so anything that does is some
    // other property sharing the name.
    const plan = planNoteStrip(['---', 'prep:', '  - chop', '  - stir', '---'].join('\n'));
    expect(plan.refused.map((hit) => hit.key)).toEqual(['prep']);
    expect(plan.blank).toEqual([]);
  });

  it('does nothing to a note with no frontmatter, or none that closes', () => {
    expect(planNoteStrip('Just a body.').blank).toEqual([]);
    expect(planNoteStrip('---\nprepTime: 10\nnever closes').blank).toEqual([]);
  });

  it('ignores the two names outside the frontmatter block', () => {
    // A body sentence beginning `prep:` is prose, not a property.
    const plan = planNoteStrip(['---', 'type: meal', '---', '', 'prep: chop first'].join('\n'));
    expect([...plan.blank, ...plan.stated]).toEqual([]);
  });
});

describe('what the note looks like afterwards', () => {
  it('removes exactly the planned lines and leaves every other byte alone', () => {
    const plan = planNoteStrip(LINSENSALAT);
    const after = applyStrip(LINSENSALAT, plan.blank);

    expect(after).toBe(
      LINSENSALAT.split('\n')
        .filter((line) => !/^(prep|total)Time:/.test(line))
        .join('\n')
    );
    expect(after).toContain('reheatTime: 25');
    expect(after).toContain('supplier: "[[Tom Tasty AG]]"');
  });

  it('keeps the body, which is where a script like this does its damage', () => {
    const plan = planNoteStrip(AELPLER);
    const after = applyStrip(AELPLER, [...plan.blank, ...plan.stated]);
    expect(after).toContain('Bewährt und einfach gut.');
    expect(after).toContain('serving_size: 440g');
  });

  it('finds nothing to do on a second run', () => {
    const once = applyStrip(LINSENSALAT, planNoteStrip(LINSENSALAT).blank);
    const twice = planNoteStrip(once);
    expect([...twice.blank, ...twice.stated, ...twice.refused]).toEqual([]);
  });

  it('leaves a stated value in place when it is not planned for removal', () => {
    // The default run. Nothing somebody typed is discarded without the second
    // flag, which is the whole reason the script has two.
    const after = applyStrip(AELPLER, planNoteStrip(AELPLER).blank);
    expect(after).toBe(AELPLER);
  });
});
