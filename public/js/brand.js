// Applies the design the agency configured in Mapaprop: colours, typography, logo, favicon, social
// links and footer. Everything degrades: an account with no active website gets 400 from `design`
// and `settings-v2`, and the site must still render (that is the normal case for someone building
// their own site here).
import { api, servedByMock } from './api.js';
import { escapeHtml, readableOn } from './ui.js';
import { t, lang } from './i18n.js';

const FALLBACK = window.SITE_CONFIG || {};
// The language is part of the key: the cached brand holds translated fallbacks, so a site served
// in two languages must not hand the Spanish one to the English page.
const CACHE_KEY = `mp-brand-v1-${lang}`;
const CACHE_TTL_MS = 60 * 60 * 1000; // design is cached upstream for an hour; match it

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) return null;
    return value;
  } catch {
    return null; // private windows and blocked storage both land here
  }
}

function writeCache(value) {
  // Not in mock mode. There the fixtures are precisely what you are editing, and an hour of cache
  // fights you: you change design.json, reload, and the tab keeps showing the previous answer --
  // which reads exactly like the change did not work. Measured: an open tab kept a logo-less brand
  // after the fixture already had one.
  if (servedByMock()) return;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), value }));
  } catch {
    /* nothing to do: the page works without the cache */
  }
}

// An image value that starts with "/" is a legacy file living inside the Mapaprop-hosted template
// and will not resolve from another domain -- there is no base to resolve it against, because no
// Express action returns the site's own domain. Read in the backend: `resolveImageUrl` builds an
// absolute CDN URL only when the account has S3 uploads enabled AND that image has an uploaded
// extension; otherwise it returns the stored value verbatim, which for most sites is this relative
// path. So re-uploading the image from Sitio Web > Diseño does fix it for that account, but the
// general case is ours to fix -- see the task `el-carrusel-del-inicio-llega-con-rutas-que-el-
// cliente-no-puede-resolver`. Until then, ignore it instead of rendering a broken image.
function usableImage(value) {
  return typeof value === 'string' && value.startsWith('http') ? value : '';
}

async function load() {
  const cached = readCache();
  if (cached) return cached;

  const brand = {
    name: FALLBACK.name || t('brand.fallbackName'),
    tagline: FALLBACK.tagline || t('brand.fallbackTagline'),
    responsible: FALLBACK.responsible || '',
    whatsapp: FALLBACK.whatsapp || '',
    colors: { ...FALLBACK.colors },
    fontFamily: FALLBACK.fontFamily || 'Inter',
    logo: usableImage(FALLBACK.logo),
    favicon: '',
    social: { ...(FALLBACK.social || {}) },
    slides: [],
    callToActions: [],
    hasWebsite: false,
    customer: null,
    email: '',
    phone: '',
    address: '',
  };

  const [design, settings] = await Promise.allSettled([api.design(), api.settings()]);

  if (design.status === 'fulfilled') {
    const d = design.value || {};
    brand.hasWebsite = true;
    if (d.colors) brand.colors = { ...brand.colors, ...d.colors };
    if (d.typography?.fontFamily) brand.fontFamily = d.typography.fontFamily;
    brand.logo = usableImage(d.images?.logo) || brand.logo;
    brand.favicon = usableImage(d.images?.favicon);
    // `slides` and `callToActions` always come with three entries, configured or not.
    brand.slides = (d.images?.slides || []).filter((s) => usableImage(s.image));
    brand.callToActions = (d.callToActions || []).filter((c) => c.enabled);
    if (d.footer?.responsible) brand.responsible = d.footer.responsible;
    if (d.social) brand.social = { ...brand.social, ...d.social };
  }

  if (settings.status === 'fulfilled') {
    const customer = settings.value?.customer || null;
    if (customer) {
      brand.customer = customer;
      brand.name = customer.name || brand.name;
      brand.email = customer.email || '';
      brand.phone = customer.phone1 || '';
      brand.whatsapp = customer.mobile || brand.whatsapp;
      brand.address = [customer.address, customer.zone2Description, customer.zone1Description]
        .filter(Boolean)
        .join(', ');
      brand.tempRental = customer.tempRental === true;
    }
  }

  writeCache(brand);
  return brand;
}

