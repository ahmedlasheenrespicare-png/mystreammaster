/** Source-confirmed state only: never infer live/finished from a calendar date. */
export function orderCrownMatches(matches: readonly ({ state?: string; date?: string } | null | undefined)[]): number[] {
  const rank = (state: string | undefined) => state === 'live' ? 0 : state === 'scheduled' ? 1 : state === 'finished' ? 2 : 3;
  return matches.map((_, index) => index).sort((a, b) => {
    const first = matches[a];
    const second = matches[b];
    const priority = rank(first?.state) - rank(second?.state);
    if (priority) return priority;
    if (rank(first?.state) === 3) return a - b;
    const firstTime = Date.parse(first?.date ?? '');
    const secondTime = Date.parse(second?.date ?? '');
    if (Number.isFinite(firstTime) !== Number.isFinite(secondTime)) return Number.isFinite(firstTime) ? -1 : 1;
    if (Number.isFinite(firstTime) && Number.isFinite(secondTime)) {
      const delta = first?.state === 'finished' ? secondTime - firstTime : firstTime - secondTime;
      if (delta) return delta;
    }
    return a - b;
  });
}
