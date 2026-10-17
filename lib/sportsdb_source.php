<?php
declare(strict_types=1);
require_once __DIR__ . '/espn_source.php';
const SPORTSDB_BASE      = 'https://www.thesportsdb.com/api/v1/json';
const ROUND_MAX          = 40;   // أقصى رقم جولة يُبحث عنه في الموسم
const ROUND_TRUNCATE_AT  = 15;   // جولة بهذا العدد أو أكثر تُعدّ مقتطعة من المصدر (UPSTREAM_TRUNCATED)
const ROUND_TTL_LIVE     = 60;   // تحديث الجولة الجارية
const ROUND_TTL_SCHEDULED = 900; // تحديث الجولة المجدولة بالكامل (NS)
const ROUND_TTL_EMPTY    = 3600; // جولة فارغة (ما بعد نهاية الموسم أو لم تُنشر بعد)
const ROUND_LEAGUES = [
    'egy.1' => 4829, // Egyptian Premier League (الدوري المصري الممتاز)
    'sau.1' => 4668, // Saudi-Arabian Pro League (دوري روشن السعودي)
];

function sportsdb_key(): string {
    $key = trim((string) getenv('SM_SPORTSDB_KEY'));
    if ($key === '') $key = trim((string) @file_get_contents(dirname(__DIR__, 2) . '/SM_SPORTSDB_KEY/key.txt'));
    return preg_match('/^[A-Za-z0-9]{1,64}$/D', $key) ? $key : '';
}

/**
 * يحوّل حدثاً واحداً من TheSportsDB إلى بنية حدث ESPN القياسية.
 */
function normalize_sportsdb_event(array $item): ?array {
    $id   = trim((string) ($item['idEvent'] ?? ''));
    $home = trim((string) ($item['strHomeTeam'] ?? ''));
    $away = trim((string) ($item['strAwayTeam'] ?? ''));
    if ($id === '' || $home === '' || $away === '') {
        return null;
    }

    $rawTs = trim((string) ($item['strTimestamp'] ?? ''));
    if ($rawTs === '') {
        $dateEvent = trim((string) ($item['dateEvent'] ?? ''));
        $strTime   = trim((string) ($item['strTime'] ?? '00:00:00'));
        if ($dateEvent === '') {
            return null;
        }
        if (preg_match('/^\d{2}:\d{2}$/', $strTime)) {
            $strTime .= ':00';
        }
        $rawTs = $dateEvent . 'T' . ($strTime !== '' ? $strTime : '00:00:00');
    }
    if (!preg_match('/(Z|[+-]\d{2}:\d{2})$/i', $rawTs)) {
        $rawTs .= 'Z';
    }
    if (strtotime($rawTs) === false) {
        return null;
    }

    $postponed = strtolower(trim((string) ($item['strPostponed'] ?? 'no'))) === 'yes';
    $rawStatus = strtoupper(trim((string) ($item['strStatus'] ?? 'NS')));

    $state     = 'pre';
    $completed = false;
    $typeName  = 'STATUS_SCHEDULED';
    $clock     = '';

    if ($postponed || in_array($rawStatus, ['PST', 'POST', 'POSTPONED'], true)) {
        $typeName = 'STATUS_POSTPONED';
    } elseif (in_array($rawStatus, ['CANC', 'CAN', 'CANCELED', 'CANCELLED'], true)) {
        $typeName = 'STATUS_CANCELED';
    } elseif (in_array($rawStatus, ['SUSP', 'SUSPENDED', 'INT'], true)) {
        $typeName = 'STATUS_SUSPENDED';
    } elseif (in_array($rawStatus, ['ABD', 'ABANDONED'], true)) {
        $typeName = 'STATUS_ABANDONED';
    } elseif (in_array($rawStatus, ['DELAY', 'DELAYED'], true)) {
        $typeName = 'STATUS_DELAYED';
    } elseif (in_array($rawStatus, ['FT', 'AET', 'PEN', 'FINISHED', 'AFTER EXTRA TIME'], true)) {
        $state     = 'post';
        $completed = true;
        $typeName  = 'STATUS_FULL_TIME';
    } elseif (in_array($rawStatus, ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'IN'], true) || preg_match('/^\d+\'?$/', $rawStatus)) {
        $state    = 'in';
        $typeName = 'STATUS_IN_PROGRESS';
        $clockMap = [
            'HT' => 'بين الشوطين',
            '1H' => 'الشوط الأول',
            '2H' => 'الشوط الثاني',
            'ET' => 'وقت إضافي',
            'BT' => 'استراحة',
            'P'  => 'ركلات ترجيح',
        ];
        $clock = $clockMap[$rawStatus] ?? (preg_match('/^\d+$/', $rawStatus) ? $rawStatus . '′' : 'مباشر');
    }

    $homeScore = isset($item['intHomeScore']) && $item['intHomeScore'] !== null && $item['intHomeScore'] !== ''
        ? (string) $item['intHomeScore']
        : null;
    $awayScore = isset($item['intAwayScore']) && $item['intAwayScore'] !== null && $item['intAwayScore'] !== ''
        ? (string) $item['intAwayScore']
        : null;

    $homeTeam = ['displayName' => $home];
    if (!empty($item['strHomeTeamBadge']) && is_string($item['strHomeTeamBadge'])) {
        $homeTeam['logo'] = $item['strHomeTeamBadge'];
    }
    $awayTeam = ['displayName' => $away];
    if (!empty($item['strAwayTeamBadge']) && is_string($item['strAwayTeamBadge'])) {
        $awayTeam['logo'] = $item['strAwayTeamBadge'];
    }

    $venue = trim((string) ($item['strVenue'] ?? ''));

    $statusObj = [
        'type' => [
            'state'       => $state,
            'completed'   => $completed,
            'name'        => $typeName,
            'shortDetail' => $clock !== '' ? $clock : $typeName,
        ],
    ];
    if ($clock !== '') {
        $statusObj['displayClock'] = $clock;
    }

    return [
        'id'           => $id,
        'date'         => $rawTs,
        'competitions' => [[
            'id'          => $id,
            'date'        => $rawTs,
            'venue'       => ['fullName' => $venue !== '' ? $venue : null],
            'status'      => $statusObj,
            'competitors' => [
                ['homeAway' => 'home', 'score' => $homeScore, 'team' => $homeTeam],
                ['homeAway' => 'away', 'score' => $awayScore, 'team' => $awayTeam],
            ],
        ]],
    ];
}

