/**
 * The reheat time, as a fixed row rather than a chip.
 *
 * It is the number somebody scans before deciding what to eat, so on a phone it
 * gets a row of its own at a size that can be read from across a worktop.
 * Whether it appears still follows the badge configuration: a vault that turned
 * the reheat-time badge off does not get a column here either.
 *
 * A row of one, which reads as an over-general shape until the second figure
 * arrives. It is kept as a strip rather than collapsed into a single label
 * because `renderStatStrip()` is the one component every figure in this plugin
 * goes through, and a bespoke one-value renderer beside it is the fifth copy
 * the strip exists to prevent.
 */
import { t } from '../../../lang/I18nManager';
import type { CULItrailSettings } from '../../../settings/types';
import { renderStatStrip, type StatCell } from '../../../ui/stat-strip';
import { formatMinutes } from '../../view-model/format-time';
import { timeBadgeKind, type TimeBadgeKind } from '../../view-model/time-badges';
import type { MealMeta } from '../../types';

function configuredKinds(settings: CULItrailSettings): Set<TimeBadgeKind> {
  const kinds = new Set<TimeBadgeKind>();
  for (const badge of settings.headerBadges) {
    if (!badge.enabled) continue;
    const kind = timeBadgeKind(badge, settings);
    if (kind) kinds.add(kind);
  }
  return kinds;
}

export function renderMobileStatRow(
  container: HTMLElement,
  meta: MealMeta,
  settings: CULItrailSettings
): void {
  const kinds = configuredKinds(settings);

  const cells: StatCell[] = [];
  const add = (kind: TimeBadgeKind, label: string, minutes: number | null) => {
    if (!kinds.has(kind) || minutes === null) return;
    const text = formatMinutes(minutes);
    if (text) cells.push({ label, value: text });
  };

  add('cook', t('meals.mobile.cook'), meta.reheatTime);

  renderStatStrip(container, cells, { variant: 'boxed' });
}
