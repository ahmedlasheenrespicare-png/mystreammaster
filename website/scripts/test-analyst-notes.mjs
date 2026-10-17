import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANALYST_NOTE_MAX_NOTES,
  ANALYST_NOTE_STORAGE_PREFIX,
  ANALYST_NOTE_TAGS,
  ANALYST_NOTE_TEXT_LIMIT,
  analystExportFilename,
  analystNoteMinuteLabel,
  analystNoteStorageKey,
  analystNotesNearMinute,
  buildMatchExport,
  countAnalystNotes,
  describeAnalystNoteAnchor,
  draftAnalystNote,
  exportToJsonText,
  normalizeAnalystNote,
  normalizeAnalystTags,
  readAnalystNotes,
  removeAnalystNote,
  sortAnalystNotes,
  upsertAnalystNote,
  validateAnalystNote,
  writeAnalystNotes,
} from '../src/lib/analyst-notes.mjs';
import { normalizeEvent } from '../src/lib/match-center.mjs';

/* ==========================================================================
   دفتر ملاحظات المحلل — لا خدمة خلفية، ولا مصدر بيانات جديد
   --------------------------------------------------------------------------
   ما يُختبر هنا هو بالضبط ما لا يُغتفر إفساده: أن تُحفظ ملاحظة المحلل لمباراتِه
   هي، وألّا تُخترع لها دقيقة، وألّا تُمحى بياناته عند عطل قراءة، وألّا يتحوّل
   التصدير إلى رقم لم يرسله المصدر.
========================================================================== */

const AT = Date.parse('2026-10-17T20:00:00Z');

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, String(value)); },
    removeItem: key => { data.delete(key); },
  };
}

/** مخزن تكتب إليه القراءة الأولى ثم يرفض: حالة «حصة ممتلئة» أو محرّك خاص. */
function hostileStorage() {
  return {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('blocked'); },
  };
}

const GOAL_EVENT = normalizeEvent({
  id: 'e1', type: 'Goal', minute: 62, extraMinute: null,
  team: { name: 'Home FC', homeAway: 'home' }, player: { id: 'p1', name: 'Scorer' },
});

/* ── 1) العزل لكل مباراة ─────────────────────────────────────────────── */

test('every fixture keeps its own notebook, keyed by the stable match id', () => {
  assert.equal(analystNoteStorageKey('brentford-liverpool'), `${ANALYST_NOTE_STORAGE_PREFIX}brentford-liverpool`);
  assert.notEqual(analystNoteStorageKey('match-a'), analystNoteStorageKey('match-b'));
  assert.equal(analystNoteStorageKey('   '), null, 'a blank match id writes nothing anywhere');
  assert.equal(analystNoteStorageKey(null), null);

  const storage = fakeStorage();
  writeAnalystNotes('match-a', [draftAnalystNote({ matchId: 'match-a', text: 'ملاحظة المباراة أ' }, { at: AT }).note], storage);
  const written = writeAnalystNotes('match-b', [draftAnalystNote({ matchId: 'match-b', text: 'ملاحظة المباراة ب' }, { at: AT }).note], storage);
  assert.equal(written.ok, true);
  assert.equal(readAnalystNotes('match-a', storage).notes.length, 1);
  assert.equal(readAnalystNotes('match-b', storage).notes[0].text, 'ملاحظة المباراة ب');
  assert.equal(readAnalystNotes('match-a', storage).notes[0].text, 'ملاحظة المباراة أ');
  assert.equal(readAnalystNotes('unrelated-match', storage).status, 'empty');
});

/* ── 2) الإنشاء والفحص ───────────────────────────────────────────────── */

test('a note needs the analyst\'s own words — nothing is drafted for them', () => {
  assert.equal(draftAnalystNote({ text: '   ' }).ok, false);
  assert.match(validateAnalystNote({}).errors.text, /نص الملاحظة/);
  const tooLong = 'ن'.repeat(ANALYST_NOTE_TEXT_LIMIT + 1);
  const result = draftAnalystNote({ text: tooLong });
  assert.equal(result.ok, false, 'an over-long note is refused, not silently clipped');
  assert.match(result.errors.text, new RegExp(String(ANALYST_NOTE_TEXT_LIMIT)));
});

test('tags are the analyst\'s own: suggestions only, free text accepted, deduped and bounded', () => {
  assert.deepEqual(ANALYST_NOTE_TAGS, ['تحول سريع', 'كرة ثابتة', 'ضغط']);
  assert.deepEqual(normalizeAnalystTags(['ضغط', ' ضغط ', 'PRESSING', 'ضغط']), ['ضغط', 'PRESSING']);
  assert.equal(normalizeAnalystTags('كرة ثابتة، ضغط').length, 2, 'a comma-separated list is understood');
  assert.equal(normalizeAnalystTags(Array.from({ length: 12 }, (_, index) => `تصنيف ${index}`)).length, 6);
  assert.ok(normalizeAnalystTags(['   ']).length === 0);
  assert.ok(normalizeAnalystTags(null).length === 0);
});

