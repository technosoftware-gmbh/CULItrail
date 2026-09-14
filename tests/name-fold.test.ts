/**
 * A name is folded once, by `caseFold`, and nowhere else by hand.
 *
 * macOS writes an umlaut two ways, and the two spellings compare unequal. The
 * bug this guards was live in a real vault: 40 meal notes whose file name was
 * decomposed, every plan entry naming one of them resolving to nothing, and
 * the only symptom a row that rendered without its picture. Nothing in this
 * plugin normalized at all; 59 places trimmed and lower-cased on their own.
 *
 * **The rule lives in TRAILsuite too, as a root test across its packages.**
 * This is its copy for the plugin that moved out, and it is a copy on purpose:
 * the fold itself is not. `caseFold` is imported from `@technosoftware/trail-core`
 * so that three plugins cannot grow three opinions about what two names being
 * the same means, which is the whole failure.
 *
 * Two shapes are findings, and the second is the one worth explaining:
 *
 * - **`trim()` and `toLowerCase()` on the same value**, in either order. That
 *   pair IS the fold, minus the composing, so writing it out is writing a
 *   second fold that forgot the part this test exists for.
 * - **`toLowerCase()` on anything whose last name reads as a title or a name.**
 *   `entry.title.toLowerCase()` carried the bug without a `trim()` anywhere
 *   near it, and a rule that only knew the pair above would have passed it. A
 *   heading, a search query, an appliance or a tag is left alone deliberately:
 *   those are compared against literals this plugin owns, and folding them is
 *   welcome but not enforceable without an exemption list, which is the thing
 *   that rots.
 *
 * **Read with the compiler, not with a regex.** A finding is a call
 * expression, so a comment naming `trim().toLowerCase()` (this one does,
 * twice) and a string containing it are outside the sweep by construction, and
 * no exemption is needed for the prose that states the rule.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import ts from 'typescript';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

/** What the fold is called, and the only identifier allowed to do the lowering. */
const FOLD = 'caseFold';

/** Where it comes from. This plugin consumes the fold; it does not own one. */
const CORE = '@technosoftware/trail-core';

/**
 * A tail that means "this is a name somebody typed", and may not be lowered by hand.
 *
 * Anything ending in name or title, in any casing: `title`, `mealTitle`,
 * `companyTitle`, `basename`. Deliberately a suffix rather than a word
 * boundary, because `mealTitle` has no boundary to find and is the shape this
 * plugin is full of.
 */
const NAMELIKE = /(title|titles|name|names)$/i;

interface Finding {
  file: string;
  line: number;
  text: string;
  why: string;
}

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (extname(entry.name) === '.ts') out.push(path);
    }
  };
  walk(dir);
  return out;
}

/** The method a call expression invokes, or null when it invokes no method. */
function calledMethod(node: ts.Expression): string | null {
  if (!ts.isCallExpression(node)) return null;
  const target = node.expression;
  return ts.isPropertyAccessExpression(target) ? target.name.text : null;
}

/**
 * The last name in a member expression, which is what says what is being lowered.
 *
 * `entry.meal.mealTitle` answers `mealTitle`, `titles[i]` answers `titles`, and
 * `entry.title.trim()` answers `trim`, which is the pair rule's business rather
 * than this one's.
 */
function tailName(node: ts.Expression): string | null {
  if (ts.isPropertyAccessExpression(node)) return node.name.text;
  if (ts.isIdentifier(node)) return node.text;
  if (ts.isElementAccessExpression(node)) return tailName(node.expression);
  if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) {
    return tailName(node.expression);
  }
  if (ts.isCallExpression(node)) return calledMethod(node);
  return null;
}

