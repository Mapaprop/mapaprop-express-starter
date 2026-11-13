import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message } from './ui.js';
import { t } from './i18n.js';

// Esta pagina manda la consulta GENERICA -- la que no es sobre ninguna propiedad -- por
// `POST express-v1/contact`, y entra al CRM de la inmobiliaria como un lead igual que la consulta
// de una ficha.
//
// Hasta el 2026-11-13 no habia endpoint para esto: `messages` exige un `propertyHash` y lo verifica
// publicado, asi que una consulta general no tenia por donde entrar. Este formulario armaba un
// `mailto:` y abria el programa de correo del visitante -- se perdia fuera del sistema, y la mitad
// de los visitantes no tiene un cliente de correo configurado.
//
// La sucursal elegida NO es un campo de la API: el lead entra a la bandeja de la cuenta. Se agrega
// como una linea del mensaje, que es honesto -- dice lo que el visitante eligio -- sin inventar un
// ruteo que no existe.
const branchSelect = document.getElementById('c-branch');
const hint = document.getElementById('c-hint');
let branches = [];

async function loadBranches() {
  try {
    const payload = await api.branches();
    branches = payload.branches || [];
  } catch {
    branches = [];
  }

  const host = document.getElementById('branches');
  if (!branches.length) {
    host.innerHTML = `<p class="notice">${escapeHtml(t('contact.branchesError'))}</p>`;
  } else {
    host.innerHTML = branches
      .map((b) => `<div class="branch">
          <h3>${escapeHtml(b.name || t('contact.branchFallback'))}${b.main ? escapeHtml(t('contact.mainBranch')) : ''}</h3>
          <p>${escapeHtml([b.address, b.zone3Description, b.zone2Description, b.zone1Description].filter(Boolean).join(', '))}</p>
          ${b.zip ? `<p>${escapeHtml(t('contact.zip', { zip: b.zip }))}</p>` : ''}
          ${[b.phone1, b.phone2, b.phone3].filter(Boolean)
            .map((p) => `<p><a href="tel:${escapeHtml(String(p).replace(/[^\d+]/g, ''))}">${escapeHtml(p)}</a></p>`).join('')}
          ${b.mobile ? `<p><a href="https://wa.me/${escapeHtml(String(b.mobile).replace(/\D/g, ''))}" target="_blank" rel="noopener">${escapeHtml(t('contact.whatsapp'))}</a></p>` : ''}
          ${b.email ? `<p><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></p>` : ''}
        </div>`)
      .join('');
  }

  branchSelect.innerHTML = branches
    .map((b, index) => `<option value="${index}">${escapeHtml(b.name || t('contact.branchFallback'))}</option>`)
    .join('') || `<option value="">${escapeHtml(t('search.none'))}</option>`;

  hint.textContent = t('contact.hint');
}

const form = document.getElementById('generic-contact');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const text = document.getElementById('c-message').value.trim();

  // La API rechaza al visitante que no deja ningun canal de respuesta, asi que se avisa aca en vez
  // de gastar el envio y devolverle un error del servidor.
  if (!email && !phone) {
    message(hint, t('enquiry.needContact'), 'error');
    return;
  }

  const branch = branches[Number(branchSelect.value)];
  const body = branch?.name
    ? `${text}\n\n${t('contact.branchInterest', { branch: branch.name })}`
    : text;

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = t('contact.sending');

  try {
    // ip, userAgent y referer los pone el proxy: el browser no conoce su propia IP y la API exige
    // los tres para su chequeo de spam.
    const response = await api.sendContact({
      name, email, phone, message: body, url: window.location.href,
    });

    if (response.success === false) {
      message(hint, t('contact.errorGeneric', { message: response.error || 'error' }), 'error');
    } else {
      form.querySelectorAll('input, textarea').forEach((field) => { field.value = ''; });
      message(hint, t('contact.success'), 'ok');
    }
  } catch (error) {
    message(hint, t('contact.errorGeneric', { message: error.message }), 'error');
  } finally {
    button.disabled = false;
    button.textContent = t('contact.submit');
  }
});

layout();
loadBranches();
