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

/** Confirmed starting XI only; never infer starters from order, positions or sub flags. */
function sm_summary_lineups(array $data, string $eventId, string $league, string $homeId, string $awayId): ?array {
    $text = static fn($value): ?string => is_string($value) || is_int($value) ? trim((string) $value) : null;
    $header = $data['header'] ?? [];
    $competition = $header['competitions'][0] ?? [];
    if (!is_array($header) || !is_array($competition) || $league === ''
        || $eventId === '' || $homeId === '' || $awayId === '' || $homeId === $awayId
        || $text($header['id'] ?? null) !== $eventId
        || $text($header['league']['slug'] ?? null) !== $league
        || $text($competition['id'] ?? null) !== $eventId) return null;
    $expected = ['home' => $homeId, 'away' => $awayId];
    if (!is_array($competition['competitors'] ?? null) || !is_array($data['rosters'] ?? [])) return null;
    $identified = [];
    foreach (($competition['competitors'] ?? []) as $competitor) {
        if (!is_array($competitor)) return null;
        $side = $competitor['homeAway'] ?? '';
        if (!is_string($side)) return null;
        if (!isset($expected[$side]) || isset($identified[$side])
            || $text($competitor['team']['id'] ?? null) !== $expected[$side]) return null;
        $identified[$side] = true;
    }
    if (count($identified) !== 2) return null;
    $sides = ['home' => null, 'away' => null];
    $seenTeams = [];
    $seenPlayers = [];
    foreach (($data['rosters'] ?? []) as $roster) {
        if (!is_array($roster) || !is_array($roster['roster'] ?? [])) return null;
        $teamId = $text($roster['team']['id'] ?? null);
        $side = array_search($teamId, $expected, true);
        if ($side === false || isset($seenTeams[$side])) return null;
        $seenTeams[$side] = true;
        $starters = []; $substitutes = []; $valid = true;
        foreach (($roster['roster'] ?? []) as $entry) {
            if (!is_array($entry)) return null;
            $athlete = $entry['athlete'] ?? [];
            $id = $text($athlete['id'] ?? null);
            $name = $text($athlete['displayName'] ?? null);
            if ($id === null || $id === '' || isset($seenPlayers[$id])) return null;
            $seenPlayers[$id] = true;
            if ($name === null || $name === '' || !is_bool($entry['starter'] ?? null)) { $valid = false; continue; }
            $player = [
                'id' => $id, 'name' => $name, 'rating' => null,
                'shirtNumber' => $text($entry['jersey'] ?? null),
                'positionCode' => $text($entry['position']['abbreviation'] ?? null),
            ];
            if ($entry['starter']) $starters[] = $player;
            else $substitutes[] = $player;
        }
        if ($valid && count($starters) === 11) $sides[$side] = [
            'confirmed' => true, 'teamId' => $teamId,
            'formation' => $text($roster['formation'] ?? null), 'coach' => null,
            'starters' => $starters, 'substitutes' => $substitutes,
        ];
    }
    if (!$sides['home'] && !$sides['away']) return null;
    return ['provider' => 'espn', 'eventId' => $eventId] + $sides;
}
