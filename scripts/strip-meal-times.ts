/**
 * Takes `prepTime:` and `totalTime:` off a vault's meal notes.
 *
 * A meal in CULItrail is bought ready-made and reheated, so a preparation time
 * describes nothing anybody can act on, and with preparation always absent a
 * total could only ever restate the reheat time. Two names for one value is the
 * condition `strip-default-serving-size.ts` next door already deletes a property
 * for; this is the same job for the two that cooking left behind.
 *
 * **Report first, delete second, and that ordering is the whole design.** Unlike
 * the other strip scripts, the values here are not dead by construction: a note
 * written while this plugin still had a cooking half may stat a real preparation
 * time, and deleting it is discarding something somebody typed. So a plain run
 * lists every note about to lose a stated value and writes nothing at all, even
 * with `--apply`. Only `--apply --discard-values` writes those, and the flag is
 * spelled to be uncomfortable to type by accident.
 *
 *   npx tsx scripts/strip-meal-times.ts --vault <path>
 *   npx tsx scripts/strip-meal-times.ts --vault <path> --apply
 *   npx tsx scripts/strip-meal-times.ts --vault <path> --apply --discard-values
 *
 * The middle form is the useful one for most vaults: it removes the two keys
 * wherever they are blank, which is where they overwhelmingly are, and leaves
 * every note that states something for a human to look at.
 *
 * Line-oriented rather than a YAML round-trip, for the reason the sibling
 * scripts give: rewriting a whole frontmatter block to remove one key reformats
 * every other key in it, which turns a two-property change into a diff nobody
 * can read. A key whose value spans more than one line is refused rather than
 * guessed at, since neither of these ever has one and anything that does is not
 * the property this means.
 *
 * Not shipped with the plugin. It runs once per vault, from a terminal.
 *
 * **The meals folder comes from the vault's own `data.json`, not from
 * `mergeSettings()`.** Two reasons, and the second is the one that matters.
 * Importing the defaults reaches `I18nManager`, which imports a value from
 * `obsidian`, and the `obsidian` package is types only: a script that does that
 * cannot run under Node at all, which is the state the three sibling scripts
 * are in. And the shipped default is `Eating/Meals`, while a German vault keeps
 * its meals in `Essen/Mahlzeiten`, so a script trusting the default would report
 * a clean vault by looking in a folder that does not exist.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The spellings to take off, which are no longer settings.
 *
 * Not read from the settings, because the properties these named have been
 * removed: what is left is whatever is already sitting in notes. The alias
 * lists the parser used to carry are reproduced here so a note written to a
 * foreign convention is cleaned too.
 */
export const RETIRED_TIME_KEYS = [
  'prepTime',
  'prep_time',
  'preparation_time',
  'prep',
  'totalTime',
  'total_time',
];

export interface TimeKeyHit {
  key: string;
  /** Empty when the key is present and states nothing, which is the usual case. */
  value: string;
  line: number;
}

export interface NoteStripPlan {
  /** Keys present and blank. Removed by `--apply` alone. */
  blank: TimeKeyHit[];
  /** Keys stating something. Removed only with `--discard-values`. */
  stated: TimeKeyHit[];
  /** Keys whose value runs past one line, which neither of these ever does. */
  refused: TimeKeyHit[];
}

/**
 * What this note would lose, without losing it.
 *
 * Pure, and separated from the walk for the reason the sibling script gives:
 * the trustworthy part of a script that edits somebody's notes is what it
 * leaves alone, and that is only provable against a note held in a test.
 */
export function planNoteStrip(text: string): NoteStripPlan {
  const plan: NoteStripPlan = { blank: [], stated: [], refused: [] };
  const lines = text.split('\n');
  if (lines[0]?.trim() !== '---') return plan;

  const close = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
  if (close === -1) return plan;

  for (let index = 1; index < close; index++) {
    const line = lines[index];
    const key = RETIRED_TIME_KEYS.find((candidate) => line.startsWith(`${candidate}:`));
    if (!key) continue;

    // A continuation line is indented. One under the key means a block or a
    // list, which a duration is not, so this is some other property sharing
    // the name.
    if (/^\s/.test(lines[index + 1] ?? '')) {
      plan.refused.push({ key, value: '', line: index });
      continue;
    }

    const value = line.slice(key.length + 1).trim();
    (value === '' ? plan.blank : plan.stated).push({ key, value, line: index });
  }
  return plan;
}