// ───────────────────────── مخزن جولات TheSportsDB ─────────────────────────
/**
 * مجلد تخزين الجولات: SM_DATA_DIR إن ضُبط، وإلا مجلد النظام المؤقت.
 * يُفضّل ضبطه خارج public_html ليبقى عبر إعادة تشغيل الخادم.
 */
function round_store_dir(): string {
    return sm_source_dir('smp_sportsdb_rounds');
}

/** موسم TheSportsDB بصيغة 2026-2027 يُحدَّد من تاريخ اليوم المطلوب (الموسم يبدأ تقريباً في يوليو). */
function season_label(string $iso): string {
    $y = (int) substr($iso, 0, 4);
    $m = (int) substr($iso, 5, 2);
    return $m >= 7 ? $y . '-' . ($y + 1) : ($y - 1) . '-' . $y;
}

/** اليوم بتوقيت UTC (Y-m-d) لحدث مُطبَّع، أو null. */
function event_utc_day(array $event): ?string {
    $date = $event['date'] ?? null;
    if (!is_string($date)) {
        return null;
    }
    $ts = strtotime($date);
    return $ts === false ? null : gmdate('Y-m-d', $ts);
}

/**
 * سياسة التحديث لجولة: فارغة، أو مجمّدة (منتهية)، أو جارية، أو مجدولة.
 * الأحداث الملغاة أو المؤجلة لا تُحسب ضمن "المنتهية" و"الجارية".
 *
 * @return array{ttl: int, frozen: bool}
 */
function round_policy(array $events, int $now): array {
    return sm_source_event_policy($events, $now);
}

/**
 * يجلب جولة واحدة من TheSportsDB (eventsround.php) ويطبّعها.
 * الجولة الفارغة (events: null) تُعاد كقائمة فارغة وليست خطأ.
 *
 * @return array{ok: true, events: list<array>}|array<string, mixed>
 */
function fetch_round(string $league, string $season, int $round, ?callable $transport = null): array {
    if (sportsdb_key() === '') return sm_source_error('UPSTREAM_KEY_MISSING', 503);
    $url = sprintf(
        '%s/%s/eventsround.php?id=%d&r=%d&s=%s',
        SPORTSDB_BASE,
        sportsdb_key(),
        ROUND_LEAGUES[$league],
        $round,
        rawurlencode($season)
    );
    $resp = $transport !== null ? $transport($url) : http_get($url, 'smp_sportsdb_rounds/' . ROUND_LEAGUES[$league] . '-' . $season . '-r' . $round . '.json');
    $transport = transport_error($resp['errno'], $resp['status'], $resp['body']);
    if ($transport !== null) {
        return $transport;
    }

    $decoded = @json_decode((string) $resp['body'], true);
    if (!is_array($decoded) || !array_key_exists('events', $decoded)) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'استجابة المصدر البديل لا تحتوي على بنية مباريات صالحة.'];
    }
    $raw = $decoded['events'] ?? [];
    if (!is_array($raw)) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_INVALID_JSON', 'message' => 'استجابة المصدر البديل لا تحتوي على قائمة مباريات صالحة.'];
    }
    if (count($raw) >= ROUND_TRUNCATE_AT) {
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_TRUNCATED', 'message' => 'الجولة المُعادة من المصدر قد تكون مقتطعة؛ رُفضت حفاظاً على دقة الجدول.'];
    }

    $events = [];
    foreach ($raw as $item) {
        if (is_array($item)) {
            $ev = normalize_sportsdb_event($item);
            if ($ev !== null) {
                $events[] = $ev;
            }
        }
    }
    return ['ok' => true, 'events' => $events];
}

