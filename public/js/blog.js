import { api } from './api.js';
import { layout } from './layout.js';
import { escapeHtml, message, safeUrl, skeletons } from './ui.js';
import { t, lang } from './i18n.js';

const host = document.getElementById('posts');

// The API sends `timestamp` as a plain date string. There is no shared date helper in the kit --
// everything else it shows is a number or a label -- so the formatting lives here, against the
// active language, and a value it cannot parse is simply not shown.
function postDate(value) {
  if (!value) return '';
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' });
}

// `posts` arrives WITHOUT the body: ExpressLogic clears the HTML before answering, so the list is
// metadata only. That is why the card shows the cover, the title and the date and nothing else --
// there is no excerpt to show, and inventing one from the body would need a second call per post.
function postCard(post) {
  const cover = safeUrl(post.mainImage);
  const date = postDate(post.timestamp || post.lastUpdate);
  return `
    <a class="card" href="post.html?url=${encodeURIComponent(post.url)}">
      <div class="card__media">
        ${cover
          ? `<img src="${escapeHtml(safeUrl(post.mainImage))}" alt="${escapeHtml(post.title || '')}" loading="lazy">`
          : `<div class="card__media--empty">${escapeHtml(t('card.noPhotos'))}</div>`}
      </div>
      <div class="card__body">
        <h2 class="card__title">${escapeHtml(post.title || '')}</h2>
        ${date ? `<p class="card__kicker">${escapeHtml(date)}</p>` : ''}
      </div>
    </a>`;
}

async function load() {
  host.innerHTML = skeletons(3);
  try {
    const { posts = [] } = await api.posts();
    if (!posts.length) {
      message(host, t('blog.empty'));
      return;
    }
    host.innerHTML = posts.map(postCard).join('');
  } catch (error) {
    message(host, t('listing.loadError', { message: error.message }), 'error');
  }
}

layout();
load();
