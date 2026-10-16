<?php
/**
 * match-center.php — وسيط «مركز المباراة» عبر خادم الموقع
 * ---------------------------------------------------------------------------------
 * ملف **جديد** بموافقة صاحب المشروع (2026-10-16). لا يعدّل `scoreboard.php` ولا
 * `standings.php` ولا أي ملف قائم — البند 13 يمنع المساس بها بلا موافقة منفصلة،
 * وهي تخدم 12 مسابقة و138 اختبار متصفح اليوم.
 *
 * لماذا وسيط ولا اتصال مباشر من المتصفح؟
 *  • البند 11: «المتصفح يكلّم خادمنا وحده بروابط نسبية»، ومخبأ الخادم مشترك بين
 *    كل الزوار بدل طلب من كل زائر.
 *  • البند 11: «عدم قبول عناوين مصدر اعتباطية من الزائر» — لذلك لا يستقبل هذا
 *    الملف لا معرّف حدث ولا رابطاً، بل **سلاجاً** من قائمة مغلقة أدناه. جدول
 *    الربط (سلاج ← معرّف الحدث) ملك الخادم وحده.
 *  • مفتاح أي مصدر يحتاج مفتاحاً يبقى هنا ولا يُطبع في أي استجابة (البند 2).
 *    ESPN لا يحتاج مفتاحاً؛ ولو أُضيف API-Football فموضعه هذا الملف وحده.
 *
 * ميزانية الطلبات (البند 11) — وهي سبب بنيته:
 *  • قراءة `scoreboard` **واحدة لكل المسابقة في اليوم** تغطي المباريات الثلاث معاً
 *    (اثنتان تبدآن 14:00Z والثالثة 16:30Z)، فتُخزَّن بمفتاح المسابقة+اليوم لا
 *    بمفتاح المباراة. وهذا يقلب ثلاث طلبات إلى طلب واحد كل 45 ثانية.
 *  • قراءة `summary` التفصيلية **لا تُطلب إلا حين يمكن أن يكون فيها شيء**: حالة
 *    جارية أو منتهية. قبل البداية أثبت الفحص (تقرير §12.5) أن `lineups` و`h2h`
 *    فارغة، فطلبها إهدار محض.
 *
 * حدود معلنة (البند 2: لا نَعِد بما لا يغطيه الربط):
 *  • المؤكد من المصدر: الحالة والنتيجة ووقت المباراة والملعب والشعارات.
 *  • الأحداث: تُقرأ من `keyEvents` إن وُجدت وبنيه مُتحقَّق؛ وإلا مصفوفة فارغة
 *    فتعرض الواجهة «غير متاح». **لا تُختلق أحداث**.
 *  • مستوى الفريقين والمواجهات (المرحلة الثانية، بموافقة 2026-10-16): تُقرأ
 *    من `lastFiveGames` و`seasonseries` في `summary` — بنيتاهما مؤكدتان
 *    بمسابير P1/P3 على مباراة منتهية (`MATCH_CENTER_FINISHED_PROBE` و
 *    `MATCH_CENTER_PREMATCH_PROBE`). التجميع (W/D/L والمتوسطات) في طبقة
 *    العقد وحدها؛ هذا الوسيط يستخرج الحقول مطبّعةً فقط.
 *  • الإحصائيات والتشكيلات والتقييمات: تُرسل `null` صراحةً حتى مرحلتها
 *    المعتمدة. تقييمات اللاعبين لا يوفّرها ESPN إطلاقاً فتبقى `null`
 *    بصفة نهائية.
 */

declare(strict_types=1);

const MC_SITE_ORIGIN     = 'https://streammasterstore.com';
const MC_UPSTREAM_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
/* نفس قيم `scoreboard.php`: تحديث الصفحة كل 60 ثانية وكاش الخادم 45 ثانية،
   فتخدم دورة واحدة قراءتين. وتوحيدها مقصود — حدّان مختلفان لمصدر واحد يعنيان
   سلوكاً غير متوقع عند مقارنة الاستجابتين. */
