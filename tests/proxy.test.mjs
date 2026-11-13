// The proxy's allowlist is the security boundary of this kit: the account's single token can carry
// write and publish scopes, so what the browser is allowed to reach has to be exactly the list of
// actions the site uses. These tests exist so that boundary is not only written but exercised.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAction, findRoute } from '../api/mp/[...path].js';

test('buildAction accepts the shapes Vercel actually hands over', () => {
  assert.equal(buildAction(['properties']), 'properties');
  assert.equal(buildAction(['properties', 'e86a6a15b7f93ae633b0b009c5c51120']),
    'properties/e86a6a15b7f93ae633b0b009c5c51120');
  assert.equal(buildAction(['development', 'properties']), 'development/properties');
  assert.equal(buildAction('settings-v2'), 'settings-v2');
});

test('buildAction rejects anything that could widen the upstream target', () => {
  assert.equal(buildAction(['..', 'property-api-v1']), null);
  assert.equal(buildAction(['properties', '../../oauth2-v1/authorize']), null);
  assert.equal(buildAction(['proper/ties']), null);
  assert.equal(buildAction(['https:', '', 'evil.example']), null);
  assert.equal(buildAction(['properties', '']), null);
  assert.equal(buildAction([]), null);
  assert.equal(buildAction(undefined), null);
});

test('the reads the site needs are allowed', () => {
  for (const action of ['properties', 'developments', 'development/properties', 'featureds',
    'types', 'operations', 'zones', 'branches', 'features', 'settings-v2', 'design']) {
    assert.ok(findRoute('GET', action), `GET ${action} debería estar permitido`);
  }
  assert.ok(findRoute('GET', 'properties/abc123'));
});

test('the three entry points are allowed, and only as POST', () => {
  assert.ok(findRoute('POST', 'messages'));
  assert.ok(findRoute('POST', 'contact'));
  assert.ok(findRoute('POST', 'seller-submissions'));
  assert.equal(findRoute('GET', 'messages'), null);
  assert.equal(findRoute('GET', 'contact'), null);
  assert.equal(findRoute('GET', 'seller-submissions'), null);
});

test('nothing else gets through, including writes this token might be able to make', () => {
  // An account with the Property API add-on carries write and publish scopes on this same token.
  assert.equal(findRoute('POST', 'properties'), null);
  assert.equal(findRoute('PUT', 'properties'), null);
  assert.equal(findRoute('DELETE', 'properties'), null);
  assert.equal(findRoute('POST', 'types'), null);
  assert.equal(findRoute('GET', 'authorize'), null);
  assert.equal(findRoute('GET', 'pages'), null); // not used by this kit: add a ROUTES row first
  assert.equal(findRoute('POST', 'featureds'), null); // a read-only action stays read-only here
  assert.equal(findRoute('GET', ''), null);
  assert.equal(findRoute('GET', null), null);
});

test('catalogs are cached and the entry points are not', () => {
  assert.ok(findRoute('GET', 'types').sMaxAge >= 3600);
  assert.equal(findRoute('POST', 'messages').sMaxAge, 0);
  // messages is form-encoded, seller-submissions is JSON: the endpoints differ and so must we.
  assert.equal(findRoute('POST', 'messages').form, true);
  assert.equal(findRoute('POST', 'contact').sMaxAge, 0);
  // `contact` lee parametros de request como `messages`, no JSON como seller-submissions.
  assert.equal(findRoute('POST', 'contact').form, true);
  assert.equal(findRoute('POST', 'seller-submissions').json, true);
});

test('🔴 `contact` no deja pasar el `subject`: el visitante no elige el asunto del mail al dueno', () => {
  // El endpoint lo acepta y es opcional. Dejarlo pasar le daria a cualquiera la linea de asunto del
  // correo que recibe la inmobiliaria. Es el mismo argumento por el que `websiteId` esta afuera de
  // seller-submissions.
  assert.equal(findRoute('POST', 'contact').fields.includes('subject'), false);
  assert.ok(findRoute('POST', 'contact').fields.includes('message'));
  // Y tampoco el propertyHash: si viniera, esto dejaria de ser la consulta generica.
  assert.equal(findRoute('POST', 'contact').fields.includes('propertyHash'), false);
});