test('a minute is stored as written, and an impossible one is refused not clamped', () => {
  assert.equal(validateAnalystNote({ text: 'x', anchor: 'minute', minute: '0' }).ok, true, 'minute zero is a real minute, not an absent value');
  assert.equal(validateAnalystNote({ text: 'x', anchor: 'minute' }).errors.minute !== undefined, true);
  assert.match(validateAnalystNote({ text: 'x', anchor: 'minute', minute: '400' }).errors.minute, /240/);
  assert.match(validateAnalystNote({ text: 'x', anchor: 'minute', minute: '12', extraMinute: '90' }).errors.minute, /15/);
  const drafted = draftAnalystNote({ text: 'ضغط', anchor: 'minute', minute: '62', extraMinute: '3', teamSide: 'away' }, { at: AT });
  assert.equal(drafted.ok, true);
  assert.deepEqual({ minute: drafted.note.minute, extraMinute: drafted.note.extraMinute, teamSide: drafted.note.teamSide }, { minute: 62, extraMinute: 3, teamSide: 'away' });
  assert.equal(analystNoteMinuteLabel(drafted.note), '62+3′');
  assert.equal(analystNoteMinuteLabel({ minute: null, extraMinute: null }), null, 'no minute reads as nothing, never as 0′');
});

test('linking to an event takes its minute from the event, and never invents one', () => {
  const linked = draftAnalystNote({ matchId: 'm1', text: 'من المرتدة', anchor: 'event', event: GOAL_EVENT }, { at: AT });
  assert.equal(linked.ok, true);
  assert.equal(linked.note.minute, 62);
  assert.equal(linked.note.eventId, 'e1');
  assert.equal(linked.note.eventKey, 'm1:e1');
  assert.match(linked.note.eventLabel, /62′/);
  assert.match(linked.note.eventLabel, /هدف/);

  const untimed = draftAnalystNote({ matchId: 'm1', text: 'مراجعة', anchor: 'event', event: normalizeEvent({ id: 'e9', type: 'Tactical review', minute: null }) }, { at: AT });
  assert.equal(untimed.ok, true);
  assert.equal(untimed.note.minute, null, 'the source sent no minute, so the note has none');

  const lost = draftAnalystNote({ matchId: 'm1', text: 'يتيم', anchor: 'event', event: null }, { at: AT });
  assert.equal(lost.ok, false, 'an event link with no event behind it is refused');
  const kept = draftAnalystNote({
    matchId: 'm1', text: 'تعديل لاحق', anchor: 'event', event: null,
    previousAnchor: { eventKey: 'm1:e1', eventLabel: '62′ · هدف · Scorer · المضيف', minute: 62, extraMinute: null, teamSide: 'home' },
  }, { at: AT });
  assert.equal(kept.ok, true, 'a note whose event left the current read stays editable');
  assert.equal(kept.note.eventKey, 'm1:e1');
  assert.equal(kept.note.minute, 62);
});

test('anchors are described in words a reader can trust', () => {
  const linked = draftAnalystNote({ matchId: 'm1', text: 'x', anchor: 'event', event: GOAL_EVENT }, { at: AT }).note;
  assert.match(describeAnalystNoteAnchor(linked, { homeName: 'سيتي', awayName: 'إبسويتش' }), /حدث:/);
  const byMinute = draftAnalystNote({ matchId: 'm1', text: 'x', anchor: 'minute', minute: '30', teamSide: 'home' }, { at: AT }).note;
  assert.equal(describeAnalystNoteAnchor(byMinute, { homeName: 'سيتي' }), 'الدقيقة 30′ · سيتي');
  assert.equal(describeAnalystNoteAnchor(draftAnalystNote({ text: 'x' }, { at: AT }).note), null, 'an unlinked note says nothing more');
});

test('ids are unique enough to survive a browser without randomUUID', () => {
  const ids = new Set(Array.from({ length: 200 }, () => draftAnalystNote({ text: 'ملاحظة', anchor: 'minute', minute: '10' }, { at: AT }).note.id));
  assert.equal(ids.size, 200);
  for (const id of ids) assert.match(id, /^n-/);
});

/* ── 3) القراءة من التخزين والكتابة إليه ────────────────────────────── */

