// Proxy para HikerAPI (hikerapi.com).
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Key');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const expectedKey = process.env.SITE_KEY || 'f36ea0b8b6c2a6bbd745bc50e473bfc5b39d0c2a075a38e9';
    const providedKey = req.headers['x-site-key'] || '';
    if (providedKey !== expectedKey) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const accessKey = process.env.HIKERAPI_ACCESS_KEY;
    if (!accessKey) throw new Error('Missing required config: HIKERAPI_ACCESS_KEY');

    const path = req.query.path;
    if (!path || typeof path !== 'string' || path[0] !== '/') {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }
    if (!/^\/[A-Za-z0-9_\-/]+$/.test(path)) {
      res.status(400).json({ error: 'Invalid path format' });
      return;
    }

    const query = { ...req.query };
    delete query.path;
    const qs = new URLSearchParams(query).toString();
    const url = 'https://api.hikerapi.com' + path + (qs ? '?' + qs : '');

    const upstream = await fetch(url, {
      headers: { 'x-access-key': accessKey, accept: 'application/json' },
    });
    const body = await upstream.text();

    res.status(upstream.status || 502);
    try {
      const decoded = JSON.parse(body);
      res.json(decoded);
    } catch {
      res.json({ error: 'Upstream non-JSON', raw: body.slice(0, 500) });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
