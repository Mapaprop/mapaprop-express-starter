import { api } from './api.js';
import { layout } from './layout.js';
import {
  amenities, blueprints, escapeHtml, message, money, multiline, num, photos, qs, specs,
  statusBadge, videoEmbed, card, skeletons,
} from './ui.js';

const root = document.getElementById('detail-root');
const hash = qs('hash');

function facts(property) {
  const rows = [
    ['Tipo', property.propertyType || property.typeDesc],
    ['Operación', property.propertyOperation || property.operationDesc],
    ['Ambientes', num(property.ambiences)],
    ['Dormitorios', num(property.bedrooms)],
    ['Baños', num(property.bathrooms)],
    // 0 means "not informed" on these, so num() drops them instead of claiming there are none.
    ['Toilettes', num(property.toilettes)],
    ['Cocheras', num(property.garages ?? property.garage)],
    ['Superficie cubierta', num(property.buildingArea) ? `${num(property.buildingArea)} m²` : null],
    ['Superficie del terreno', num(property.landArea) ? `${num(property.landArea)} m²` : null],
    ['Antigüedad', num(property.yearsOld) ? `${num(property.yearsOld)} años` : null],
    ['Pisos del edificio', num(property.totalFloors)],
    ['Departamentos por piso', num(property.apartmentsPerFloor)],
    ['Orientación', property.ubication],
    ['Calefacción', property.heatingType],
    ['Aire acondicionado', property.airConditionerType],
    ['Código', property.code],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return `<ul class="facts">${rows
    .map(([label, value]) => `<li><strong>${escapeHtml(label)}</strong>${escapeHtml(String(value))}</li>`)
    .join('')}</ul>`;
}

function gallery(property) {
  const pics = photos(property);
  const plans = blueprints(property);
  const all = [...pics, ...plans];
  if (!all.length) return '<div class="gallery__main"><div class="card__media--empty">Sin fotos</div></div>';

  return `
    <div class="gallery">
      <div class="gallery__main">
        <img id="gallery-main" src="${escapeHtml(all[0].image)}" alt="${escapeHtml(property.title || 'Propiedad')}">
      </div>
      ${all.length > 1
        ? `<div class="gallery__thumbs">${all
            .map((img, index) => `<img data-full="${escapeHtml(img.image)}" src="${escapeHtml(img.thumbnail || img.image)}"
                 class="${index === 0 ? 'is-active' : ''}" alt="Foto ${index + 1}" loading="lazy">`)
            .join('')}</div>`
        : ''}
      ${plans.length ? `<p class="form__hint">Incluye ${plans.length} ${plans.length === 1 ? 'plano' : 'planos'}.</p>` : ''}
    </div>`;
}

function priceBox(property) {
  const extras = [];
  const expenses = num(property.expensesPrice);
  if (expenses) extras.push(`Expensas: ${property.expensesCurrency || ''} ${expenses.toLocaleString('es-AR')}`);
  const tax = num(property.taxPrice);
  if (tax) extras.push(`Impuestos: ${property.taxCurrency || ''} ${tax.toLocaleString('es-AR')}`);

  const alternatives = (property.alternativePrices || []).filter((p) => Number(p.price) > 1);

  return `<div class="price-box">
      <p class="price-box__price">${escapeHtml(money(property.price, property.currency))}</p>
      ${extras.length ? `<p class="price-box__extra">${escapeHtml(extras.join(' · '))}</p>` : ''}
      ${alternatives.length
        ? `<p class="price-box__extra">${alternatives
            .map((p) => escapeHtml(`${p.description}: ${p.currency || ''} ${Number(p.price).toLocaleString('es-AR')}`))
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
      <h3>Consultar por esta propiedad</h3>
      <div class="form__row">
        <div><label for="q-name">Nombre</label><input id="q-name" name="name" required minlength="3"></div>
        <div><label for="q-phone">Teléfono</label><input id="q-phone" name="phone" type="tel"></div>
      </div>
      <div><label for="q-email">Email</label><input id="q-email" name="email" type="email"></div>
      <div>
        <label for="q-message">Mensaje</label>
        <textarea id="q-message" name="message" required>Hola, quiero más información sobre ${escapeHtml(property.code || property.title || 'esta propiedad')}.</textarea>
      </div>
      <p class="form__hint">Dejá al menos un teléfono o un email para que podamos responderte.</p>
      <button class="btn btn--primary" type="submit">Enviar consulta</button>
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
      <h2>Ubicación</h2>
      <iframe class="map" loading="lazy" title="Mapa de la propiedad"
        src="https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}"></iframe>
    </section>`;
}

function videos(property) {
  const embeds = (property.videos || []).map((v) => videoEmbed(v.source)).filter(Boolean);
  if (!embeds.length) return '';
  return `<section class="section">
      <h2>Videos y recorridos</h2>
      <div class="videos">${embeds
        .map((src) => `<iframe src="${escapeHtml(src)}" title="Video de la propiedad" loading="lazy"
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
      <a href="propiedades.html">← Volver a las propiedades</a>
    </nav>
    <div class="detail">
      <div>
        ${gallery(property)}
        <h1 style="margin-top:1.2rem">${escapeHtml(property.title || 'Propiedad')}</h1>
        <p class="card__zone">${escapeHtml(property.address || '')}${property.zone ? ` · ${escapeHtml(property.zone)}` : ''}</p>
        ${badge ? `<p><span class="badge badge--status" style="position:static;display:inline-block">${badge}</span></p>` : ''}
        <p class="card__specs">${escapeHtml(specs(property).join(' · '))}</p>
        ${facts(property)}
        <h2>Descripción</h2>
        <div class="prose">${multiline(property.descriptionFormatted || property.description || '')}</div>
        ${property.conditions ? `<h2>Condiciones</h2><div class="prose">${multiline(property.conditions)}</div>` : ''}
        ${tags.length ? `<h2>Características</h2><ul class="chips">${tags.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>` : ''}
        ${videos(property)}
        ${map(property)}
        ${isDevelopment ? '<section class="section" id="units-section"><h2>Unidades del emprendimiento</h2><div class="grid" id="units"></div></section>' : ''}
      </div>
      <aside class="aside">
        ${priceBox(property)}
        ${contactForm(property)}
      </aside>
    </div>`;

  document.title = `${property.title || 'Propiedad'}`;

  document.querySelectorAll('.gallery__thumbs img').forEach((thumb) => {
    thumb.addEventListener('click', () => {
      document.getElementById('gallery-main').src = thumb.dataset.full;
      document.querySelectorAll('.gallery__thumbs img').forEach((t) => t.classList.remove('is-active'));
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
      message(feedback, 'Dejanos un email o un teléfono para poder responderte.', 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Enviando…';

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
        message(feedback, `No pudimos enviar la consulta (${response.error || 'error'}).`, 'error');
      } else {
        form.querySelectorAll('input, textarea').forEach((field) => { field.value = ''; });
        message(feedback, '¡Listo! Recibimos tu consulta y te vamos a responder a la brevedad.', 'ok');
      }
    } catch (error) {
      message(feedback, `No pudimos enviar la consulta: ${error.message}`, 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar consulta';
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
      : '<p class="notice">Todavía no hay unidades publicadas.</p>';
  } catch (error) {
    message(host, `No pudimos cargar las unidades: ${error.message}`, 'error');
  }
}

async function start() {
  layout();
  if (!hash) {
    message(root, 'No indicaste qué propiedad querés ver.', 'error');
    return;
  }
  try {
    // The detail response comes at the root of the document, not wrapped in { property: ... }.
    const property = await api.property(hash);
    if (!property || !property.propertyHash) {
      message(root, 'No encontramos esta propiedad. Puede que ya no esté publicada.', 'error');
      return;
    }
    render(property);
  } catch (error) {
    message(root, error.status === 404
      ? 'No encontramos esta propiedad. Puede que ya no esté publicada.'
      : `No pudimos cargar la propiedad: ${error.message}`, 'error');
  }
}

start();
