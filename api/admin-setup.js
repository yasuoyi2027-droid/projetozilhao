// POST /api/admin-setup  { secret, username, password }
// Endpoint de uso único para criar/repor a conta admin do painel. Protegido por
// ADMIN_SETUP_SECRET (env var) — sem essa env configurada, o endpoint recusa tudo.
const crypto = require('crypto');
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
    const expected = process.env.ADMIN_SETUP_SECRET;
    if (!expected) {
      res.status(500).json({ error: 'not_configured' });
      return;
    }

    const input = req.body && typeof req.body === 'object' ? req.body : {};
    const secret = String(input.secret || '');
    const secretBuf = Buffer.from(secret);
    const expectedBuf = Buffer.from(expected);
    if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
      res.status(403).json({ error: 'forbidden' });
      return;
    }

    const username = String(input.username || 'admin').trim();
    const password = String(input.password || '') || auth.genPassword(10);
    const accountId = 'admin-' + crypto.randomBytes(8).toString('hex');

    const account = {
      id: accountId,
      role: 'admin',
      username,
      password_hash: auth.hashPassword(password),
      target_username: null,
      created_at: new Date().toISOString(),
    };

    await accounts.saveAccount(accountId, account);
    await accounts.saveUsernameIndex(username, accountId);
    await accounts.addToIndex(accountId);

    res.status(200).json({ ok: true, username, password });
  } catch (e) {
    console.error('admin-setup error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
