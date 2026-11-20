import type { Match } from "./matches.mjs";

/** أدنى ما تحتاجه الحسبة — الشريط يمرّر `Match` كاملًا، والاختبارات تمرّر هذا الشكل. */
export type CrownStatusMatch = Pick<Match, "state" | "detail" | "venue">;

export const CROWN_NO_BOARD_LINE: string;

export function crownStateLabel(match: CrownStatusMatch | null | undefined): string;

export function crownBandDetail(match: CrownStatusMatch | null | undefined): string;

/** دقائق وثواني المباراة الجارية، أو null إن لم يرسل المصدر رقمًا يُبنى عليه. */
export function crownLiveClock(detail: string | null | undefined, elapsedMs: number | null | undefined): { minutes: number; seconds: number } | null;

