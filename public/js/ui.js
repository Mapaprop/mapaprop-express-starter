// Render helpers shared by every page. The gotchas of the property object live here, in one place,
// so no page has to remember them.

// On these optional integers the API returns 0 to mean "the agency did not inform it", not "zero":
// totalFloors, floors, apartmentsPerFloor, toilettes, dependencies, expensesPrice, taxPrice. The
// whole object follows the convention, so treat 0 as absence everywhere.
export function num(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 0) return null;
  return parsed;
}

// Some fields arrive as floats on the detail endpoint (type: 20.0, price: 54554.0).
export function int(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// Text the agency typed with line breaks (descriptionFormatted, design slide titles).
export function multiline(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

// A price of 0 or 1 is not a data-entry mistake: it is how an agency asks to be contacted instead
// of publishing a number.
export function money(price, currency) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 1) return 'Consultar precio';
  return `${currency || ''} ${value.toLocaleString('es-AR')}`.trim();
}

// Images: `image.type` is 1 = PHOTO, 2 = BLUEPRINT, so plans must not land in the photo gallery.
export function photos(property) {
  return (property.images || []).filter((i) => int(i.type) !== 2 && i.image);
}

export function blueprints(property) {
  return (property.images || []).filter((i) => int(i.type) === 2 && i.image);
}

// `mainImage` is a full URL on the listing but can be a bare filename on the detail response, so it
// is only trusted when it actually looks like a URL.
export function cover(property) {
  const first = photos(property)[0];
  if (first) return first.thumbnail || first.image;
  const main = property.mainImage;
  if (typeof main === 'string' && main.startsWith('http') && !main.includes('noimage')) return main;
  return '';
}

// Commercial state. These are not filtered out by the API: a sold property still comes back, with
// its flag on, and it is the site's job to label it.
export function statusBadge(property) {
  if (property.sold) return 'Vendida';
  if (property.rented) return 'Alquilada';
  if (property.reserved) return 'Reservada';
  if (property.suspended) return 'Suspendida';
  return '';
}

// Amenities: `attributes[]` already carries a `label` translated to the account's locale, so it is
// preferred over `labels[]`, which is a list of raw constant keys.
export function amenities(property) {
  const fromAttributes = (property.attributes || [])
    .filter((a) => a && a.status === true && a.label)
    .map((a) => a.label);
  if (fromAttributes.length) return [...new Set(fromAttributes)];
  return (property.labels || []).map((key) => String(key).replace(/-/g, ' '));
}

// The handful of figures that fit under a card or next to a title.
export function specs(property) {
  const out = [];
  const add = (value, singular, plural) => {
    const n = num(value);
    if (n) out.push(`${n} ${n === 1 ? singular : plural}`);
  };
  add(property.ambiences, 'ambiente', 'ambientes');
  add(property.bedrooms, 'dormitorio', 'dormitorios');
  add(property.bathrooms, 'baño', 'baños');
  add(property.garages ?? property.garage, 'cochera', 'cocheras');
  const built = num(property.buildingArea);
  if (built) out.push(`${built} m² cubiertos`);
  const land = num(property.landArea);
  if (land) out.push(`${land} m² de terreno`);
  return out;
}

export function propertyUrl(property) {
  return `propiedad.html?hash=${encodeURIComponent(property.propertyHash)}`;
}

