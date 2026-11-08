import { api, PAGE_SIZE } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message, money, num, pager, propertyUrl, skeletons, cover, statusBadge } from './ui.js';

const host = document.getElementById('developments');
const pagination = document.getElementById('pagination');

// A development declares what the project will be (`totalApartments`, `totalTowers`) and carries a
// `developmentStats` block with what is actually loaded. Both are true and answer different
// questions, so the card shows the measured one and falls back to the declared one.
function stats(property) {
  const s = property.developmentStats;
  if (!s) return '';
  const bits = [];
  if (s.units?.total) bits.push(`${s.units.total} ${s.units.total === 1 ? 'unidad' : 'unidades'}`);
  if (s.units?.available) bits.push(`${s.units.available} disponibles`);
  const currencies = Object.entries(s.prices?.byCurrency || {});
  if (currencies.length === 1) {
    const [currency, range] = currencies[0];
    if (range.from) {
      bits.push(range.from === range.to
        ? `${currency} ${Number(range.from).toLocaleString('es-AR')}`
        : `desde ${currency} ${Number(range.from).toLocaleString('es-AR')}`);
    }
  } else if (currencies.length > 1) {
    bits.push('precios en varias monedas');
  }
  return bits.join(' · ');
}

function developmentCard(property) {
  const image = cover(property);
  const badge = statusBadge(property);
  const measured = stats(property);
  const declared = num(property.totalApartments)
    ? `Proyecto de ${num(property.totalApartments)} unidades`
    : '';
  return `
    <a class="card" href="${propertyUrl(property)}">
      <div class="card__media">
        ${image
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(property.title || 'Emprendimiento')}" loading="lazy">`
          : '<div class="card__media--empty">Sin fotos</div>'}
        ${badge ? `<span class="badge badge--status">${badge}</span>` : ''}
        <span class="badge badge--dev">Emprendimiento</span>
      </div>
      <div class="card__body">
        <p class="card__kicker">${escapeHtml(property.propertyOperation || '')}</p>
        <h3 class="card__title">${escapeHtml(property.title || 'Sin título')}</h3>
        <p class="card__zone">${escapeHtml(property.zone || property.address || '')}</p>
        ${declared ? `<p class="card__specs">${escapeHtml(declared)}</p>` : ''}
        ${measured ? `<p class="card__specs">${escapeHtml(measured)}</p>` : ''}
        <p class="card__price">${escapeHtml(money(property.price, property.currency))}</p>
      </div>
    </a>`;
}

async function load(from = 0) {
  host.innerHTML = skeletons(3);
  pagination.innerHTML = '';
  try {
    // `type` is forced to 23 by the API: whatever is sent is overwritten.
    const { properties = [], total = 0 } = await api.developments({ from, size: PAGE_SIZE });
    document.getElementById('dev-count').textContent =
      total === 1 ? '1 emprendimiento' : `${total} emprendimientos`;

    if (!properties.length) {
      message(host, 'Todavía no hay emprendimientos publicados.');
      return;
    }
    host.innerHTML = properties.map(developmentCard).join('');
    pagination.innerHTML = pager(total, from, PAGE_SIZE, (next) => {
      load(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    message(host, `No pudimos cargar los emprendimientos: ${error.message}`, 'error');
  }
}

layout();
load();
