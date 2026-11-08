import { api, PAGE_SIZE } from './api.js';
import { layout } from './layout.js';
import { card, skeletons, escapeHtml, message, pager, collectZones } from './ui.js';

const results = document.getElementById('results');
const pagination = document.getElementById('pagination');
const form = document.getElementById('filters');

// Only the filters the API actually reads. Anything else would be silently ignored, which reads
// like a broken filter.
const FILTERS = ['term', 'operation', 'type', 'bedrooms', 'bathrooms', 'priceFrom', 'priceTo',
  'stateId', 'countyId', 'cityId', 'branchId'];

function currentParams() {
  const search = new URLSearchParams(window.location.search);
  const params = {};
  FILTERS.forEach((key) => {
    const value = search.get(key);
    if (value) params[key] = value;
  });
  params.from = Number(search.get('from') || 0);
  params.size = PAGE_SIZE;
  return params;
}

function pushParams(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (key === 'size') return;
    if (value !== '' && value !== null && value !== undefined && !(key === 'from' && !value)) {
      search.set(key, value);
    }
  });
  const query = search.toString();
  window.history.replaceState({}, '', query ? `?${query}` : window.location.pathname);
}

function fillForm(params) {
  document.getElementById('f-term').value = params.term || '';
  document.getElementById('f-operation').value = params.operation || '';
  document.getElementById('f-type').value = params.type || '';
  document.getElementById('f-bedrooms').value = params.bedrooms || '';
  document.getElementById('f-bathrooms').value = params.bathrooms || '';
  document.getElementById('f-priceFrom').value = params.priceFrom || '';
  document.getElementById('f-priceTo').value = params.priceTo || '';
  ['stateId', 'countyId', 'cityId'].forEach((level) => {
    if (params[level]) document.getElementById('f-zone').value = `${level}:${params[level]}`;
  });
}

async function fillCatalogs(params) {
  const [operations, types, zones] = await Promise.allSettled([api.operations(), api.types(), api.zones()]);
  if (operations.status === 'fulfilled') {
    const select = document.getElementById('f-operation');
    (operations.value.operations || []).forEach((o) =>
      select.insertAdjacentHTML('beforeend', `<option value="${o.id}">${escapeHtml(o.description)}</option>`));
  }
  if (types.status === 'fulfilled') {
    const select = document.getElementById('f-type');
    (types.value.types || []).forEach((t) =>
      select.insertAdjacentHTML('beforeend', `<option value="${t.id}">${escapeHtml(t.description)}</option>`));
  }
  if (zones.status === 'fulfilled') {
    const select = document.getElementById('f-zone');
    collectZones(zones.value).forEach((z) =>
      select.insertAdjacentHTML('beforeend',
        `<option value="${z.level}:${z.id}">${escapeHtml(z.name)} (${z.count})</option>`));
  }
  fillForm(params);
}

async function load(params) {
  results.innerHTML = skeletons(6);
  pagination.innerHTML = '';
  pushParams(params);

  try {
    const { properties = [], total = 0 } = await api.properties(params);
    document.getElementById('listing-count').textContent =
      total === 1 ? '1 propiedad' : `${total} propiedades`;

    if (!properties.length) {
      message(results, total === 0
        ? 'No encontramos propiedades con esos filtros. Probá quitando alguno.'
        : 'Esta página quedó vacía. Volvé a la primera.');
      return;
    }

    results.innerHTML = properties.map(card).join('');
    pagination.innerHTML = pager(total, params.from, params.size, (from) => {
      load({ ...params, from });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    message(results, `No pudimos cargar las propiedades: ${error.message}`, 'error');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const params = { from: 0, size: PAGE_SIZE };
  const term = document.getElementById('f-term').value.trim();
  // The API requires at least 3 characters on `term`; sending fewer is a validation error.
  if (term.length >= 3) params.term = term;
  ['operation', 'type', 'bedrooms', 'bathrooms', 'priceFrom', 'priceTo'].forEach((key) => {
    const value = document.getElementById(`f-${key}`).value;
    if (value) params[key] = value;
  });
  const zone = document.getElementById('f-zone').value;
  if (zone) {
    const [level, id] = zone.split(':');
    params[level] = id;
  }
  load(params);
});

document.getElementById('f-clear').addEventListener('click', (event) => {
  event.preventDefault();
  form.reset();
  load({ from: 0, size: PAGE_SIZE });
});

const initial = currentParams();
layout();
fillCatalogs(initial);
load(initial);
