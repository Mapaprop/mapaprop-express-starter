import { api } from './api.js';
import { layout } from './layout.js';
import { message, skeletons } from './ui.js';
import { t } from './i18n.js';
import { postCard } from './post-card.js';

const host = document.getElementById('posts');

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
