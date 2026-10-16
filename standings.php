<?php
/**
 * Isolated, read-only standings endpoint, approved separately from the existing
 * PHP services. No arbitrary URLs, API secrets, visitor cookies or account data.
 * The only upstream is ESPN's public standings API for these three leagues.
 * Requires PHP 7.4+ with cURL. Cache files contain public football data only.
 */
declare(strict_types=1);

const SM_ST_LEAGUES = [
    'uefa.champions' => ['uid' => 's:600~l:775', 'count' => 36],
    'eng.1' => ['uid' => 's:600~l:700', 'count' => 20],
    'esp.1' => ['uid' => 's:600~l:740', 'count' => 20],
];
const SM_ST_TTL = 120;
const SM_ST_STALE_TTL = 86400;
const SM_ST_MAX_BYTES = 524288;
const SM_ST_FIELDS = [
    'played' => 'gamesPlayed', 'wins' => 'wins', 'draws' => 'ties',
    'losses' => 'losses', 'goalsFor' => 'pointsFor',
    'goalsAgainst' => 'pointsAgainst', 'goalDifference' => 'pointDifferential',
    'points' => 'points',
];

function sm_st_number($raw, bool $signed = false): ?int
{
    if (is_string($raw)) {
        if (!preg_match('/^[+-]?\d+$/D', $raw)) return null;
        $raw = (float) $raw;
    }
    if ((!is_int($raw) && !is_float($raw)) || !is_finite((float) $raw)
        || floor((float) $raw) !== (float) $raw || abs((float) $raw) > 9007199254740991
        || (!$signed && $raw < 0)) return null;
    return (int) $raw;
}

function sm_st_groups(array $node, string $league, int $depth = 0): array
{
    if ($depth > 5) throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
    $found = [];
    if (isset($node['standings']) && is_array($node['standings'])
        && ($node['standings']['name'] ?? '') === 'overall'
        && ($league !== 'uefa.champions' || ($node['name'] ?? '') === 'League Phase')) {
        $found[] = $node['standings'];
    }
    if (isset($node['children']) && is_array($node['children'])) {
        foreach ($node['children'] as $child) {
            if (is_array($child)) $found = array_merge($found, sm_st_groups($child, $league, $depth + 1));
        }
    }
    return $found;
}

function sm_st_normalize(array $raw, string $league, int $readAt): array
{
    if (!isset(SM_ST_LEAGUES[$league]) || ($raw['uid'] ?? '') !== SM_ST_LEAGUES[$league]['uid']) {
        throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
    }
    $groups = sm_st_groups($raw, $league);
    if (count($groups) !== 1) throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
    $table = $groups[0];
    $season = sm_st_number($table['season'] ?? null);
    if ($season === null || $season < 2000 || $season > 2100
        || !isset($table['entries']) || !is_array($table['entries'])
        || count($table['entries']) !== SM_ST_LEAGUES[$league]['count']) {
        throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
    }
    $entries = []; $ranks = []; $ids = []; $hasNumbers = false;
    foreach ($table['entries'] as $entry) {
        if (!is_array($entry)) throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
        $team = $entry['team'] ?? [];
        $id = is_array($team) ? ($team['id'] ?? null) : null;
        $name = is_array($team) ? ($team['displayName'] ?? null) : null;
        if (!is_string($id) || !preg_match('/^[1-9]\d{0,11}$/D', $id)
            || !is_string($name) || trim($name) === '' || strlen($name) > 240
            || !preg_match('//u', $name) || preg_match('/[\x00-\x1f\x7f]/', $name)
            || isset($ids[$id]) || !isset($entry['stats']) || !is_array($entry['stats'])) {
            throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
        }
        $stats = [];
        foreach ($entry['stats'] as $stat) {
            if (!is_array($stat) || !isset($stat['name']) || !is_string($stat['name'])) continue;
            if (array_key_exists($stat['name'], $stats)) throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
            $stats[$stat['name']] = $stat['value'] ?? $stat['displayValue'] ?? null;
        }
        // Rank is supplied by ESPN. Never recalculate tie-breakers or points.
        $rank = sm_st_number($stats['rank'] ?? null);
        if ($rank === null || $rank < 1 || $rank > count($table['entries']) || isset($ranks[$rank])) {
            throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
        }
        $row = ['teamId' => $id, 'name' => trim($name), 'rank' => $rank];
        foreach (SM_ST_FIELDS as $field => $source) {
            $row[$field] = sm_st_number($stats[$source] ?? null, $field === 'points' || $field === 'goalDifference');
            if ($row[$field] !== null) $hasNumbers = true;
        }
        $ids[$id] = true; $ranks[$rank] = true; $entries[] = $row;
    }
    if (!$hasNumbers) throw new RuntimeException('UPSTREAM_SCHEMA_CHANGED');
    usort($entries, static function (array $a, array $b): int { return $a['rank'] <=> $b['rank']; });
    return [
        'ok' => true, 'provider' => 'ESPN', 'league' => $league, 'phase' => 'league',
        'season' => $season, 'fetchedAt' => gmdate('Y-m-d\TH:i:s\Z', $readAt),
        'stale' => false, 'entries' => $entries,
    ];
}

