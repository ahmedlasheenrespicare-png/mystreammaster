<?php
declare(strict_types=1);
// Identity metadata is reconstructed from the probe-validated event/league/teams;
// player fields below are the exact sanitized annotation values, not mock squads.
$evidence = json_decode(file_get_contents('/app/lineups-evidence.json'), true)['annotations'];
function roster_case(array $evidence, string $id): array {
    $meta = array_values(array_filter($evidence, fn($entry) => $entry['event'] === $id && isset($entry['sides'])))[0];
    $summary = ['header' => ['id' => $id, 'league' => ['slug' => 'eng.1'],
        'competitions' => [['id' => $id, 'competitors' => $meta['competitors'], 'status' => $meta['status']]]], 'rosters' => []];
    foreach ($meta['sides'] as $team) {
        $players = [];
        foreach ($evidence as $entry) if ($entry['event'] === $id && ($entry['side'] ?? null) === $team['homeAway']) $players = $entry['players'];
        $summary['rosters'][] = ['team' => $team['team'], 'homeAway' => $team['homeAway'], 'formation' => $team['formation'],
            'roster' => array_map(fn($p) => ['athlete' => ['id' => $p[0], 'displayName' => $p[1]], 'starter' => $p[2],
                'jersey' => $p[3], 'position' => ['abbreviation' => $p[4]], 'formationPlace' => $p[5],
                'subbedIn' => $p[6], 'subbedOut' => $p[7]], $players)];
    }
    return $summary;
}
function read_xi(array $summary): ?array { return sm_summary_lineups($summary, '401879259', 'eng.1', '382', '373'); }
foreach ([['401879259', '382', '373'], ['401879262', '337', '364'], ['401879258', '361', '362']] as [$id, $home, $away]) {
    $xi = sm_summary_lineups(roster_case($evidence, $id), $id, 'eng.1', $home, $away);
    foreach (['home', 'away'] as $side) {
        check(count($xi[$side]['starters']) === 11 && count($xi[$side]['substitutes']) === 9, "$id $side: source boolean flags confirm 11+9");
        check($xi[$side]['confirmed'] === true && $xi[$side]['starters'][0]['rating'] === null, "$id $side: confirmed XI, never fabricated ratings");
    }
}
check(sm_summary_lineups(roster_case($evidence, '401879263'), '401879263', 'eng.1', '349', '366') === null, 'pregame: no explicit starters means unavailable, never infer XI');
$real = roster_case($evidence, '401879259');
$xi = read_xi($real);
check($xi['home']['starters'][0]['id'] === '217092' && $xi['home']['starters'][0]['positionCode'] === 'G', 'source goalkeeper ID and position preserved');
foreach (['id', 'league', 'competition', 'home', 'away'] as $field) {
    $bad = $real;
    if ($field === 'id') $bad['header']['id'] = 'wrong';
    if ($field === 'league') $bad['header']['league']['slug'] = 'esp.1';
    if ($field === 'competition') $bad['header']['competitions'][0]['id'] = 'wrong';
    if ($field === 'home') $bad['header']['competitions'][0]['competitors'][0]['team']['id'] = 'wrong';
    if ($field === 'away') $bad['header']['competitions'][0]['competitors'][1]['team']['id'] = 'wrong';
    check(read_xi($bad) === null, "identity mismatch $field fails closed");
}
$bad = $real; $bad['rosters'][1] = $bad['rosters'][0];
check(read_xi($bad) === null, 'duplicate team fails closed');
$bad = $real; $bad['rosters'][0]['team']['id'] = 'unrelated';
check(read_xi($bad) === null, 'unrelated roster cannot be mapped by order');
$bad = $real; $bad['rosters'][0]['roster'][1]['athlete']['id'] = $bad['rosters'][0]['roster'][0]['athlete']['id'];
check(read_xi($bad) === null, 'duplicate player within XI rejected');
$bad = $real; $bad['rosters'][1]['roster'][0]['athlete']['id'] = $bad['rosters'][0]['roster'][0]['athlete']['id'];
check(read_xi($bad) === null, 'duplicate player across opponents rejected');
foreach ([1, 'true', null] as $flag) {
    $bad = $real; foreach ($bad['rosters'] as &$r) $r['roster'][0]['starter'] = $flag; unset($r);
    check(read_xi($bad) === null, 'starter flag must be explicit boolean, not truthy');
}
foreach ([10, 12] as $count) {
    $bad = $real;
    foreach ($bad['rosters'] as &$r) { foreach ($r['roster'] as $i => &$p) $p['starter'] = $i < $count; unset($p); } unset($r);
    check(read_xi($bad) === null, "$count starters never displayed as a confirmed XI");
}
$bad = $real; $bad['rosters'] = 'malformed';
check(read_xi($bad) === null, 'malformed roster container fails closed');
$bad = $real; foreach ($bad['rosters'] as &$r) $r['roster'][0]['athlete']['displayName'] = ''; unset($r);
check(read_xi($bad) === null, 'unnamed starter never removed while still claiming eleven');
$shuffled = $real; $shuffled['rosters'] = array_reverse($shuffled['rosters']);
check(read_xi($shuffled) === $xi, 'roster order does not change home/away identity');
$partial = $real; array_pop($partial['rosters']); $one = read_xi($partial);
check(($one['home'] === null) !== ($one['away'] === null), 'one absent opponent remains explicitly null, not a fabricated squad');
