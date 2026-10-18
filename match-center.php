<?php
/**
 * match-center.php — وسيط «مركز المباراة» عبر خادم الموقع
 * ---------------------------------------------------------------------------------
 * وسيط أُنشئ بموافقة صاحب المشروع (2026-10-16)، ويشارك مخزن أيام ESPN
 * مع scoreboard.php عبر المكتبة المشتركة. جدول الربط MC_MATCHES يبقى مغلقاً.
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
 *  • قراءة `scoreboard` **واحدة لكل المسابقة في اليوم** تغطي كل التعريفات
 *    المرتبطة بالبطولة واليوم نفسيهما، فتُخزَّن بمفتاح المسابقة+اليوم لا
 *    بمفتاح المباراة. ومن ثم لا يتضاعف الطلب مع عدد صفحات اليوم.
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
 *  • الأحداث والإحصائيات (المرحلة 2): من `keyEvents` و`boxscore.teams`
 *    كما أكدهما مسبار P1، ولا تُقرأ إلا لحالة جارية/منتهية. التشكيلات
 *    والتقييمات تبقى `null` حتى مرحلتها؛ وتقييمات ESPN معدومة نهائياً.
 */

declare(strict_types=1);
/* مكتبة PHP المشتركة في php-lib/. المسار القديم lib/ عالق لا يقبل الكتابة عبر
   FTP (الخطأ 550 lib/.htaccess: Permission denied) وأُزيل من المستودع. المحمّل
   يعلن رمزاً واضحاً بدل fatal صامت، واسم الملف ثابت في الكود ولا يأتي من
   أي معامل طلب. */
function sm_lib(string $file): void {
  static $base = null;
  if ($base === null) {
    foreach ([__DIR__.'/php-lib'] as $c) {
      if (is_file($c.'/'.$file)) { $base = $c; break; }
    }
  }
  if ($base === null) {
    http_response_code(500);
    echo json_encode(['ok'=>false,'code'=>'PHP_LIBRARY_MISSING']);
    exit;
  }
  require_once $base.'/'.$file;
}
sm_lib('espn_source.php');
sm_lib('event_summary.php');

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
 * المعرّفات الإنجليزية الأساسية موثقة في تقرير §12.1 و`MATCH_CENTER_VERIFICATION`؛
 * والدفعات اللاحقة في `match-center-english-followup.mjs`. تعريفات esp.1 تقابل
 * خرج المستخدم المحفوظ في `match-center-spanish*.mjs`. يُفحص تطابق PHP/JS آلياً.
 */