function paint(brand) {
  const root = document.documentElement.style;
  const primary = brand.colors.primary || '#195fa9';
  const secondary = brand.colors.secondary || '#4a7fe8';
  root.setProperty('--primary', primary);
  root.setProperty('--secondary', secondary);

  // The foreground of a filled surface is DERIVED, not trusted. Measured on a real account: the
  // `design` endpoint returned `primary: #ededed` and no `primaryText`, so the fallback white left
  // "Buscar" and "Enviar consulta" as white on near-white -- a 1.07 ratio. What the agency
  // configured still wins whenever it is readable; it is only overridden when it is not.
  root.setProperty('--primary-text', readableOn(primary, [brand.colors.primaryText, '#ffffff', '#16202b']));
  root.setProperty('--secondary-text', readableOn(secondary, [brand.colors.secondaryText, '#ffffff', '#16202b']));

  // Accents used as TEXT on the white surface. The palette is the agency's and may be pale, so the
  // first readable candidate wins instead of trusting `primary` to be dark.
  const surface = '#ffffff';
  root.setProperty('--accent-ink',
    readableOn(surface, [brand.colors.primary, brand.colors.secondary, '#16202b']));
  root.setProperty('--accent-ink-alt',
    readableOn(surface, [brand.colors.secondary, brand.colors.primary, '#16202b']));

  if (brand.fontFamily) {
    root.setProperty('--font', `'${brand.fontFamily}', system-ui, sans-serif`);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(brand.fontFamily)}:wght@400;500;700&display=swap`;
    document.head.appendChild(link);
  }

  if (brand.favicon) {
    const icon = document.querySelector('link[rel="icon"]') || document.createElement('link');
    icon.rel = 'icon';
    icon.href = brand.favicon;
    document.head.appendChild(icon);
  }

  document.title = brand.name ? `${document.title} · ${brand.name}` : document.title;

  document.querySelectorAll('[data-brand-logo]').forEach((el) => {
    el.innerHTML = brand.logo
      ? `<img src="${escapeHtml(brand.logo)}" alt="${escapeHtml(brand.name)}">`
      : `<span class="logo__text">${escapeHtml(brand.name)}</span>`;
  });

  document.querySelectorAll('[data-brand-name]').forEach((el) => { el.textContent = brand.name; });
  document.querySelectorAll('[data-brand-responsible]').forEach((el) => {
    el.textContent = brand.responsible || '';
  });
  document.querySelectorAll('[data-brand-contact]').forEach((el) => {
    const bits = [];
    if (brand.address) bits.push(escapeHtml(brand.address));
    if (brand.phone) bits.push(`<a href="tel:${escapeHtml(brand.phone.replace(/[^\d+]/g, ''))}">${escapeHtml(brand.phone)}</a>`);
    if (brand.email) bits.push(`<a href="mailto:${escapeHtml(brand.email)}">${escapeHtml(brand.email)}</a>`);
    el.innerHTML = bits.join(' · ');
  });

  const socialIcons = {
    instagram: 'Instagram', facebook: 'Facebook', twitter: 'X',
    linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube',
  };
  document.querySelectorAll('[data-brand-social]').forEach((el) => {
    el.innerHTML = Object.entries(brand.social || {})
      .filter(([key, url]) => socialIcons[key] && url)
      .map(([key, url]) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${socialIcons[key]}</a>`)
      .join('');
  });

  document.querySelectorAll('[data-brand-whatsapp]').forEach((el) => {
    if (!brand.whatsapp) { el.remove(); return; }
    el.href = `https://wa.me/${brand.whatsapp.replace(/[^\d]/g, '')}`;
  });
}

// Loading and painting are separate on purpose: the header and footer are injected later by
// layout.js, so the paint has to run again once those placeholders exist. A memoised promise cannot
// repaint, it can only hand back the same value.
let pending = null;

export function getBrand() {
  if (!pending) pending = load();
  return pending;
}

export function applyBrand(data) {
  paint(data);
}
