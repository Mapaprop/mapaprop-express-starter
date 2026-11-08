// Header and footer injected from one place. There is no build step here, so sharing the chrome
// through a script is what keeps the nav from being copied into six files.
import { getBrand, applyBrand } from './brand.js';
import { isActive, installImageFallback } from './ui.js';

const LINKS = [
  { href: 'index.html', label: 'Inicio' },
  { href: 'propiedades.html?operation=1', label: 'Ventas' },
  { href: 'propiedades.html?operation=2', label: 'Alquileres' },
  { href: 'propiedades.html?operation=3', label: 'Temporarios', onlyTempRental: true },
  { href: 'emprendimientos.html', label: 'Emprendimientos' },
  { href: 'vender.html', label: 'Vender' },
  { href: 'contacto.html', label: 'Contacto' },
];

function header(current, data) {
  const search = new URLSearchParams(window.location.search);
  const links = LINKS.filter((l) => !l.onlyTempRental || data.tempRental !== false)
    .map((l) => {
      const active = isActive(l.href, current, search) ? ' class="is-active"' : '';
      return `<a href="${l.href}"${active}>${l.label}</a>`;
    })
    .join('');

  return `<header class="header"><div class="wrap header__bar">
      <a class="logo" href="index.html" data-brand-logo></a>
      <button class="nav__toggle" aria-label="Abrir menú">☰</button>
      <nav class="nav">${links}</nav>
    </div></header>`;
}

function footer() {
  return `<footer class="footer"><div class="wrap">
      <div class="footer__grid">
        <div>
          <h4 data-brand-name></h4>
          <p data-brand-contact></p>
        </div>
        <div>
          <h4>Propiedades</h4>
          <p><a href="propiedades.html?operation=1">En venta</a></p>
          <p><a href="propiedades.html?operation=2">En alquiler</a></p>
          <p><a href="emprendimientos.html">Emprendimientos</a></p>
        </div>
        <div>
          <h4>Contacto</h4>
          <p><a href="contacto.html">Escribinos</a></p>
          <p><a href="vender.html">Quiero vender o alquilar</a></p>
        </div>
        <div>
          <h4>Seguinos</h4>
          <div class="footer__social" data-brand-social></div>
        </div>
      </div>
      <div class="footer__legal">
        <span data-brand-responsible></span>
        <span>Sitio desarrollado con <a href="https://help.mapaprop.com/es/api/express-api" target="_blank" rel="noopener">Mapaprop Express API</a></span>
      </div>
    </div></footer>
    <a class="whatsapp" data-brand-whatsapp target="_blank" rel="noopener" aria-label="Escribinos por WhatsApp">✆</a>`;
}

export async function layout() {
  const current = window.location.pathname.split('/').pop() || 'index.html';
  installImageFallback();
  const data = await getBrand();

  document.body.insertAdjacentHTML('afterbegin', header(current, data));
  document.body.insertAdjacentHTML('beforeend', footer());

  // Paint only now: the placeholders the brand fills live in the chrome injected above.
  applyBrand(data);

  document.querySelector('.nav__toggle')?.addEventListener('click', () => {
    document.querySelector('.nav')?.classList.toggle('is-open');
  });

  return data;
}
