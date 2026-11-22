// GET /api/get-payment?id=<uuid>
const alfaiaboemia = require('./_lib/alfaiaboemia');
const storage = require('./_lib/storage');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TERMINAL = ['paid', 'expired', 'refunded'];

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = String(req.query.id || '');
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  try {
    const local = await storage.load(id);

    if (local && TERMINAL.includes(local.status)) {
      res.status(200).json({ id, status: local.status, source: 'webhook', data: local });
      return;
    }

    const result = await alfaiaboemia.getPayment(id);

    if (result.status === 404) {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    if (result.status >= 400) {
      res.status(result.status).json({ error: 'gateway_error', status: result.status });
      return;
    }

    const data = result.body && result.body.data;
    const status = data ? data.status || 'unknown' : 'unknown';

    if (data) {
      try {
        const merged = {
          id,
          status,
          created: (local && local.created) || data,
          latest: data,
          events: (local && local.events) || [],
        };
        if (local && local.sku) merged.sku = local.sku;
        if (local && local.parent_id) merged.parent_id = local.parent_id;
        if (local && local.user_context) merged.user_context = local.user_context;
        await storage.save(id, merged);
      } catch (e) {
        console.error('storage update failed:', e.message);
      }
    }

    res.status(200).json({ id, status, source: 'gateway', data });
  } catch (e) {
    console.error('get-payment error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