export function card(property) {
  const badge = statusBadge(property);
  const image = cover(property);
  const detail = specs(property).slice(0, 3).join(' · ');
  return `
    <a class="card" href="${propertyUrl(property)}">
      <div class="card__media">
        ${image
          ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(property.title || 'Propiedad')}" loading="lazy">`
          : '<div class="card__media--empty">Sin fotos</div>'}
        ${badge ? `<span class="badge badge--status">${badge}</span>` : ''}
        ${property.development === true ? '<span class="badge badge--dev">Emprendimiento</span>' : ''}
      </div>
      <div class="card__body">
        <p class="card__kicker">${escapeHtml(property.propertyOperation || property.operationDesc || '')} · ${escapeHtml(property.propertyType || property.typeDesc || '')}</p>
        <h3 class="card__title">${escapeHtml(property.title || 'Sin título')}</h3>
        <p class="card__zone">${escapeHtml(property.zone || property.address || '')}</p>
        ${detail ? `<p class="card__specs">${escapeHtml(detail)}</p>` : ''}
        <p class="card__price">${escapeHtml(money(property.price, property.currency))}</p>
      </div>
    </a>`;
}

export function skeletons(count = 6) {
  return Array.from({ length: count }, () => '<div class="card card--skeleton"></div>').join('');
}

export function message(container, text, kind = 'info') {
  container.innerHTML = `<p class="notice notice--${kind}">${escapeHtml(text)}</p>`;
}

// Pagination over `from`/`total`. The API caps `size` at 20, so a long list is always paged.
export function pager(total, from, size, onGo) {
  if (total <= size) return '';
  const pages = Math.ceil(total / size);
  const current = Math.floor(from / size) + 1;
  const window = [];
  for (let p = Math.max(1, current - 2); p <= Math.min(pages, current + 2); p += 1) window.push(p);
  const button = (page, label = page, disabled = false) =>
    `<button class="pager__item${page === current ? ' is-current' : ''}" ${disabled ? 'disabled' : ''} data-page="${page}">${label}</button>`;
  setTimeout(() => {
    document.querySelectorAll('.pager__item[data-page]').forEach((el) => {
      el.addEventListener('click', () => onGo((Number(el.dataset.page) - 1) * size));
    });
  }, 0);
  return `<nav class="pager">
    ${button(current - 1, '‹', current === 1)}
    ${window.map((p) => button(p)).join('')}
    ${button(current + 1, '›', current === pages)}
    <span class="pager__total">${total} propiedades</span>
  </nav>`;
}

export function qs(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

// `videos[].source` arrives in four shapes: a youtube watch URL, a youtube shorts URL, a full
// <iframe> string the agency pasted, and a Matterport tour URL. Only an embeddable URL is ever
// returned -- the iframe string is parsed for its src instead of being injected, so markup from the
// API never reaches innerHTML.
export function videoEmbed(source) {
  if (typeof source !== 'string' || !source.trim()) return '';
  let url = source.trim();

  if (url.startsWith('<')) {
    const match = url.match(/src=["']([^"']+)["']/i);
    if (!match) return '';
    url = match[1];
  }

  if (!/^https?:\/\//i.test(url)) return '';

  const youtubeId =
    url.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    url.match(/youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,})/)?.[1] ||
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/)?.[1] ||
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1];
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;

  if (/vimeo\.com\/(\d+)/.test(url)) return `https://player.vimeo.com/video/${url.match(/vimeo\.com\/(\d+)/)[1]}`;
  if (/matterport\.com\/show/.test(url)) return url;
  return '';
}

// The zone tree is states -> counties -> cities, and every node carries a `count` of published
// properties (the levels accumulate, and a zone with none is simply absent). The counts are what
// make the pills useful, so they are kept and used for ordering.
export function collectZones(payload) {
  const out = [];
  (payload?.states || []).forEach((state) => {
    out.push({ level: 'stateId', id: state.id, name: state.description, count: state.count || 0 });
    (state.counties || []).forEach((county) => {
      out.push({
        level: 'countyId', id: county.id, count: county.count || 0,
        name: `${county.description}, ${state.description}`,
      });
      (county.cities || []).forEach((city) => {
        out.push({
          level: 'cityId', id: city.id, count: city.count || 0,
          name: `${city.description}, ${county.description}`,
        });
      });
    });
  });
  return out.sort((a, b) => b.count - a.count);
}

// Three of the links point at the same page and differ only by `operation`, so comparing the file
// name alone lights all three up at once. The query has to be part of the comparison.
export function isActive(href, current, search) {
  const [page, query] = href.split('?');
  if (page !== current) return false;
  const wanted = new URLSearchParams(query || '').get('operation');
  const actual = search.get('operation');
  return wanted === actual || (!wanted && !actual);
}