/**
 * يُرجع جولة من المخزن إن كانت طازجة، وإلا يجلبها. عند تعذّر الجلب يُعاد المخزون مع رمز الخطأ.
 *
 * @return array{ok: true, events: list<array>, stale_code: ?string}|array<string, mixed>
 */
function load_round(string $league, string $season, int $round, ?callable $transport = null, ?int $now = null): array {
    $file = round_store_dir() . '/' . ROUND_LEAGUES[$league] . '-' . $season . '-r' . $round . '.json';
    $res = sm_source_load($file, static function () use ($league, $season, $round, $transport): array {
        $fetched = fetch_round($league, $season, $round, $transport);
        if (($fetched['ok'] ?? false) === true) $fetched['payload'] = ['events' => $fetched['events']];
        return $fetched;
    }, static function (array $payload, int $now): array {
        $policy = round_policy($payload['events'], $now);
        // Preserve PR #54: non-live rounds have no stale-age ceiling.
        return $policy + ['stale_ttl' => $policy['ttl'] === ROUND_TTL_LIVE ? 600 : PHP_INT_MAX];
    }, $now ?? time());
    if ($res['ok']) $res['events'] = $res['payload']['events'];
    return $res;
}

/** جولات حُمّلت في الطلب الحالي؛ تمنع تكرار قراءة الجولة نفسها أثناء البحث الثنائي. */
function load_round_memo(string $league, string $season, int $round): array {
    static $memo = [];
    $key = $league . '|' . $season . '|' . $round;
    if (!isset($memo[$key])) {
        $memo[$key] = load_round($league, $season, $round);
    }
    return $memo[$key];
}

/**
 * يُرجع مباريات يوم UTC واحد (ISO Y-m-d) من الجولة التي تغطيه، عبر بحث ثنائي على أرقام الجولات.
 * - جولة فارغة = ما بعد نهاية الموسم، فيُبحث في الأدنى.
 * - إن لم تغطِّ أي جولة اليوم فلا مباريات في ذلك اليوم.
 *
 * @return array{ok: true, events: list<array>, stale_code: ?string}|array<string, mixed>
 */
function round_day_events(string $league, string $iso): array {
    $season    = season_label($iso);
    $lo        = 1;
    $hi        = ROUND_MAX;
    $staleCode = null;
    $sourceAge = 0;

    while ($lo <= $hi) {
        $mid = intdiv($lo + $hi, 2);
        $res = load_round_memo($league, $season, $mid);
        if (($res['ok'] ?? false) !== true) {
            return $res;
        }
        $sourceAge = max($sourceAge, (int) ($res['age'] ?? 0));
        if ($staleCode === null && $res['stale_code'] !== null) {
            $staleCode = $res['stale_code'];
        }
        $events = $res['events'];
        if (count($events) === 0) {
            $hi = $mid - 1;
            continue;
        }
        $minDay = null;
        $maxDay = null;
        foreach ($events as $ev) {
            $d = event_utc_day($ev);
            if ($d === null) {
                continue;
            }
            $minDay = $minDay === null || $d < $minDay ? $d : $minDay;
            $maxDay = $maxDay === null || $d > $maxDay ? $d : $maxDay;
        }
        if ($minDay === null) {
            return ['ok' => true, 'events' => [], 'stale_code' => $staleCode, 'age' => $sourceAge];
        }
        if ($iso < $minDay) {
            $hi = $mid - 1;
        } elseif ($iso > $maxDay) {
            $lo = $mid + 1;
        } else {
            $dayEvents = array_values(array_filter($events, static fn(array $ev): bool => event_utc_day($ev) === $iso));
            return ['ok' => true, 'events' => $dayEvents, 'stale_code' => $staleCode, 'age' => $sourceAge];
        }
    }
    return ['ok' => true, 'events' => [], 'stale_code' => $staleCode, 'age' => $sourceAge];
}