const MC_CACHE_TTL       = 45;
const MC_STALE_TTL       = 600;
const MC_RATE_LIMIT      = 240;
const MC_RATE_WINDOW     = 60;
const MC_CONNECT_TIMEOUT = 6;
const MC_REQUEST_TIMEOUT = 12;

/**
 * جدول الربط المغلق — البند 3: «الربط بمعرّف المباراة Fixture ID لا باسم
 * الفريق ولا بوقت البداية وحده». وسببه عملي لا نظري: ثلاثة أحداث في eng.1
 * تبدأ 14:00Z يوم 2026-10-17 (منها اثنان ضمن التجربة)، فالربط بالوقت يصطدم.
 *
 * المعرّفات مؤكدة من المصدر حرفياً (تقرير §12.1 و`MATCH_CENTER_VERIFICATION`).
 */
const MC_MATCHES = [
    'manchester-city-ipswich-town' => ['event' => '401879259', 'league' => 'eng.1', 'day' => '20261017'],
    'brentford-liverpool'          => ['event' => '401879262', 'league' => 'eng.1', 'day' => '20261017'],
    'newcastle-united-aston-villa' => ['event' => '401879258', 'league' => 'eng.1', 'day' => '20261017'],
];

/* أسماء حالات ESPN التي يمكن أن تحمل أحداثاً — وما عداها لا يُطلب له `summary`
   أصلاً، لأن الفحص قبل البداية (تقرير §12.5) أثبت أن `lineups` و`h2h` فارغة
   وأن `boxscore` لا يحمل أرقام مباراة. قائمة واحدة بدل تعبير نمطي مضمّن، فلا
   يتباعد تعريفان لـ«متى نطلب التفاصيل».

   ⚠️ هذه **مفردات ESPN** لا رموزنا المطبَّعة (`live`/`halftime`/…): هذا الوسيط
   يمرّر مفردات المصدر كما هي وطبقة العقد وحدها تترجمها، فترجمتان في مكانين
   تتباعدان. وهي توازي فرعي `in` و`post` في `ESPN_STATE_MAP` بالعقد. */
const MC_DETAIL_STATUS_NAMES = [
    'STATUS_HALFTIME', 'STATUS_END_OF_FIRST_HALF', 'STATUS_IN_PLAY', 'STATUS_IN_PROGRESS',
    'STATUS_FIRST_HALF', 'STATUS_SECOND_HALF', 'STATUS_EXTRA_TIME', 'STATUS_PENALTIES',
    'STATUS_FULL_TIME', 'STATUS_FINAL', 'STATUS_AWARDED', 'STATUS_FORFEIT',
    'STATUS_SUSPENDED', 'STATUS_ABANDONED',
];

/* ───────────────────────── الترويسات و CORS ───────────────────────── */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && ($origin === MC_SITE_ORIGIN || str_ends_with($origin, '.streammasterstore.com'))) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: ' . MC_SITE_ORIGIN);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Accept, Content-Type');
header('Access-Control-Expose-Headers: X-Match-Center-Cache, X-Cache-Age, X-Diagnostic-Code');
header('X-Content-Type-Options: nosniff');
/* وسيط بيانات لا صفحة — لا يُفهرس. الفهرسة تخص صفحات المركز المرسومة مسبقاً. */
header('X-Robots-Tag: noindex, nofollow');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ───────────────────────── الاستجابات ─────────────────────────

