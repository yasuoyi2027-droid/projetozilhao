// Autenticação do painel: hashing de password (scrypt) + tokens de sessão assinados (HMAC).
const crypto = require('crypto');

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(String(password), salt, 64);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function genPassword(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O/0/I/1 para evitar confusão
  let out = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function genUsername(seed) {
  const clean = String(seed || '')
    .toLowerCase()
    .replace(/@.*$/, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 16);
  const suffix = crypto.randomBytes(2).toString('hex');
  return (clean || 'cliente') + suffix;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('Missing required config: AUTH_SECRET');
  return s;
}

function signToken(payload, ttlSeconds = 60 * 60 * 24 * 30) {
  const body = Object.assign({}, payload, { iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSeconds });
  const json = JSON.stringify(body);
  const encoded = b64url(json);
  const sig = b64url(crypto.createHmac('sha256', secret()).update(encoded).digest());
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string' || !token.includes('.')) return null;
    const [encoded, sig] = token.split('.');
    const expected = b64url(crypto.createHmac('sha256', secret()).update(encoded).digest());
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(b64urlDecode(encoded).toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearerToken(req) {
  const h = req.headers['authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

module.exports = { hashPassword, verifyPassword, genPassword, genUsername, signToken, verifyToken, bearerToken };