test('a round trip keeps the note fields a reader needs and drops nothing', () => {
  const storage = fakeStorage();
  const note = draftAnalystNote({
    matchId: 'm1', text: 'الظهير الأيسر يخرج فيترك مساحة\nيجب التغطية', anchor: 'minute', minute: '75', tags: ['ضغط', 'كرة ثابتة'],
  }, { at: AT }).note;
  assert.equal(writeAnalystNotes('m1', [note], storage).ok, true);
  const read = readAnalystNotes('m1', storage);
  assert.equal(read.status, 'ok');
  assert.deepEqual(read.notes, [note]);
  assert.match(read.notes[0].text, /\n/);
  assert.deepEqual(read.notes[0].tags, ['ضغط', 'كرة ثابتة']);
});

test('a browser with no storage says so, and never pretends the note was kept', () => {
  assert.deepEqual(readAnalystNotes('m1', null), { notes: [], status: 'unavailable' });
  assert.deepEqual(readAnalystNotes('m1', undefined), { notes: [], status: 'unavailable' }, 'Node has no localStorage: the honest answer is "unavailable"');
  assert.deepEqual(writeAnalystNotes('m1', [], null), { ok: false, status: 'unavailable' });
  const hostile = hostileStorage();
  assert.equal(readAnalystNotes('m1', hostile).status, 'unavailable');
  assert.equal(writeAnalystNotes('m1', [draftAnalystNote({ text: 'x' }, { at: AT }).note], hostile).status, 'unwritable');
});

test('unreadable stored data is reported and left alone, not wiped on the floor', () => {
  const key = analystNoteStorageKey('m1');
  const storage = fakeStorage({ [key]: '{this is not json' });
  const read = readAnalystNotes('m1', storage);
  assert.equal(read.status, 'unreadable');
  assert.deepEqual(read.notes, []);
  assert.equal(storage.getItem(key), '{this is not json', 'reading must not destroy what it could not parse');

  const partial = fakeStorage({ [key]: JSON.stringify([{ text: 'صحيحة' }, { text: '' }, null, { noText: true }, { text: 'مكررة', id: 'dup' }, { text: 'مكررة', id: 'dup' }]) });
  const recovered = readAnalystNotes('m1', partial);
  assert.equal(recovered.status, 'ok');
  assert.deepEqual(recovered.notes.map(note => note.text), ['صحيحة', 'مكررة'], 'broken rows are skipped, duplicates by id are kept once');
});

test('a note whose body exceeds the limit cannot be smuggled in through storage', () => {
  const key = analystNoteStorageKey('m1');
  const storage = fakeStorage({ [key]: JSON.stringify([{ text: 'ن'.repeat(ANALYST_NOTE_TEXT_LIMIT + 50) }, { text: 'سليمة' }]) });
  assert.deepEqual(readAnalystNotes('m1', storage).notes.map(note => note.text), ['سليمة']);
  assert.equal(normalizeAnalystNote({ text: '' }), null);
});

test('saving an empty notebook removes the key instead of storing an empty list', () => {
  const storage = fakeStorage();
  writeAnalystNotes('m1', [draftAnalystNote({ text: 'مؤقتة' }, { at: AT }).note], storage);
  assert.equal(storage.data.size, 1);
  const result = writeAnalystNotes('m1', [], storage);
  assert.equal(result.ok, true);
  assert.equal(result.status, 'empty');
  assert.equal(storage.data.size, 0);
});

test('edits and deletes stay local to the list the analyst is looking at', () => {
  const first = draftAnalystNote({ text: 'أولى', anchor: 'minute', minute: '10' }, { at: AT }).note;
  const second = draftAnalystNote({ text: 'ثانية', anchor: 'minute', minute: '20' }, { at: AT + 1000 }).note;
  let notes = upsertAnalystNote([], first);
  notes = upsertAnalystNote(notes, second);
  assert.equal(countAnalystNotes(notes), 2);
  const edited = upsertAnalystNote(notes, { ...second, text: 'ثانية معدَّلة', updatedAt: new Date(AT + 9000).toISOString() });
  assert.equal(countAnalystNotes(edited), 2, 'an update replaces, it does not duplicate');
  assert.equal(sortAnalystNotes(edited)[0].text, 'ثانية معدَّلة');
  assert.equal(removeAnalystNote(edited, first.id).length, 1);
  assert.equal(removeAnalystNote(edited, 'not-an-id').length, 2);
  assert.equal(upsertAnalystNote(edited, null).length, 2);

  const crowded = Array.from({ length: ANALYST_NOTE_MAX_NOTES + 40 }, (_, index) => draftAnalystNote({ text: `ملاحظة ${index}`, anchor: 'minute', minute: String(index % 90) }, { at: AT + index }).note);
  const trimmed = upsertAnalystNote(crowded, draftAnalystNote({ text: 'واحدة زائدة' }, { at: AT }).note);
  assert.equal(trimmed.length, ANALYST_NOTE_MAX_NOTES, 'the cap is enforced by dropping the oldest, never by failing');
});

