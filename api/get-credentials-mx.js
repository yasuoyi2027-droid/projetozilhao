// GET /api/get-credentials-mx?id=<core_checkout_id>
// Usado pela página /obrigado-mx para mostrar, uma única vez, o login gerado automaticamente.
const storage = require('./_lib/storage');

const ID_RE = /^[0-9a-zA-Z_-]{6,100}$/;

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
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
    if (!local || local.status !== 'succeeded' || !local.account) {
      res.status(404).json({ error: 'not_found' });
      return;
    }

    res.status(200).json({
      username: local.account.username,
      password: local.account.password,
      target_username: (local.created || {}).target_username || null,
    });
  } catch (e) {
    console.error('get-credentials-mx error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
