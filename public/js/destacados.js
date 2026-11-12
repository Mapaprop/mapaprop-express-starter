// The agency's showcase, as a page of its own. It is the one listing with NO filters: the order is
// the content here, and a filter would reshuffle it into something the agency never arranged.
import { api, PAGE_SIZE } from './api.js';
import { layout } from './layout.js';
import { card, skeletons, message, pager } from './ui.js';
import { t } from './i18n.js';

const results = document.getElementById('results');
const pagination = document.getElementById('pagination');

function pushFrom(from) {
  const search = new URLSearchParams(window.location.search);
  if (from) search.set('from', from);
  else search.delete('from');
  const query = search.toString();
  window.history.replaceState({}, '', query ? `?${query}` : window.location.pathname);
}

async function load(from) {
  results.innerHTML = skeletons(6);
  pagination.innerHTML = '';
  pushFrom(from);

  try {
    const { properties = [], total = 0 } = await api.featureds({ from, size: PAGE_SIZE });
    document.getElementById('featured-count').textContent = t('pager.total', { n: total });

    if (!properties.length) {
      message(results, total === 0 ? t('featured.empty') : t('featured.emptyPage'));
      return;
    }

    results.innerHTML = properties.map(card).join('');
    // Paging goes by `total`, never by whether the page came back full: a featured property that is
    // no longer published does not come back, so a short page does not mean there is nothing after
    // it. Reading the page length as the end is how the other pages of this showcase get lost.
    pagination.innerHTML = pager(total, from, PAGE_SIZE, (next) => {
      load(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  } catch (error) {
    message(results, t('featured.loadError', { message: error.message }), 'error');
  }
}

layout();
load(Number(new URLSearchParams(window.location.search).get('from') || 0));
