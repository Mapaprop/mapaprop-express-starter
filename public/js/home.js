import { api } from './api.js';
import { layout } from './layout.js';
import { card, skeletons, escapeHtml, multiline, message, collectZones, safeUrl, siteUrl } from './ui.js';
import { t } from './i18n.js';
import { postCard } from './post-card.js';

const featured = document.getElementById('featured');
featured.innerHTML = skeletons(6);

function hero(data) {
  const slides = data.slides || [];
  const host = document.getElementById('hero');
  const fallback = (window.SITE_CONFIG || {}).hero || {};

  if (slides.length) {
    host.classList.add('has-slides');
    slides.forEach((slide, index) => {
      const el = document.createElement('div');
      el.className = `hero__slide${index === 0 ? ' is-active' : ''}`;
      // `safeUrl` ACA, aunque brand.js ya filtre las slides con usableImage(): esa defensa vive
      // arriba y `hero()` no la puede ver. Y no es teorica -- usableImage sólo mira que empiece con
      // "http", asi que una url con `")` adentro cierra este url() y mete un segundo url() en la
      // misma declaracion: un pedido a un tercero en cada carga de la home. safeUrl lo normaliza
      // con `new URL`, que percent-codifica las comillas.
      el.style.backgroundImage = `url("${safeUrl(slide.image)}")`;
      host.prepend(el);
    });
    // The title the agency typed can hold line breaks: its own site uses them to split the
    // headline over two or three lines, so they are rendered, not stripped.
    if (slides[0].title) document.getElementById('hero-title').innerHTML = multiline(slides[0].title);
    if (slides[0].subtitle) document.getElementById('hero-subtitle').innerHTML = multiline(slides[0].subtitle);

    if (slides.length > 1) {
      let current = 0;
      const all = host.querySelectorAll('.hero__slide');
      setInterval(() => {
        all[current].classList.remove('is-active');
        current = (current + 1) % all.length;
        all[current].classList.add('is-active');
      }, 6000);
    }
  } else {
    // The agency's own copy wins; the translated default is the fallback (applyI18n already put it
    // there), so there is nothing to do when config.js leaves these empty.
    if (fallback.title) document.getElementById('hero-title').textContent = fallback.title;
    if (fallback.subtitle) document.getElementById('hero-subtitle').textContent = fallback.subtitle;
  }
}

function callToActions(data) {
  // `data.callToActions` arrives already filtered by `enabled` (see brand.js), so the blocks are
  // contiguous and the Nth one belongs in the Nth slot. No cap here: the page declares the slots it
  // has and the `!host` guard below skips a block with nowhere to go, so an account configured with
  // more of them degrades instead of being silently truncated -- which is what a `slice(0, 2)` did
  // while the API was sending three.
  const blocks = data.callToActions || [];
  blocks.forEach((block, index) => {
    const host = document.getElementById(`cta-${index + 1}`);
    const wrap = document.getElementById(`cta-${index + 1}-wrap`);
    if (!host || !wrap || !block.title) return;
    host.innerHTML = `
      <h2>${escapeHtml(block.title)}</h2>
      ${block.description ? `<p>${escapeHtml(block.description)}</p>` : ''}
      ${block.buttonText ? `<a class="btn" href="${escapeHtml(siteUrl(block.buttonLink) || 'contacto.html')}">${escapeHtml(block.buttonText)}</a>` : ''}`;
    wrap.hidden = false;
  });
}

