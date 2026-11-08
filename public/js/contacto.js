import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message } from './ui.js';

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
    host.innerHTML = '<p class="notice">No pudimos cargar las sucursales en este momento.</p>';
  } else {
    host.innerHTML = branches
      .map((b) => `<div class="branch">
          <h3>${escapeHtml(b.name || 'Sucursal')}${b.main ? ' · Principal' : ''}</h3>
          <p>${escapeHtml([b.address, b.zone3Description, b.zone2Description, b.zone1Description].filter(Boolean).join(', '))}</p>
          ${b.zip ? `<p>CP ${escapeHtml(b.zip)}</p>` : ''}
          ${[b.phone1, b.phone2, b.phone3].filter(Boolean)
            .map((p) => `<p><a href="tel:${escapeHtml(String(p).replace(/[^\d+]/g, ''))}">${escapeHtml(p)}</a></p>`).join('')}
          ${b.mobile ? `<p><a href="https://wa.me/${escapeHtml(String(b.mobile).replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a></p>` : ''}
          ${b.email ? `<p><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></p>` : ''}
        </div>`)
      .join('');
  }

  branchSelect.innerHTML = branches
    .map((b, index) => `<option value="${index}">${escapeHtml(b.name || 'Sucursal')}</option>`)
    .join('') || '<option value="">—</option>';

  hint.textContent = branches.some((b) => b.email)
    ? 'Al enviar se abre tu programa de correo con el mensaje listo.'
    : 'Esta cuenta no tiene un email de sucursal cargado. Usá los teléfonos de la izquierda.';
}

document.getElementById('generic-contact').addEventListener('submit', (event) => {
  event.preventDefault();
  const branch = branches[Number(branchSelect.value)] || branches[0];
  if (!branch?.email) {
    message(hint, 'No hay un email cargado para esta sucursal. Probá por teléfono o WhatsApp.', 'error');
    return;
  }
  const name = document.getElementById('c-name').value.trim();
  const email = document.getElementById('c-email').value.trim();
  const phone = document.getElementById('c-phone').value.trim();
  const text = document.getElementById('c-message').value.trim();
  const body = [`Nombre: ${name}`, email ? `Email: ${email}` : '', phone ? `Teléfono: ${phone}` : '', '', text]
    .filter((line) => line !== '')
    .join('\n');
  window.location.href =
    `mailto:${branch.email}?subject=${encodeURIComponent(`Consulta de ${name}`)}&body=${encodeURIComponent(body)}`;
});

layout();
loadBranches();
