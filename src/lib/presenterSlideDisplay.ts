/**
 * In presenter mode (!isEditing), always show live stats clearly regardless of
 * design style (e.g. "minimal" hides counts in the editor preview).
 */
export function presenterShowCounts(isEditing: boolean, styleShowCounts: boolean): boolean {
  if (!isEditing) return true;
  return styleShowCounts;
}

export function presenterShowPercentages(isEditing: boolean, styleShowPercentages: boolean): boolean {
  if (!isEditing) return true;
  return styleShowPercentages;
}

export function presenterShowProgressBars(isEditing: boolean, styleShowProgressBars: boolean): boolean {
  if (!isEditing) return true;
  return styleShowProgressBars;
}