function findingsIn(path: string): Finding[] {
  const text = readFileSync(path, 'utf8');
  const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: Finding[] = [];

  const report = (node: ts.Node, why: string): void => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    found.push({
      file: relative(ROOT, path),
      line,
      text: (text.split('\n')[line - 1] ?? '').trim().slice(0, 90),
      why,
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const method = calledMethod(node);
      const receiver = ts.isPropertyAccessExpression(node.expression)
        ? node.expression.expression
        : null;
      const inner = receiver ? calledMethod(receiver) : null;

      const pair =
        (method === 'toLowerCase' && inner === 'trim') ||
        (method === 'trim' && inner === 'toLowerCase');

      if (pair) {
        report(node, `lowers a trimmed value by hand: use ${FOLD}()`);
      } else if (method === 'toLowerCase' && receiver) {
        const tail = tailName(receiver);
        if (tail && NAMELIKE.test(tail)) {
          report(node, `lowers a name by hand: use ${FOLD}()`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return found;
}

const SOURCE_FILES = filesUnder(SRC);

const report = (findings: Finding[]): string[] =>
  findings.map((f) => `${f.file}:${f.line}  ${f.why}\n    ${f.text}`);

describe('the name-fold rule', () => {
  it('reads a meaningful number of files', () => {
    // A walk that stops finding files reports nothing, which looks exactly like
    // a plugin in good order.
    expect(SOURCE_FILES.length).toBeGreaterThan(150);
  });

  it('takes the fold from the core rather than growing one here', () => {
    // The structural check. A local `caseFold` would pass the sweep below while
    // being the thing the sweep exists to prevent: a second opinion about what
    // two names being the same means.
    const owners = SOURCE_FILES.filter((path) =>
      new RegExp(`export function ${FOLD}\\b`).test(readFileSync(path, 'utf8'))
    ).map((path) => relative(ROOT, path));
    expect(owners).toEqual([]);

    const importers = SOURCE_FILES.filter((path) => {
      const text = readFileSync(path, 'utf8');
      return text.includes(FOLD) && text.includes(CORE);
    });
    expect(importers.length).toBeGreaterThan(0);
  });

  it('is kept in every source file', () => {
    expect(report(SOURCE_FILES.flatMap(findingsIn))).toEqual([]);
  });
});

/** The sweep is only worth its run time if it can fail. These are the shapes it must catch. */
describe('what the rule catches, and what it leaves alone', () => {
  const scan = (code: string): string[] => {
    const source = ts.createSourceFile(
      join(SRC, 'sample.ts'),
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );
    const out: string[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const method = calledMethod(node);
        const receiver = ts.isPropertyAccessExpression(node.expression)
          ? node.expression.expression
          : null;
        const inner = receiver ? calledMethod(receiver) : null;
        if (
          (method === 'toLowerCase' && inner === 'trim') ||
          (method === 'trim' && inner === 'toLowerCase')
        ) {
          out.push('pair');
        } else if (method === 'toLowerCase' && receiver) {
          const tail = tailName(receiver);
          if (tail && NAMELIKE.test(tail)) out.push('name');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    return out;
  };

  it('catches the pair in either order', () => {
    expect(scan('const k = value.trim().toLowerCase();')).toEqual(['pair']);
    expect(scan('const k = value.toLowerCase().trim();')).toEqual(['pair']);
  });

  it('catches a name lowered on its own, which is how the bug shipped', () => {
    expect(scan('if (entry.title.toLowerCase() === wanted) return entry;')).toEqual(['name']);
    expect(scan('const k = row.mealTitle.toLowerCase();')).toEqual(['name']);
  });

  it('leaves the fold own callers alone', () => {
    expect(scan('const k = caseFold(entry.title);')).toEqual([]);
  });

  it('leaves a heading, a query and a tag alone, deliberately', () => {
    // Compared against literals this plugin owns, so the two sides cannot drift
    // apart the way a file name and a pasted title can.
    expect(scan("if (heading.toLowerCase() === 'queue') return true;")).toEqual([]);
    expect(scan('const q = this.query.toLowerCase();')).toEqual([]);
  });

  it('is not fooled by a comment or a string that names the shape', () => {
    expect(scan('// never write title.trim().toLowerCase() by hand')).toEqual([]);
    expect(scan("const advice = 'use caseFold, not trim().toLowerCase()';")).toEqual([]);
  });
});
