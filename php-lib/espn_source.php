<?php
declare(strict_types=1);
require_once __DIR__ . '/source_store.php';

const UPSTREAM_BASE      = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const UPSTREAM_LIMIT     = 500;  // الحد الأقصى المدعوم من ESPN دون اقتطاع صامت
const CONNECT_TIMEOUT    = 6;    // مهلة فتح الاتصال بالمصدر بالثواني
const REQUEST_TIMEOUT    = 12;   // المهلة الكلية لطلب المصدر بالثواني
const UPSTREAM_UA        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function transport_error(int $errno, int $status, ?string $body): ?array {
    if ($errno === -2) {
        return ['ok' => false, 'http' => 500, 'code' => 'HTTP_CLIENT_UNAVAILABLE', 'message' => 'وسائل الاتصال الخارجي (cURL / allow_url_fopen) غير مفعلة على الخادم.'];
    }
    if ($errno === 0 && $status > 0) {
        if ($status === 429) {
            return [
                'ok'              => false,
                'http'            => 503,
                'code'            => 'UPSTREAM_RATE_LIMITED',
                'upstream_status' => 429,
                'message'         => 'رفض المصدر الطلب مؤقتاً بسبب كثرة الطلبات (HTTP 429).',
            ];
        }

        if ($status < 200 || $status >= 300) {
            return [
                'ok'              => false,
                'http'            => $status === 503 ? 503 : 502,
                'code'            => 'UPSTREAM_HTTP_' . $status,
                'upstream_status' => $status,
                'message'         => 'استجاب المصدر برمز خطأ HTTP ' . $status . '.',
            ];
        }
    }
    if ($errno !== 0 || !is_string($body)) {
        if ($errno === 28) {
            return ['ok' => false, 'http' => 504, 'code' => 'UPSTREAM_TIMEOUT', 'message' => 'انتهت مهلة انتظار رد المصدر.'];
        }
        if ($errno === 6) {
            return ['ok' => false, 'http' => 502, 'code' => 'DNS_LOOKUP_FAILED', 'message' => 'تعذر حل اسم نطاق مصدر المباريات (DNS).'];
        }
        if ($errno === 7) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_CONNECT_FAILED', 'message' => 'رفض مصدر المباريات الاتصال أو تعذر الوصول إليه.'];
        }
        if (in_array($errno, [35, 51, 58, 60], true)) {
            return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_SSL_ERROR', 'message' => 'فشل التحقق من شهادة الأمان (SSL) مع المصدر.'];
        }
        return ['ok' => false, 'http' => 502, 'code' => 'UPSTREAM_NETWORK_ERROR', 'message' => 'تعذر إتمام الاتصال بالمصدر (cURL ' . $errno . ').'];
    }

    if ($status === 0) return sm_source_error('UPSTREAM_NETWORK');
    return null;
}

function classify_upstream_response(int $errno, int $status, ?string $body): array {
    $transport = transport_error($errno, $status, $body);
    if ($transport !== null) {
        return $transport;
    }

    $decoded = @json_decode((string) $body, true);
    if (!is_array($decoded) || !array_key_exists('events', $decoded) || !is_array($decoded['events'])) {
        return [
            'ok'      => false,
            'http'    => 502,
            'code'    => 'UPSTREAM_INVALID_JSON',
            'message' => 'استجابة المصدر لا تحتوي على قائمة مباريات صالحة.',
        ];
    }

    if (count($decoded['events']) >= UPSTREAM_LIMIT) return sm_source_error('UPSTREAM_TRUNCATED');
    return ['ok' => true, 'events' => $decoded['events']];
}

