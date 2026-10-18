import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  changedStatKeys,
  pitchStatZones,
  statRowsSignature,
  type PitchStatZone,
  type StatComparisonRow,
  type StatPair,
} from '../lib/match-center.mjs';

/* ==========================================================================
   التمثيل البصري للإحصائيات على الملعب (Pitch-Mapped Team Stats)
   --------------------------------------------------------------------------
   أرقام الفريقين لا تُعرض قوائم نصية في مرحلتي «مباشر» و«بعد المباراة»:
   تُسقَط فوق رسم الملعب بحسب طبيعة الرقم —

   • الهجوم والتسديد فوق منطقتي الجزاء (تسديدات الفريق عند مرمى خصمه).
   • الوسط والاستحواذ ودقة التمرير في دائرة منتصف الملعب.
   • الدفاع والانضباط (التصديات، الركنيات، الأخطاء، التسلل، البطاقات) في
     الثلث الدفاعي لكل فريق.

   ما يُرسم هنا تنسيقٌ وحسب؛ «أي رقم يقف أين» قرارٌ في `pitchStatZones` داخل
   `lib/match-center.mjs` وتختبره Node — فالشاشة والاختبار يقرآن عقداً واحداً.

   وحدود الأمانة نفسها التي تحكم بقية اللوحات:
   • قيمة ناقصة تبقى كلمة «لا رقم من المصدر»، ولا تُستكمل صفراً.
   • الرقم الأعلى ليس الأفضل: الفارق كمية، والأخطاء والبطاقات ليست ميزة.
   • المنطقة التي لا يصل رقمها تُسمّى بغيابها (xG، صناعة الفرص، التشتيتات
     والتدخلات) بدل خانة فارغة أو رقم مُختلَع.
========================================================================== */

const numberLabel = (value: number): string =>
  new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);

/** الرقم بوحدة المصدر: النسبة تُلحق بالرقم، وغيرها يُذكر بعدها كما ورد. */
function valueText(row: StatComparisonRow, value: number): string {
  const digits = numberLabel(value);
  if (row.unitIsPercent) return `${digits}%`;
  return row.unit ? `${digits} ${row.unit}` : digits;
}

