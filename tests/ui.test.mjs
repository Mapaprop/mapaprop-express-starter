// Unit tests for the property-object conventions this kit has to respect. They run with Node's
// built-in runner, no dependencies: `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  amenities, blueprints, collectZones, cover, escapeHtml, money, multiline, num, photos, specs,
  statusBadge, videoEmbed, isActive, contrast, luminance, readableOn,
} from '../public/js/ui.js';

test('num treats 0 as "not informed", because that is what the API means by it', () => {
  assert.equal(num(0), null);
  assert.equal(num('0'), null);
  assert.equal(num(undefined), null);
  assert.equal(num(''), null);
  assert.equal(num(3), 3);
  assert.equal(num('2'), 2);
});

test('a price of 0 or 1 reads as "Consultar precio", not as a number', () => {
  assert.equal(money(0, 'USD'), 'Consultar precio');
  assert.equal(money(1, 'USD'), 'Consultar precio');
  assert.equal(money(null, 'USD'), 'Consultar precio');
  assert.match(money(120000, 'USD'), /^USD/);
  assert.match(money(120000, 'USD'), /120\.000/); // es-AR grouping
});

test('blueprints are kept out of the photo gallery (image.type 2)', () => {
  const property = {
    images: [
      { image: 'a.jpg', thumbnail: 'a-t.jpg', type: 1 },
      { image: 'plan.jpg', thumbnail: 'plan-t.jpg', type: 2 },
      { image: 'b.jpg', thumbnail: 'b-t.jpg', type: 1 },
    ],
  };
  assert.equal(photos(property).length, 2);
  assert.equal(blueprints(property).length, 1);
  assert.equal(blueprints(property)[0].image, 'plan.jpg');
});

test('cover ignores a mainImage that is a bare filename or the placeholder', () => {
  // The detail endpoint can answer "noimage.gif" or a bare name; only a real URL is trusted.
  assert.equal(cover({ images: [], mainImage: 'noimage.gif' }), '');
  assert.equal(cover({ images: [], mainImage: '1342116.jpg' }), '');
  assert.equal(cover({ images: [], mainImage: 'https://x/photos/1.jpg' }), 'https://x/photos/1.jpg');
  assert.equal(
    cover({ images: [{ image: 'full.jpg', thumbnail: 'thumb.jpg', type: 1 }], mainImage: 'https://x/1.jpg' }),
    'thumb.jpg',
  );
});

test('commercial state is surfaced: the API returns sold and rented properties too', () => {
  assert.equal(statusBadge({ sold: true }), 'Vendida');
  assert.equal(statusBadge({ rented: true }), 'Alquilada');
  assert.equal(statusBadge({ reserved: true }), 'Reservada');
  assert.equal(statusBadge({ suspended: true }), 'Suspendida');
  assert.equal(statusBadge({}), '');
});

test('amenities prefer attributes[] (already translated) over the raw labels[] keys', () => {
  const withAttributes = {
    attributes: [
      { label: 'Parrilla', status: true },
      { label: 'Pileta', status: true },
      { label: 'Apagado', status: false },
    ],
    labels: ['grill', 'swimming-pool'],
  };
  assert.deepEqual(amenities(withAttributes), ['Parrilla', 'Pileta']);
  assert.deepEqual(amenities({ labels: ['party-saloon'] }), ['party saloon']);
  assert.deepEqual(amenities({}), []);
});

test('specs skip the fields the agency did not inform', () => {
  const list = specs({ ambiences: 3, bedrooms: 0, bathrooms: 1, buildingArea: 0, landArea: 250 });
  assert.deepEqual(list, ['3 ambientes', '1 baño', '250 m² de terreno']);
});

test('videoEmbed normalises the four shapes the API can return', () => {
  assert.equal(videoEmbed('https://www.youtube.com/watch?v=gLcP6qqulhA&ab_channel=X'),
    'https://www.youtube.com/embed/gLcP6qqulhA');
  assert.equal(videoEmbed('https://www.youtube.com/shorts/DV5mG3XGPZU'),
    'https://www.youtube.com/embed/DV5mG3XGPZU');
  assert.equal(videoEmbed('<iframe width="560" src="https://www.youtube.com/embed/abc123XYZ"></iframe>'),
    'https://www.youtube.com/embed/abc123XYZ');
  assert.equal(videoEmbed('https://my.matterport.com/show?play=1&m=CmhKN1eSdqR'),
    'https://my.matterport.com/show?play=1&m=CmhKN1eSdqR');
  // Anything that is not embeddable is dropped rather than rendered broken.
  assert.equal(videoEmbed(''), '');
  assert.equal(videoEmbed('<iframe></iframe>'), '');
  assert.equal(videoEmbed('javascript:alert(1)'), '');
});

test('text from the API is escaped, and typed line breaks survive', () => {
  assert.equal(escapeHtml('<script>x</script>'), '&lt;script&gt;x&lt;/script&gt;');
  assert.equal(multiline('uno\ndos'), 'uno<br>dos');
  assert.equal(multiline('<b>\n'), '&lt;b&gt;<br>');
});

test('collectZones walks states -> counties -> cities and orders by count', () => {
  const payload = {
    states: [{
      id: 1, description: 'Capital Federal', count: 30,
      counties: [{
        id: 18, description: 'Caballito', count: 20,
        cities: [{ id: 900, description: 'Centro', count: 5 }],
      }],
    }],
  };
  const zones = collectZones(payload);
  assert.deepEqual(zones.map((z) => [z.level, z.id, z.count]), [
    ['stateId', 1, 30],
    ['countyId', 18, 20],
    ['cityId', 900, 5],
  ]);
  assert.equal(zones[1].name, 'Caballito, Capital Federal');
  assert.deepEqual(collectZones({}), []);
  assert.deepEqual(collectZones(null), []);
});

test('only one nav item is active, even though three links share a page', () => {
  const search = (q) => new URLSearchParams(q);
  // On /propiedades?operation=1 only "Ventas" lights up.
  assert.equal(isActive('propiedades.html?operation=1', 'propiedades.html', search('operation=1')), true);
  assert.equal(isActive('propiedades.html?operation=2', 'propiedades.html', search('operation=1')), false);
  assert.equal(isActive('propiedades.html?operation=3', 'propiedades.html', search('operation=1')), false);
  // The plain listing is not any of the three operations.
  assert.equal(isActive('propiedades.html?operation=1', 'propiedades.html', search('')), false);
  assert.equal(isActive('index.html', 'index.html', search('')), true);
  assert.equal(isActive('index.html', 'contacto.html', search('')), false);
});

test('a pale palette does not become unreadable text', () => {
  // Measured on a real account: primary #dfe1d6 over white is a 1.32 ratio.
  assert.ok(contrast('#dfe1d6', '#ffffff') < 1.5);
  assert.ok(contrast('#9d0c21', '#ffffff') > 4.5);
  // With a pale primary the accent falls through to the secondary.
  assert.equal(readableOn('#ffffff', ['#dfe1d6', '#9d0c21', '#16202b']), '#9d0c21');
  // With a dark primary it is kept.
  assert.equal(readableOn('#ffffff', ['#195fa9', '#4a7fe8', '#16202b']), '#195fa9');
  // If nothing passes, the last candidate is the guaranteed-dark ink.
  assert.equal(readableOn('#ffffff', ['#eeeeee', '#dddddd', '#16202b']), '#16202b');
  // Garbage from the API must not blow up the page.
  assert.equal(luminance('nope'), null);
  assert.equal(contrast('nope', '#ffffff'), 0);
  assert.equal(readableOn('#ffffff', [null, undefined, '#16202b']), '#16202b');
});