function sm_st_upstream(string $league): array
{
    if (!isset(SM_ST_LEAGUES[$league])) throw new RuntimeException('INVALID_LEAGUE');
    if (!function_exists('curl_init')) throw new RuntimeException('CURL_UNAVAILABLE');
    $url = 'https://site.web.api.espn.com/apis/v2/sports/soccer/' . $league . '/standings';
    $handle = curl_init($url);
    if ($handle === false) throw new RuntimeException('UPSTREAM_UNAVAILABLE');
    $body = ''; $tooLarge = false;
    curl_setopt_array($handle, [
        CURLOPT_RETURNTRANSFER => false, CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 10,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_SSL_VERIFYPEER => true, CURLOPT_SSL_VERIFYHOST => 2,
        CURLOPT_ENCODING => '', CURLOPT_USERAGENT => 'StreamMaster-Standings/1.0',
        CURLOPT_HTTPHEADER => ['Accept: application/json'],
        CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use (&$body, &$tooLarge): int {
            if (strlen($body) + strlen($chunk) > SM_ST_MAX_BYTES) { $tooLarge = true; return 0; }
            $body .= $chunk;
            return strlen($chunk);
        },
    ]);
    $ok = curl_exec($handle);
    $errno = curl_errno($handle);
    $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
    curl_close($handle);
    if ($tooLarge) throw new RuntimeException('UPSTREAM_TOO_LARGE');
    if ($ok === false) throw new RuntimeException($errno === 28 ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK');
    if ($status !== 200) throw new RuntimeException('UPSTREAM_HTTP_' . $status);
    $json = json_decode($body, true, 64);
    if (!is_array($json) || json_last_error() !== JSON_ERROR_NONE) throw new RuntimeException('UPSTREAM_INVALID_JSON');
    return $json;
}

function sm_st_cache_read(string $file, string $league, int $now): ?array
{
    if (!is_file($file) || @filesize($file) > SM_ST_MAX_BYTES + 4096) return null;
    $text = @file_get_contents($file);
    if (!is_string($text)) return null;
    $stored = json_decode($text, true, 64);
    if (!is_array($stored) || !isset($stored['storedAt'], $stored['raw'])
        || !is_int($stored['storedAt']) || !is_array($stored['raw'])
        || $stored['storedAt'] <= 0 || $stored['storedAt'] > $now
        || $now - $stored['storedAt'] > SM_ST_STALE_TTL) return null;
    try { $data = sm_st_normalize($stored['raw'], $league, $stored['storedAt']); }
    catch (Throwable $error) { return null; }
    return ['data' => $data, 'age' => $now - $stored['storedAt']];
}

function sm_st_cache_write(string $file, array $raw, int $now): void
{
    $json = json_encode(['storedAt' => $now, 'raw' => $raw], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json) || strlen($json) > SM_ST_MAX_BYTES + 4096) return;
    $temporary = @tempnam(dirname($file), 'write-');
    if ($temporary === false) return;
    @chmod($temporary, 0600);
    if (@file_put_contents($temporary, $json, LOCK_EX) === false || !@rename($temporary, $file)) @unlink($temporary);
}