/**
 * The note with the planned lines gone.
 *
 * Line-oriented rather than a YAML round-trip, for the reason the sibling
 * scripts give: rewriting a whole frontmatter block to remove one key reformats
 * every other key in it, which turns a two-property change into a diff nobody
 * can read.
 */
export function applyStrip(text: string, hits: TimeKeyHit[]): string {
  const drop = new Set(hits.map((hit) => hit.line));
  return text
    .split('\n')
    .filter((_, index) => !drop.has(index))
    .join('\n');
}

function markdownFiles(dir: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...markdownFiles(path));
    else if (name.endsWith('.md')) found.push(path);
  }
  return found;
}

function main(): void {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const discardValues = argv.includes('--discard-values');
  const vault = argv[argv.indexOf('--vault') + 1];
  const mealsOverride = argv.includes('--meals') ? argv[argv.indexOf('--meals') + 1] : null;
  const configDir = argv.includes('--config-dir') ? argv[argv.indexOf('--config-dir') + 1] : null;

  if (argv.indexOf('--vault') === -1 || !vault) {
    console.error(
      'usage: strip-meal-times.ts --vault <path> [--apply] [--discard-values]' +
        ' [--meals <folder>] [--config-dir <name>]'
    );
    process.exit(2);
  }

  const meals = mealsFolder(vault, mealsOverride, configDir);
  const stated: Array<TimeKeyHit & { path: string }> = [];
  const refused: Array<TimeKeyHit & { path: string }> = [];
  let blankCount = 0;
  const touched = new Set<string>();

  for (const path of markdownFiles(join(vault, meals))) {
    const text = readFileSync(path, 'utf8');
    const plan = planNoteStrip(text);

    blankCount += plan.blank.length;
    for (const hit of plan.stated) stated.push({ ...hit, path });
    for (const hit of plan.refused) refused.push({ ...hit, path });

    const removable = discardValues ? [...plan.blank, ...plan.stated] : plan.blank;
    if (removable.length === 0) continue;

    touched.add(path);
    if (apply) writeFileSync(path, applyStrip(text, removable), 'utf8');
  }

  console.log(apply ? 'APPLIED' : 'DRY RUN, nothing written');
  console.log(`meals folder: ${meals}`);
  console.log({
    notesTouched: touched.size,
    blankKeysRemoved: blankCount,
    statedValues: stated.length,
    statedValuesRemoved: discardValues ? stated.length : 0,
    refused: refused.length,
  });

  if (stated.length > 0) {
    console.log(
      discardValues
        ? '\nThese stated a value and it was discarded:'
        : '\nThese state a value and were LEFT ALONE. Re-run with --apply --discard-values to remove them:'
    );
    for (const hit of stated) console.log(`  ${hit.key} = ${hit.value}  ${hit.path}`);
  }
  for (const hit of refused) {
    console.log(`  refused, ${hit.key} runs past one line: ${hit.path}`);
  }
}

/**
 * Where this vault keeps its meals.
 *
 * Refuses rather than guessing: a wrong folder here reads as a vault with
 * nothing to clean, which is the failure that looks like success.
 */
function mealsFolder(vault: string, override: string | null, configDir: string | null): string {
  if (override) return override;

  // `.obsidian` is the default rather than a certainty: a vault can rename its
  // configuration folder, and `Vault#configDir` is what a plugin would ask.
  // This runs from a terminal with no app to ask, so the default is assumed,
  // `--config-dir` is the way to say otherwise, and a miss refuses rather than
  // reporting a clean vault by looking in a folder that is not there.
  const configured = join(vault, configDir ?? '.obsidian', 'plugins', 'culitrail', 'data.json');
  if (existsSync(configured)) {
    const data = JSON.parse(readFileSync(configured, 'utf8')) as { mealsFolder?: unknown };
    if (typeof data.mealsFolder === 'string' && data.mealsFolder.trim() !== '')
      return data.mealsFolder;
  }

  console.error(
    `Could not read mealsFolder from ${configured}. Pass --meals <folder> to say where they are.`
  );
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
