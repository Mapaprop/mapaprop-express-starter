import { api } from './api.js';
import { layout } from './layout.js';
import {
  amenities, blueprints, escapeHtml, message, money, multiline, num, photos, qs, specs,
  statusBadge, videoEmbed, card, skeletons, safeUrl,
} from './ui.js';
import { t, formatNumber } from './i18n.js';

const root = document.getElementById('detail-root');
const hash = qs('hash');

function facts(property) {
  // The LABEL is ours and gets translated; the VALUE comes from the API already in the account's
  // language (`propertyType`, `ubication`, `heatingType`) and is passed through untouched.
  const rows = [
    [t('facts.type'), property.propertyType || property.typeDesc],
    [t('facts.operation'), property.propertyOperation || property.operationDesc],
    [t('facts.ambiences'), num(property.ambiences)],
    [t('facts.bedrooms'), num(property.bedrooms)],
    [t('facts.bathrooms'), num(property.bathrooms)],
    // 0 means "not informed" on these, so num() drops them instead of claiming there are none.
    [t('facts.toilettes'), num(property.toilettes)],
    [t('facts.garages'), num(property.garages ?? property.garage)],
    [t('facts.builtArea'), num(property.buildingArea) ? `${num(property.buildingArea)} m²` : null],
    [t('facts.landArea'), num(property.landArea) ? `${num(property.landArea)} m²` : null],
    [t('facts.age'), num(property.yearsOld) ? t('facts.ageValue', { n: num(property.yearsOld) }) : null],
    [t('facts.totalFloors'), num(property.totalFloors)],
    [t('facts.apartmentsPerFloor'), num(property.apartmentsPerFloor)],
    [t('facts.ubication'), property.ubication],
    [t('facts.heating'), property.heatingType],
    [t('facts.airConditioning'), property.airConditionerType],
    [t('facts.code'), property.code],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return `<ul class="facts">${rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(String(value))}</li>`)
    .join('')}</ul>`;
}

function gallery(property) {
  const pics = photos(property);
  const plans = blueprints(property);
  const all = [...pics, ...plans];
  if (!all.length) return `<div class="gallery__main"><div class="card__media--empty">${escapeHtml(t('card.noPhotos'))}</div></div>`;

  return `
    <div class="gallery">
      <div class="gallery__main">
        <img id="gallery-main" src="${escapeHtml(safeUrl(all[0].image))}" alt="${escapeHtml(property.title || t('card.property'))}">
      </div>
      ${all.length > 1
        ? `<div class="gallery__thumbs">${all
            .map((img, index) => `<img data-full="${escapeHtml(safeUrl(img.image))}" src="${escapeHtml(safeUrl(img.thumbnail || img.image))}"
                 class="${index === 0 ? 'is-active' : ''}" alt="${escapeHtml(t('detail.photoAlt', { n: index + 1 }))}" loading="lazy">`)
            .join('')}</div>`
        : ''}
      ${plans.length ? `<p class="form__hint">${escapeHtml(t('detail.blueprints', { n: plans.length }))}</p>` : ''}
    </div>`;
}

function priceBox(property) {
  const extras = [];
  const expenses = num(property.expensesPrice);
  if (expenses) {
    extras.push(t('detail.expenses', { amount: `${property.expensesCurrency || ''} ${formatNumber(expenses)}`.trim() }));
  }
  const tax = num(property.taxPrice);
  if (tax) {
    extras.push(t('detail.taxes', { amount: `${property.taxCurrency || ''} ${formatNumber(tax)}`.trim() }));
  }

  const alternatives = (property.alternativePrices || []).filter((p) => Number(p.price) > 1);

  return `<div class="price-box">
      <p class="price-box__price">${escapeHtml(money(property.price, property.currency))}</p>
      ${extras.length ? `<p class="price-box__extra">${escapeHtml(extras.join(' · '))}</p>` : ''}
      ${alternatives.length
        ? `<p class="price-box__extra">${alternatives
            .map((p) => escapeHtml(`${p.description}: ${p.currency || ''} ${formatNumber(p.price)}`))
            .join('<br>')}</p>`
        : ''}
    </div>`;
}

// The form that closes the circle. It posts to `POST express-v1/messages`, so the enquiry lands in
// the agency's Mapaprop inbox as a lead: it can be assigned, followed, scored and it shows up in
// their reports. A site that captures enquiries anywhere else leaves the agency loading properties
// into Mapaprop and answering clients outside of it.
function contactForm(property) {
  return `<form class="form" id="enquiry">
      <h3>${escapeHtml(t('enquiry.title'))}</h3>
      <div class="form__row">
        <div><label for="q-name">${escapeHtml(t('enquiry.name'))}</label><input id="q-name" name="name" required minlength="3"></div>
        <div><label for="q-phone">${escapeHtml(t('enquiry.phone'))}</label><input id="q-phone" name="phone" type="tel"></div>
      </div>
      <div><label for="q-email">${escapeHtml(t('enquiry.email'))}</label><input id="q-email" name="email" type="email"></div>
      <div>
        <label for="q-message">${escapeHtml(t('enquiry.message'))}</label>
        <textarea id="q-message" name="message" required>${escapeHtml(t('enquiry.draft', {
          subject: property.code || property.title || t('enquiry.thisProperty'),
        }))}</textarea>
      </div>
      <p class="form__hint">${escapeHtml(t('enquiry.hint'))}</p>
      <button class="btn btn--primary" type="submit">${escapeHtml(t('enquiry.submit'))}</button>
      <div id="enquiry-feedback"></div>
    </form>`;
}

function map(property) {
  const lat = Number(property.location?.lat);
  const lon = Number(property.location?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return '';
  // OpenStreetMap needs no API key, so the starter kit works before the agency configures a map
  // provider. Swap in Google Maps or Mapbox here if you have a key.
  const bbox = [lon - 0.004, lat - 0.003, lon + 0.004, lat + 0.003].join(',');
  return `<section class="section">
      <h2>${escapeHtml(t('detail.location'))}</h2>
      <iframe class="map" loading="lazy" title="${escapeHtml(t('detail.mapTitle'))}"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}"></iframe>
    </section>`;
}

function videos(property) {
  const embeds = (property.videos || []).map((v) => videoEmbed(v.source)).filter(Boolean);
  if (!embeds.length) return '';
  return `<section class="section">
      <h2>${escapeHtml(t('detail.videos'))}</h2>
      <div class="videos">${embeds
        // `safeUrl` en el sink: hoy el unico que decide que entra aca es `videoEmbed()`, y nada
        // obliga a que siga siendo asi. Un <iframe src> enmarca contenido arbitrario, que es lo
        // que lo diferencia de un <img>.
        .map((src) => `<iframe src="${escapeHtml(safeUrl(src))}" title="${escapeHtml(t('detail.videoTitle'))}" loading="lazy"
             allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
             allowfullscreen></iframe>`)
        .join('')}</div>
    </section>`;
}

function render(property) {
  const badge = statusBadge(property);
  const tags = amenities(property);
  const isDevelopment = property.development === true;

  root.innerHTML = `
    <nav class="form__hint" style="margin-bottom:1rem">
      <a href="propiedades.html">${escapeHtml(t('detail.back'))}</a>
    </nav>
    <div class="detail">
      <div>
        ${gallery(property)}
        <h1 style="margin-top:1.2rem">${escapeHtml(property.title || t('card.property'))}</h1>
        <p class="card__zone">${escapeHtml(property.address || '')}${property.zone ? ` · ${escapeHtml(property.zone)}` : ''}</p>
        ${badge ? `<p><span class="badge badge--status" style="position:static;display:inline-block">${badge}</span></p>` : ''}
        <p class="card__specs">${escapeHtml(specs(property).join(' · '))}</p>
        ${facts(property)}
        <h2>${escapeHtml(t('detail.description'))}</h2>
        <div class="prose">${multiline(property.descriptionFormatted || property.description || '')}</div>
        ${property.conditions ? `<h2>${escapeHtml(t('detail.conditions'))}</h2><div class="prose">${multiline(property.conditions)}</div>` : ''}
        ${tags.length ? `<h2>${escapeHtml(t('detail.amenities'))}</h2><ul class="chips">${tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>` : ''}
        ${videos(property)}
        ${map(property)}
        ${isDevelopment ? `<section class="section" id="units-section"><h2>${escapeHtml(t('detail.units'))}</h2><div class="grid" id="units"></div></section>` : ''}
      </div>
      <aside class="aside">
        ${priceBox(property)}
        ${contactForm(property)}
      </aside>
    </div>`;

  document.title = property.title || t('card.property');

  document.querySelectorAll('.gallery__thumbs img').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      // Viaje de ida y vuelta por el DOM: el valor se escapo al escribir el atributo y vuelve
      // CRUDO por `dataset`. En un <img> no ejecuta, pero el patron `data-*` -> propiedad copiado
      // a un <a> si lo haria, y este archivo es el ejemplo que alguien va a copiar.
      document.getElementById('gallery-main').src = safeUrl(thumb.dataset.full);
      document.querySelectorAll('.gallery__thumbs img').forEach((other) => other.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });

  wireEnquiry(property);
  if (isDevelopment) loadUnits(property);
}

function wireEnquiry(property) {
  const form = document.getElementById('enquiry');
  const feedback = document.getElementById('enquiry-feedback');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('q-email').value.trim();
    const phone = document.getElementById('q-phone').value.trim();
    if (!email && !phone) {
      message(feedback, t('enquiry.needContact'), 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = t('enquiry.sending');

    try {
      // ip, userAgent and referer are added by the proxy: the browser cannot know its own IP, and
      // the API requires all three for its antispam check.
      const response = await api.sendMessage({
        propertyHash: property.propertyHash,
        name: document.getElementById('q-name').value.trim(),
        email,
        phone,
        message: document.getElementById('q-message').value.trim(),
        url: window.location.href,
      });

      if (response.success === false) {
        message(feedback, t('enquiry.failed', { code: response.error || 'error' }), 'error');
      } else {
        form.querySelectorAll('input, textarea').forEach((field) => { field.value = ''; });
        message(feedback, t('enquiry.sent'), 'ok');
      }
    } catch (error) {
      message(feedback, t('enquiry.error', { message: error.message }), 'error');
    } finally {
      button.disabled = false;
      button.textContent = t('enquiry.submit');
    }
  });
}

// A development carries the ids of its units in `developmentProperties`, and they are fetched in one
// call. `propertyIds` cannot be empty: the API rejects a blank value instead of returning the whole
// index (that was a cross-customer leak fixed in June 2026).
async function loadUnits(property) {
  const ids = property.developmentProperties || [];
  const host = document.getElementById('units');
  if (!ids.length) {
    document.getElementById('units-section').remove();
    return;
  }
  host.innerHTML = skeletons(3);
  try {
    const { properties = [] } = await api.developmentUnits(ids, { size: 20 });
    host.innerHTML = properties.length
      ? properties.map(card).join('')
      : `<p class="notice">${t('detail.unitsEmpty')}</p>`;
  } catch (error) {
    message(host, t('detail.unitsError', { message: error.message }), 'error');
  }
}

async function start() {
  layout();
  if (!hash) {
    message(root, t('detail.noHash'), 'error');
    return;
  }
  try {
    // The detail response comes at the root of the document, not wrapped in { property: ... }.
    const property = await api.property(hash);
    if (!property || !property.propertyHash) {
      message(root, t('detail.notFound'), 'error');
      return;
    }
    render(property);
  } catch (error) {
    message(root, error.status === 404
      ? t('detail.notFound')
      : t('detail.loadError', { message: error.message }), 'error');
  }
}

start();
