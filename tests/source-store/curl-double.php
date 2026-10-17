<?php
namespace SMCurlQA;
/** No sockets: drives the production curl_multi branch with deterministic HTTP replies. */
foreach (['CURLOPT_RETURNTRANSFER','CURLOPT_FOLLOWLOCATION','CURLOPT_PROTOCOLS','CURLOPT_CONNECTTIMEOUT',
    'CURLOPT_TIMEOUT','CURLOPT_SSL_VERIFYPEER','CURLOPT_SSL_VERIFYHOST','CURLOPT_ENCODING','CURLOPT_USERAGENT',
    'CURLOPT_HTTPHEADER','CURLINFO_HTTP_CODE','CURLPROTO_HTTPS','CURLM_OK'] as $i=>$name) {
    if (!defined($name)) define($name,$i+1);
}
function curl_init(string $url): object { return (object) ['url'=>$url]; }
function curl_setopt_array(object $handle, array $options): bool { return true; }
function curl_exec(object $handle): string { return json_encode($GLOBALS['curl_fixture'] ?? ['events'=>[]]); }
function curl_errno(object $handle): int { return 0; }
function curl_getinfo(object $handle, int $key): int { return 200; }
function curl_close(object $handle): void {}
function curl_multi_init(): object { $GLOBALS['curl_batches']++; return (object) ['handles'=>[]]; }
function curl_multi_add_handle(object $multi, object $handle): void { $multi->handles[]=$handle; }
function curl_multi_exec(object $multi, &$active): int { $GLOBALS['curl_batch_sizes'][]=count($multi->handles);$active=0;return CURLM_OK; }
function curl_multi_select(object $multi, float $timeout): int { return 0; }
function curl_multi_getcontent(object $handle): string { return curl_exec($handle); }
function curl_multi_remove_handle(object $multi, object $handle): void {}
function curl_multi_close(object $multi): void {}
