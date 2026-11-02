import { useId } from 'react';
import LeagueTrophyWithEmblem from './LeagueTrophySvg';

/** Lightweight, original SVG illustrations for the crown strip only.
 * Stylised cup silhouettes, not official logos or exact trophy replicas. */
export default function CrownLeagueTrophy({ leagueId }: { leagueId: string }) {
  const id = `crown-cup-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (leagueId !== 'eng.league_cup' && leagueId !== 'afc.champions') {
    return <LeagueTrophyWithEmblem leagueId={leagueId} variant="authentic" />;
  }
  const leagueCup = leagueId === 'eng.league_cup';
  const metal = `url(#${id}-silver)`;
  const darkMetal = `url(#${id}-dark)`;
  return <span className="lc-trophy-wrap" data-trophy-league={leagueId} data-trophy-metal="silver" data-crown-cup={leagueCup ? 'league-cup' : 'elite-cup'} aria-hidden="true">
    <svg className="lc-trophy-svg" viewBox="0 0 200 200" focusable="false" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-silver`} x1="0" y1="0" x2="1" y2="0">
          <stop stopColor="#566475" /><stop offset=".2" stopColor="#dce6ef" /><stop offset=".4" stopColor="#fff" /><stop offset=".56" stopColor="#99aabb" /><stop offset=".78" stopColor="#f3f8ff" /><stop offset="1" stopColor="#617084" />
        </linearGradient>
        <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#c1cdda" /><stop offset=".5" stopColor="#536273" /><stop offset="1" stopColor="#202b39" />
        </linearGradient>
      </defs>
      {leagueCup ? <g>
        {/* Silver two-handled bowl, narrow stem and stepped dark plinth. */}
        <path d="M63 48C28 31 21 53 31 81C36 96 48 104 70 107M137 48C172 31 179 53 169 81C164 96 152 104 130 107" fill="none" stroke={darkMetal} strokeWidth="12" strokeLinecap="round" />
        <path d="M63 48C28 31 21 53 31 81C36 96 48 104 70 107M137 48C172 31 179 53 169 81C164 96 152 104 130 107" fill="none" stroke={metal} strokeWidth="6" strokeLinecap="round" />
        <path d="M58 40H142L136 87Q132 117 108 125H92Q68 117 64 87Z" fill={metal} stroke="#8597a8" strokeWidth="1.5" />
        <ellipse cx="100" cy="40" rx="42" ry="7" fill={darkMetal} stroke="#e5edf4" strokeWidth="3" />
        <path d="M74 54Q76 94 92 106" fill="none" stroke="#fff" strokeWidth="3" opacity=".7" />
        <path d="M92 124H108L111 143L123 151H77L89 143Z" fill={metal} />
        <ellipse cx="100" cy="151" rx="26" ry="5" fill={metal} />
        <path d="M72 157H128L135 181H65Z" fill="#1b2330" stroke="#697788" strokeWidth="2" />
        <rect x="61" y="180" width="78" height="7" rx="2" fill={darkMetal} />
        <rect x="80" y="164" width="40" height="9" rx="1" fill={metal} />
        <path d="M87 168H113" stroke="#596878" strokeWidth="1" />
      </g> : <g>
        {/* Tall ascending silver fins and a wide sculpted crown. */}
        <ellipse cx="100" cy="178" rx="36" ry="8" fill={darkMetal} />
        <path d="M74 162H126L132 178Q100 188 68 178Z" fill={metal} />
        <path d="M88 162C92 118 62 93 53 42L68 29C67 83 109 113 100 163Z" fill={darkMetal} stroke="#c9d5e0" strokeWidth="1" />
        <path d="M100 163C110 114 72 86 75 23L88 16C82 73 126 113 112 163Z" fill={metal} />
        <path d="M111 162C135 111 115 73 114 16L128 23C123 79 151 111 123 164Z" fill={darkMetal} stroke="#c9d5e0" strokeWidth="1" />
        <path d="M101 163C126 110 96 74 98 12L110 14C104 72 138 111 114 165Z" fill={metal} />
        <path d="M122 162C150 118 132 75 133 31L148 43C143 97 162 112 132 165Z" fill={metal} />
        <path d="M53 42Q100 68 148 43L144 55Q100 78 57 55Z" fill={metal} />
        <path d="M66 38Q100 55 135 38" fill="none" stroke="#f6fbff" strokeWidth="3" />
        <rect x="88" y="172" width="24" height="5" rx="1" fill="#546477" />
      </g>}
    </svg>
  </span>;
}
