// Header and footer injected from one place. There is no build step here, so sharing the chrome
// through a script is what keeps the nav from being copied into six files.
import { getBrand, applyBrand } from './brand.js';
import { isActive, installImageFallback } from './ui.js';
import { t, applyI18n, lang, languages, setLang, LANG_LABEL, LANG_SHORT } from './i18n.js';

const LINKS = [
  { href: 'index.html', key: 'nav.home' },
  { href: 'propiedades.html?operation=1', key: 'nav.sales' },
  { href: 'propiedades.html?operation=2', key: 'nav.rentals' },
  { href: 'propiedades.html?operation=3', key: 'nav.temporary', onlyTempRental: true },
  { href: 'emprendimientos.html', key: 'nav.developments' },
  { href: 'vender.html', key: 'nav.sell' },
  { href: 'contacto.html', key: 'nav.contact' },
];

function header(current, data) {
  const search = new URLSearchParams(window.location.search);
  const links = LINKS.filter((l) => !l.onlyTempRental || data.tempRental !== false)
    .map((l) => {
      const active = isActive(l.href, current, search) ? ' class="is-active"' : '';
      return `<a href="${l.href}"${active}>${t(l.key)}</a>`;
    })
    .join('');

  return `<header class="header"><div class="wrap header__bar">
      <a class="logo" href="index.html" data-brand-logo></a>
      <nav class="nav">${links}</nav>
      ${langSwitcher()}
      <button class="nav__toggle" aria-label="${t('nav.toggle')}">☰</button>
    </div></header>`;
}

// The switcher lives OUTSIDE `.nav` on purpose: on a phone the nav collapses into the drawer, and a
// visitor who cannot read the menu is exactly the one who needs to change the language. It renders
// nothing when the site offers a single language, so a kit left on its default config is unchanged.
function langSwitcher() {
  if (languages.length < 2) return '';
  const buttons = languages.map((code) => {
    const current = code === lang;
    return `<button type="button" class="lang__option${current ? ' is-active' : ''}" data-lang="${code}"`
      + `${current ? ' aria-current="true"' : ''} title="${LANG_LABEL[code]}" lang="${code}">`
      + `<span class="lang__short" aria-hidden="true">${LANG_SHORT[code]}</span>`
      + `<span class="lang__full">${LANG_LABEL[code]}</span></button>`;
  }).join('');
  return `<div class="lang" role="group" aria-label="${t('nav.language')}">${buttons}</div>`;
}

// The attribution is a BRAND STRING and is deliberately NOT translated and NOT configurable: the
// name of a product does not change language, and the line stays on in every deploy of the kit.
function footer() {
  return `<footer class="footer"><div class="wrap">
      <div class="footer__grid">
        <div>
          <h4 data-brand-name></h4>
          <p data-brand-contact></p>
        </div>
        <div>
          <h4>${t('footer.properties')}</h4>
          <p><a href="propiedades.html?operation=1">${t('footer.forSale')}</a></p>
          <p><a href="propiedades.html?operation=2">${t('footer.forRent')}</a></p>
          <p><a href="emprendimientos.html">${t('footer.developments')}</a></p>
        </div>
        <div>
          <h4>${t('footer.contact')}</h4>
          <p><a href="contacto.html">${t('footer.writeUs')}</a></p>
          <p><a href="vender.html">${t('footer.sellOrRent')}</a></p>
        </div>
        <div>
          <h4>${t('footer.followUs')}</h4>
          <div class="footer__social" data-brand-social></div>
        </div>
      </div>
      <div class="footer__legal">
        <span data-brand-responsible></span>
        <span class="footer__powered"><a href="https://help.mapaprop.com/es/api/express-api" target="_blank" rel="noopener">Powered by Mapaprop API</a></span>
      </div>
    </div></footer>
    <a class="whatsapp" data-brand-whatsapp target="_blank" rel="noopener" aria-label="${t('footer.whatsapp')}">✆</a>`;
}

export async function layout() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  installImageFallback();
  const data = await getBrand();

  document.body.insertAdjacentHTML('afterbegin', header(current, data));
  document.body.insertAdjacentHTML('beforeend', footer());

  // The static markup ships in Spanish so the page reads before any module runs; this swaps it when
  // another language is active.
  applyI18n(document);

  // Paint only now: the placeholders the brand fills live in the chrome injected above.
  applyBrand(data);

  document.querySelector('.nav__toggle')?.addEventListener('click', () => {
    document.querySelector('.nav')?.classList.toggle('is-open');
  });

  document.querySelector('.lang')?.addEventListener('click', (event) => {
    const option = event.target.closest('.lang__option');
    if (option) setLang(option.dataset.lang);
  });

  return data;
}
