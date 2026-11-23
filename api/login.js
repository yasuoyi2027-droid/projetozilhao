// POST /api/login  { username, password } -> { token, role, target_username }
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
    const input = req.body && typeof req.body === 'object' ? req.body : {};
    const username = String(input.username || '').trim();
    const password = String(input.password || '');

    if (!username || !password) {
      res.status(400).json({ error: 'missing_credentials' });
      return;
    }

    const accountId = await accounts.loadIdByUsername(username);
    if (!accountId) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const account = await accounts.loadAccount(accountId);
    if (!account || !auth.verifyPassword(password, account.password_hash)) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const token = auth.signToken({ sub: account.id, role: account.role });
    res.status(200).json({
      token,
      role: account.role,
      username: account.username,
      target_username: account.target_username || null,
    });
  } catch (e) {
    console.error('login error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
