import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message, qs, safeUrl } from './ui.js';
import { t, lang } from './i18n.js';

const root = document.getElementById('post-root');

function postDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
}

async function load() {
  const url = qs('url');
  if (!url) {
    message(root, t('blog.notFound'), 'error');
    return;
  }
  try {
    const { post } = await api.post(url);
    if (!post) {
      message(root, t('blog.notFound'), 'error');
      return;
    }

    const cover = safeUrl(post.mainImage);
    const date = postDate(post.timestamp || post.lastUpdate);
    root.innerHTML = `
      <p><a href="blog.html">${escapeHtml(t('blog.back'))}</a></p>
      <h1>${escapeHtml(post.title || '')}</h1>
      <p class="card__kicker">${escapeHtml([date, post.editor].filter(Boolean).join(' · '))}</p>
      ${cover ? `<p><img src="${escapeHtml(safeUrl(post.mainImage))}" alt="${escapeHtml(post.title || '')}" loading="lazy" style="max-width:100%;height:auto"></p>` : ''}
      <article id="post-body"></article>`;

    // 🔴 El cuerpo se inyecta como HTML, sin escapar, y es deliberado: `post.html` ES html -- lo
    // escribe la inmobiliaria en el editor de su propio panel de Mapaprop, y escaparlo mostraria
    // las etiquetas en pantalla en vez del texto. Es el mismo criterio que el sitio de Mapaprop:
    // `customer-posts.php` hace `echo $posts->html` crudo. El contenido es de primera parte, del
    // mismo origen que el logo y la descripcion de sus propiedades.
    //
    // ⚠️ Y trae `style=` inline pegado del editor (fuentes, colores), asi que el post NO hereda la
    // tipografia del sitio. Es como se ve tambien en el sitio de Mapaprop; se deja igual para no
    // reinterpretar el contenido del cliente.
    document.getElementById('post-body').innerHTML = post.html || '';

    document.title = post.title ? `${post.title} · ${document.title}` : document.title;
  } catch (error) {
    message(root, t('listing.loadError', { message: error.message }), 'error');
  }
}

layout();
load();
