/* أنواع خريطة الكلمات — تُطابق src/keywords.mjs */

export type Intent =
  | "transactional"
  | "comparison"
  | "informational"
  | "editorial"
  | "legal"
  | "navigational";

export interface KeywordEntry {
  /** الكلمة التي تملكها الصفحة. null = صفحة لا تستهدف كلمة (قانونية/وظيفية) */
  primary: string | null;
  secondary?: string[];
  intent: Intent;
}

export declare const KEYWORDS: Record<string, KeywordEntry>;
export declare function normalizeRoute(route: string): string;
export declare function keywordsFor(route: string): KeywordEntry;
export declare function hasKeywordEntry(route: string): boolean;