test('notes can be read by minute as well as by recency', () => {
  const late = draftAnalystNote({ text: 'متأخرة', anchor: 'minute', minute: '80' }, { at: AT + 5000 }).note;
  const early = draftAnalystNote({ text: 'مبكرة', anchor: 'minute', minute: '10' }, { at: AT }).note;
  const loose = draftAnalystNote({ text: 'بلا دقيقة' }, { at: AT + 1000 }).note;
  const byNewest = sortAnalystNotes([late, early, loose]).map(note => note.text);
  assert.deepEqual(byNewest, ['متأخرة', 'بلا دقيقة', 'مبكرة']);
  const byMinute = sortAnalystNotes([late, early, loose], 'minute').map(note => note.text);
  assert.deepEqual(byMinute, ['مبكرة', 'متأخرة', 'بلا دقيقة'], 'unanchored notes go last, not to minute zero');
  assert.deepEqual(analystNotesNearMinute([late, early, loose], 82, 5).map(note => note.text), ['متأخرة']);
  assert.deepEqual(analystNotesNearMinute([late, early, loose], null), []);
});

/* ── 4) التصدير ─────────────────────────────────────────────────────── */

test('the export carries what arrived and names what did not — no zeros in the gaps', () => {
  const note = draftAnalystNote({ matchId: 'm1', text: 'على الهواء', anchor: 'event', event: GOAL_EVENT, tags: ['ضغط'] }, { at: AT }).note;
  const payload = buildMatchExport({
    match: { id: 'm1', slug: 'home-away', competitionName: 'دوري المثال', season: '2026/27', round: 9, venue: 'الملعب', kickoffUtc: '2026-10-17T14:00:00Z', home: { name: 'سيتي', sourceName: 'Manchester City' }, away: { name: 'إبسويتش', sourceName: 'Ipswich Town' } },
    snapshot: {
      provider: 'espn', readAt: '2026-10-17T15:00:00Z',
      status: { code: 'live', label: 'مباشر', clock: '62:00', period: 2, completed: false },
      score: { home: 2, away: 1 },
      venue: null,
      statistics: [{ key: 'possessionPct', label: 'الاستحواذ', unit: '%', home: 58, away: null }],
      lineups: null, ratings: null, seasonComparison: null, seasonSample: null, h2h: [],
      events: [GOAL_EVENT, normalizeEvent({ id: 'd1', type: 'Start Delay', minute: 49 })],
    },
    notes: [note],
    freshnessText: 'آخر قراءة قبل دقيقة',
    at: AT,
  });

  assert.equal(payload.kind, 'stream-master.match-center.analyst-export');
  assert.equal(payload.events.count, 1, 'a stoppage never enters the export');
  assert.equal(payload.read.statistics[0].away, null, 'an absent value is exported as null, not as 0');
  assert.equal(payload.read.score.home, 2);
  assert.equal(payload.read.lineups, null);
  assert.equal(payload.notAvailableFromProvider.playerRatings, null);
  assert.equal('lineups' in payload.notAvailableFromProvider, true);
  assert.equal(payload.notAvailableFromProvider.expectedGoals, null);
  assert.equal(payload.freshness, 'آخر قراءة قبل دقيقة');
  assert.equal(payload.notes[0].text, 'على الهواء');
  assert.equal(payload.notes[0].minute, 62);
  assert.deepEqual(payload.notes[0].tags, ['ضغط']);
  assert.match(payload.privacyNote, /هذا الجهاز ومتصفحه فقط/);

  const roundTrip = JSON.parse(exportToJsonText(payload));
  assert.deepEqual(roundTrip, JSON.parse(JSON.stringify(payload)), 'the exported text is the payload itself, valid JSON');
});

test('the export filename cannot carry a path or an odd character out of the browser', () => {
  assert.equal(analystExportFilename('brentford-liverpool', AT), 'analyst-notes-brentford-liverpool-20261017-2000.json');
  const traversing = analystExportFilename('../../etc/passwd', AT);
  assert.match(traversing, /^analyst-notes-/);
  assert.doesNotMatch(traversing, /\//, 'a filename is a leaf, never a path');
  assert.match(traversing, /\.json$/);
  assert.equal(analystExportFilename(null, AT), 'analyst-notes-match-20261017-2000.json');
});