async function fillSearcher() {
  const [operations, types, zones] = await Promise.allSettled([api.operations(), api.types(), api.zones()]);

  if (operations.status === 'fulfilled') {
    const select = document.getElementById('s-operation');
    (operations.value.operations || []).forEach((o) => {
      select.insertAdjacentHTML('beforeend', `<option value="${Number(o.id)}">${escapeHtml(o.description)}</option>`);
    });
    const preset = new URLSearchParams(window.location.search).get('operation');
    if (preset) select.value = preset;
  }

  if (types.status === 'fulfilled') {
    const select = document.getElementById('s-type');
    (types.value.types || []).forEach((type) => {
      select.insertAdjacentHTML('beforeend',
        `<option value="${Number(type.id)}">${escapeHtml(type.description)}</option>`);
    });
  }

  if (zones.status === 'fulfilled') {
    // `zones` is the account's own tree. Only the second level is offered here to keep the home
    // simple; the listing page exposes province and city too.
    const select = document.getElementById('s-zone');
    const list = collectZones(zones.value);
    list.slice(0, 80).forEach((z) => {
      select.insertAdjacentHTML('beforeend',
        `<option value="${z.level}:${z.id}">${escapeHtml(z.name)} (${z.count})</option>`);
    });
    renderZonePills(list.filter((z) => z.level !== 'stateId').slice(0, 14));
  }
}

function renderZonePills(zones) {
  if (!zones.length) return;
  const host = document.getElementById('zones');
  host.innerHTML = zones
    .map((z) => `<li><a href="propiedades.html?${z.level}=${z.id}">${escapeHtml(z.name)} <strong>${z.count}</strong></a></li>`)
    .join('');
  document.getElementById('zones-section').hidden = false;
}

async function loadFeatured() {
  try {
    const { properties = [] } = await api.properties({ size: 6 });
    if (!properties.length) {
      message(featured, t('home.empty'));
      return;
    }
    featured.innerHTML = properties.map(card).join('');
  } catch (error) {
    message(featured, t('listing.loadError', { message: error.message }), 'error');
  }
}

async function loadDevelopments() {
  try {
    const { properties = [] } = await api.developments({ size: 3 });
    if (!properties.length) return;
    document.getElementById('developments').innerHTML = properties.map(card).join('');
    document.getElementById('developments-section').hidden = false;
  } catch {
    /* an account with no developments is the common case, not an error worth showing */
  }
}

async function loadPosts() {
  try {
    const { posts = [] } = await api.posts();
    if (!posts.length) return;
    // Three, like the template's own home. The cap is on the HOME, not on the API: `blog.html`
    // lists them all, and the heading links to it -- so an agency with twelve notes still publishes
    // the twelve, instead of the home quietly becoming the whole blog.
    document.getElementById('posts-home').innerHTML = posts.slice(0, 3).map(postCard).join('');
    document.getElementById('posts-section').hidden = false;
  } catch {
    /* an account with no blog is the common case, not an error worth showing */
  }
}

async function loadBranches() {
  try {
    const { branches = [] } = await api.branches();
    if (branches.length < 1) return;
    document.getElementById('branches').innerHTML = branches
      .map((b) => `<div class="branch">
          <h3>${escapeHtml(b.name || t('contact.branchFallback'))}</h3>
          <p>${escapeHtml([b.address, b.zone2Description, b.zone1Description].filter(Boolean).join(', '))}</p>
          ${b.phone1 ? `<p><a href="tel:${escapeHtml(String(b.phone1).replace(/[^\d+]/g, ''))}">${escapeHtml(b.phone1)}</a></p>` : ''}
          ${b.email ? `<p><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></p>` : ''}
        </div>`)
      .join('');
    document.getElementById('branches-section').hidden = false;
  } catch {
    /* branches do not require a website, but a failure here must not take the home down */
  }
}

document.getElementById('searcher').addEventListener('submit', (event) => {
  event.preventDefault();
  const params = new URLSearchParams();
  const operation = document.getElementById('s-operation').value;
  const type = document.getElementById('s-type').value;
  const term = document.getElementById('s-term').value.trim();
  const zone = document.getElementById('s-zone').value;
  if (operation) params.set('operation', operation);
  if (type) params.set('type', type);
  // `term` needs at least 3 characters or the API rejects the request.
  if (term.length >= 3) params.set('term', term);
  if (zone) {
    const [level, id] = zone.split(':');
    params.set(level, id);
  }
  window.location.href = `propiedades.html?${params.toString()}`;
});

layout().then((data) => {
  hero(data);
  callToActions(data);
});
fillSearcher();
loadFeatured();
loadPosts();
loadDevelopments();
loadBranches();
