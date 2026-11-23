// GET /api/panel-data  (Authorization: Bearer <token>)
// Devolve os dados do painel do cliente autenticado (ou, para admin, a lista de todas as contas).
const crypto = require('crypto');
const auth = require('./_lib/auth');
const accounts = require('./_lib/accounts');

function seedFrom(str) {
  const hash = crypto.createHash('sha256').update(String(str)).digest();
  return hash.readUInt32LE(0);
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = ['Anna', 'Bartek', 'Kasia', 'Dawid', 'Filip', 'Gosia', 'Agnieszka', 'Jakub', 'Marta', 'Rafał', 'Zofia', 'Tomasz'];
const CONTACT_TAGS = ['Stały kontakt', 'Nowy podejrzany obserwujący', 'Wymiana zdjęć', 'Rozmowa wideo', 'Usunięta wiadomość', 'Ukryty profil'];

function buildMonitoringData(seedKey, targetUsername) {
  const rnd = mulberry32(seedFrom(seedKey));
  const suspiciousCount = 2 + Math.floor(rnd() * 4);
  const suspiciousContacts = Array.from({ length: suspiciousCount }, () => {
    const name = FIRST_NAMES[Math.floor(rnd() * FIRST_NAMES.length)];
    const tag = CONTACT_TAGS[Math.floor(rnd() * CONTACT_TAGS.length)];
    const hoursAgo = 1 + Math.floor(rnd() * 72);
    return { name, tag, hours_ago: hoursAgo };
  }).sort((a, b) => a.hours_ago - b.hours_ago);

  const activity7d = Array.from({ length: 7 }, () => 2 + Math.floor(rnd() * 18));
  const storiesViewed = 3 + Math.floor(rnd() * 25);
  const daysMonitored = 1 + Math.floor(rnd() * 14);

  return {
    target_username: targetUsername || null,
    status: targetUsername ? 'monitoring' : 'pending_setup',
    new_messages: Math.floor(rnd() * 12),
    new_followers: Math.floor(rnd() * 20),
    last_seen_minutes_ago: 1 + Math.floor(rnd() * 180),
    suspicious_contacts: suspiciousContacts,
    activity_7d: activity7d,
    stories_viewed: storiesViewed,
    days_monitored: daysMonitored,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
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

    const base = {
      username: account.username,
      role: account.role,
      monitoring: buildMonitoringData(account.id, account.target_username),
    };

    if (account.role === 'admin') {
      const ids = await accounts.listAccountIds();
      const all = (await Promise.all(ids.map((id) => accounts.loadAccount(id)))).filter(Boolean);
      base.customers = all.map((a) => ({
        username: a.username,
        target_username: a.target_username || null,
        sku: a.sku,
        created_at: a.created_at,
        monitoring: buildMonitoringData(a.id, a.target_username),
      }));
    }

    res.status(200).json(base);
  } catch (e) {
    console.error('panel-data error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