/** فشل معلن برمز — تستهلكه طبقة النقل في الواجهة فتسمّي السبب بدل تخمينه. */
function mc_fail(int $status, string $code, string $message): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate');
    header('X-Match-Center-Cache: BYPASS');
    header('X-Diagnostic-Code: ' . $code);
    echo json_encode([
        'error'   => $code,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

function mc_send(array $payload, string $cacheState, int $age, int $maxAge, string $diagnostic = 'OK'): void {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: public, max-age=' . max(0, $maxAge) . ', stale-while-revalidate=30');
    header('X-Match-Center-Cache: ' . $cacheState);
    header('X-Cache-Age: ' . max(0, $age));
    header('X-Diagnostic-Code: ' . $diagnostic);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ───────────────────────── المخبأ المشترك ─────────────────────────
/* البند 11: «مخبأ خادم مشترك بين الزوار». ومجلد المخبأ منفصل عن مخبأ
   scoreboard.php حتى لا يتداخل ملفاهما، ونفس قواعد التنظيف. */

function mc_cache_dir(): string {
    $dir = rtrim(sys_get_temp_dir(), '/\\') . '/smp_match_center_cache';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

/** @return array{payload:string,at:int}|null */
function mc_read_cache(string $key): ?array {
    $file = mc_cache_dir() . '/' . $key . '.json';
    if (!is_file($file)) {
        return null;
    }
    $raw = @file_get_contents($file);
    if ($raw === false || $raw === '') {
        return null;
    }
    $record = @json_decode($raw, true);
    if (!is_array($record) || !isset($record['at'], $record['payload'])) {
        return null;
    }
    return ['payload' => (string) $record['payload'], 'at' => (int) $record['at']];
}

function mc_write_cache(string $key, string $payload): void {
    $file = mc_cache_dir() . '/' . $key . '.json';
    @file_put_contents($file, json_encode(['at' => time(), 'payload' => $payload], JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function mc_prune_cache(): void {
    $dir    = mc_cache_dir();
    $cutoff = time() - (MC_STALE_TTL * 2);
    foreach ((array) @glob($dir . '/*.json') as $file) {
        if (is_string($file) && is_file($file) && (int) @filemtime($file) < $cutoff) {
            @unlink($file);
        }
    }
}

function mc_rate_limit(): void {
    $ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $file = rtrim(sys_get_temp_dir(), '/\\') . '/smp_mc_rl_' . md5($ip);
    $now  = time();
    $data = ['t' => $now, 'n' => 0];
    if (is_file($file)) {
        $raw = @json_decode((string) @file_get_contents($file), true);
        if (is_array($raw) && isset($raw['t'], $raw['n']) && ($now - (int) $raw['t']) < MC_RATE_WINDOW) {
            $data = $raw;
        }
    }
    $data['n'] = (int) $data['n'] + 1;
    @file_put_contents($file, json_encode($data), LOCK_EX);
    if ($data['n'] > MC_RATE_LIMIT) {
        header('Retry-After: ' . MC_RATE_WINDOW);
        mc_fail(429, 'RATE_LIMITED', 'تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة بعد قليل.');
    }
}

// ───────────────────────── جلب المصدر ─────────────────────────

/**
 * @return array{body:?string,status:int,errno:int}
 */
function mc_fetch(string $url): array {
    if (!function_exists('curl_init')) {
        return ['body' => null, 'status' => 0, 'errno' => -1];
    }
    $ch = curl_init($url);
    if ($ch === false) {
        return ['body' => null, 'status' => 0, 'errno' => -1];
    }
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        /* حدود SSRF نفسها التي في `proxy.php` و`scoreboard.php`: https فقط، بلا
           متابعة تحويلات، وبتحقق من الشهادة ومن اسم المضيف. */
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_CONNECTTIMEOUT => MC_CONNECT_TIMEOUT,
        CURLOPT_TIMEOUT        => MC_REQUEST_TIMEOUT,
        CURLOPT_ENCODING       => '',
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Accept-Language: en-US,en;q=0.9'],
    ]);
    $body   = curl_exec($ch);
    $errno  = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);
    return [
        'body'   => is_string($body) ? $body : null,
        'status' => $status,
        'errno'  => $errno,
    ];
}

function mc_upstream_scoreboard(string $league, string $day): string {
    return sprintf(
        '%s/%s/scoreboard?dates=%s&limit=%d',
        MC_UPSTREAM_BASE,
        rawurlencode($league),
        rawurlencode($day),
        500
    );
}

function mc_upstream_summary(string $league, string $event): string {
    return sprintf('%s/%s/summary?event=%s', MC_UPSTREAM_BASE, rawurlencode($league), rawurlencode($event));
}

// ───────────────────────── تطبيع البيانات ─────────────────────────

/** رابط شعار `https://` فقط — نفس شرط `lib/matches.mjs` وطبقة العقد. */
function mc_logo(mixed $value): ?string {
    return is_string($value) && str_starts_with($value, 'https://') ? $value : null;
}

function mc_str(mixed $value): ?string {
    if (!is_string($value)) {
        return null;
    }
    $trimmed = trim($value);
    return $trimmed === '' ? null : $trimmed;
}

/** رقم من نص أو رقم — `null` عند الغياب، فلا يتحول الغائب صفراً. */
function mc_int(mixed $value): ?int {
    if (is_int($value)) {
        return $value;
    }
    if (is_string($value) && preg_match('/^\d+$/', trim($value)) === 1) {
        return (int) trim($value);
    }
    return null;
}

/**
 * يستخرج حدث المباراة المطلوب من استجابة `scoreboard`.
 *
 * البند 3: المطابقة **بمعرّف الحدث وحده**. لا باسم الفريق (يتغير بين المصادر)
 * ولا بوقت البداية (ثلاثة أحداث تشترك في 14:00Z).
 *
 * @return array<string,mixed>|null
 */
function mc_pick_event(array $data, string $eventId): ?array {
    $events = $data['events'] ?? null;
    if (!is_array($events)) {
        return null;
    }
    foreach ($events as $event) {
        if (!is_array($event)) {
            continue;
        }
        if ((string) ($event['id'] ?? '') === $eventId) {
            return $event;
        }
    }
    return null;
}

/**
 * يبني جزء الحالة والنتيجة من حدث ESPN.
 *
 * @return array{status:array<string,mixed>,score:?array{home:?int,away:?int},logos:array{home:?string,away:?string},venue:?string,competitors:array<int,array<string,mixed>>}|null
 */
function mc_read_header(array $event): ?array {
    $competition = $event['competitions'][0] ?? null;
    if (!is_array($competition)) {
        return null;
    }
    $status = $competition['status'] ?? null;
    $type   = is_array($status) ? ($status['type'] ?? null) : null;

    $home = null;
    $away = null;
    $competitors = [];
    foreach ((array) ($competition['competitors'] ?? []) as $competitor) {
        if (!is_array($competitor)) {
            continue;
        }
        $side = $competitor['homeAway'] ?? ($competitor['team']['homeAway'] ?? null);
        $team = is_array($competitor['team'] ?? null) ? $competitor['team'] : $competitor;
        $entry = [
            'homeAway' => $side === 'away' ? 'away' : 'home',
            'team'     => [
                'displayName' => mc_str($team['displayName'] ?? null) ?? mc_str($team['shortDisplayName'] ?? null),
                'logo'        => mc_logo($team['logo'] ?? null),
                'id'          => mc_str($team['id'] ?? null),
            ],
            'score' => mc_int($competitor['score'] ?? ($team['score'] ?? null)),
        ];
        $competitors[] = $entry;
        if ($entry['homeAway'] === 'home') {
            $home = $entry;
        } else {
            $away = $entry;
        }
    }

    $venue = $competition['venue']['fullName'] ?? ($event['competitions'][0]['venue']['name'] ?? null);

    return [
        /* تُمرَّر مفردات الحالة كما هي: طبقة العقد في الواجهة تملك جدول ESPN
           وحده، وهذا الوسيط لا يترجمها. ترجمتان في مكانين تتباعدان. */
        'status' => [
            'type' => [
                'name'        => mc_str(is_array($type) ? ($type['name'] ?? null) : null),
                'state'       => mc_str(is_array($type) ? ($type['state'] ?? null) : null),
                'completed'   => is_array($type) ? ($type['completed'] ?? false) === true : false,
                'shortDetail' => mc_str(is_array($type) ? ($type['shortDetail'] ?? null) : null),
                'detail'      => mc_str(is_array($type) ? ($type['detail'] ?? null) : null),
            ],
            'displayClock' => mc_str($status['displayClock'] ?? null),
            'period'       => mc_int($status['period'] ?? null),
        ],
        'score' => ($home === null || $away === null) ? null : ['home' => $home['score'], 'away' => $away['score']],
        'logos' => [
            'home' => $home['team']['logo'] ?? null,
            'away' => $away['team']['logo'] ?? null,
        ],
        'venue'       => mc_str(is_string($venue) ? $venue : null),
        'competitors' => $competitors,
    ];
}

/**
 * أحداث المباراة من `summary.keyEvents`.
 *
 * ⚠️ بنية `keyEvents` **لم تُتحقق من المصدر بعد** (تقرير §12.5): الفحص أُجري
 * قبل البداية وكانت فارغة. لذلك هذا القارئ متحفظ إلى أقصى حد — يقبل عدة أشكال
 * محتملة للحقل، ويسقط أي عنصر لا يحمل دقيقةً ونوعاً، ويعيد مصفوفة فارغة إن لم
 * يُقبل شيء. ومصفوفة فارغة تعرض «غير متاح»، وهو صادق؛ أما حدث مختلَق فليس كذلك.
 * يُؤكد هذا المسار أو يُصحَّح بعد فحص أثناء مباراة حية.
 *
 * @return array<int,array<string,mixed>>
 */
function mc_read_events(array $summary, array $competitors): array {
    $keyEvents = $summary['keyEvents'] ?? ($summary['boxscore']['keyEvents'] ?? null);
    if (!is_array($keyEvents)) {
        return [];
    }

    /* خريطة معرّف الفريق ← طرفه، لإسناد الحدث إلى مضيف أو ضيف بلا تخمين. */
    $sideOfTeam = [];
    foreach ($competitors as $competitor) {
        $id = $competitor['team']['id'] ?? null;
        if (is_string($id) && $id !== '') {
            $sideOfTeam[$id] = $competitor['homeAway'];
        }
    }

    $out = [];
    foreach ($keyEvents as $index => $item) {
        if (!is_array($item)) {
            continue;
        }
        $clockRaw = $item['clock']['displayValue'] ?? ($item['clock'] ?? ($item['time']['displayValue'] ?? null));
        $minute   = null;
        if (is_string($clockRaw) && preg_match('/(\d+)/', $clockRaw, $m) === 1) {
            $minute = (int) $m[1];
        } elseif (is_int($clockRaw)) {
            $minute = $clockRaw;
        }
        $text = mc_str($item['type']['text'] ?? ($item['type']['name'] ?? ($item['text'] ?? ($item['type'] ?? null))));
        if ($minute === null || $text === null) {
            continue; /* عنصر بلا دقيقة أو بلا نوع لا يصلح حدثاً معلناً */
        }

        $teamId = $item['team']['id'] ?? null;
        $side   = is_string($teamId) && isset($sideOfTeam[$teamId]) ? $sideOfTeam[$teamId] : null;

        $out[] = [
            /* معرّف المصدر يُحفظ: بدونه تتغير بصمة الحدث حين يتحول هدف إلى
               ملغى بعد VAR فيُعلن مرتين (البند 7). */
            'id'     => mc_str($item['id'] ?? null) ?? ('k' . $index),
            'type'   => $text,
            'minute' => $minute,
            'side'   => $side,
            'player' => [
                'id'   => mc_str($item['athlete']['id'] ?? ($item['player']['id'] ?? null)),
                'name' => mc_str($item['athlete']['displayName'] ?? ($item['player']['displayName'] ?? null)),
            ],
            'team'   => [
                'name'     => mc_str($item['team']['displayName'] ?? null),
                'homeAway' => $side,
            ],
            'detail' => mc_str($item['text'] ?? null),
        ];
    }
    return $out;
}

/**
 * مستوى الفريقين من `summary.lastFiveGames` (بنية مؤكدة بمسابير P1/P3).
 *
 * الاستخراج مطبّع فقط: التجميع والمتوسطات في طبقة العقد (`summarizeForm`)،
 * وربط كل قائمة بطرفها من هذه المباراة بمعرّف فريق المصدر لا بالاسم.
 * قائمة بلا معرّف فريق معروف تُسقط — ربطها بالترتيب تخمين.
 *
 * @return array{home:array<int,array<string,mixed>>,away:array<int,array<string,mixed>>}|null
 */
function mc_read_form(array $summary, array $competitors): ?array {
    $groups = $summary['lastFiveGames'] ?? null;
    if (!is_array($groups)) {
        return null;
    }

    $sideOfTeam = [];
    foreach ($competitors as $competitor) {
        $id = $competitor['team']['id'] ?? null;
        if (is_string($id) && $id !== '') {
            $sideOfTeam[$id] = $competitor['homeAway'];
        }
    }

    $out = ['home' => [], 'away' => []];
    foreach ($groups as $group) {
        if (!is_array($group)) {
            continue;
        }
        $teamId = $group['team']['id'] ?? null;
        if (!is_string($teamId) || !isset($sideOfTeam[$teamId])) {
            continue;
        }
        $side = $sideOfTeam[$teamId];
        foreach ((array) ($group['events'] ?? []) as $item) {
            if (!is_array($item)) {
                continue;
            }
            $out[$side][] = [
                'fixtureId'    => mc_str($item['id'] ?? null),
                'date'         => mc_str($item['gameDate'] ?? ($item['date'] ?? null)),
                'competition'  => mc_str($item['competitionName'] ?? ($item['leagueName'] ?? null)),
                'opponent'     => mc_str($item['opponent']['displayName'] ?? null),
                'homeTeamId'   => mc_str($item['homeTeamId'] ?? null),
                'awayTeamId'   => mc_str($item['awayTeamId'] ?? null),
                'homeGoals'    => mc_int($item['homeTeamScore'] ?? null),
                'awayGoals'    => mc_int($item['awayTeamScore'] ?? null),
            ];
        }
    }

    return ($out['home'] === [] && $out['away'] === []) ? null : $out;
}

/**
 * المواجهات السابقة من `summary.seasonseries` (بنية مؤكدة بمسابير P1/P3):
 * سلسلة «head-to-head» بآخر خمس مواجهات عبر البطولات. الاكتمال والنتيجة
 * من المصدر؛ والودية تُشتق من اسم البطولة كما يرسله المصدر وحده
 * (بطولة مسماة Friendly)، فلا تُخمَّن بطولة رسمية وديةً ولا العكس.
 * الملعب غير موجود في عناصر السلسلة فلا يُرسل — يبقى «غير متاح».
 *
 * @return array<int,array<string,mixed>>
 */
function mc_read_h2h(array $summary): array {
    $series = $summary['seasonseries'] ?? null;
    if (!is_array($series)) {
        return [];
    }

    $events = [];
    foreach ($series as $item) {
        if (is_array($item) && ($item['type'] ?? '') === 'head-to-head' && is_array($item['events'] ?? null)) {
            $events = $item['events'];
            break;
        }
    }
    if ($events === [] && is_array($series[0]['events'] ?? null)) {
        $events = $series[0]['events'];
    }

    $out = [];
    foreach ($events as $item) {
        if (!is_array($item)) {
            continue;
        }
        $home = null;
        $away = null;
        foreach ((array) ($item['competitors'] ?? []) as $competitor) {
            if (!is_array($competitor)) {
                continue;
            }
            $entry = [
                'name'  => mc_str($competitor['team']['displayName'] ?? null),
                'score' => mc_int($competitor['score'] ?? null),
            ];
            if (($competitor['homeAway'] ?? '') === 'away') {
                $away = $entry;
            } else {
                $home = $entry;
            }
        }
        $date = mc_str($item['date'] ?? null);
        if ($home === null || $away === null || $date === null || $home['name'] === null || $away['name'] === null) {
            continue;
        }
        $competition = mc_str($item['competitionName'] ?? null);
        $typeCompleted = is_array($item['statusType'] ?? null)
            ? (($item['statusType']['completed'] ?? false) === true)
            : false;
        $out[] = [
            'fixtureId'   => mc_str($item['id'] ?? null),
            'date'        => $date,
            'competition' => $competition,
            'year'        => null,
            'friendly'    => $competition !== null && stripos($competition, 'friend') !== false,
            'completed'   => $typeCompleted || ($item['status'] ?? '') === 'post',
            'home'        => $home['name'],
            'away'        => $away['name'],
            'homeGoals'   => $home['score'],
            'awayGoals'   => $away['score'],
        ];
    }
    return $out;
}

// ───────────────────────── الطلب ─────────────────────────

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    mc_fail(405, 'METHOD_NOT_ALLOWED', 'هذه النقطة تقبل GET فقط.');
}

$slug = mc_str($_GET['match'] ?? null);
/* البند 11: القائمة مغلقة. سلاج غير معروف يُرفض — فلا يُجلب حدث لم نؤكده،
   ولا يُستخدم هذا الوسيط وكيلًا لمصدر اعتباطي. */
if ($slug === null || !isset(MC_MATCHES[$slug])) {
    mc_fail(404, 'UNKNOWN_MATCH', 'المباراة المطلوبة ليست من مباريات مركز المباراة.');
}

$binding = MC_MATCHES[$slug];
mc_rate_limit();

$scoreboardKey = 'sb_' . $binding['league'] . '_' . $binding['day'];
$now           = time();

/* ── 1) الحالة والنتيجة: قراءة واحدة لكل المسابقة في اليوم ── */
$cached   = mc_read_cache($scoreboardKey);
$cacheHit = 'MISS';
$age      = 0;
$raw      = null;

if ($cached !== null) {
    $age = $now - $cached['at'];
    $decoded = json_decode($cached['payload'], true);
    if (is_array($decoded)) {
        $raw = $decoded;
        $cacheHit = $age <= MC_CACHE_TTL ? 'HIT' : 'STALE';
    }
}

$diagnostic = 'OK';
if ($raw === null || $cacheHit === 'STALE') {
    $result = mc_fetch(mc_upstream_scoreboard($binding['league'], $binding['day']));
    $fresh  = $result['body'] !== null && $result['status'] === 200
        ? json_decode($result['body'], true)
        : null;
    if (is_array($fresh)) {
        $raw = $fresh;
        mc_write_cache($scoreboardKey, (string) $result['body']);
        $cacheHit = 'MISS';
        $age      = 0;
        mc_prune_cache();
    } elseif ($raw !== null) {
        /* المصدر تعطل ولدينا نسخة احتياطية: تُخدم مع تشخيص صريح، ولا تُعرض
           على أنها طازجة (البند 11: لا «محدث الآن» بسبب نسخة مخزنة قديمة). */
        $cacheHit   = 'STALE';
        $diagnostic = $result['status'] > 0 ? 'UPSTREAM_HTTP_' . $result['status'] : 'UPSTREAM_UNREACHABLE';
    } else {
        mc_fail(
            502,
            $result['status'] > 0 ? 'UPSTREAM_HTTP_' . $result['status'] : 'UPSTREAM_UNREACHABLE',
            'تعذّرت قراءة المصدر، ولا توجد نسخة احتياطية صالحة.'
        );
    }
}

$event = mc_pick_event($raw, $binding['event']);
if ($event === null) {
    /* المصدر ردّ بنجاح لكن الحدث المطلوب غائب: تأجيل أو تغيير موعد أو سحب.
       لا يُخترع بديل ولا يُربط حدث آخر بنفس الوقت. */
    mc_fail(404, 'EVENT_NOT_FOUND', 'لم يعد المصدر يورد هذه المباراة في هذا التاريخ.');
}

$header = mc_read_header($event);
if ($header === null) {
    mc_fail(502, 'MALFORMED_UPSTREAM', 'استجابة المصدر لا تحمل بنية مباراة صالحة.');
}

/* ── 2) التفاصيل: لا تُطلب إلا حين يمكن أن يكون فيها شيء ── */
/* الإشارة البنيوية الأولى (`type.state` = in/post) هي المعتمدة، وقائمة الأسماء
   احتياط حين لا يرسل المصدر `state`. وكلاهما من المصدر، لا من مرور الوقت. */
$stateCode = (string) ($header['status']['type']['state'] ?? '');
$stateName = strtoupper((string) ($header['status']['type']['name'] ?? ''));
$isDetail  = in_array($stateCode, ['in', 'post'], true)
    || in_array($stateName, MC_DETAIL_STATUS_NAMES, true);

/* `summary` تُطلب دائماً (مخبأة لكل حدث): قبل البداية تحمل مستوى الفريقين
   والمواجهات (مسبار P3 أكد امتلاءهما وخلو أحداثها)، وأثناء/بعد المباراة
   تحمل الأحداث أيضاً. أما تحليل الأحداث فيبقى مشروطاً بالحالة كما كان —
   فلا تُقرأ أحداث مباراة لم تبدأ ولو وصلت. */
$events = [];
$form   = null;
$h2h    = [];
{
    $summaryKey   = 'sm_' . $binding['event'];
    $summaryCache = mc_read_cache($summaryKey);
    $summaryRaw   = null;
    if ($summaryCache !== null && ($now - $summaryCache['at']) <= MC_CACHE_TTL) {
        $decoded = json_decode($summaryCache['payload'], true);
        if (is_array($decoded)) {
            $summaryRaw = $decoded;
            $cacheHit   = $cacheHit === 'MISS' ? 'MISS' : $cacheHit;
        }
    }
    if ($summaryRaw === null) {
        $summaryResult = mc_fetch(mc_upstream_summary($binding['league'], $binding['event']));
        if ($summaryResult['body'] !== null && $summaryResult['status'] === 200) {
            $decoded = json_decode($summaryResult['body'], true);
            if (is_array($decoded)) {
                $summaryRaw = $decoded;
                mc_write_cache($summaryKey, (string) $summaryResult['body']);
            }
        }
        /* فشل `summary` لا يُسقط الصفحة: النتيجة والحالة وصلتا من `scoreboard`.
           البند 11: «فشل مباراة واحدة لا يمحو بيانات الأخرى» — وكذلك فشل
           نقطة تفصيلية لا يمحو قراءة أساسية ناجحة. */
    }
    if (is_array($summaryRaw)) {
        $form = mc_read_form($summaryRaw, $header['competitors']);
        $h2h  = mc_read_h2h($summaryRaw);
        if ($isDetail) {
            $events = mc_read_events($summaryRaw, $header['competitors']);
        }
    }
}

/* ── 3) الحمولة بالشكل المتفق عليه مع طبقة النقل ── */
$payload = [
    /* المزوّد مُعلن صراحةً: طبقة النقل ترفض حمولة بلا مزوّد، لأن قراءة
       مفردات مزوّد بجدول آخر خلطٌ لا تخمين بريء (البند 2). */
    'provider' => 'espn',
    /* هوية المباراة **إلزامية**: بلاها ترفض طبقة النقل الربط، وهذا ما يمنع
       انتقال نتيجة مباراة إلى صفحة أخرى (البند 3). */
    'match'    => $slug,
    'event'    => $binding['event'],
    'league'   => $binding['league'],
    /* وقت القراءة من خادمنا لا من المصدر: هو المرجع في رفض الاستجابات الأقدم. */
    'readAt'   => gmdate('Y-m-d\TH:i:s\Z', $now),
    'cache'    => $cacheHit,
    'status'   => $header['status'],
    'score'    => $header['score'],
    'logos'    => $header['logos'],
    'venue'    => $header['venue'],
    'events'   => $events,
    /* مستوى الفريقين والمواجهات من `summary` (بناؤهما مؤكد بمسابير
       P1/P3). غيابهما `null`/`[]` فيعرضان «غير متاح» — لا يُستكملان. */
    'form'             => $form,
    'h2h'              => $h2h,
    /* البند 2 و§12.5: هذه لم تُتحقق بنيتها من المصدر، فتُعلن غائبة صراحةً.
       `null` هنا يعني «غير متاح» في الواجهة، ولا يتحول صفراً ولا كائناً فارغاً. */
    'statistics'       => null,
    'lineups'          => null,
    'ratings'          => null, /* ESPN لا يوفّر تقييمات لاعبين إطلاقاً */
    'seasonComparison' => null,
    'seasonSample'     => null,
];

$maxAge = $cacheHit === 'HIT' ? max(0, MC_CACHE_TTL - $age) : 0;
mc_send($payload, $cacheHit, $age, $maxAge, $diagnostic);
