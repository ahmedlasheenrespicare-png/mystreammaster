<?php
/** Shared source-unit store. No HTTP input, transport, secrets or response controllers here. */
declare(strict_types=1);

const SM_SOURCE_SCHEMA = 1;

/** Resolve private storage; never accept a configured directory inside the web root. */
function sm_source_dir(string $namespace): string {
    static $base = null;
    if ($base === null) {
        $configured = trim((string) getenv('SM_DATA_DIR'));
        $candidate = $configured;
        if ($candidate !== '' && $candidate[0] === '/' && strpos($candidate, "\0") === false) {
            if (!is_dir($candidate)) @mkdir($candidate, 0700, true);
            $resolved = realpath($candidate);
            $roots = [realpath(dirname(__DIR__)), realpath($_SERVER['DOCUMENT_ROOT'] ?? dirname(__DIR__))];
            $unsafe = $resolved === false || preg_match('~(^|/)public_html(/|$)~', (string) $resolved);
            foreach ($roots as $root) {
                if ($root && ($resolved === $root || strpos((string) $resolved . '/', $root . '/') === 0)) $unsafe = true;
            }
            if (!$unsafe) $base = $resolved;
        }
        if ($base === null) {
            // Fixed text only: no configured path or upstream credential can enter logs.
            error_log($configured === '' ? 'SM_DATA_DIR_UNSET: using temporary source storage' : 'SM_DATA_DIR_UNSAFE: using temporary source storage');
            $base = rtrim(sys_get_temp_dir(), '/\\') . '/smp_source_store';
        }
    }
    $dir = $base . '/' . $namespace;
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    return $dir;
}

/** Actual transport starts, distinct from unit checks that fail before making a request. */
function sm_source_note_request(string $unit): void {
    if (preg_match('~^[a-zA-Z0-9_.\-/]+$~D', $unit)) error_log('SM_SOURCE_REQUEST unit=' . $unit . ' at=' . time());
}

function sm_source_read(string $file): ?array {
    $raw = @file_get_contents($file);
    if (!is_string($raw)) return null;
    $rec = json_decode($raw, true);
    if (is_array($rec) && !isset($rec['schema'])) {
        if (isset($rec['checked_at'], $rec['fetched_at'], $rec['events']) && is_array($rec['events'])) {
            $rec = array_merge($rec, ['schema' => SM_SOURCE_SCHEMA, 'payload' => ['events' => $rec['events']],
                'stale_ttl' => ($rec['ttl'] ?? 0) === 60 ? 600 : PHP_INT_MAX, '_legacy' => true]);
            unset($rec['events']);
        } elseif (isset($rec['storedAt'], $rec['raw']) && is_int($rec['storedAt']) && is_array($rec['raw'])) {
            $rec = ['schema' => SM_SOURCE_SCHEMA, 'checked_at' => $rec['storedAt'], 'fetched_at' => $rec['storedAt'],
                'ttl' => 120, 'frozen' => false, 'error' => null, 'payload' => $rec['raw'],
                'retry_ttl' => 60, 'stale_ttl' => 86400, '_legacy' => true];
        }
    }
    if (!is_array($rec) || ($rec['schema'] ?? null) !== SM_SOURCE_SCHEMA
        || !isset($rec['checked_at'], $rec['ttl'], $rec['frozen'])
        || !array_key_exists('fetched_at', $rec) || !array_key_exists('error', $rec)
        || !array_key_exists('payload', $rec)
        || !is_int($rec['checked_at']) || !is_int($rec['ttl']) || $rec['ttl'] < 0
        || !is_bool($rec['frozen']) || ($rec['payload'] !== null && !is_array($rec['payload']))
        || ($rec['fetched_at'] !== null && !is_int($rec['fetched_at']))
        || ($rec['error'] !== null && !is_string($rec['error']))) return null;
    return $rec;
}

function sm_source_write(string $file, array $record): bool {
    $encoded = json_encode($record, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($encoded)) return false;
    $temporary = @tempnam(dirname($file), 'write-');
    if ($temporary === false) return false;
    @chmod($temporary, 0600);
    $ok = @file_put_contents($temporary, $encoded) === strlen($encoded) && @rename($temporary, $file);
    if (!$ok) @unlink($temporary);
    return $ok;
}

/** The PR #54 round policy, also used for ESPN days and event summaries. */
function sm_source_event_policy(array $events, int $now): array {
    if (!$events) return ['ttl' => 3600, 'frozen' => false];
    $active = 0; $allDone = true; $inPlay = false; $latest = 0; $knownDates = true;
    foreach ($events as $ev) {
        $type = $ev['competitions'][0]['status']['type'] ?? $ev['status']['type'] ?? [];
        $name = $type['name'] ?? '';
        if (in_array($name, ['STATUS_POSTPONED', 'STATUS_CANCELED', 'STATUS_CANCELLED', 'STATUS_ABANDONED'], true)) continue;
        $active++;
        if (empty($type['completed'])) $allDone = false;
        if (in_array($type['state'] ?? '', ['in', 'post'], true)
            || in_array($name, ['STATUS_SUSPENDED', 'STATUS_DELAYED'], true)) $inPlay = true;
        $ts = isset($ev['date']) && is_string($ev['date']) ? strtotime($ev['date']) : false;
        if ($ts === false) $knownDates = false;
        else $latest = max($latest, $ts);
    }
    if ($active && $allDone && $knownDates && $now - $latest > 172800) return ['ttl' => 0, 'frozen' => true];
    return ['ttl' => $active && ($inPlay || $allDone) ? 60 : 900, 'frozen' => false];
}

