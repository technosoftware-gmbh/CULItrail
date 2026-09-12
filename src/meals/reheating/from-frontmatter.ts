/**
 * The dish's half of the reheating merge, as its frontmatter states it.
 *
 * A meal here is bought ready-made, so how to reheat it is one appliance, one
 * temperature and one time: `reheatAppliance`, `reheatTemp` and `reheatTime`.
 * That is a narrower claim than the body section can make, and deliberately so,
 * because it is the claim every note in a real library actually has to make.
 *
 * **This produces an `ApplianceEntry` and nothing else**, which is the whole
 * reason it is only this long. An entry carrying values and no prose is already
 * a row of the merge table in docs/design/ready-meals.md: "only temp and/or
 * time", against a supplier stating prose with tokens, fills the tokens. So
 * frontmatter joins the existing merge as another source of the same shape
 * rather than as a second way of resolving an instruction.
 *
 * App-free.
 */
import { matchAppliance } from './appliances';
import { formatMinutes } from '../view-model/format-time';
import type { CULItrailSettings } from '../../settings/types';
import type { ApplianceEntry } from './types';
import type { MealMeta } from '../types';

/**
 * The note's frontmatter as at most one appliance entry.
 *
 * **An appliance is required; a temperature and a time are not.** Without one
 * there is no heading to resolve against, so there is no supplier wording to
 * fill and no label to render, and guessing at the supplier's only appliance
 * would be the plugin deciding something the note declined to say. A meal that
 * states a temperature and no appliance therefore offers nothing, which is the
 * same data-entry gap as a token nothing fills rather than a different kind of
 * problem.
 *
 * The time is formatted here rather than stored formatted, because the note
 * holds minutes as a number and `{time}` substitutes what a person reads. That
 * is the same split as every other figure in this plugin: a language-free value
 * in the note, its wording decided at render.
 */
export function frontmatterEntries(meta: MealMeta, settings: CULItrailSettings): ApplianceEntry[] {
  const stated = meta.reheatAppliance?.trim() ?? '';
  if (stated === '') return [];

  const temp = meta.reheatTemp?.trim() ?? '';
  const time = formatMinutes(meta.reheatTime);
  if (temp === '' && time === '') return [];

  const match = matchAppliance(stated, settings.reheatAppliances);
  return [
    {
      applianceId: match.applianceId,
      label: match.label,
      unknown: match.unknown,
      steps: [],
      temp: temp === '' ? null : temp,
      time: time === '' ? null : time,
    },
  ];
}

/**
 * Everything the dish itself says, body section and frontmatter together.
 *
 * **Per appliance, and the section wins.** A note carrying an explicit
 * `## Steamer` has said something specific about the steamer, and frontmatter
 * saying `95 degrees` about the same appliance is the general case it was
 * written to override; the same precedence as an explicit value beating a
 * derived one. The two are not in competition for different appliances, so a
 * note may state a microwave in its frontmatter and spell out an oven in its
 * body and get both.
 *
 * Stated as an override rather than as "frontmatter unless a section exists at
 * all", because an all-or-nothing rule makes adding one appliance by hand
 * silently delete the one in the properties.
 */
export function dishEntries(
  sectionEntries: ApplianceEntry[],
  meta: MealMeta,
  settings: CULItrailSettings
): ApplianceEntry[] {
  const claimed = new Set(sectionEntries.map((entry) => entry.applianceId));
  return [
    ...sectionEntries,
    ...frontmatterEntries(meta, settings).filter((entry) => !claimed.has(entry.applianceId)),
  ];
}
