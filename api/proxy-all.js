// Função consolidada que substitui api/proxy/{hikerapi,image-proxy,instagram,leads}.js
// num único Serverless Function, para ficar dentro do limite do plano Vercel.
// Dispatch via ?kind=hikerapi|image-proxy|instagram|leads (ver vercel.json rewrites).
const crypto = require('crypto');
const { kvSet } = require('./_lib/kv');

const IMAGE_ALLOWED_HOSTS = ['scontent.cdninstagram.com', 'instagram.com', 'cdninstagram.com', 'fbcdn.net'];

function setCors(res, methods) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Key, CF-Turnstile-Token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ---- hikerapi ---------------------------------------------------------
async function handleHikerapi(req, res) {
  setCors(res, 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(204).end();

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
    delete query.kind;
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
}

// ---- image-proxy -------------------------------------------------------
async function handleImageProxy(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const rawUrl = req.query.url;
  if (!rawUrl || typeof rawUrl !== 'string') {
    res.status(400).send('missing url');
    return;
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    res.status(400).send('invalid url');
    return;
  }

  const host = parsed.hostname.toLowerCase();
  const ok = IMAGE_ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
  if (!ok) {
    res.status(403).send('host not allowed');
    return;
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
    });
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';

    if (!upstream.ok) {
      res.status(502).send('upstream fail');
      return;
    }
    if (!contentType.startsWith('image/')) {
      res.status(415).send('not an image');
      return;
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).send(buf);
  } catch (e) {
    res.status(502).send('upstream fail');
  }
}

// ---- instagram (legado) -------------------------------------------------
async function hikerCall(path, query) {
  const accessKey = process.env.HIKERAPI_ACCESS_KEY;
  if (!accessKey) throw new Error('Missing required config: HIKERAPI_ACCESS_KEY');
  const qs = new URLSearchParams(query).toString();
  const url = 'https://api.hikerapi.com' + path + (qs ? '?' + qs : '');

  const upstream = await fetch(url, { headers: { 'x-access-key': accessKey, accept: 'application/json' } });
  const raw = await upstream.text();
  let decoded;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new Error(`Upstream non-JSON (HTTP ${upstream.status})`);
  }
  if (upstream.status >= 400) {
    const msg = decoded.detail || decoded.error || `HTTP ${upstream.status}`;
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${upstream.status}`);
  }
  return decoded;
}

function proxyUrl(url) {
  if (!url || typeof url !== 'string') return url;
  if (url.includes('cdninstagram.com') || url.includes('fbcdn.net')) {
    return '/api/proxy/image-proxy?url=' + encodeURIComponent(url);
  }
  return url;
}

function normalizeProfile(user, fallbackUsername) {
  return {
    pk: String(user.pk || user.id || ''),
    user_id: String(user.pk || user.id || ''),
    username: user.username || fallbackUsername,
    full_name: user.full_name || '',
    biography: user.biography || '',
    profile_pic_url:
      proxyUrl(user.profile_pic_url || (user.hd_profile_pic_url_info || {}).url) || '/images/avatars/perfil-sem-foto.jpeg',
    profile_pic_url_hd: proxyUrl((user.hd_profile_pic_url_info || {}).url || user.profile_pic_url_hd),
    is_private: !!user.is_private,
    is_verified: !!user.is_verified,
    is_business: !!user.is_business,
    media_count: Number(user.media_count || 0),
    follower_count: Number(user.follower_count || 0),
    following_count: Number(user.following_count || 0),
  };
}

function mapUsers(list) {
  return (list || []).map((u) => {
    if (!u || typeof u !== 'object') return u;
    if (u.profile_pic_url) u.profile_pic_url = proxyUrl(u.profile_pic_url);
    return u;
  });
}

async function handleInstagram(req, res) {
  setCors(res, 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const tipo = req.query.tipo || '';
    let username = String(req.query.username || '').trim();
    username = username.replace(/^@+/, '');

    if (!username || !/^[A-Za-z0-9._]{1,30}$/.test(username)) {
      res.status(400).json({ error: 'Invalid username' });
      return;
    }

    if (tipo === 'perfil') {
      const resp = await hikerCall('/v2/user/by/username', { username });
      const user = resp.user;
      if (!user || typeof user !== 'object') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.status(200).json(normalizeProfile(user, username));
      return;
    }

    if (tipo === 'busca_completa' || tipo === 'all') {
      const resp = await hikerCall('/v2/user/by/username', { username });
      const user = resp.user;
      if (!user || typeof user !== 'object') {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const profile = normalizeProfile(user, username);

      let followers = [];
      try {
        const follow = await hikerCall('/v2/user/following', { user_id: user.pk || user.id || '', page_id: '1' });
        followers = mapUsers((follow.response || {}).users || follow.users || []);
      } catch (e) {}

      let posts = [];
      try {
        const medias = await hikerCall('/g2/user/medias', { user_id: user.pk || user.id || '', flat: 'true' });
        const items = (medias.response || {}).items || medias.items || [];
        for (const it of items) {
          if (!it || typeof it !== 'object') continue;
          if (it.user && it.user.profile_pic_url) it.user.profile_pic_url = proxyUrl(it.user.profile_pic_url);
          if (it.owner && it.owner.profile_pic_url) it.owner.profile_pic_url = proxyUrl(it.owner.profile_pic_url);
        }
        posts = items;
      } catch (e) {}

      res.status(200).json({
        ...profile,
        lista_perfis_publicos: followers,
        followers,
        chaining_results: followers,
        posts,
        followers_posts: posts,
        feed_posts: posts,
        error_count: 0,
        results: [{ source: 'proxy' }],
      });
      return;
    }

    res.status(400).json({ error: 'Unknown tipo' });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}

// ---- leads ---------------------------------------------------------------
async function handleLeads(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const action = req.query.action || '';

    if (action === 'check_status') {
      res.status(200).json({ success: true, exists: false, searchCount: 0, canSearch: true });
      return;
    }

    if (action === 'check_status_by_ip') {
      res.status(200).json({
        success: true,
        exists: false,
        searchCount: 0,
        canSearch: true,
        blockReason: null,
        gracePeriodExpired: false,
        gracePeriodRemaining: 0,
        gracePeriodMinutes: 15,
        previousUsername: null,
      });
      return;
    }

    if (action === 'save_search') {
      const data = req.body && typeof req.body === 'object' ? req.body : null;
      if (!data) {
        res.status(400).json({ success: false, error: 'Invalid payload' });
        return;
      }
      try {
        const key = data.leadId || crypto.randomBytes(8).toString('hex');
        const safe = String(key).replace(/[^A-Za-z0-9_\-]/g, '_');
        data._savedAt = new Date().toISOString();
        data._ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
        await kvSet('lead:' + safe, data);
      } catch (e) {
        console.error('lead save failed:', e.message);
      }
      res.status(200).json({ success: true, saved: true });
      return;
    }

    res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

module.exports = async function handler(req, res) {
  const kind = String(req.query.kind || '');
  switch (kind) {
    case 'hikerapi':
      return handleHikerapi(req, res);
    case 'image-proxy':
      return handleImageProxy(req, res);
    case 'instagram':
      return handleInstagram(req, res);
    case 'leads':
      return handleLeads(req, res);
    default:
      res.status(400).json({ error: 'unknown_kind' });
  }
};