/** عرض الشريط: نسبة إلى الأعلى بين الرقمين في الصف نفسه، لا درجة من 100. */
function barWidth(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '0%';
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

/**
 * صف رقم واحد على الملعب: القيمتان معاً دائماً، والغياب كلمة.
 * كل قيمة تحمل اسم فريقها في `aria-label` — فالمكان على الملعب وحده لا يُقرأ
 * بالناطق، ولون الشريط لا يُقرأ بالعين وحدها.
 */
function StatRow({ row, homeName, awayName, changed }: {
  row: StatComparisonRow;
  homeName: string;
  awayName: string;
  changed: boolean;
}) {
  return (
    <li
      className={`mc-statpitch-row${changed ? ' mc-statpitch-row--changed' : ''}`}
      data-stat-key={row.key}
      data-difference={row.leadingSide ?? 'equal'}
    >
      <span className="mc-statpitch-label">{row.label}</span>
      <span className="mc-statpitch-values">
        {row.home === null
          ? <span className="mc-statpitch-none" data-side="home" aria-label={`${row.label} — ${homeName}: لا رقم من المصدر`}>لا رقم</span>
          : (
            <bdi className="mc-num mc-statpitch-value" data-side="home" aria-label={`${row.label} — ${homeName}: ${valueText(row, row.home)}`}>
              {valueText(row, row.home)}
            </bdi>
          )}
        <span className="mc-statpitch-vs" aria-hidden="true">·</span>
        {row.away === null
          ? <span className="mc-statpitch-none" data-side="away" aria-label={`${row.label} — ${awayName}: لا رقم من المصدر`}>لا رقم</span>
          : (
            <bdi className="mc-num mc-statpitch-value" data-side="away" aria-label={`${row.label} — ${awayName}: ${valueText(row, row.away)}`}>
              {valueText(row, row.away)}
            </bdi>
          )}
      </span>
      <span className="mc-statpitch-bars" aria-hidden="true">
        <i className="mc-statpitch-bar mc-statpitch-bar--home" style={{ inlineSize: barWidth(row.bar.home) }} />
        <i className="mc-statpitch-bar mc-statpitch-bar--away" style={{ inlineSize: barWidth(row.bar.away) }} />
      </span>
    </li>
  );
}

function ZoneChip({ zone, homeName, awayName, changedKeys }: {
  zone: PitchStatZone;
  homeName: string;
  awayName: string;
  changedKeys: Set<string>;
}) {
  /* المنطقة تُرسم وإن لم يصل رقمها: الغياب المُسمّى يبقى في مكانه، والمواضع
     لا تتزحزح مع كل قراءة في وضع «مباشر». */
  const empty = zone.rows.length === 0;
  const ownerName = zone.owner === 'home' ? homeName : zone.owner === 'away' ? awayName : null;
  return (
    <div
      className={`mc-statpitch-zone${zone.owner ? ` mc-statpitch-zone--${zone.owner}` : ''}${empty ? ' mc-statpitch-zone--empty' : ''}`}
      data-zone={zone.id}
      data-owner={zone.owner ?? 'shared'}
      /* الموضع الرأسي من العقد؛ أما الجهة (يمين/يسار/وسط) فنهايتها منطقية في
         CSS حتى لا يخرج الشريط عن أرضية الملعب في أي عرض. */
      style={{ insetBlockStart: `${zone.zone.block}%` } as CSSProperties}
      role="group"
      aria-labelledby={`mc-statpitch-zone-${zone.id}`}
    >
      <span className="mc-statpitch-zone-title" id={`mc-statpitch-zone-${zone.id}`}>
        {zone.title}
        {ownerName && <bdi className="mc-statpitch-zone-owner">{ownerName}</bdi>}
      </span>

      {zone.rows.length > 0 ? (
        <ul className="mc-statpitch-rows">
          {zone.rows.map(row => (
            <StatRow
              key={`${zone.id}-${row.key}`}
              row={row}
              homeName={homeName}
              awayName={awayName}
              changed={changedKeys.has(row.key)}
            />
          ))}
        </ul>
      ) : (
        <p className="mc-statpitch-empty">لا رقم لهذه المنطقة في القراءة الحالية.</p>
      )}

      {zone.absentMetrics.length > 0 && (
        <p className="mc-statpitch-absent">
          {zone.absentMetrics.map(metric => metric.label).join('، ')}
          : لا يرسلها المصدر، فلا تُعرض رقماً ولا تقديراً.
        </p>
      )}
    </div>
  );
}

export interface MatchCenterStatPitchProps {
  statistics: StatPair[] | null | undefined;
  homeName: string;
  awayName: string;
  /**
   * «مباشر»: الأرقام تتحدث مع كل قراءة مؤكدة تصل، والتغيّر يُعلن ويُبرز.
   * «بعد المباراة»: الشاشة تثبت على الأرقام الختامية ولا إعلان فيها.
   */
  mode: 'live' | 'final';
  /** بادئة المعرفات: اللوحة تُرسم في تبويبين في الصفحة نفسها. */
  idPrefix: string;
  headingLevel?: 'h2' | 'h3' | 'h4';
  /** وقت القراءة كما تُنسّقه طبقة الصفحة — يُذكر مع الأرقام لا بدلها. */
  readAtLabel?: string | null;
}

export default function MatchCenterStatPitch({
  statistics,
  homeName,
  awayName,
  mode,
  idPrefix,
  headingLevel = 'h3',
  readAtLabel = null,
}: MatchCenterStatPitchProps) {
  const zones = useMemo(() => pitchStatZones(statistics as never), [statistics]);
  const Heading = headingLevel;

  /* التغيّر يُحسب بعد الترطيب لا أثناء الرسم: الرسم الأول (على الخادم وفي
     أول ترطيب) لا يعرف قراءةً سابقة، فلو قورن وقتها لاختلف HTML الخادم عن
     المتصفح. والأثر هنا إبرازٌ بصري وإعلان، لا رقمٌ آخر. */
  const signature = useMemo(() => (mode === 'live' ? statRowsSignature(statistics as never) : ''), [mode, statistics]);
  const previous = useRef<string | null>(null);
  const [changedKeys, setChangedKeys] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (mode !== 'live') {
      previous.current = null;
      setChangedKeys(current => (current.size === 0 ? current : new Set()));
      return;
    }
    setChangedKeys(new Set(changedStatKeys(previous.current, signature)));
    previous.current = signature === '' ? null : signature;
  }, [mode, signature]);

  if (zones.length === 0) return null;

  const titleId = `${idPrefix}-statpitch-title`;
  const noteId = `${idPrefix}-statpitch-note`;
  /* الإعلان باسم الرقم العربي لا بمفتاح المصدر (`totalShots` لا يُقرأ)، والرقم
     الواحد قد يقف في منطقتين (تسديدات الفريقين)، فالتسمية تُجمع مرة واحدة. */
  const labelByKey = new Map(zones.flatMap(zone => zone.rows).map(row => [row.key, row.label]));
  const changedLabels = [...new Set([...changedKeys].map(key => labelByKey.get(key)).filter((label): label is string => Boolean(label)))];

  return (
    <section className="mc-statpitch" aria-labelledby={titleId}>
      <header className="mc-statpitch-head">
        <Heading id={titleId} className="mc-statpitch-title">إحصائيات الفريقين على الملعب</Heading>
        <p className="mc-statpitch-caption">
          {mode === 'live'
            ? <>
              أرقام الفريقين مسقوطة فوق مناطق الملعب بحسب طبيعتها، وتتحدث مع كل قراءة مؤكدة تصل
              {readAtLabel ? <> — آخر قراءة <span className="mc-num" dir="ltr">{readAtLabel}</span></> : ''}.
            </>
            : <>
              أرقام ختامية: المباراة انتهت، فالشاشة ثابتة على ما أرسله المصدر ولا تُحدَّث بعده.
            </>}
        </p>
      </header>

      <div className="mc-statpitch-field" data-mode={mode}>
        <div className="mc-statpitch-markings" aria-hidden="true">
          <span className="mc-statpitch-halfway" />
          <span className="mc-statpitch-circle" />
          <span className="mc-statpitch-spot" />
          <span className="mc-statpitch-box mc-statpitch-box--home" />
          <span className="mc-statpitch-box mc-statpitch-box--away" />
          <span className="mc-statpitch-goal mc-statpitch-goal--home" />
          <span className="mc-statpitch-goal mc-statpitch-goal--away" />
        </div>

        {zones.map(zone => (
          <ZoneChip key={zone.id} zone={zone} homeName={homeName} awayName={awayName} changedKeys={changedKeys} />
        ))}

        <ul className="mc-statpitch-legend" aria-hidden="true">
          <li data-side="home"><bdi>{homeName}</bdi></li>
          <li data-side="away"><bdi>{awayName}</bdi></li>
        </ul>
      </div>

      <p className="mc-statpitch-screen" aria-live={mode === 'live' ? 'polite' : 'off'} aria-atomic="false">
        {mode === 'live'
          ? (changedLabels.length > 0
            ? <>تحدّث على الملعب: {changedLabels.join('، ')}.</>
            : 'لم يتغيّر رقم منذ القراءة السابقة.')
          : 'الأرقام المعروضة على الملعب ختامية.'}
      </p>

      {/* الفارق كمية لا حكم: لا «أفضل» ولا «يتفوق»، فالأخطاء والبطاقات أرقام. */}
      <p className="mc-note" id={noteId}>
        كل رقم يعرض قيمتي الفريقين كما أرسلهما المصدر، والشريط نسبة إلى الأعلى بين الرقمين في الصف نفسه فقط — لا درجة من 100 ولا حكم جودة:
        زيادة الأخطاء أو البطاقات أو التسلل أرقام، ليست أفضلية. المواضع مناطق تخطيطية بحسب طبيعة الرقم؛ المصدر لا يرسل إحداثيات ولا أهدافاً متوقعة.
      </p>
    </section>
  );
}
