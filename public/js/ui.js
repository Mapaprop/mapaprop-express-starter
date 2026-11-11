// Render helpers shared by every page. The gotchas of the property object live here, in one place,
// so no page has to remember them.
//
// Every text comes from i18n.js. What the API sends (propertyType, propertyOperation,
// attributes[].label, the zone names) is NOT translated here: it already arrives in the account's
// own language.
import { t, formatNumber } from './i18n.js';

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

// 🔴 escapeHtml is NOT enough for an href. It stops you from breaking OUT of the attribute, but
// `javascript:alert(1)` contains none of the five characters it replaces, so it survives intact and
// becomes a clickable script. Every URL that comes from the API goes through here first: anything
// that is not http(s) is dropped, and a dropped link is better than a link that runs code.
export function safeUrl(value) {
  const url = String(value ?? '').trim();
  // Empty first: resolving "" against the base returns the CURRENT page, which would turn a social
  // link the agency never configured into a link back to itself.
  if (!url) return '';
  // The scheme check is done on the PARSED url, not with a regex on the raw string: leading
  // control characters and whitespace are legal in an href and browsers strip them before deciding
  // the scheme, so `\njavascript:` is a javascript URL to the browser and not to a naive regex.
  try {
    const parsed = new URL(url, globalThis.location?.href || 'https://example.invalid');
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}

// The routes a Mapaprop website uses, mapped onto the pages THIS kit ships.
//
// Why it is needed: `design.callToActions[].buttonLink` is configured against the agency's Mapaprop
// site, so it arrives as `/contacto`, `/destacados`, `/buscar/ventas/` -- paths that exist there and
// not here, where the pages are files ending in `.html`. Measured in production on 2026-11-11: the
// demo's buttons pointed at `/contacto` and `/pagina/creditos.` and both answered 404.
//
// The left column is not invented: it is the href vocabulary of the `express-basic-1` template, the
// one these accounts render with. A path with no counterpart here -- `/blog`, `/pagina/<slug>`, a
// property by seoUrl -- returns empty on purpose, so the caller decides what to do instead of
// linking somewhere that does not exist.
const SITE_ROUTES = new Map([
  ['/', 'index.html'],
  ['/contacto', 'contacto.html'],
  ['/vender', 'vender.html'],
  ['/destacados', 'index.html'],
  ['/desarrollos-inmobiliarios', 'emprendimientos.html'],
  ['/buscar/ventas', 'propiedades.html?operation=1'],
  ['/buscar/alquileres', 'propiedades.html?operation=2'],
  ['/buscar/alquileres-temporarios', 'propiedades.html?operation=3'],
]);

export function siteUrl(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  // Anything with a scheme is the agency pointing OUT of the site (wa.me, its Facebook): that one
  // travels as it is, through the same scheme check as every other link.
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return safeUrl(raw);
  // Only the path matters for the lookup; a trailing slash is the same route.
  const path = raw.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return SITE_ROUTES.get(path.toLowerCase()) || '';
}

// Text the agency typed with line breaks (descriptionFormatted, design slide titles).
export function multiline(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

// A price of 0 or 1 is not a data-entry mistake: it is how an agency asks to be contacted instead
// of publishing a number.
export function money(price, currency) {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 1) return t('card.askPrice');
  // The currency is the property's and the grouping is the language's: the two never swap.
  return `${currency || ''} ${formatNumber(value)}`.trim();
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
  if (property.sold) return t('status.sold');
  if (property.rented) return t('status.rented');
  if (property.reserved) return t('status.reserved');
  if (property.suspended) return t('status.suspended');
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
  const add = (value, key) => {
    const n = num(value);
    if (n) out.push(t(`specs.${key}`, { n }));
  };
  add(property.ambiences, 'ambiences');
  add(property.bedrooms, 'bedrooms');
  add(property.bathrooms, 'bathrooms');
  add(property.garages ?? property.garage, 'garages');
  const built = num(property.buildingArea);
  if (built) out.push(t('specs.builtArea', { n: built }));
  const land = num(property.landArea);
  if (land) out.push(t('specs.landArea', { n: land }));
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
          ? `<img src="${escapeHtml(safeUrl(image))}" alt="${escapeHtml(property.title || t('card.property'))}" loading="lazy">`
          : `<div class="card__media--empty">${escapeHtml(t('card.noPhotos'))}</div>`}
        ${badge ? `<span class="badge badge--status">${badge}</span>` : ''}
        ${property.development === true ? `<span class="badge badge--dev">${escapeHtml(t('card.development'))}</span>` : ''}
      </div>
      <div class="card__body">
        <p class="card__kicker">${escapeHtml(property.propertyOperation || property.operationDesc || '')} · ${escapeHtml(property.propertyType || property.typeDesc || '')}</p>
        <h3 class="card__title">${escapeHtml(property.title || t('card.noTitle'))}</h3>
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
let pagerSeq = 0;

export function pager(total, from, size, onGo) {
  if (total <= size) return '';
  const pages = Math.ceil(total / size);
  const current = Math.floor(from / size) + 1;
  const window = [];
  for (let p = Math.max(1, current - 2); p <= Math.min(pages, current + 2); p += 1) window.push(p);
  const button = (page, label = page, disabled = false) =>
    `<button class="pager__item${page === current ? ' is-current' : ''}" ${disabled ? 'disabled' : ''} data-page="${page}">${label}</button>`;
  // Los botones se cablean POR INSTANCIA, con una marca propia: un `querySelectorAll` global
  // engancha los botones de cualquier otro pager del documento al `onGo` del ultimo renderizado.
  // Hoy hay uno solo por pagina y funciona igual; con un paginado arriba y otro abajo -- que es lo
  // primero que va a hacer quien copie este helper -- el de arriba pasa a mover el de abajo.
  const id = `pager-${(pagerSeq += 1)}`;
  setTimeout(() => {
    document.querySelectorAll(`[data-pager="${id}"] .pager__item[data-page]`).forEach((el) => {
      el.addEventListener('click', () => onGo((Number(el.dataset.page) - 1) * size));
    });
  }, 0);
  return `<nav class="pager" data-pager="${id}">
    ${button(current - 1, '‹', current === 1)}
    ${window.map((p) => button(p)).join('')}
    ${button(current + 1, '›', current === pages)}
    <span class="pager__total">${escapeHtml(t('pager.total', { n: total }))}</span>
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

  // 🔴 Matterport es el unico caso que devuelve la URL CRUDA, asi que es el unico donde el chequeo
  // tiene que mirar el HOST y no el string: un regex suelto como /matterport\.com\/show/ matchea
  // `https://evil.example/x?r=matterport.com/show`, y eso termina dentro de un <iframe> en la
  // ficha. No es ejecucion en nuestro origen, pero es contenido ajeno enmarcado con el sitio del
  // cliente alrededor, que es el material de un phishing.
  try {
    const host = new URL(url).hostname.toLowerCase();
    if ((host === 'matterport.com' || host.endsWith('.matterport.com'))
        && new URL(url).pathname.startsWith('/show')) {
      return url;
    }
  } catch {
    return '';
  }
  return '';
}

// The zone tree is states -> counties -> cities, and every node carries a `count` of published
// properties (the levels accumulate, and a zone with none is simply absent). The counts are what
// make the pills useful, so they are kept and used for ordering.
// `id` and `count` are interpolated straight into an href and into the markup, so they are coerced
// to numbers HERE rather than escaped at each of the places that print them: they are numbers in
// the API, and a value that is not one has no business reaching a template.
export function collectZones(payload) {
  const out = [];
  (payload?.states || []).forEach((state) => {
    out.push({ level: 'stateId', id: Number(state.id), name: state.description, count: Number(state.count) || 0 });
    (state.counties || []).forEach((county) => {
      out.push({
        level: 'countyId', id: Number(county.id), count: Number(county.count) || 0,
        name: `${county.description}, ${state.description}`,
      });
      (county.cities || []).forEach((city) => {
        out.push({
          level: 'cityId', id: Number(city.id), count: Number(city.count) || 0,
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

// --- Contrast -------------------------------------------------------------------------------
// The design endpoint hands back whatever palette the agency picked, and `primary` is often a pale
// tint meant to sit BEHIND dark text. Using it as a foreground on a white surface then produces
// unreadable prices and links (measured on a real account: #dfe1d6 on white is a 1.32 ratio, where
// 4.5 is the readable floor). So the accent used for text is derived, not assumed.
export function luminance(hex) {
  const value = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  const channel = (c) => {
    const n = parseInt(c, 16) / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(value.slice(0, 2))
    + 0.7152 * channel(value.slice(2, 4))
    + 0.0722 * channel(value.slice(4, 6));
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return 0;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// Returns the first candidate readable on `background`, falling back to the last one.
export function readableOn(background, candidates, minimum = 4.5) {
  const list = candidates.filter(Boolean);
  return list.find((colour) => contrast(colour, background) >= minimum) || list[list.length - 1];
}

// --- Broken images --------------------------------------------------------------------------
// A photo can 404 (deleted in Mapaprop, or a dev row pointing at an object that is not in the dev
// bucket). Without this the browser renders the alt text over an empty box, which looks broken.
// `error` does not bubble, so it is caught in the capture phase.
export function installImageFallback() {
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.dataset.fallbackDone) return;
    img.dataset.fallbackDone = '1';
    const media = img.closest('.card__media, .gallery__main');
    if (media) {
      media.innerHTML = `<div class="card__media--empty">${escapeHtml(t('card.noPhotos'))}</div>`;
      return;
    }
    img.remove();
  }, true);
}
