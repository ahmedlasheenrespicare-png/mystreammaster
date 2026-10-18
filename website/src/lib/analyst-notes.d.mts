/* أنواع دفتر ملاحظات المحلل — السلوك في `analyst-notes.mjs`.
   نفس عرف `match-center.mjs`: منطق خالص في .mjs يصلح لـReact وNode، والأنواع
   هنا ليستهلكها TypeScript في strict دون أن يكذب على حالة «لا تخزين». */

export interface AnalystNote {
  id: string;
  /** معرّف المباراة الداخلي (الـslug) — أساس عزل ملاحظات كل مباراة. */
  matchId: string;
  text: string;
  tags: string[];
  /** كيف تُثبت الملاحظة موضعها: حدث من المصدر، أو دقيقة كتبها المحلل، أو لا شيء. */
  anchor: 'event' | 'minute' | 'none';
  eventId: string | null;
  eventKey: string | null;
  eventLabel: string | null;
  /** `null` = لا دقيقة للملاحظة؛ لا تتحول إلى صفر. */
  minute: number | null;
  extraMinute: number | null;
  teamSide: 'home' | 'away' | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface AnalystNoteAnchorInput {
  eventId?: string | null;
  eventKey?: string | null;
  eventLabel?: string | null;
  minute?: number | null;
  extraMinute?: number | null;
  teamSide?: 'home' | 'away' | null;
}

export interface AnalystNoteDraftInput {
  matchId?: string;
  text?: string;
  tags?: unknown;
  anchor?: 'event' | 'minute' | 'none' | string;
  event?: unknown;
  /** ربط محفوظ يُعاد استخدامه إن لم يعد الحدث الحيّ موجوداً في القراءة. */
  previousAnchor?: AnalystNoteAnchorInput | null;
  minute?: string | number | null;
  extraMinute?: string | number | null;
  teamSide?: 'home' | 'away' | null;
  id?: string | null;
  createdAt?: string | null;
}

export interface AnalystNoteDraftResult {
  ok: boolean;
  errors: Record<string, string>;
  note: AnalystNote | null;
}

export type AnalystNotesReadStatus = 'ok' | 'empty' | 'unreadable' | 'unavailable';
export type AnalystNotesWriteStatus = 'ok' | 'empty' | 'unavailable' | 'unwritable';

/** واجهة تخزين صغيرة (localStorage أو بدله في الاختبار). */
export interface AnalystNotesStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface AnalystNoteAnchor {
  eventId: string | null;
  eventKey: string | null;
  eventLabel: string;
  minute: number | null;
  extraMinute: number | null;
  teamSide: 'home' | 'away' | null;
}

export interface MatchExportPayload {
  kind: 'stream-master.match-center.analyst-export';
  version: 1;
  exportedAt: string;
  privacyNote: string;
  match: Record<string, unknown>;
  read: Record<string, unknown> | null;
  freshness: string | null;
  events: { count: number; limit: number; items: Record<string, unknown>[] };
  notes: Record<string, unknown>[];
  notAvailableFromProvider: Record<string, unknown>;
}

export const ANALYST_NOTE_STORAGE_PREFIX: string;
export const ANALYST_NOTE_TAGS: string[];
export const ANALYST_NOTE_TEXT_LIMIT: number;
export const ANALYST_NOTE_TAG_CHAR_LIMIT: number;
export const ANALYST_NOTE_MAX_TAGS: number;
export const ANALYST_NOTE_MAX_NOTES: number;
export const ANALYST_NOTE_MINUTE_MAX: number;
export const ANALYST_NOTE_EXTRA_MAX: number;
export const ANALYST_NOTE_ANCHORS: Record<'event' | 'minute' | 'none', string>;
export const ANALYST_EXPORT_EVENT_LIMIT: number;

export function analystNoteId(seed?: string | number | null, at?: number | null): string;
export function noteAnchorFromEvent(event: unknown, matchId?: string | null): AnalystNoteAnchor | null;
export function normalizeAnalystTags(value: unknown): string[];
export function noteAnchorFromStored(source: AnalystNoteAnchorInput | null | undefined): AnalystNoteAnchor | null;
export function validateAnalystNote(input?: AnalystNoteDraftInput): {
  ok: boolean;
  errors: Record<string, string>;
  text: string | null;
};
export function draftAnalystNote(
  input?: AnalystNoteDraftInput,
  options?: { id?: string | null; at?: number | null },
): AnalystNoteDraftResult;
export function normalizeAnalystNote(raw: unknown, matchId?: string | null): AnalystNote | null;

export function upsertAnalystNote(notes: AnalystNote[] | null | undefined, note: AnalystNote | null): AnalystNote[];
export function removeAnalystNote(notes: AnalystNote[] | null | undefined, id: string | null): AnalystNote[];
export function sortAnalystNotes(notes: AnalystNote[] | null | undefined, mode?: 'newest' | 'minute'): AnalystNote[];
export function analystNotesNearMinute(notes: AnalystNote[] | null | undefined, minute: number | string | null, window?: number): AnalystNote[];
export function countAnalystNotes(notes: AnalystNote[] | null | undefined): number;
export function analystNoteMinuteLabel(note: { minute?: number | null; extraMinute?: number | null } | null | undefined): string | null;
export function describeAnalystNoteAnchor(
  note: AnalystNote | null | undefined,
  names?: { homeName?: string | null; awayName?: string | null },
): string | null;

export function analystNoteStorageKey(matchId: string | null | undefined): string | null;
export function readAnalystNotes(
  matchId: string | null | undefined,
  storage?: AnalystNotesStorageLike | null,
): { notes: AnalystNote[]; status: AnalystNotesReadStatus };
export function writeAnalystNotes(
  matchId: string | null | undefined,
  notes: AnalystNote[] | null | undefined,
  storage?: AnalystNotesStorageLike | null,
): { ok: boolean; status: AnalystNotesWriteStatus };

export function buildMatchExport(input?: {
  match?: unknown;
  snapshot?: unknown;
  notes?: AnalystNote[] | null;
  freshnessText?: string | null;
  events?: unknown[] | null;
  at?: number | null;
}): MatchExportPayload;
export function exportToJsonText(payload: unknown): string;
export function analystExportFilename(matchId: string | null | undefined, at?: number | null): string;