const MC_MATCHES = [
    'manchester-city-ipswich-town' => ['event' => '401879259', 'league' => 'eng.1', 'day' => '20261017'],
    'brentford-liverpool' => ['event' => '401879262', 'league' => 'eng.1', 'day' => '20261017'],
    'newcastle-united-aston-villa' => ['event' => '401879258', 'league' => 'eng.1', 'day' => '20261017'],
    'epl-everton-vs-chelsea' => ['event' => '401878771', 'league' => 'eng.1', 'day' => '20261017'],
    'epl-fulham-vs-hull-city' => ['event' => '401878770', 'league' => 'eng.1', 'day' => '20261017'],
    'epl-afc-bournemouth-vs-sunderland' => ['event' => '401879263', 'league' => 'eng.1', 'day' => '20261018'],
    'epl-brighton-hove-albion-vs-crystal-palace' => ['event' => '401879261', 'league' => 'eng.1', 'day' => '20261018'],
    'epl-leeds-united-vs-manchester-united' => ['event' => '401879260', 'league' => 'eng.1', 'day' => '20261018'],
    'epl-nottingham-forest-vs-arsenal' => ['event' => '401878769', 'league' => 'eng.1', 'day' => '20261018'],
    'epl-tottenham-hotspur-vs-coventry-city' => ['event' => '401879257', 'league' => 'eng.1', 'day' => '20261019'],
    'epl-ipswich-town-vs-nottingham-forest' => ['event' => '401879253', 'league' => 'eng.1', 'day' => '20261023'],
    'epl-aston-villa-vs-manchester-city' => ['event' => '401879256', 'league' => 'eng.1', 'day' => '20261024'],
    'epl-arsenal-vs-everton' => ['event' => '401878768', 'league' => 'eng.1', 'day' => '20261024'],
    'epl-coventry-city-vs-fulham' => ['event' => '401879255', 'league' => 'eng.1', 'day' => '20261024'],
    'epl-chelsea-vs-tottenham-hotspur' => ['event' => '401878767', 'league' => 'eng.1', 'day' => '20261024'],
    'epl-crystal-palace-vs-newcastle-united' => ['event' => '401879254', 'league' => 'eng.1', 'day' => '20261025'],
    'epl-hull-city-vs-brentford' => ['event' => '401878766', 'league' => 'eng.1', 'day' => '20261025'],
    'epl-liverpool-vs-brighton-hove-albion' => ['event' => '401878765', 'league' => 'eng.1', 'day' => '20261025'],
    'epl-manchester-united-vs-afc-bournemouth' => ['event' => '401879252', 'league' => 'eng.1', 'day' => '20261025'],
    'epl-sunderland-vs-leeds-united' => ['event' => '401878764', 'league' => 'eng.1', 'day' => '20261025'],
    'epl-chelsea-vs-manchester-united' => ['event' => '401879248', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-afc-bournemouth-vs-leeds-united' => ['event' => '401879251', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-brentford-vs-nottingham-forest' => ['event' => '401879249', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-coventry-city-vs-sunderland' => ['event' => '401879247', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-hull-city-vs-ipswich-town' => ['event' => '401878763', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-manchester-city-vs-brighton-hove-albion' => ['event' => '401879245', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-tottenham-hotspur-vs-crystal-palace' => ['event' => '401878761', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-aston-villa-vs-fulham' => ['event' => '401879250', 'league' => 'eng.1', 'day' => '20261031'],
    'epl-liverpool-vs-arsenal' => ['event' => '401879246', 'league' => 'eng.1', 'day' => '20261101'],
    'epl-newcastle-united-vs-everton' => ['event' => '401878762', 'league' => 'eng.1', 'day' => '20261102'],
    'epl-everton-vs-coventry-city' => ['event' => '401879242', 'league' => 'eng.1', 'day' => '20261106'],
    'epl-leeds-united-vs-tottenham-hotspur' => ['event' => '401878758', 'league' => 'eng.1', 'day' => '20261107'],
    'epl-arsenal-vs-hull-city' => ['event' => '401878760', 'league' => 'eng.1', 'day' => '20261107'],
    'epl-fulham-vs-newcastle-united' => ['event' => '401879241', 'league' => 'eng.1', 'day' => '20261107'],
    'epl-nottingham-forest-vs-manchester-city' => ['event' => '401878757', 'league' => 'eng.1', 'day' => '20261107'],
    'epl-brighton-hove-albion-vs-brentford' => ['event' => '401879244', 'league' => 'eng.1', 'day' => '20261108'],
    'epl-crystal-palace-vs-liverpool' => ['event' => '401879243', 'league' => 'eng.1', 'day' => '20261108'],
    'epl-ipswich-town-vs-afc-bournemouth' => ['event' => '401878759', 'league' => 'eng.1', 'day' => '20261108'],
    'epl-sunderland-vs-chelsea' => ['event' => '401879239', 'league' => 'eng.1', 'day' => '20261108'],
    'epl-manchester-united-vs-aston-villa' => ['event' => '401879240', 'league' => 'eng.1', 'day' => '20261108'],
    'epl-manchester-city-vs-fulham' => ['event' => '401879233', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-afc-bournemouth-vs-nottingham-forest' => ['event' => '401879238', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-aston-villa-vs-sunderland' => ['event' => '401878756', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-chelsea-vs-leeds-united' => ['event' => '401879236', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-coventry-city-vs-crystal-palace' => ['event' => '401879235', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-tottenham-hotspur-vs-ipswich-town' => ['event' => '401878754', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-newcastle-united-vs-arsenal' => ['event' => '401879232', 'league' => 'eng.1', 'day' => '20261121'],
    'epl-hull-city-vs-brighton-hove-albion' => ['event' => '401879234', 'league' => 'eng.1', 'day' => '20261122'],
    'epl-liverpool-vs-manchester-united' => ['event' => '401878755', 'league' => 'eng.1', 'day' => '20261122'],
    'epl-brentford-vs-everton' => ['event' => '401879237', 'league' => 'eng.1', 'day' => '20261123'],
    'epl-nottingham-forest-vs-chelsea' => ['event' => '401879225', 'league' => 'eng.1', 'day' => '20261127'],
    'epl-leeds-united-vs-coventry-city' => ['event' => '401879227', 'league' => 'eng.1', 'day' => '20261128'],
    'epl-manchester-united-vs-brentford' => ['event' => '401879226', 'league' => 'eng.1', 'day' => '20261128'],
    'epl-ipswich-town-vs-aston-villa' => ['event' => '401878752', 'league' => 'eng.1', 'day' => '20261128'],
    'epl-everton-vs-liverpool' => ['event' => '401879229', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-brighton-hove-albion-vs-newcastle-united' => ['event' => '401879231', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-crystal-palace-vs-hull-city' => ['event' => '401879230', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-fulham-vs-afc-bournemouth' => ['event' => '401879228', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-sunderland-vs-tottenham-hotspur' => ['event' => '401879224', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-arsenal-vs-manchester-city' => ['event' => '401878753', 'league' => 'eng.1', 'day' => '20261129'],
    'epl-afc-bournemouth-vs-brighton-hove-albion' => ['event' => '401879223', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-aston-villa-vs-everton' => ['event' => '401878751', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-brentford-vs-arsenal' => ['event' => '401878750', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-chelsea-vs-crystal-palace' => ['event' => '401879222', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-coventry-city-vs-ipswich-town' => ['event' => '401879221', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-hull-city-vs-nottingham-forest' => ['event' => '401879220', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-liverpool-vs-sunderland' => ['event' => '401879219', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-manchester-city-vs-leeds-united' => ['event' => '401879218', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-newcastle-united-vs-manchester-united' => ['event' => '401879217', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-tottenham-hotspur-vs-fulham' => ['event' => '401878749', 'league' => 'eng.1', 'day' => '20261202'],
    'epl-afc-bournemouth-vs-hull-city' => ['event' => '401879216', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-aston-villa-vs-crystal-palace' => ['event' => '401879215', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-brentford-vs-manchester-city' => ['event' => '401879214', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-chelsea-vs-liverpool' => ['event' => '401879213', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-everton-vs-fulham' => ['event' => '401879212', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-leeds-united-vs-ipswich-town' => ['event' => '401879211', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-manchester-united-vs-coventry-city' => ['event' => '401879210', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-newcastle-united-vs-sunderland' => ['event' => '401878748', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-nottingham-forest-vs-brighton-hove-albion' => ['event' => '401878747', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-tottenham-hotspur-vs-arsenal' => ['event' => '401879209', 'league' => 'eng.1', 'day' => '20261205'],
    'epl-arsenal-vs-afc-bournemouth' => ['event' => '401878746', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-brighton-hove-albion-vs-everton' => ['event' => '401878745', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-coventry-city-vs-aston-villa' => ['event' => '401879208', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-crystal-palace-vs-manchester-united' => ['event' => '401879207', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-fulham-vs-brentford' => ['event' => '401879206', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-hull-city-vs-tottenham-hotspur' => ['event' => '401879205', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-ipswich-town-vs-newcastle-united' => ['event' => '401878744', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-liverpool-vs-leeds-united' => ['event' => '401878743', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-manchester-city-vs-chelsea' => ['event' => '401878742', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-sunderland-vs-nottingham-forest' => ['event' => '401878741', 'league' => 'eng.1', 'day' => '20261212'],
    'epl-afc-bournemouth-vs-coventry-city' => ['event' => '401878740', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-arsenal-vs-manchester-united' => ['event' => '401879204', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-brentford-vs-newcastle-united' => ['event' => '401879203', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-brighton-hove-albion-vs-ipswich-town' => ['event' => '401878739', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-chelsea-vs-aston-villa' => ['event' => '401879202', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-leeds-united-vs-fulham' => ['event' => '401879201', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-liverpool-vs-tottenham-hotspur' => ['event' => '401879200', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-manchester-city-vs-hull-city' => ['event' => '401879199', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-nottingham-forest-vs-everton' => ['event' => '401879198', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-sunderland-vs-crystal-palace' => ['event' => '401878738', 'league' => 'eng.1', 'day' => '20261219'],
    'epl-aston-villa-vs-leeds-united' => ['event' => '401878737', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-everton-vs-sunderland' => ['event' => '401879197', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-fulham-vs-brighton-hove-albion' => ['event' => '401878734', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-ipswich-town-vs-brentford' => ['event' => '401879196', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-tottenham-hotspur-vs-afc-bournemouth' => ['event' => '401878731', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-hull-city-vs-liverpool' => ['event' => '401878733', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-newcastle-united-vs-manchester-city' => ['event' => '401878732', 'league' => 'eng.1', 'day' => '20261226'],
    'epl-coventry-city-vs-chelsea' => ['event' => '401878736', 'league' => 'eng.1', 'day' => '20261227'],
    'epl-manchester-united-vs-nottingham-forest' => ['event' => '401879195', 'league' => 'eng.1', 'day' => '20261227'],
    'epl-crystal-palace-vs-arsenal' => ['event' => '401878735', 'league' => 'eng.1', 'day' => '20261227'],
    'epl-hull-city-vs-leeds-united' => ['event' => '401879190', 'league' => 'eng.1', 'day' => '20261229'],
    'epl-tottenham-hotspur-vs-brighton-hove-albion' => ['event' => '401879186', 'league' => 'eng.1', 'day' => '20261229'],
    'epl-everton-vs-manchester-city' => ['event' => '401879192', 'league' => 'eng.1', 'day' => '20261229'],
    'epl-coventry-city-vs-brentford' => ['event' => '401878730', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-crystal-palace-vs-afc-bournemouth' => ['event' => '401879193', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-fulham-vs-arsenal' => ['event' => '401879191', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-manchester-united-vs-sunderland' => ['event' => '401879188', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-newcastle-united-vs-nottingham-forest' => ['event' => '401879187', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-aston-villa-vs-liverpool' => ['event' => '401879194', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-ipswich-town-vs-chelsea' => ['event' => '401879189', 'league' => 'eng.1', 'day' => '20261230'],
    'epl-leeds-united-vs-everton' => ['event' => '401879182', 'league' => 'eng.1', 'day' => '20270101'],
    'epl-brighton-hove-albion-vs-manchester-united' => ['event' => '401878728', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-arsenal-vs-ipswich-town' => ['event' => '401879185', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-brentford-vs-crystal-palace' => ['event' => '401879184', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-liverpool-vs-coventry-city' => ['event' => '401879181', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-nottingham-forest-vs-fulham' => ['event' => '401879179', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-sunderland-vs-hull-city' => ['event' => '401879178', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-afc-bournemouth-vs-aston-villa' => ['event' => '401878729', 'league' => 'eng.1', 'day' => '20270102'],
    'epl-chelsea-vs-newcastle-united' => ['event' => '401879183', 'league' => 'eng.1', 'day' => '20270103'],
    'epl-manchester-city-vs-tottenham-hotspur' => ['event' => '401879180', 'league' => 'eng.1', 'day' => '20270103'],
    'epl-arsenal-vs-brentford' => ['event' => '401879177', 'league' => 'eng.1', 'day' => '20270105'],
    'epl-brighton-hove-albion-vs-afc-bournemouth' => ['event' => '401879176', 'league' => 'eng.1', 'day' => '20270105'],
    'epl-everton-vs-aston-villa' => ['event' => '401879174', 'league' => 'eng.1', 'day' => '20270105'],
    'epl-nottingham-forest-vs-hull-city' => ['event' => '401879169', 'league' => 'eng.1', 'day' => '20270105'],
    'epl-sunderland-vs-liverpool' => ['event' => '401878727', 'league' => 'eng.1', 'day' => '20270105'],
    'epl-crystal-palace-vs-chelsea' => ['event' => '401879175', 'league' => 'eng.1', 'day' => '20270106'],
    'epl-fulham-vs-tottenham-hotspur' => ['event' => '401879173', 'league' => 'eng.1', 'day' => '20270106'],
    'epl-ipswich-town-vs-coventry-city' => ['event' => '401879172', 'league' => 'eng.1', 'day' => '20270106'],
    'epl-leeds-united-vs-manchester-city' => ['event' => '401879171', 'league' => 'eng.1', 'day' => '20270106'],
    'epl-manchester-united-vs-newcastle-united' => ['event' => '401879170', 'league' => 'eng.1', 'day' => '20270107'],
    'epl-afc-bournemouth-vs-ipswich-town' => ['event' => '401878726', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-aston-villa-vs-manchester-united' => ['event' => '401878725', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-brentford-vs-brighton-hove-albion' => ['event' => '401879168', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-chelsea-vs-sunderland' => ['event' => '401879167', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-coventry-city-vs-everton' => ['event' => '401878724', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-hull-city-vs-arsenal' => ['event' => '401878723', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-liverpool-vs-crystal-palace' => ['event' => '401879166', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-manchester-city-vs-nottingham-forest' => ['event' => '401878722', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-newcastle-united-vs-fulham' => ['event' => '401878721', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-tottenham-hotspur-vs-leeds-united' => ['event' => '401879165', 'league' => 'eng.1', 'day' => '20270116'],
    'epl-arsenal-vs-newcastle-united' => ['event' => '401878720', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-brighton-hove-albion-vs-manchester-city' => ['event' => '401879164', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-crystal-palace-vs-tottenham-hotspur' => ['event' => '401879163', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-everton-vs-brentford' => ['event' => '401879162', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-fulham-vs-aston-villa' => ['event' => '401878719', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-ipswich-town-vs-hull-city' => ['event' => '401879161', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-leeds-united-vs-chelsea' => ['event' => '401879160', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-manchester-united-vs-liverpool' => ['event' => '401878718', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-nottingham-forest-vs-afc-bournemouth' => ['event' => '401878717', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-sunderland-vs-coventry-city' => ['event' => '401879159', 'league' => 'eng.1', 'day' => '20270123'],
    'epl-afc-bournemouth-vs-fulham' => ['event' => '401879158', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-aston-villa-vs-ipswich-town' => ['event' => '401878716', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-brentford-vs-manchester-united' => ['event' => '401878715', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-chelsea-vs-nottingham-forest' => ['event' => '401878714', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-coventry-city-vs-leeds-united' => ['event' => '401879157', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-hull-city-vs-crystal-palace' => ['event' => '401879156', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-liverpool-vs-everton' => ['event' => '401879155', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-manchester-city-vs-arsenal' => ['event' => '401879154', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-newcastle-united-vs-brighton-hove-albion' => ['event' => '401878713', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-tottenham-hotspur-vs-sunderland' => ['event' => '401879153', 'league' => 'eng.1', 'day' => '20270130'],
    'epl-arsenal-vs-liverpool' => ['event' => '401878712', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-brighton-hove-albion-vs-hull-city' => ['event' => '401878711', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-crystal-palace-vs-coventry-city' => ['event' => '401879152', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-everton-vs-newcastle-united' => ['event' => '401879151', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-fulham-vs-manchester-city' => ['event' => '401879150', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-ipswich-town-vs-tottenham-hotspur' => ['event' => '401879149', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-leeds-united-vs-afc-bournemouth' => ['event' => '401878710', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-manchester-united-vs-chelsea' => ['event' => '401879148', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-nottingham-forest-vs-brentford' => ['event' => '401879147', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-sunderland-vs-aston-villa' => ['event' => '401878709', 'league' => 'eng.1', 'day' => '20270206'],
    'epl-aston-villa-vs-afc-bournemouth' => ['event' => '401879146', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-coventry-city-vs-liverpool' => ['event' => '401879145', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-crystal-palace-vs-brentford' => ['event' => '401878708', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-everton-vs-leeds-united' => ['event' => '401878707', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-fulham-vs-nottingham-forest' => ['event' => '401879144', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-hull-city-vs-sunderland' => ['event' => '401879143', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-ipswich-town-vs-arsenal' => ['event' => '401878706', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-manchester-united-vs-brighton-hove-albion' => ['event' => '401879142', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-newcastle-united-vs-chelsea' => ['event' => '401879141', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-tottenham-hotspur-vs-manchester-city' => ['event' => '401879140', 'league' => 'eng.1', 'day' => '20270210'],
    'epl-afc-bournemouth-vs-crystal-palace' => ['event' => '401879139', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-arsenal-vs-fulham' => ['event' => '401878705', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-brentford-vs-coventry-city' => ['event' => '401879138', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-brighton-hove-albion-vs-tottenham-hotspur' => ['event' => '401879137', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-chelsea-vs-ipswich-town' => ['event' => '401878704', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-leeds-united-vs-aston-villa' => ['event' => '401879136', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-liverpool-vs-hull-city' => ['event' => '401878703', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-manchester-city-vs-newcastle-united' => ['event' => '401879135', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-nottingham-forest-vs-manchester-united' => ['event' => '401879134', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-sunderland-vs-everton' => ['event' => '401878702', 'league' => 'eng.1', 'day' => '20270220'],
    'epl-aston-villa-vs-chelsea' => ['event' => '401879133', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-coventry-city-vs-afc-bournemouth' => ['event' => '401879132', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-crystal-palace-vs-sunderland' => ['event' => '401878701', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-everton-vs-nottingham-forest' => ['event' => '401878700', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-fulham-vs-leeds-united' => ['event' => '401878699', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-hull-city-vs-manchester-city' => ['event' => '401878698', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-ipswich-town-vs-brighton-hove-albion' => ['event' => '401879131', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-manchester-united-vs-arsenal' => ['event' => '401878697', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-newcastle-united-vs-brentford' => ['event' => '401879130', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-tottenham-hotspur-vs-liverpool' => ['event' => '401879129', 'league' => 'eng.1', 'day' => '20270227'],
    'epl-afc-bournemouth-vs-tottenham-hotspur' => ['event' => '401879128', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-arsenal-vs-crystal-palace' => ['event' => '401878696', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-brentford-vs-ipswich-town' => ['event' => '401879127', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-brighton-hove-albion-vs-fulham' => ['event' => '401878695', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-chelsea-vs-coventry-city' => ['event' => '401879126', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-leeds-united-vs-hull-city' => ['event' => '401878694', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-liverpool-vs-aston-villa' => ['event' => '401879125', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-manchester-city-vs-everton' => ['event' => '401879124', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-nottingham-forest-vs-newcastle-united' => ['event' => '401879123', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-sunderland-vs-manchester-united' => ['event' => '401879122', 'league' => 'eng.1', 'day' => '20270303'],
    'epl-afc-bournemouth-vs-newcastle-united' => ['event' => '401879121', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-aston-villa-vs-hull-city' => ['event' => '401879120', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-chelsea-vs-arsenal' => ['event' => '401878693', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-coventry-city-vs-manchester-city' => ['event' => '401878692', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-crystal-palace-vs-fulham' => ['event' => '401878691', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-leeds-united-vs-brighton-hove-albion' => ['event' => '401879119', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-liverpool-vs-ipswich-town' => ['event' => '401878690', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-manchester-united-vs-everton' => ['event' => '401879118', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-sunderland-vs-brentford' => ['event' => '401879117', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-tottenham-hotspur-vs-nottingham-forest' => ['event' => '401879116', 'league' => 'eng.1', 'day' => '20270313'],
    'epl-arsenal-vs-sunderland' => ['event' => '401879115', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-brentford-vs-afc-bournemouth' => ['event' => '401879114', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-brighton-hove-albion-vs-coventry-city' => ['event' => '401879113', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-everton-vs-tottenham-hotspur' => ['event' => '401879112', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-fulham-vs-liverpool' => ['event' => '401879111', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-hull-city-vs-chelsea' => ['event' => '401879110', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-ipswich-town-vs-crystal-palace' => ['event' => '401879109', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-manchester-city-vs-manchester-united' => ['event' => '401879108', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-newcastle-united-vs-leeds-united' => ['event' => '401879107', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-nottingham-forest-vs-aston-villa' => ['event' => '401878689', 'league' => 'eng.1', 'day' => '20270320'],
    'epl-afc-bournemouth-vs-manchester-city' => ['event' => '401879106', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-aston-villa-vs-brighton-hove-albion' => ['event' => '401879105', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-chelsea-vs-fulham' => ['event' => '401879104', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-coventry-city-vs-arsenal' => ['event' => '401879103', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-crystal-palace-vs-everton' => ['event' => '401879102', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-leeds-united-vs-nottingham-forest' => ['event' => '401878688', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-liverpool-vs-newcastle-united' => ['event' => '401879101', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-manchester-united-vs-hull-city' => ['event' => '401879100', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-sunderland-vs-ipswich-town' => ['event' => '401878687', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-tottenham-hotspur-vs-brentford' => ['event' => '401879099', 'league' => 'eng.1', 'day' => '20270410'],
    'epl-arsenal-vs-aston-villa' => ['event' => '401878686', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-brentford-vs-leeds-united' => ['event' => '401879098', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-brighton-hove-albion-vs-chelsea' => ['event' => '401878685', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-everton-vs-afc-bournemouth' => ['event' => '401878684', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-fulham-vs-sunderland' => ['event' => '401879097', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-hull-city-vs-coventry-city' => ['event' => '401878683', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-ipswich-town-vs-manchester-united' => ['event' => '401879096', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-manchester-city-vs-crystal-palace' => ['event' => '401879095', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-newcastle-united-vs-tottenham-hotspur' => ['event' => '401878682', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-nottingham-forest-vs-liverpool' => ['event' => '401878681', 'league' => 'eng.1', 'day' => '20270417'],
    'epl-afc-bournemouth-vs-arsenal' => ['event' => '401878680', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-aston-villa-vs-coventry-city' => ['event' => '401878679', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-brentford-vs-fulham' => ['event' => '401878678', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-chelsea-vs-manchester-city' => ['event' => '401879094', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-everton-vs-brighton-hove-albion' => ['event' => '401879093', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-leeds-united-vs-liverpool' => ['event' => '401879092', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-manchester-united-vs-crystal-palace' => ['event' => '401879091', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-newcastle-united-vs-ipswich-town' => ['event' => '401879090', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-nottingham-forest-vs-sunderland' => ['event' => '401879089', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-tottenham-hotspur-vs-hull-city' => ['event' => '401878677', 'league' => 'eng.1', 'day' => '20270424'],
    'epl-arsenal-vs-tottenham-hotspur' => ['event' => '401878676', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-brighton-hove-albion-vs-nottingham-forest' => ['event' => '401879088', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-coventry-city-vs-manchester-united' => ['event' => '401878675', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-crystal-palace-vs-aston-villa' => ['event' => '401879087', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-fulham-vs-everton' => ['event' => '401879086', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-hull-city-vs-afc-bournemouth' => ['event' => '401879085', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-ipswich-town-vs-leeds-united' => ['event' => '401879084', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-liverpool-vs-chelsea' => ['event' => '401878674', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-manchester-city-vs-brentford' => ['event' => '401879083', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-sunderland-vs-newcastle-united' => ['event' => '401878673', 'league' => 'eng.1', 'day' => '20270501'],
    'epl-afc-bournemouth-vs-manchester-united' => ['event' => '401878672', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-brentford-vs-aston-villa' => ['event' => '401879082', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-brighton-hove-albion-vs-sunderland' => ['event' => '401878671', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-everton-vs-hull-city' => ['event' => '401878670', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-fulham-vs-ipswich-town' => ['event' => '401878669', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-leeds-united-vs-arsenal' => ['event' => '401879081', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-manchester-city-vs-liverpool' => ['event' => '401878668', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-newcastle-united-vs-coventry-city' => ['event' => '401879080', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-nottingham-forest-vs-crystal-palace' => ['event' => '401878667', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-tottenham-hotspur-vs-chelsea' => ['event' => '401878666', 'league' => 'eng.1', 'day' => '20270508'],
    'epl-arsenal-vs-nottingham-forest' => ['event' => '401879079', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-aston-villa-vs-newcastle-united' => ['event' => '401878665', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-chelsea-vs-everton' => ['event' => '401879078', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-coventry-city-vs-tottenham-hotspur' => ['event' => '401879077', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-crystal-palace-vs-brighton-hove-albion' => ['event' => '401878664', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-hull-city-vs-fulham' => ['event' => '401879076', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-ipswich-town-vs-manchester-city' => ['event' => '401879075', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-liverpool-vs-brentford' => ['event' => '401878663', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-manchester-united-vs-leeds-united' => ['event' => '401879074', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-sunderland-vs-afc-bournemouth' => ['event' => '401879073', 'league' => 'eng.1', 'day' => '20270515'],
    'epl-afc-bournemouth-vs-chelsea' => ['event' => '401879072', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-brentford-vs-hull-city' => ['event' => '401879071', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-brighton-hove-albion-vs-liverpool' => ['event' => '401878662', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-everton-vs-arsenal' => ['event' => '401879070', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-fulham-vs-coventry-city' => ['event' => '401879069', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-leeds-united-vs-sunderland' => ['event' => '401879068', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-manchester-city-vs-aston-villa' => ['event' => '401879067', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-newcastle-united-vs-crystal-palace' => ['event' => '401879066', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-nottingham-forest-vs-ipswich-town' => ['event' => '401878661', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-tottenham-hotspur-vs-manchester-united' => ['event' => '401879065', 'league' => 'eng.1', 'day' => '20270523'],
    'epl-arsenal-vs-brighton-hove-albion' => ['event' => '401878660', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-aston-villa-vs-tottenham-hotspur' => ['event' => '401879064', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-chelsea-vs-brentford' => ['event' => '401879063', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-coventry-city-vs-nottingham-forest' => ['event' => '401878659', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-crystal-palace-vs-leeds-united' => ['event' => '401879062', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-hull-city-vs-newcastle-united' => ['event' => '401879061', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-ipswich-town-vs-everton' => ['event' => '401879060', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-liverpool-vs-afc-bournemouth' => ['event' => '401879059', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-manchester-united-vs-fulham' => ['event' => '401879058', 'league' => 'eng.1', 'day' => '20270530'],
    'epl-sunderland-vs-manchester-city' => ['event' => '401878658', 'league' => 'eng.1', 'day' => '20270530'],
    'la-liga-espanyol-vs-atletico-madrid' => ['event' => '401882843', 'league' => 'esp.1', 'day' => '20261017'],
    'la-liga-villarreal-vs-elche' => ['event' => '401882837', 'league' => 'esp.1', 'day' => '20261017'],
    'la-liga-real-betis-vs-barcelona' => ['event' => '401882846', 'league' => 'esp.1', 'day' => '20261017'],
    'la-liga-valencia-vs-athletic-club' => ['event' => '401882838', 'league' => 'esp.1', 'day' => '20261017'],
    'la-liga-osasuna-vs-racing-santander' => ['event' => '401882840', 'league' => 'esp.1', 'day' => '20261018'],
    'la-liga-celta-vigo-vs-alaves' => ['event' => '401882845', 'league' => 'esp.1', 'day' => '20261018'],
    'la-liga-malaga-vs-real-sociedad' => ['event' => '401882841', 'league' => 'esp.1', 'day' => '20261018'],
    'la-liga-real-madrid-vs-sevilla' => ['event' => '401882839', 'league' => 'esp.1', 'day' => '20261018'],
    'la-liga-getafe-vs-rayo-vallecano' => ['event' => '401882842', 'league' => 'esp.1', 'day' => '20261019'],
    'la-liga-levante-vs-athletic-club' => ['event' => '401882870', 'league' => 'esp.1', 'day' => '20261021'],
    'la-liga-alaves-vs-malaga' => ['event' => '401882836', 'league' => 'esp.1', 'day' => '20261023'],
    'la-liga-rayo-vallecano-vs-elche' => ['event' => '401882830', 'league' => 'esp.1', 'day' => '20261024'],
    'la-liga-racing-santander-vs-espanyol' => ['event' => '401882831', 'league' => 'esp.1', 'day' => '20261024'],
    'la-liga-valencia-vs-villarreal' => ['event' => '401882827', 'league' => 'esp.1', 'day' => '20261024'],
    'la-liga-atletico-madrid-vs-deportivo' => ['event' => '401882834', 'league' => 'esp.1', 'day' => '20261024'],
    'la-liga-athletic-club-vs-getafe' => ['event' => '401882835', 'league' => 'esp.1', 'day' => '20261025'],
    'la-liga-celta-vigo-vs-real-betis' => ['event' => '401882833', 'league' => 'esp.1', 'day' => '20261025'],
    'la-liga-real-sociedad-vs-levante' => ['event' => '401882829', 'league' => 'esp.1', 'day' => '20261025'],
    'la-liga-barcelona-vs-real-madrid' => ['event' => '401882832', 'league' => 'esp.1', 'day' => '20261025'],
    'la-liga-sevilla-vs-osasuna' => ['event' => '401882828', 'league' => 'esp.1', 'day' => '20261026'],
    'la-liga-villarreal-vs-espanyol' => ['event' => '401882817', 'league' => 'esp.1', 'day' => '20261030'],
    'la-liga-levante-vs-atletico-madrid' => ['event' => '401882820', 'league' => 'esp.1', 'day' => '20261031'],
    'la-liga-rayo-vallecano-vs-celta-vigo' => ['event' => '401882818', 'league' => 'esp.1', 'day' => '20261031'],
    'la-liga-real-betis-vs-malaga' => ['event' => '401882825', 'league' => 'esp.1', 'day' => '20261031'],
    'la-liga-barcelona-vs-alaves' => ['event' => '401882822', 'league' => 'esp.1', 'day' => '20261031'],
    'la-liga-getafe-vs-sevilla' => ['event' => '401882821', 'league' => 'esp.1', 'day' => '20261101'],
    'la-liga-racing-santander-vs-real-madrid' => ['event' => '401882819', 'league' => 'esp.1', 'day' => '20261101'],
    'la-liga-elche-vs-valencia' => ['event' => '401882823', 'league' => 'esp.1', 'day' => '20261101'],
    'la-liga-athletic-club-vs-real-sociedad' => ['event' => '401882826', 'league' => 'esp.1', 'day' => '20261101'],
    'la-liga-deportivo-vs-osasuna' => ['event' => '401882824', 'league' => 'esp.1', 'day' => '20261102'],
    'la-liga-sevilla-vs-alaves' => ['event' => '401882809', 'league' => 'esp.1', 'day' => '20261106'],
    'la-liga-malaga-vs-racing-santander' => ['event' => '401882812', 'league' => 'esp.1', 'day' => '20261107'],
    'la-liga-espanyol-vs-deportivo' => ['event' => '401882813', 'league' => 'esp.1', 'day' => '20261107'],
    'la-liga-osasuna-vs-athletic-club' => ['event' => '401882811', 'league' => 'esp.1', 'day' => '20261107'],
    'la-liga-valencia-vs-real-madrid' => ['event' => '401882808', 'league' => 'esp.1', 'day' => '20261107'],
    'la-liga-elche-vs-real-betis' => ['event' => '401882814', 'league' => 'esp.1', 'day' => '20261108'],
    'la-liga-real-sociedad-vs-rayo-vallecano' => ['event' => '401882810', 'league' => 'esp.1', 'day' => '20261108'],
    'la-liga-celta-vigo-vs-levante' => ['event' => '401882815', 'league' => 'esp.1', 'day' => '20261108'],
    'la-liga-villarreal-vs-getafe' => ['event' => '401882807', 'league' => 'esp.1', 'day' => '20261108'],
    'la-liga-atletico-madrid-vs-barcelona' => ['event' => '401882816', 'league' => 'esp.1', 'day' => '20261108'],
    'la-liga-alaves-vs-deportivo' => ['event' => '401882806', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-athletic-club-vs-espanyol' => ['event' => '401882805', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-barcelona-vs-villarreal' => ['event' => '401882804', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-getafe-vs-atletico-madrid' => ['event' => '401882803', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-levante-vs-elche' => ['event' => '401882802', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-osasuna-vs-malaga' => ['event' => '401882801', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-racing-santander-vs-real-sociedad' => ['event' => '401882800', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-rayo-vallecano-vs-valencia' => ['event' => '401882799', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-real-madrid-vs-celta-vigo' => ['event' => '401882798', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-sevilla-vs-real-betis' => ['event' => '401882797', 'league' => 'esp.1', 'day' => '20261122'],
    'la-liga-celta-vigo-vs-villarreal' => ['event' => '401882795', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-deportivo-vs-barcelona' => ['event' => '401882794', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-elche-vs-atletico-madrid' => ['event' => '401882793', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-espanyol-vs-getafe' => ['event' => '401882792', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-levante-vs-racing-santander' => ['event' => '401882791', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-malaga-vs-athletic-club' => ['event' => '401882790', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-real-betis-vs-rayo-vallecano' => ['event' => '401882796', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-real-madrid-vs-alaves' => ['event' => '401882789', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-real-sociedad-vs-sevilla' => ['event' => '401882788', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-valencia-vs-osasuna' => ['event' => '401882787', 'league' => 'esp.1', 'day' => '20261129'],
    'la-liga-alaves-vs-espanyol' => ['event' => '401882786', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-athletic-club-vs-real-madrid' => ['event' => '401882785', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-atletico-madrid-vs-real-betis' => ['event' => '401882784', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-barcelona-vs-celta-vigo' => ['event' => '401882783', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-getafe-vs-valencia' => ['event' => '401882782', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-osasuna-vs-elche' => ['event' => '401882781', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-racing-santander-vs-deportivo' => ['event' => '401882780', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-rayo-vallecano-vs-levante' => ['event' => '401882779', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-sevilla-vs-malaga' => ['event' => '401882778', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-villarreal-vs-real-sociedad' => ['event' => '401882777', 'league' => 'esp.1', 'day' => '20261206'],
    'la-liga-atletico-madrid-vs-valencia' => ['event' => '401882776', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-deportivo-vs-athletic-club' => ['event' => '401882774', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-elche-vs-sevilla' => ['event' => '401882773', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-espanyol-vs-celta-vigo' => ['event' => '401882772', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-levante-vs-alaves' => ['event' => '401882771', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-malaga-vs-barcelona' => ['event' => '401882770', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-real-betis-vs-racing-santander' => ['event' => '401882775', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-real-madrid-vs-osasuna' => ['event' => '401882769', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-real-sociedad-vs-getafe' => ['event' => '401882768', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-villarreal-vs-rayo-vallecano' => ['event' => '401882767', 'league' => 'esp.1', 'day' => '20261213'],
    'la-liga-sevilla-vs-racing-santander' => ['event' => '401882758', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-valencia-vs-espanyol' => ['event' => '401882757', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-alaves-vs-elche' => ['event' => '401882766', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-athletic-club-vs-real-betis' => ['event' => '401882765', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-barcelona-vs-real-sociedad' => ['event' => '401882762', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-celta-vigo-vs-atletico-madrid' => ['event' => '401882764', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-deportivo-vs-real-madrid' => ['event' => '401882763', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-getafe-vs-levante' => ['event' => '401882761', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-osasuna-vs-villarreal' => ['event' => '401882760', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-rayo-vallecano-vs-malaga' => ['event' => '401882759', 'league' => 'esp.1', 'day' => '20261220'],
    'la-liga-celta-vigo-vs-deportivo' => ['event' => '401882755', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-espanyol-vs-barcelona' => ['event' => '401882754', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-levante-vs-valencia' => ['event' => '401882753', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-malaga-vs-elche' => ['event' => '401882752', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-racing-santander-vs-athletic-club' => ['event' => '401882751', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-rayo-vallecano-vs-atletico-madrid' => ['event' => '401882750', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-real-betis-vs-alaves' => ['event' => '401882756', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-real-madrid-vs-getafe' => ['event' => '401882749', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-real-sociedad-vs-osasuna' => ['event' => '401882748', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-villarreal-vs-sevilla' => ['event' => '401882747', 'league' => 'esp.1', 'day' => '20270103'],
    'la-liga-alaves-vs-real-sociedad' => ['event' => '401882746', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-athletic-club-vs-villarreal' => ['event' => '401882745', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-atletico-madrid-vs-racing-santander' => ['event' => '401882744', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-deportivo-vs-rayo-vallecano' => ['event' => '401882743', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-elche-vs-getafe' => ['event' => '401882742', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-espanyol-vs-real-betis' => ['event' => '401882741', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-osasuna-vs-barcelona' => ['event' => '401882740', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-real-madrid-vs-levante' => ['event' => '401882739', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-sevilla-vs-celta-vigo' => ['event' => '401882738', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-valencia-vs-malaga' => ['event' => '401882737', 'league' => 'esp.1', 'day' => '20270110'],
    'la-liga-atletico-madrid-vs-real-sociedad' => ['event' => '401882736', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-barcelona-vs-elche' => ['event' => '401882733', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-celta-vigo-vs-valencia' => ['event' => '401882734', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-getafe-vs-athletic-club' => ['event' => '401882732', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-levante-vs-espanyol' => ['event' => '401882731', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-malaga-vs-real-madrid' => ['event' => '401882730', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-racing-santander-vs-osasuna' => ['event' => '401882729', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-rayo-vallecano-vs-sevilla' => ['event' => '401882728', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-real-betis-vs-deportivo' => ['event' => '401882735', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-villarreal-vs-alaves' => ['event' => '401882727', 'league' => 'esp.1', 'day' => '20270117'],
    'la-liga-alaves-vs-barcelona' => ['event' => '401882726', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-athletic-club-vs-levante' => ['event' => '401882725', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-deportivo-vs-atletico-madrid' => ['event' => '401882724', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-elche-vs-rayo-vallecano' => ['event' => '401882723', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-espanyol-vs-villarreal' => ['event' => '401882722', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-getafe-vs-osasuna' => ['event' => '401882721', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-racing-santander-vs-celta-vigo' => ['event' => '401882720', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-real-madrid-vs-real-betis' => ['event' => '401882719', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-real-sociedad-vs-malaga' => ['event' => '401882718', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-valencia-vs-sevilla' => ['event' => '401882717', 'league' => 'esp.1', 'day' => '20270124'],
    'la-liga-atletico-madrid-vs-espanyol' => ['event' => '401882716', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-barcelona-vs-valencia' => ['event' => '401882713', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-celta-vigo-vs-getafe' => ['event' => '401882714', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-levante-vs-real-sociedad' => ['event' => '401882712', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-malaga-vs-alaves' => ['event' => '401882711', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-osasuna-vs-deportivo' => ['event' => '401882710', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-rayo-vallecano-vs-real-madrid' => ['event' => '401882709', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-real-betis-vs-elche' => ['event' => '401882715', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-sevilla-vs-athletic-club' => ['event' => '401882708', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-villarreal-vs-racing-santander' => ['event' => '401882707', 'league' => 'esp.1', 'day' => '20270131'],
    'la-liga-alaves-vs-celta-vigo' => ['event' => '401882706', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-athletic-club-vs-osasuna' => ['event' => '401882705', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-barcelona-vs-atletico-madrid' => ['event' => '401882700', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-deportivo-vs-malaga' => ['event' => '401882703', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-elche-vs-levante' => ['event' => '401882702', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-espanyol-vs-rayo-vallecano' => ['event' => '401882701', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-getafe-vs-villarreal' => ['event' => '401882699', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-real-betis-vs-sevilla' => ['event' => '401882704', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-real-sociedad-vs-real-madrid' => ['event' => '401882698', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-valencia-vs-racing-santander' => ['event' => '401882697', 'league' => 'esp.1', 'day' => '20270207'],
    'la-liga-celta-vigo-vs-rayo-vallecano' => ['event' => '401882696', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-elche-vs-deportivo' => ['event' => '401882695', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-levante-vs-malaga' => ['event' => '401882694', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-osasuna-vs-atletico-madrid' => ['event' => '401882693', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-racing-santander-vs-getafe' => ['event' => '401882692', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-real-madrid-vs-athletic-club' => ['event' => '401882691', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-real-sociedad-vs-real-betis' => ['event' => '401882690', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-sevilla-vs-espanyol' => ['event' => '401882689', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-valencia-vs-alaves' => ['event' => '401882688', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-villarreal-vs-barcelona' => ['event' => '401882687', 'league' => 'esp.1', 'day' => '20270214'],
    'la-liga-alaves-vs-racing-santander' => ['event' => '401882686', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-athletic-club-vs-celta-vigo' => ['event' => '401882685', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-atletico-madrid-vs-elche' => ['event' => '401882684', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-barcelona-vs-levante' => ['event' => '401882681', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-deportivo-vs-real-sociedad' => ['event' => '401882683', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-espanyol-vs-osasuna' => ['event' => '401882682', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-malaga-vs-real-betis' => ['event' => '401882680', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-rayo-vallecano-vs-getafe' => ['event' => '401882679', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-sevilla-vs-real-madrid' => ['event' => '401882678', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-villarreal-vs-valencia' => ['event' => '401882677', 'league' => 'esp.1', 'day' => '20270221'],
    'la-liga-athletic-club-vs-barcelona' => ['event' => '401882676', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-celta-vigo-vs-espanyol' => ['event' => '401882674', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-getafe-vs-alaves' => ['event' => '401882673', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-levante-vs-deportivo' => ['event' => '401882672', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-malaga-vs-atletico-madrid' => ['event' => '401882671', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-osasuna-vs-sevilla' => ['event' => '401882670', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-racing-santander-vs-rayo-vallecano' => ['event' => '401882669', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-real-betis-vs-villarreal' => ['event' => '401882675', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-real-madrid-vs-valencia' => ['event' => '401882668', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-real-sociedad-vs-elche' => ['event' => '401882667', 'league' => 'esp.1', 'day' => '20270228'],
    'la-liga-alaves-vs-athletic-club' => ['event' => '401882666', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-atletico-madrid-vs-celta-vigo' => ['event' => '401882665', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-barcelona-vs-real-betis' => ['event' => '401882661', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-deportivo-vs-getafe' => ['event' => '401882664', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-elche-vs-malaga' => ['event' => '401882663', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-espanyol-vs-racing-santander' => ['event' => '401882662', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-rayo-vallecano-vs-osasuna' => ['event' => '401882660', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-sevilla-vs-real-sociedad' => ['event' => '401882659', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-valencia-vs-levante' => ['event' => '401882658', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-villarreal-vs-real-madrid' => ['event' => '401882657', 'league' => 'esp.1', 'day' => '20270307'],
    'la-liga-alaves-vs-sevilla' => ['event' => '401882656', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-athletic-club-vs-valencia' => ['event' => '401882655', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-barcelona-vs-deportivo' => ['event' => '401882652', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-elche-vs-villarreal' => ['event' => '401882653', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-getafe-vs-real-sociedad' => ['event' => '401882651', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-malaga-vs-rayo-vallecano' => ['event' => '401882650', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-osasuna-vs-celta-vigo' => ['event' => '401882649', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-racing-santander-vs-atletico-madrid' => ['event' => '401882648', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-real-betis-vs-levante' => ['event' => '401882654', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-real-madrid-vs-espanyol' => ['event' => '401882647', 'league' => 'esp.1', 'day' => '20270314'],
    'la-liga-atletico-madrid-vs-getafe' => ['event' => '401882646', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-celta-vigo-vs-real-madrid' => ['event' => '401882645', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-espanyol-vs-athletic-club' => ['event' => '401882644', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-levante-vs-osasuna' => ['event' => '401882643', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-racing-santander-vs-real-betis' => ['event' => '401882642', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-rayo-vallecano-vs-barcelona' => ['event' => '401882641', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-real-sociedad-vs-alaves' => ['event' => '401882640', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-sevilla-vs-elche' => ['event' => '401882639', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-valencia-vs-deportivo' => ['event' => '401882638', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-villarreal-vs-malaga' => ['event' => '401882637', 'league' => 'esp.1', 'day' => '20270321'],
    'la-liga-athletic-club-vs-racing-santander' => ['event' => '401882636', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-barcelona-vs-sevilla' => ['event' => '401882632', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-deportivo-vs-villarreal' => ['event' => '401882634', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-elche-vs-alaves' => ['event' => '401882633', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-getafe-vs-espanyol' => ['event' => '401882631', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-levante-vs-rayo-vallecano' => ['event' => '401882630', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-malaga-vs-osasuna' => ['event' => '401882629', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-real-betis-vs-celta-vigo' => ['event' => '401882635', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-real-madrid-vs-atletico-madrid' => ['event' => '401882628', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-real-sociedad-vs-valencia' => ['event' => '401882627', 'league' => 'esp.1', 'day' => '20270404'],
    'la-liga-alaves-vs-real-betis' => ['event' => '401882626', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-atletico-madrid-vs-levante' => ['event' => '401882625', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-celta-vigo-vs-elche' => ['event' => '401882624', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-espanyol-vs-malaga' => ['event' => '401882623', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-osasuna-vs-real-madrid' => ['event' => '401882622', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-racing-santander-vs-barcelona' => ['event' => '401882621', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-rayo-vallecano-vs-real-sociedad' => ['event' => '401882620', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-sevilla-vs-deportivo' => ['event' => '401882619', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-valencia-vs-getafe' => ['event' => '401882618', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-villarreal-vs-athletic-club' => ['event' => '401882617', 'league' => 'esp.1', 'day' => '20270411'],
    'la-liga-alaves-vs-rayo-vallecano' => ['event' => '401882616', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-atletico-madrid-vs-sevilla' => ['event' => '401882615', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-barcelona-vs-espanyol' => ['event' => '401882611', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-deportivo-vs-celta-vigo' => ['event' => '401882613', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-elche-vs-osasuna' => ['event' => '401882612', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-getafe-vs-real-madrid' => ['event' => '401882610', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-levante-vs-villarreal' => ['event' => '401882609', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-malaga-vs-valencia' => ['event' => '401882608', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-real-betis-vs-athletic-club' => ['event' => '401882614', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-real-sociedad-vs-racing-santander' => ['event' => '401882607', 'league' => 'esp.1', 'day' => '20270418'],
    'la-liga-athletic-club-vs-deportivo' => ['event' => '401882606', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-celta-vigo-vs-barcelona' => ['event' => '401882605', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-espanyol-vs-real-sociedad' => ['event' => '401882604', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-getafe-vs-real-betis' => ['event' => '401882603', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-osasuna-vs-alaves' => ['event' => '401882602', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-racing-santander-vs-malaga' => ['event' => '401882601', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-real-madrid-vs-elche' => ['event' => '401882600', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-sevilla-vs-levante' => ['event' => '401882599', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-valencia-vs-rayo-vallecano' => ['event' => '401882598', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-villarreal-vs-atletico-madrid' => ['event' => '401882597', 'league' => 'esp.1', 'day' => '20270421'],
    'la-liga-atletico-madrid-vs-alaves' => ['event' => '401882596', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-barcelona-vs-osasuna' => ['event' => '401882591', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-celta-vigo-vs-sevilla' => ['event' => '401882594', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-deportivo-vs-racing-santander' => ['event' => '401882593', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-elche-vs-espanyol' => ['event' => '401882592', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-levante-vs-real-madrid' => ['event' => '401882590', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-malaga-vs-getafe' => ['event' => '401882589', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-rayo-vallecano-vs-villarreal' => ['event' => '401882588', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-real-betis-vs-valencia' => ['event' => '401882595', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-real-sociedad-vs-athletic-club' => ['event' => '401882587', 'league' => 'esp.1', 'day' => '20270502'],
    'la-liga-alaves-vs-levante' => ['event' => '401882586', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-athletic-club-vs-malaga' => ['event' => '401882585', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-getafe-vs-elche' => ['event' => '401882583', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-osasuna-vs-real-sociedad' => ['event' => '401882582', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-racing-santander-vs-sevilla' => ['event' => '401882581', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-rayo-vallecano-vs-deportivo' => ['event' => '401882580', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-real-betis-vs-espanyol' => ['event' => '401882584', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-real-madrid-vs-barcelona' => ['event' => '401882579', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-valencia-vs-atletico-madrid' => ['event' => '401882578', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-villarreal-vs-celta-vigo' => ['event' => '401882577', 'league' => 'esp.1', 'day' => '20270509'],
    'la-liga-atletico-madrid-vs-rayo-vallecano' => ['event' => '401882576', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-deportivo-vs-alaves' => ['event' => '401882575', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-elche-vs-athletic-club' => ['event' => '401882574', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-espanyol-vs-valencia' => ['event' => '401882573', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-levante-vs-getafe' => ['event' => '401882572', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-malaga-vs-celta-vigo' => ['event' => '401882571', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-osasuna-vs-real-betis' => ['event' => '401882570', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-real-madrid-vs-racing-santander' => ['event' => '401882569', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-real-sociedad-vs-barcelona' => ['event' => '401882568', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-sevilla-vs-villarreal' => ['event' => '401882567', 'league' => 'esp.1', 'day' => '20270516'],
    'la-liga-alaves-vs-real-madrid' => ['event' => '401882566', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-atletico-madrid-vs-athletic-club' => ['event' => '401882565', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-barcelona-vs-malaga' => ['event' => '401882562', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-celta-vigo-vs-real-sociedad' => ['event' => '401882564', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-deportivo-vs-espanyol' => ['event' => '401882563', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-racing-santander-vs-levante' => ['event' => '401882561', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-rayo-vallecano-vs-real-betis' => ['event' => '401882560', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-sevilla-vs-getafe' => ['event' => '401882559', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-valencia-vs-elche' => ['event' => '401882558', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-villarreal-vs-osasuna' => ['event' => '401882557', 'league' => 'esp.1', 'day' => '20270523'],
    'la-liga-athletic-club-vs-rayo-vallecano' => ['event' => '401882556', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-elche-vs-racing-santander' => ['event' => '401882554', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-espanyol-vs-alaves' => ['event' => '401882553', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-getafe-vs-barcelona' => ['event' => '401882552', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-levante-vs-celta-vigo' => ['event' => '401882551', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-malaga-vs-sevilla' => ['event' => '401882550', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-osasuna-vs-valencia' => ['event' => '401882549', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-real-betis-vs-atletico-madrid' => ['event' => '401882555', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-real-madrid-vs-deportivo' => ['event' => '401882548', 'league' => 'esp.1', 'day' => '20270530'],
    'la-liga-real-sociedad-vs-villarreal' => ['event' => '401882547', 'league' => 'esp.1', 'day' => '20270530'],
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
    mc_release_response_lock();
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
    mc_release_response_lock();
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: public, max-age=' . max(0, $maxAge) . ', stale-while-revalidate=30');
    header('X-Match-Center-Cache: ' . $cacheState);
    header('X-Cache-Age: ' . max(0, $age));
    header('X-Diagnostic-Code: ' . $diagnostic);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ───────────────────────── المخبأ المشترك ─────────────────────────
/* البند 11: «مخبأ خادم مشترك بين الزوار». مصادر الأيام مشتركة مع scoreboard.php،
   وكاش الاستجابة مستقل مدته 45 ثانية. */

function mc_release_response_lock(): void {
    global $mcResponseLock;
    if (is_resource($mcResponseLock)) { flock($mcResponseLock, LOCK_UN); fclose($mcResponseLock); }
    $mcResponseLock = null;
}

function mc_diagnostic(string $code): string {
    if ($code === 'UPSTREAM_RATE_LIMITED') return 'UPSTREAM_HTTP_429';
    if (in_array($code, ['DNS_LOOKUP_FAILED', 'UPSTREAM_CONNECT_FAILED', 'UPSTREAM_NETWORK_ERROR', 'HTTP_CLIENT_UNAVAILABLE'], true)) return 'UPSTREAM_UNREACHABLE';
    return $code;
}

function mc_cache_dir(): string {
    $dir = sm_source_dir('match-center-responses');
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
    sm_source_write($file, ['at' => time(), 'payload' => $payload]);
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
function mc_fetch(string $url, ?string $unit = null): array {
    if (!function_exists('curl_init')) {
        return ['body' => null, 'status' => 0, 'errno' => -1];
    }
    $ch = curl_init($url);
    if ($ch === false) {
        return ['body' => null, 'status' => 0, 'errno' => -1];
    }
    if ($unit !== null) sm_source_note_request($unit);
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
 * أحداث المباراة من `summary.keyEvents` — البنية مؤكدة بمسبار P1 على مباراة
 * منتهية (`MATCH_CENTER_FINISHED_PROBE`): نوع `{id,text,type}` ودقيقة
 * `displayValue` ومشاركون `participants[].athlete` وفريق `{id,displayName}`.
 *
 * أحداث الإطار (انطلاقة/استراحة/بداية شوط/نهاية) تُستبعد: الخط الزمني
 * للأحداث الرياضية، وحالة الاستراحة تحملها حالة المباراة نفسها. وتوقفات
 * المصدر (`Start Delay`/`End Delay`) تُستبعد أيضاً: ESPN يسجّل التوقف نفسه
 * مرتين — نسخة لكل فريق، إحداهما بلا نص — ثم يسجّل انتهاءه، فلا تضيف شيئاً
 * فوق ما تحمله ساعة المباراة وتضاعف ضجيج الشريط. المشارك الثاني لا يُمرَّر
 * إلا في التبديلات (الخارج — ترتيبه مؤكد من نص المصدر)؛ في الأهداف دوره غير
 * مسمّى في الاستخراج فلا يُوسم صانعاً ولا يُعرض.
 *
 * @return array<int,array<string,mixed>>
 */

/** أنواع أحداث إطارية لا تدخل الخط الزمني الرياضي. */
const MC_FRAME_EVENT_TYPES = ['kickoff', 'halftime', 'start 2nd half', 'start second half', 'end regular time', 'end 2nd half', 'end second half', 'full time', 'start extra time', 'end extra time'];

/* توقفات المصدر ليست أحداثاً رياضية: `Start Delay` يُكرَّر مرة لكل فريق ثم
   يتبعه `End Delay`. تُستبعد بالنص مثل أحداث الإطار، فلا يصل إلى الواجهة
   سطران مكرران في الدقيقة نفسها. */
const MC_NOISE_EVENT_TYPES = ['start delay', 'end delay', 'delay', 'delay over'];

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
        $text = mc_str($item['type']['text'] ?? ($item['type']['name'] ?? null));
        if ($text === null
            || in_array(strtolower($text), MC_FRAME_EVENT_TYPES, true)
            || in_array(strtolower($text), MC_NOISE_EVENT_TYPES, true)) {
            continue;
        }
        /* الدقيقة من `displayValue` («55'» أو «45+2'» للبدل الضائع)؛ وبلا
           عرض صالح تُشتق من ثواني `clock.value` — وكلاهما من المصدر. */
        $minute      = null;
        $extraMinute = null;
        $display     = $item['clock']['displayValue'] ?? null;
        if (is_string($display) && preg_match('/(\d+)(?:\+(\d+))?/', $display, $m) === 1) {
            $minute      = (int) $m[1];
            $extraMinute = isset($m[2]) && $m[2] !== '' ? (int) $m[2] : null;
        } elseif (is_numeric($item['clock']['value'] ?? null) && (float) $item['clock']['value'] > 0) {
            $minute = (int) floor(((float) $item['clock']['value']) / 60);
        }
        if ($minute === null) {
            continue; /* عنصر بلا دقيقة لا يصلح حدثاً معلناً */
        }

        $teamId = $item['team']['id'] ?? null;
        $side   = is_string($teamId) && isset($sideOfTeam[$teamId]) ? $sideOfTeam[$teamId] : null;

        /* المشاركون بالترتيب كما وردوا: الأول صاحب الحدث دائماً (مسجّل/
           مُنذر/داخل)، والثاني في التبديل وحده هو الخارج. */
        $participants = [];
        foreach ((array) ($item['participants'] ?? []) as $participant) {
            if (!is_array($participant)) {
                continue;
            }
            $athlete = $participant['athlete'] ?? null;
            if (!is_array($athlete)) {
                continue;
            }
            $participants[] = [
                'id'   => mc_str($athlete['id'] ?? null),
                'name' => mc_str($athlete['displayName'] ?? null),
            ];
        }
        $isSubstitution = stripos($text, 'substitut') !== false;

        $out[] = [
            /* معرّف المصدر يُحفظ: بدونه تتغير بصمة الحدث حين يتحول هدف إلى
               ملغى بعد VAR فيُعلن مرتين (البند 7). */
            'id'          => mc_str($item['id'] ?? null) ?? ('k' . $index),
            'type'        => $text,
            'minute'      => $minute,
            'extraMinute' => $extraMinute,
            'period'      => mc_int($item['period']['number'] ?? null),
            'side'        => $side,
            'player'      => $participants[0] ?? ['id' => null, 'name' => null],
            /* في العقد: `assist` هي قناة اللاعب المرتبط. لا تُملأ هنا إلا
               للتبديل (الخارج) — دور المشارك الثاني في الهدف غير مسمّى. */
            'assist'      => $isSubstitution ? ($participants[1] ?? null) : null,
            'team'        => [
                'name'     => mc_str($item['team']['displayName'] ?? null),
                'homeAway' => $side,
            ],
            'detail'      => mc_str($item['shortText'] ?? null),
        ];
    }
    return $out;
}

/** رقم (صحيح أو عشري) من نص أو رقم — `null` عند الغياب، فلا يتحول الغائب صفراً. */
function mc_num(mixed $value): int|float|null {
    if (is_int($value) || is_float($value)) {
        return $value;
    }
    if (is_string($value) && is_numeric(trim($value))) {
        return trim($value) + 0;
    }
    return null;
}

/**
 * إحصائيات الفريقين من `summary.boxscore.teams` — 28 اسماً مؤكداً بمسبار
 * P1 (`website/docs/espn-summary-probe.json → results[].rawStatNames`)، وتُقرأ
 * كلها بأسماء المصدر نفسها وتعريفها؛ الترتيب هنا للقراءة، وترتيب العرض
 * تقرّره `STAT_GROUPS` في الواجهة.
 * لا «خارج المرمى» مشتقة: اسمها غير موجود في القائمة، وطرحها من الكلية
 * ونسبة الاعتراض يفترض هوية حسابية غير موثقة فلا تُفترض.
 *
 * @return array<int,array{key:string,label:string,unit:string,home:int|float|null,away:int|float|null}>|null
 */
const MC_STAT_LABELS = [
    /* الاستحواذ والتمرير */
    'possessionPct'      => ['الاستحواذ', '%'],
    'totalPasses'        => ['إجمالي التمريرات', ''],
    'accuratePasses'     => ['التمريرات الصحيحة', ''],
    'passPct'            => ['دقة التمرير', '%'],
    /* التسديد */
    'totalShots'         => ['التسديدات', ''],
    'shotsOnTarget'      => ['على المرمى', ''],
    'blockedShots'       => ['تسديدات تم اعتراضها', ''],
    'shotPct'            => ['نسبة التسديد', '%'],
    'penaltyKickShots'   => ['ركلات جزاء — محاولات', ''],
    'penaltyKickGoals'   => ['ركلات جزاء — أهداف', ''],
    /* بناء الهجمة */
    'totalCrosses'       => ['العرضيات', ''],
    'accurateCrosses'    => ['العرضيات الدقيقة', ''],
    'crossPct'           => ['دقة العرضيات', '%'],
    'totalLongBalls'     => ['الكرات الطويلة', ''],
    'accurateLongBalls'  => ['الكرات الطويلة الدقيقة', ''],
    'longballPct'        => ['دقة الكرات الطويلة', '%'],
    'wonCorners'         => ['الركنيات', ''],
    /* الدفاع */
    'totalTackles'       => ['التدخلات', ''],
    'effectiveTackles'   => ['التدخلات الناجحة', ''],
    'tacklePct'          => ['نسبة نجاح التدخلات', '%'],
    'interceptions'      => ['الاعتراضات', ''],
    'totalClearance'     => ['التشتيت', ''],
    'effectiveClearance' => ['التشتيت الفعّال', ''],
    /* حراسة المرمى */
    'saves'              => ['التصديات', ''],
    /* الانضباط */
    'foulsCommitted'     => ['الأخطاء', ''],
    'offsides'           => ['التسلل', ''],
    'yellowCards'        => ['بطاقات صفراء', ''],
    'redCards'           => ['بطاقات حمراء', ''],
];

/**
 * النسب المئوية بمقياس واحد (0–100) كما تُعرض.
 *
 * المصدر لا يوحّد مقياس نسبه: `possessionPct` تصل من 0 إلى 100 (مثل 47.2)،
 * بينما `passPct` تصل كسراً من 0 إلى 1 بخانة عشرية واحدة (0.6–0.9 في 240
 * مباراة مؤرشفة في `website/src/content/fixtures-archive/`). الكسر في (0, 1]
 * يُحوَّل إلى نقاط مئوية (0.8 ← 80)؛ وهذا تحويل وحدة لا اشتقاق رقم من رقمين.
 * نسبة أقل من 1% لا تحدث واقعياً لأي من هذه المقاييس، فلا التباس. القيمة
 * خارج [0, 100] بعد ذلك تُعاد null — لا تُقصّ ولا تُصحَّح.
 */
function mc_pct(mixed $value): int|float|null {
    $number = mc_num($value);
    if ($number === null) {
        return null;
    }
    if ($number > 0 && $number <= 1) {
        $number = round($number * 100, 1);
    }
    return ($number < 0 || $number > 100) ? null : $number;
}

function mc_read_statistics(array $summary, array $competitors): ?array {
    $teams = $summary['boxscore']['teams'] ?? null;
    if (!is_array($teams)) {
        return null;
    }

    $sideOfTeam = [];
    foreach ($competitors as $competitor) {
        $id = $competitor['team']['id'] ?? null;
        if (is_string($id) && $id !== '') {
            $sideOfTeam[$id] = $competitor['homeAway'];
        }
    }

    /* قيم كل طرف بمفتاح اسم المصدر — التسميات عندنا، والأرقام عنده. */
    $bySide = ['home' => [], 'away' => []];
    foreach ($teams as $team) {
        if (!is_array($team)) {
            continue;
        }
        $teamId = $team['team']['id'] ?? null;
        if (!is_string($teamId) || !isset($sideOfTeam[$teamId])) {
            continue; /* فريق لا يخص هذه المباراة — لا يُربط بالترتيب */
        }
        $side = $sideOfTeam[$teamId];
        foreach ((array) ($team['statistics'] ?? []) as $stat) {
            if (!is_array($stat)) {
                continue;
            }
            $name = mc_str($stat['name'] ?? null);
            if ($name === null || !isset(MC_STAT_LABELS[$name])) {
                continue;
            }
            $raw = $stat['value'] ?? ($stat['displayValue'] ?? null);
            $bySide[$side][$name] = MC_STAT_LABELS[$name][1] === '%' ? mc_pct($raw) : mc_num($raw);
        }
    }

    $out = [];
    foreach (MC_STAT_LABELS as $key => [$label, $unit]) {
        $home = $bySide['home'][$key] ?? null;
        $away = $bySide['away'][$key] ?? null;
        /* صف بلا أي قيمة لا يُرسل: غياب الصف «غير متاح» في الواجهة،
           أما صفر حقيقي مرسل من المصدر فيبقى صفراً معروضاً. */
        if ($home === null && $away === null) {
            continue;
        }
        $out[] = ['key' => $key, 'label' => $label, 'unit' => $unit, 'home' => $home, 'away' => $away];
    }
    return $out === [] ? null : $out;
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
            $teamId = $competitor['team']['id'] ?? null;
            $entry = [
                'id'    => is_int($teamId) ? (string) $teamId : mc_str($teamId),
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
            /* معرّفا فريقي المصدر — بهما يُنسب الفوز في سطر المجمل لا بالاسم المعروض. */
            'homeTeamId'  => $home['id'],
            'awayTeamId'  => $away['id'],
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

$responseKey = 'response_' . $slug;
$now = time();
$mcResponseLock = @fopen(mc_cache_dir() . '/' . $responseKey . '.lock', 'c');
if (!is_resource($mcResponseLock) || !flock($mcResponseLock, LOCK_EX)) {
    mc_fail(503, 'SOURCE_STORE_UNAVAILABLE', 'تعذر قفل مخزن البيانات.');
}
$response = mc_read_cache($responseKey);
if ($response !== null && ($now - $response['at']) < MC_CACHE_TTL) {
    $payload = json_decode($response['payload'], true);
    if (is_array($payload)) {
        $payload['cache'] = 'HIT';
        mc_send($payload, 'HIT', $now - $response['at'], MC_CACHE_TTL - ($now - $response['at']));
    }
}

/* Same persistent UTC-day unit used by scoreboard.php; no second upstream fetch. */
$units = sm_espn_days($binding['league'], [$binding['day']]);
$unit = $units[$binding['day']];
if (!$unit['ok']) mc_fail((int) $unit['http'], mc_diagnostic($unit['code']), 'تعذّرت قراءة المصدر، ولا توجد نسخة احتياطية صالحة.');
$raw = $unit['payload'];
$cacheHit = $unit['cache'];
$age = $unit['age'];
$diagnostic = $unit['stale_code'] === null ? 'OK' : mc_diagnostic($unit['stale_code']);

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
$events     = [];
$form       = null;
$h2h        = [];
$statistics = null;
$lineups    = null;
{
    $summaryResult = sm_summary_load($binding['league'], $binding['event'], static function () use ($binding): array {
        return mc_fetch(mc_upstream_summary($binding['league'], $binding['event']), 'espn-summaries/' . $binding['league'] . '-' . $binding['event'] . '.json');
    }, $now);
    $summaryRaw = $summaryResult['ok'] ? $summaryResult['payload'] : null;
    if (!$summaryResult['ok'] || !empty($summaryResult['stale_code'])) {
        // Partial summary failure does not erase a valid score, but is never labelled fresh.
        $cacheHit = 'STALE';
        $diagnostic = mc_diagnostic($summaryResult['stale_code'] ?? $summaryResult['code']);
        $age = max($age, $summaryResult['age'] ?? 0);
    } elseif ($summaryResult['cache'] === 'MISS' && $cacheHit !== 'STALE') {
        $cacheHit = 'MISS';
    }
    if (is_array($summaryRaw)) {
        $lineupTeamIds = [];
        foreach ($header['competitors'] as $competitor) {
            $lineupTeamIds[$competitor['homeAway']] = (string) ($competitor['team']['id'] ?? '');
        }
        $lineups = sm_summary_lineups($summaryRaw, $binding['event'], $binding['league'],
            $lineupTeamIds['home'] ?? '', $lineupTeamIds['away'] ?? '');
        $form = mc_read_form($summaryRaw, $header['competitors']);
        $h2h  = mc_read_h2h($summaryRaw);
        if ($isDetail) {
            $events     = mc_read_events($summaryRaw, $header['competitors']);
            /* قبل البداية يحمل boxscore فرقاً أيضاً (P3) لكن قيمها لم
               تُتحقق عينتها — فالإحصائيات لا تُقرأ إلا جارية/منتهية. */
            $statistics = mc_read_statistics($summaryRaw, $header['competitors']);
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
    /* التشكيلة من أعلام starter الصريحة في summary نفسها؛ الغائب يبقى null. */
    'statistics'       => $statistics,
    'lineups'          => $lineups,
    'ratings'          => null, /* لم يُعتمد مصدر تقييمات لهذا التنفيذ */
    'seasonComparison' => null,
    'seasonSample'     => null,
];

if ($cacheHit !== 'STALE') {
    mc_write_cache($responseKey, (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    /* كاش الردود كان يُكتب بلا تنظيف بعد نقل المصادر إلى المخزن المشترك،
       فبقيت ملفات الردود القديمة بلا حد. التنظيف بعد الكتابة كما كان. */
    mc_prune_cache();
}

$maxAge = $cacheHit === 'HIT' ? max(0, MC_CACHE_TTL - $age) : 0;
mc_send($payload, $cacheHit, $age, $maxAge, $diagnostic);
