<?php
declare(strict_types=1);
require_once __DIR__ . '/source_store.php';

/** Per-event summary, not a per-page cache. Transport is server-only and injectable in tests. */
function sm_summary_load(string $league, string $eventId, callable $transport, int $now): array {
    $file = sm_source_dir('espn-summaries') . '/' . $league . '-' . $eventId . '.json';
    return sm_source_load($file, static function () use ($transport, $eventId): array {
        $res = $transport();
        // Preserve match-center's established HTTP diagnostic codes.
        if (($res['status'] ?? 0) !== 200) return sm_source_error(
            ($res['status'] ?? 0) > 0 ? 'UPSTREAM_HTTP_' . $res['status'] : (($res['errno'] ?? 0) === 28 ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE')
        );
        $data = json_decode((string) ($res['body'] ?? ''), true);
        if (!is_array($data) || (string) ($data['header']['id'] ?? '') !== $eventId
            || !is_array($data['header']['competitions'] ?? null) || !$data['header']['competitions']) {
            return sm_source_error('UPSTREAM_INVALID_JSON');
        }
        return ['ok' => true, 'payload' => $data];
    }, static function (array $data, int $at): array {
        $event = $data['header'];
        // ESPN summary dates are on the competition, not always on the header.
        if (!isset($event['date'])) $event['date'] = $event['competitions'][0]['date'] ?? null;
        return sm_source_event_policy([$event], $at) + ['stale_ttl' => 600];
    }, $now);
}