function http_get(string $url, ?string $unit = null): array {
    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        if ($ch === false) return ['errno' => -2, 'status' => 0, 'body' => null];
        if ($unit !== null) sm_source_note_request($unit);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
            CURLOPT_TIMEOUT        => REQUEST_TIMEOUT,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_ENCODING       => '',
            CURLOPT_USERAGENT      => UPSTREAM_UA,
            CURLOPT_HTTPHEADER     => $headers,
        ]);
        $body   = curl_exec($ch);
        $errno  = curl_errno($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['errno' => $errno, 'status' => $status, 'body' => is_string($body) ? $body : null];
    }
    if (filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOL)) {
        if ($unit !== null) sm_source_note_request($unit);
        $context = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'timeout'       => REQUEST_TIMEOUT,
                'ignore_errors' => true,
                'header'        => implode("\r\n", array_merge($headers, ['User-Agent: ' . UPSTREAM_UA])) . "\r\n",
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);
        $body   = @file_get_contents($url, false, $context);
        $status = 0;
        if (isset($http_response_header) && is_array($http_response_header)) {
            foreach ($http_response_header as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                }
            }
        }
        if (!is_string($body) || $status === 0) {
            return ['errno' => 7, 'status' => 0, 'body' => null];
        }
        return ['errno' => 0, 'status' => $status, 'body' => $body];
    }
    return ['errno' => -2, 'status' => 0, 'body' => null];
}

function single_day_upstream_url(string $league, string $ymd): string {
    return sprintf('%s/%s/scoreboard?dates=%s&limit=%d', UPSTREAM_BASE, rawurlencode($league), rawurlencode($ymd), UPSTREAM_LIMIT);
}

function sm_espn_fetch_days(string $league, array $days): array {
    $headers = [
        'Accept: application/json',
        'Accept-Language: en-US,en;q=0.9',
    ];
    $results = [];

    if (function_exists('curl_multi_init') && count($days) > 1) {
        $mh      = curl_multi_init();
        $handles = [];
        foreach ($days as $ymd) {
            $ch = curl_init(single_day_upstream_url($league, $ymd));
            if ($ch === false) { $results[$ymd] = sm_source_error('HTTP_CLIENT_UNAVAILABLE', 500); continue; }
            sm_source_note_request('espn-days/' . $league . '-' . $ymd . '.json');
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS      => CURLPROTO_HTTPS,
                CURLOPT_CONNECTTIMEOUT => CONNECT_TIMEOUT,
                CURLOPT_TIMEOUT        => REQUEST_TIMEOUT,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_ENCODING       => '',
                CURLOPT_USERAGENT      => UPSTREAM_UA,
                CURLOPT_HTTPHEADER     => $headers,
            ]);
            curl_multi_add_handle($mh, $ch);
            $handles[$ymd] = $ch;
        }
        $active = null;
        do {
            $mrc = curl_multi_exec($mh, $active);
            if ($active) {
                curl_multi_select($mh, 0.2);
            }
        } while ($active && $mrc === CURLM_OK);

        foreach ($handles as $ymd => $ch) {
            $body   = curl_multi_getcontent($ch);
            $errno  = curl_errno($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);
            $results[$ymd] = classify_upstream_response($errno, $status, is_string($body) ? $body : null);
        }
        curl_multi_close($mh);
    } else {
        foreach ($days as $ymd) {
            $resp = http_get(single_day_upstream_url($league, $ymd), 'espn-days/' . $league . '-' . $ymd . '.json');
            $results[$ymd] = classify_upstream_response($resp['errno'], $resp['status'], $resp['body']);
        }
    }

    return $results;
}

/** Shared league + UTC day files: scoreboard and match-center use identical keys. */
function sm_espn_days(string $league, array $days, ?callable $transport = null, ?int $now = null): array {
    $files = [];
    foreach ($days as $day) $files[$day] = sm_source_dir('espn-days') . '/' . $league . '-' . $day . '.json';
    return sm_source_batch($files, static function (array $due) use ($league, $transport): array {
        $raw = $transport !== null ? $transport($league, array_map('strval', $due)) : sm_espn_fetch_days($league, array_map('strval', $due));
        foreach ($raw as &$res) {
            if (($res['ok'] ?? false) === true) $res['payload'] = ['events' => $res['events']];
        }
        unset($res);
        return $raw;
    }, static function (array $payload, int $at): array {
        return sm_source_event_policy($payload['events'], $at) + ['stale_ttl' => 600];
    }, $now ?? time());
}
