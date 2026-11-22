// Proxy "legado" chamado pelo frontend como fonte "proxy" (primária).
// Delega ao HikerAPI, reformatando a resposta para o shape que o frontend espera.

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

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Key, CF-Turnstile-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

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
};
