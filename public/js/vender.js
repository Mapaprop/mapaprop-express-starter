import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message } from './ui.js';

// This form posts to `POST express-v1/seller-submissions`, which files the owner as a CONTACT in
// the agency's Mapaprop CRM and emails them with the attachments.
//
// 🔴 Unlike the inventory endpoints, this one NEEDS an active website tied to the token: without it
// the API answers NOT_FOUND. The agency ties it in Configuración > Token de API, card "Función Sitio
// Web". The page detects that case and says so instead of failing silently.
//
// Limits that come from the API, not from here: 2 MB per file, 10 MB of bandwidth per hour and 10
// submissions per hour.
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const form = document.getElementById('seller');
const feedback = document.getElementById('seller-feedback');

async function fillCatalogs() {
  const [types, operations] = await Promise.allSettled([api.types(), api.operations()]);
  const typeSelect = document.getElementById('v-type');
  const operationSelect = document.getElementById('v-operation');

  // The endpoint takes these as free text ("Casa", "Venta"), not as ids, so the catalog
  // descriptions are sent through as-is.
  if (types.status === 'fulfilled') {
    typeSelect.innerHTML = (types.value.types || [])
      .map((t) => `<option>${escapeHtml(t.description)}</option>`).join('');
  }
  if (!typeSelect.innerHTML) {
    typeSelect.innerHTML = ['Casa', 'Departamento', 'PH', 'Local', 'Oficina', 'Terreno', 'Galpón', 'Campo']
      .map((t) => `<option>${t}</option>`).join('');
  }
  if (operations.status === 'fulfilled') {
    operationSelect.innerHTML = (operations.value.operations || [])
      .map((o) => `<option>${escapeHtml(o.description)}</option>`).join('');
  }
  if (!operationSelect.innerHTML) {
    operationSelect.innerHTML = ['Venta', 'Alquiler', 'Alquiler Temporario']
      .map((o) => `<option>${o}</option>`).join('');
  }
}

// Attachments travel as base64 data URLs, which is what the endpoint expects.
function readAsDataUrl(input) {
  const file = input.files?.[0];
  if (!file) return Promise.resolve(null);
  if (file.size > MAX_FILE_BYTES) {
    return Promise.reject(new Error(`"${file.name}" pesa más de 2 MB. Subí un archivo más chico.`));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(`No pudimos leer "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

function value(id) {
  const el = document.getElementById(id);
  return el && el.value.trim() !== '' ? el.value.trim() : undefined;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  button.textContent = 'Enviando…';
  feedback.innerHTML = '';

  try {
    const [image, pdf] = await Promise.all([
      readAsDataUrl(document.getElementById('v-image')),
      readAsDataUrl(document.getElementById('v-pdf')),
    ]);

    const payload = {
      name: value('v-name'),
      email: value('v-email'),
      phone: value('v-phone'),
      contactHours: value('v-hours'),
      propertyType: value('v-type'),
      propertyOperation: value('v-operation'),
      propertyAddress: value('v-address'),
      propertyZone: value('v-zone'),
      propertyZipcode: value('v-zip'),
      propertyCurrency: value('v-currency'),
      propertyPrice: value('v-price'),
      propertyBuildingArea: value('v-building'),
      propertyLandArea: value('v-land'),
      propertyRooms: value('v-rooms'),
      propertyBathrooms: value('v-bathrooms'),
      propertyDescription: value('v-description'),
      propertyValuation: value('v-valuation'),
      propertyListed: value('v-listed'),
      // url, ip, userAgent, referer and domain are filled by the proxy.
    };
    if (image) payload.image = image;
    if (pdf) payload.pdf = pdf;

    const response = await api.sendSellerSubmission(payload);

    if (response.error === true) {
      message(feedback, explain(response.code, response.message), 'error');
    } else {
      form.reset();
      message(feedback, '¡Gracias! Recibimos los datos de tu propiedad y te vamos a contactar.', 'ok');
    }
  } catch (error) {
    message(feedback, explain(error.code, error.message), 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Enviar';
  }
});

function explain(code, fallback) {
  if (code === 'NOT_FOUND') {
    return 'Este formulario todavía no está disponible. (Para el administrador del sitio: el envío '
      + 'de propietarios necesita un sitio web atado al Token de API, en Configuración > Token de API, '
      + 'tarjeta "Función Sitio Web".)';
  }
  if (code === 'RATE_LIMIT_EXCEEDED') return 'Recibimos muchos envíos seguidos. Probá de nuevo en un rato.';
  if (code === 'INVALID_FILE') return 'Alguno de los archivos no es válido. Se aceptan JPG, PNG, GIF, WebP y PDF.';
  return `No pudimos enviar el formulario: ${fallback || 'error desconocido'}`;
}

layout();
fillCatalogs();