function sm_st_result(?array $cached, string $code): array
{
    if ($cached !== null) {
        $body = $cached['data']; $body['stale'] = true;
        $body['cache'] = 'STALE'; $body['ageSeconds'] = $cached['age']; $body['code'] = $code;
        return ['status' => 200, 'body' => $body];
    }
    return ['status' => 503, 'body' => ['ok' => false, 'code' => $code]];
}

/** Injectable transport/cache path are PHP-only test seams, never request inputs. */
function sm_st_service(string $league, int $now, string $directory, ?callable $transport = null): array
{
    if (!isset(SM_ST_LEAGUES[$league])) return ['status' => 400, 'body' => ['ok' => false, 'code' => 'INVALID_LEAGUE']];
    $canCache = (is_dir($directory) || @mkdir($directory, 0700, true)) && is_writable($directory);
    $file = $directory . '/' . $league . '.json';
    $cached = $canCache ? sm_st_cache_read($file, $league, $now) : null;
    if ($cached !== null && $cached['age'] < SM_ST_TTL) {
        $body = $cached['data']; $body['cache'] = 'HIT'; $body['ageSeconds'] = $cached['age'];
        return ['status' => 200, 'body' => $body];
    }
    $lock = $canCache ? @fopen($directory . '/' . $league . '.lock', 'c') : false;
    if (is_resource($lock) && !flock($lock, LOCK_EX | LOCK_NB)) {
        fclose($lock);
        return sm_st_result($cached, 'REFRESH_IN_PROGRESS');
    }
    try {
        // A worker might have refreshed the cache before this lock was acquired.
        $latest = $canCache ? sm_st_cache_read($file, $league, $now) : null;
        if ($latest !== null && $latest['age'] < SM_ST_TTL) {
            $body = $latest['data']; $body['cache'] = 'HIT'; $body['ageSeconds'] = $latest['age'];
            return ['status' => 200, 'body' => $body];
        }
        $raw = ($transport ?? 'sm_st_upstream')($league);
        if (!is_array($raw)) throw new RuntimeException('UPSTREAM_INVALID_JSON');
        $data = sm_st_normalize($raw, $league, $now);
        if ($canCache) sm_st_cache_write($file, $raw, $now);
        $data['cache'] = 'MISS'; $data['ageSeconds'] = 0;
        return ['status' => 200, 'body' => $data];
    } catch (Throwable $error) {
        $code = $error->getMessage();
        // Never expose transport messages, filesystem paths or stack traces.
        if (!preg_match('/^(UPSTREAM_[A-Z_]+|UPSTREAM_HTTP_\d{1,3}|CURL_UNAVAILABLE)$/D', $code)) $code = 'UPSTREAM_UNAVAILABLE';
        return sm_st_result($cached, $code);
    } finally {
        if (is_resource($lock)) { flock($lock, LOCK_UN); fclose($lock); }
    }
}

function sm_st_http(): void
{
    @ini_set('display_errors', '0');
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && $method !== 'HEAD') {
        header('Allow: GET, HEAD');
        $result = ['status' => 405, 'body' => ['ok' => false, 'code' => 'METHOD_NOT_ALLOWED']];
    } elseif (count($_GET) !== 1 || !isset($_GET['league']) || !is_string($_GET['league']) || !isset(SM_ST_LEAGUES[$_GET['league']])) {
        $result = ['status' => 400, 'body' => ['ok' => false, 'code' => 'INVALID_LEAGUE']];
    } else {
        $result = sm_st_service($_GET['league'], time(), sys_get_temp_dir() . '/sm-standings-v1');
    }
    http_response_code($result['status']);
    header('X-Standings-Cache: ' . ($result['body']['cache'] ?? 'BYPASS'));
    header('X-Cache-Age: ' . (string) ($result['body']['ageSeconds'] ?? 0));
    header('X-Diagnostic-Code: ' . ($result['body']['code'] ?? 'OK'));
    if ($result['status'] === 503) header('Retry-After: 15');
    if ($method !== 'HEAD') echo json_encode($result['body'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

// Including this file for PHP tests does not execute the HTTP controller.
if (isset($_SERVER['SCRIPT_FILENAME']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) sm_st_http();
