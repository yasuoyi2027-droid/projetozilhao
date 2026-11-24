// GET /api/get-payment-mx?id=<checkout_id>
const zenith = require('./_lib/zenithApi');
const storage = require('./_lib/storage');

const ID_RE = /^[0-9a-zA-Z_-]{6,100}$/;
const TERMINAL = ['succeeded', 'paid', 'failed', 'canceled', 'refunded'];

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = String(req.query.id || '');
  if (!ID_RE.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  try {
    const local = await storage.load(id);

    if (local && TERMINAL.includes(local.status)) {
      res.status(200).json({ id, status: local.status, source: 'webhook', data: local });
      return;
    }

    const result = await zenith.getCheckout(id);

    if (result.status === 404) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (result.status >= 400) {
      res.status(result.status).json({ error: 'gateway_error', status: result.status });
      return;
    }

    const checkout = (result.body && result.body.checkout) || {};
    const status = checkout.status || 'unknown';

    if (checkout.id && !(local && TERMINAL.includes(local.status))) {
      try {
        const merged = Object.assign({}, local || {}, { id, status });
        await storage.save(id, merged);
      } catch (e) {
        console.error('storage update failed:', e.message);
      }
    }

    res.status(200).json({ id, status, source: 'gateway', data: result.body });
  } catch (e) {
    console.error('get-payment-mx error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
