// robots.txt is a function and not a static file for one reason: the `Sitemap:` directive requires
// an ABSOLUTE url, and every deployment of this kit answers on a different domain. A static file
// would have to hardcode one host (wrong for everybody else) or use a relative path (which the
// crawlers do not accept).
export default function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto']
    || (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https')).split(',')[0];

  const lines = [
    'User-agent: *',
    'Allow: /',
    // The API proxy answers JSON to the site's own JavaScript: there is nothing for a crawler
    // there, and letting it in burns the account's API calls on requests nobody reads.
    'Disallow: /api/',
    '',
  ];
  if (host) lines.push(`Sitemap: ${proto}://${host}/sitemap.xml`, '');

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=86400');
  res.status(200).send(lines.join('\n'));
}