function sm_source_due(array $rec, int $now, ?int $ttlCeiling = null): bool {
    if ($rec['checked_at'] > $now) return true;
    if ($rec['error'] === null && $rec['payload'] !== null && $rec['frozen']) return false;
    $ttl = $rec['error'] !== null ? ($rec['retry_ttl'] ?? $rec['ttl']) : $rec['ttl'];
    if ($rec['error'] === null && $ttlCeiling !== null) $ttl = min($ttl, $ttlCeiling);
    return $now - $rec['checked_at'] >= $ttl;
}

function sm_source_error(string $code, int $http = 502): array {
    // Codes only, never arbitrary exception messages or transport URLs.
    if (!preg_match('/^(?:UPSTREAM_[A-Z_]+|UPSTREAM_HTTP_\d{1,3}|DNS_LOOKUP_FAILED|HTTP_CLIENT_UNAVAILABLE|CURL_UNAVAILABLE|SOURCE_STORE_UNAVAILABLE)$/D', $code)) $code = 'UPSTREAM_UNAVAILABLE';
    return ['ok' => false, 'http' => $http, 'code' => $code, 'message' => 'تعذّر تحديث بيانات المصدر.'];
}

function sm_source_result(array $rec, int $now, string $cache = 'HIT'): array {
    $age = $rec['fetched_at'] === null ? 0 : max(0, $now - $rec['fetched_at']);
    if ($rec['error'] !== null) {
        if ($rec['payload'] === null || $age >= ($rec['stale_ttl'] ?? 600)) {
            return sm_source_error($rec['error'], $rec['error_http'] ?? 502);
        }
        $cache = 'STALE';
    }
    return ['ok' => true, 'payload' => $rec['payload'], 'cache' => $cache,
        'age' => $age, 'stale_code' => $rec['error']];
}

/**
 * Lock all units in deterministic order, re-read under lock, fetch only due units in ONE
 * batch (preserves curl_multi), persist successes AND failures before unlocking.
 * $fetch(keys) returns [key => {ok,payload}|{ok:false,code,http}].
 * $policy(payload,now) returns ttl/frozen/stale_ttl and optional retry_ttl.
 * No-cache failures are records too, so an outage cannot cause a request stampede.
 */
function sm_source_batch(array $files, callable $fetch, callable $policy, int $now, ?int $ttlCeiling = null): array {
    $ordered = $files; asort($ordered, SORT_STRING);
    $locks = []; $records = []; $due = []; $results = [];
    try {
        foreach ($ordered as $key => $file) {
            $lock = @fopen($file . '.lock', 'c');
            if ($lock === false || !@flock($lock, LOCK_EX)) {
                if (is_resource($lock)) fclose($lock);
                $results[$key] = sm_source_error('SOURCE_STORE_UNAVAILABLE', 503);
                continue;
            }
            $locks[] = $lock;
            $rec = sm_source_read($file);
            if (!empty($rec['_legacy'])) {
                unset($rec['_legacy']);
                if (!sm_source_write($file, $rec)) {
                    $results[$key] = sm_source_error('SOURCE_STORE_UNAVAILABLE', 503);
                    continue;
                }
            }
            $records[$key] = $rec;
            if ($rec !== null && !sm_source_due($rec, $now, $ttlCeiling)) $results[$key] = sm_source_result($rec, $now);
            else $due[] = $key;
        }
        if (!$due) return $results;
        try { $fetched = $fetch($due); }
        catch (Throwable $error) {
            $failure = sm_source_error($error->getMessage());
            $fetched = array_fill_keys($due, $failure);
        }
        foreach ($due as $key) {
            $res = $fetched[$key] ?? sm_source_error('UPSTREAM_NETWORK');
            $rec = $records[$key];
            if (($res['ok'] ?? false) === true && isset($res['payload']) && is_array($res['payload'])) {
                $rules = $policy($res['payload'], $now);
                $rec = array_merge(['schema' => SM_SOURCE_SCHEMA, 'checked_at' => $now,
                    'fetched_at' => $now, 'ttl' => 60, 'frozen' => false, 'error' => null,
                    'payload' => $res['payload'], 'stale_ttl' => 600], $rules);
            } else {
                $failure = sm_source_error((string) ($res['code'] ?? 'UPSTREAM_INVALID_JSON'), (int) ($res['http'] ?? 502));
                if ($rec === null) $rec = ['schema' => SM_SOURCE_SCHEMA, 'fetched_at' => null,
                    'ttl' => 60, 'frozen' => false, 'payload' => null];
                $rec['checked_at'] = $now;
                $rec['error'] = $failure['code'];
                $rec['error_http'] = $failure['http'];
            }
            // Unit outcome; SM_SOURCE_REQUEST counts transport starts, not missing-key checks.
            $unit = basename(dirname($files[$key])) . '/' . basename($files[$key]);
            if (preg_match('~^[a-zA-Z0-9_.\-/]+$~D', $unit)) {
                error_log('SM_SOURCE_FETCH unit=' . $unit . ' at=' . $now . ' code=' . ($rec['error'] ?? 'OK'));
            }
            if (!sm_source_write($files[$key], $rec)) {
                $results[$key] = sm_source_error('SOURCE_STORE_UNAVAILABLE', 503);
                continue;
            }
            $results[$key] = sm_source_result($rec, $now, 'MISS');
        }
        return $results;
    } finally {
        foreach (array_reverse($locks) as $lock) { flock($lock, LOCK_UN); fclose($lock); }
    }
}

function sm_source_load(string $file, callable $fetch, callable $policy, int $now, ?int $ttlCeiling = null): array {
    $results = sm_source_batch(['unit' => $file], static function () use ($fetch): array {
        return ['unit' => $fetch()];
    }, $policy, $now, $ttlCeiling);
    return $results['unit'];
}
