// The sole authority for these metadata values is src/seo.ts (via the SSR build).
// Never remove/reorder tracking, legal copy, or unrelated head elements here.
export function applyLegacyAnalysisSeo($, seo) {
  $('html').attr('lang', seo.lang).attr('dir', 'rtl');
  const meta = (attribute, key, value) => {
    const selector = `meta[${attribute}="${key}"]`;
    const tags = $(selector);
    if (tags.length) tags.first().attr('content', value);
    else $('head').append($('<meta>').attr(attribute, key).attr('content', value));
    tags.slice(1).remove();
  };
  if (!$('title').length) $('head').append('<title></title>');
  $('title').first().text(seo.title); $('title').slice(1).remove();
  if (!$('link[rel="canonical"]').length) $('head').append('<link rel="canonical">');
  $('link[rel="canonical"]').first().attr('href', seo.canonical);
  $('link[rel="canonical"]').slice(1).remove();
  for (const [key, value] of Object.entries({ description: seo.description, robots: seo.robots,
    'twitter:card': 'summary_large_image', 'twitter:title': seo.title,
    'twitter:description': seo.description, 'twitter:url': seo.canonical,
    'twitter:image': seo.ogImage, 'twitter:image:alt': seo.ogImageAlt })) meta('name', key, value);
  for (const [key, value] of Object.entries({ 'og:type': seo.ogType, 'og:locale': 'ar_EG',
    'og:title': seo.title, 'og:description': seo.description, 'og:url': seo.canonical,
    'og:image': seo.ogImage, 'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': seo.ogImageAlt })) meta('property', key, value);
  const ld = $('head script[type="application/ld+json"]');
  if (!ld.length) $('head').append('<script type="application/ld+json"></script>');
  $('head script[type="application/ld+json"]').first().text(JSON.stringify({
    '@context': 'https://schema.org', '@graph': seo.jsonLd,
  }, null, 2).replace(/</g, '\\u003c'));
  ld.slice(1).remove();
  if (!$('meta[name="analysis-seo-source"]').length) {
    $('head').append('<meta name="analysis-seo-source" content="Generated from website/src/seo.ts; do not edit SEO tags here">');
  }
}
