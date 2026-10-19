/* تعريفات وحدة جسر شعارات المتصدّرين المؤقت — تُستهلك من React ومن اختبارات Node. */

export declare const LEADER_CREST_SOURCE: 'live-cards' | 'local';

export declare function liveCardsTeamLogo(team: {
  teamId?: string;
  provider?: string;
}): string | null;

export declare function highlightlyTeamLogo(team: {
  teamId?: string;
  provider?: string;
}): string | null;

export declare function providerTeamLogo(team: {
  teamId?: string;
  provider?: string;
  logo?: string | null;
}): string | null;

export declare function isApprovedCrestUrl(url: unknown): boolean;

export declare function isLiveCardsTeamLogo(url: unknown): boolean;
