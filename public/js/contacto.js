import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message } from './ui.js';
import { t } from './i18n.js';

// NOTE ON THIS PAGE, and it is a real limitation of the API, not a shortcut:
// `POST express-v1/messages` requires a `propertyHash` and rejects the request without one -- it
// then checks that the property exists and is published. So a GENERIC enquiry has no endpoint: it
// cannot be delivered into the agency's CRM through Express API.
//
// Rather than fake it (misusing `seller-submissions`, which would file a fake seller lead), this
// form composes an email to the chosen branch and the page pushes visitors towards the property
// sheet, whose form DOES land in the CRM. See the README.
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

  hint.textContent = branches.some((b) => b.email)
    ? t('contact.hintMailto')
    : t('contact.hintNoEmail');
}

document.getElementById('generic-contact').addEventListener('submit', (event) => {
  event.preventDefault();
  const branch = branches[Number(branchSelect.value)] || branches[0];
  if (!branch?.email) {
    message(hint, t('contact.noBranchEmail'), 'error');
    return;
  }
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const text = document.getElementById('c-message').value.trim();
  const body = [
    t('contact.mailName', { name }),
    email ? t('contact.mailEmail', { email }) : '',
    phone ? t('contact.mailPhone', { phone }) : '',
    '',
    text,
  ].filter((line) => line !== '').join('\n');
  // 🔴 El email se arma con `URL`, no concatenando. `mailto:` fija el esquema, asi que no hay XSS
  // -- pero una direccion con la forma `ventas@x.com?cc=tercero@evil.com` inyecta DESTINATARIOS en
  // el borrador que abre el programa de correo del visitante, y la consulta sale con copia a un
  // tercero sin que nadie lo vea. El dato es de la propia inmobiliaria, asi que el caso realista es
  // un alta mal tipeada o una cuenta comprometida; igual no cuesta nada cerrarlo.
  const mail = new URL(`mailto:${encodeURIComponent(branch.email)}`);
  mail.searchParams.set('subject', t('contact.mailSubject', { name }));
  mail.searchParams.set('body', body);
  // url-ok: el esquema es literal (`mailto:`) y lo arma `new URL` dos lineas arriba, asi que el
  // dato de la API no puede elegirlo; lo que si podia inyectar -- destinatarios -- lo cierra el
  // encodeURIComponent del constructor.
  window.location.href = mail.toString();
});

layout();
loadBranches();
