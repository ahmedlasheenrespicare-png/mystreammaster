import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from '../src/site.mjs';
import { getSeo } from '../dist-ssr/entry-server.js';
import { footer } from './legacy-shell.mjs';

test('WhatsApp contact uses one international number across schema and static sources', async () => {
  assert.equal(WHATSAPP_NUMBER, '201090415657');
  assert.equal(WHATSAPP_DISPLAY, '+20 109 041 5657');
  assert.equal(WHATSAPP_DISPLAY.replace(/\D/g, ''), WHATSAPP_NUMBER);

  const organization = getSeo('/').jsonLd.find((node) => node['@type'] === 'Organization');
  assert.ok(organization, 'homepage Organization JSON-LD exists');
  assert.equal(organization.contactPoint?.telephone, `+${WHATSAPP_NUMBER}`);

  assert.ok(footer.includes(`https://wa.me/${WHATSAPP_NUMBER}`), 'legacy-page footer uses the shared number');
  const handAuthoredPage = await readFile(
    new URL('../public/blog/http-protocols/index.html', import.meta.url),
    'utf8',
  );
  assert.ok(handAuthoredPage.includes(`https://wa.me/${WHATSAPP_NUMBER}`), 'static article link uses the new number');
});
