/**
 * Recognising which configured badge is the reheat-time badge.
 *
 * The mobile layout shows it in a fixed stat row of its own rather than as a
 * chip, because it is the number somebody scans before deciding what to eat.
 * That only works if the badge row then leaves it out: one classifier, used by
 * both, so the stat row and the chips can never disagree about which badge is
 * which.
 *
 * It has to be a classifier rather than a list of ids because badges are user
 * configuration. Somebody can delete the built-in badge and make their own
 * against the same property, and the stat row should still show it.
 *
 * App-free.
 */
import type { CULItrailSettings, CustomBadge } from '../../settings/types';
import { mealMetaAliases } from '../parser/meal-meta';

export type TimeBadgeKind = 'cook';

function namesAny(property: string, aliases: string[]): boolean {
  const wanted = property.trim().toLowerCase();
  if (!wanted) return false;
  return aliases.some((alias) => alias.toLowerCase() === wanted);
}

/**
 * Whether this is the time badge, or null.
 *
 * One kind rather than three. A meal here is bought ready-made, so there is no
 * preparation to time and a total could only ever restate the reheat time; a
 * vault that still carries a badge configured against an old property gets a
 * chip like any other unrecognised one, which is the right answer for a badge
 * this classifier no longer has a row for.
 */
export function timeBadgeKind(
  badge: CustomBadge,
  settings: CULItrailSettings
): TimeBadgeKind | null {
  const aliases = mealMetaAliases(settings);
  return namesAny(badge.property, aliases.reheatTime) ? 'cook' : null;
}

/**
 * True for a badge the mobile layout renders somewhere other than the chip
 * row: the reheat time, which gets the stat row, and last-eaten, which the
 * meal card above already shows.
 */
export function isMobileHandledElsewhere(badge: CustomBadge, settings: CULItrailSettings): boolean {
  if (timeBadgeKind(badge, settings) !== null) return true;
  return namesAny(badge.property, mealMetaAliases(settings).lastEaten);
}
