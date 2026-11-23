// POST /api/set-target  (Authorization: Bearer <token>)  { target_username }
// Permite ao cliente definir/alterar o perfil do Instagram em monitorização.
const auth = require('./_lib/auth');
const accounts = require('./_lib/accounts');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const token = auth.bearerToken(req);
    const payload = auth.verifyToken(token);
    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const account = await accounts.loadAccount(payload.sub);
    if (!account) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const input = req.body && typeof req.body === 'object' ? req.body : {};
    const targetUsername = String(input.target_username || '').replace(/^@+/, '').trim().slice(0, 60);
    if (!targetUsername) {
      res.status(400).json({ error: 'invalid_target' });
      return;
    }

    account.target_username = targetUsername;
    await accounts.saveAccount(account.id, account);

    res.status(200).json({ ok: true, target_username: targetUsername });
  } catch (e) {
    console.error('set-target error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
