import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABLE_DURATIONS,
  getSeo,
  PRICING_PLANS,
  SITE_URL,
} from '../dist-ssr/entry-server.js';

const nodesOfType = (seo, type) => seo.jsonLd.filter((node) => {
  const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
  return types.includes(type);
});

const oneNode = (seo, type, route) => {
  const nodes = nodesOfType(seo, type);
  assert.equal(nodes.length, 1, `${route}: يجب أن يوجد كيان ${type} واحد`);
  return nodes[0];
};

function assertPlanProduct(route, plan, language) {
  const seo = getSeo(route);
  const product = oneNode(seo, 'Product', route);
  const webPage = oneNode(seo, 'WebPage', route);
  const expectedId = `${seo.canonical}#product`;

  assert.equal(product['@id'], expectedId, `${route}: @id المنتج`);
  assert.equal(product.url, seo.canonical, `${route}: رابط المنتج`);
  assert.equal(product.image, seo.ogImage, `${route}: صورة المنتج يجب أن تطابق صورة الصفحة الخاصة`);
  assert.equal(webPage.primaryImageOfPage?.url, product.image, `${route}: صورة WebPage والمنتج يجب أن تتطابقا`);
  assert.deepEqual(webPage.mainEntity, { '@id': expectedId }, `${route}: WebPage.mainEntity`);

  const expectedOffers = AVAILABLE_DURATIONS.flatMap((months) => {
    const price = plan.prices[months];
    return price ? [{ months, price }] : [];
  });
  assert.ok(expectedOffers.length > 0, `${route}: لا يوجد سعر لفترة معروضة`);
  assert.equal(product.offers?.length, expectedOffers.length, `${route}: عدد العروض يطابق مدد البيع المعروضة`);

  for (const [index, expected] of expectedOffers.entries()) {
    const offer = product.offers[index];
    assert.equal(offer['@type'], 'Offer', `${route}: نوع العرض`);
    assert.equal(offer.name, language === 'en' ? `${Number(expected.months)} months` : `${Number(expected.months)} شهر`);
    assert.equal(Number(offer.price), expected.price.USD, `${route}: السعر من PRICING_PLANS`);
    assert.equal(offer.priceCurrency, 'USD', `${route}: العملة`);
    assert.equal(offer.url, seo.canonical, `${route}: رابط العرض`);
    assert.equal(offer.availability, 'https://schema.org/InStock', `${route}: التوفر المعلن`);
    assert.deepEqual(offer.seller, { '@id': `${SITE_URL}/#organization` }, `${route}: جهة البيع`);
  }
  return product;
}

test('Product/Offer للباقات يطابق مصدر الأسعار وItemList يربط المنتجات الصحيحة', () => {
  const store = getSeo('/store');
  const storePage = oneNode(store, 'WebPage', '/store');
  const catalog = oneNode(store, 'ItemList', '/store');
  const catalogId = `${store.canonical}#plans`;

  assert.equal(catalog['@id'], catalogId);
  assert.equal(catalog.url, store.canonical);
  assert.equal(catalog.numberOfItems, PRICING_PLANS.length);
  assert.equal(catalog.itemListOrder, 'https://schema.org/ItemListUnordered');
  assert.equal(catalog.itemListElement.length, PRICING_PLANS.length);
  assert.deepEqual(storePage.mainEntity, { '@id': catalogId });

  const arabicProducts = [];
  for (const [index, plan] of PRICING_PLANS.entries()) {
    const route = `/${plan.serverCode}`;
    const product = assertPlanProduct(route, plan, 'ar');
    arabicProducts.push(product);
    const listItem = catalog.itemListElement[index];
    assert.equal(listItem['@type'], 'ListItem');
    assert.equal(listItem.position, index + 1);
    assert.deepEqual(listItem.item, { '@id': product['@id'] }, `${route}: عنصر المتجر يشير إلى المنتج الصحيح`);

    assertPlanProduct(`/en/${plan.serverCode}`, plan, 'en');
  }

  const home = getSeo('/');
  const homeProduct = oneNode(home, 'Product', '/');
  const homePage = oneNode(home, 'WebPage', '/');
  const aggregate = homeProduct.offers;
  const activePrices = PRICING_PLANS.flatMap((plan) => AVAILABLE_DURATIONS
    .filter((months) => plan.prices[months])
    .map((months) => plan.prices[months].USD));

  assert.equal(homeProduct['@id'], `${SITE_URL}/#product`);
  assert.equal(homeProduct.image, home.ogImage, 'صورة المنتج الرئيسي تطابق صورة الصفحة');
  assert.equal(homePage.primaryImageOfPage?.url, homeProduct.image);
  assert.deepEqual(homePage.mainEntity, { '@id': homeProduct['@id'] });
  assert.equal(aggregate['@type'], 'AggregateOffer');
  assert.equal(aggregate.priceCurrency, 'USD');
  assert.equal(Number(aggregate.lowPrice), Math.min(...activePrices));
  assert.equal(Number(aggregate.highPrice), Math.max(...activePrices));
  assert.equal(Number(aggregate.offerCount), arabicProducts.length);
  assert.deepEqual(aggregate.seller, { '@id': `${SITE_URL}/#organization` });
});
