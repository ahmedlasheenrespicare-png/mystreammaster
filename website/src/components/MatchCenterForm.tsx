import { formatInZone, hasDisplayableForm, type TeamForm } from '../lib/match-center.mjs';

/* ==========================================================================
   مستوى الفريق — آخر مباريات موثقة
   --------------------------------------------------------------------------
   مكوّن واحد لموضعين: على مجسم الملعب ما دامت التشكيلة لم تصدر (`pitch`)،
   وداخل لوحة «قبل المباراة» بعد أن تحل التشكيلة محله على الملعب (`panel`).
   البنية واحدة (قائمة المباريات ثم حبّات الملخص) والفرق فئات CSS فقط، حتى
   لا يختلف الرقم بين البيتين. نطاق البطولات لا يُذكر هنا بل في «توثيق ومراجعة».
========================================================================== */

const RESULT_WORD: Record<TeamForm['matches'][number]['result'], string> = { W: 'فوز', D: 'تعادل', L: 'خسارة' };

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numeric(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Date.parse(value));
}

function numberLabel(value: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 }).format(value);
}

export interface FormSideProps {
  name: string;
  form: TeamForm | null;
  variant: 'panel' | 'pitch';
  side?: 'home' | 'away';
}

export default function FormSide({ name, form, variant, side }: FormSideProps) {
  if (!hasDisplayableForm(form)) return null;
  const matches = (form?.matches ?? []).filter(item => item
    && numeric(item.goalsFor) !== null
    && numeric(item.goalsAgainst) !== null
    && (item.result === 'W' || item.result === 'D' || item.result === 'L'));
  const totals: [string, number | null][] = [
    ['مباريات موثقة', numeric(form?.played)],
    ['فوز', numeric(form?.wins)],
    ['تعادل', numeric(form?.draws)],
    ['خسارة', numeric(form?.losses)],
    ['أهداف مسجلة', numeric(form?.goalsFor)],
    ['أهداف مستقبلة', numeric(form?.goalsAgainst)],
    ['متوسط التسجيل', numeric(form?.avgGoalsFor)],
    ['متوسط الاستقبال', numeric(form?.avgGoalsAgainst)],
  ];
  const shown = totals.filter((entry): entry is [string, number] => entry[1] !== null);
  const rootClass = variant === 'pitch' ? 'mc-pitch-form' : 'mc-form-side';

  return (
    <section className={rootClass} data-side={side}>
      <h3>{name}</h3>
      {variant === 'pitch' && matches.length > 0 && (
        <p className="mc-pitch-form-sub">آخر <span className="mc-num">{numberLabel(matches.length)}</span> مباريات موثقة</p>
      )}
      {matches.length > 0 && (
        <ol className="mc-events mc-form-matches" aria-label={`مباريات موثقة لـ ${name}`}>
          {matches.map((item, index) => {
            const opponent = text(item.opponent);
            const date = validDate(item.date)
              ? formatInZone(item.date, 'Africa/Cairo', { year: 'numeric', month: '2-digit', day: '2-digit' })
              : null;
            const competition = text(item.competition);
            return (
              <li className="mc-event mc-form-match" key={item.fixtureId ?? `${item.date}-${index}`} data-r={item.result}>
                <span className="mc-event-minute mc-form-result" data-r={item.result}>{RESULT_WORD[item.result]}</span>
                <span className="mc-event-body">
                  {opponent && <span>{item.venue === 'home' ? 'ضد' : 'لدى'} {opponent}</span>}
                  <small>
                    {/* النتيجة بترتيب «له–عليه» بالاتجاه اللاتيني حتى لا تنقلب أرقامها في سياق RTL. */}
                    <span className="mc-num mc-form-score" dir="ltr">{numberLabel(item.goalsFor)}–{numberLabel(item.goalsAgainst)}</span>
                    {date && <> · {date}</>}
                    {competition && <> · {competition}</>}
                  </small>
                </span>
              </li>
            );
          })}
        </ol>
      )}
      {shown.length > 0 && (
        <dl className={variant === 'pitch' ? 'mc-pitch-form-summary' : 'mc-form-summary'}>
          {shown.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="mc-num">{numberLabel(value)}</dd></div>)}
        </dl>
      )}
    </section>
  );
}
