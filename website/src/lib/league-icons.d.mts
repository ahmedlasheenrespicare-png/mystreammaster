/* تعريفات وحدة أيقونات البطولات — تُطابق src/lib/league-icons.mjs */

/** معرّف البطولة في مصدر المباريات (`leagueId`) → رابط شعارها على مخزن ESPN */
export declare const LEAGUE_ICONS: Readonly<Record<string, string>>;

/** أيقونة بطولة بمعرّف المصدر — `undefined` لبطولة بلا شعار موثّق. */
export declare function leagueIcon(leagueId: string): string | undefined;
