// Proxy simples para servir imagens externas (perfis do Instagram) via nosso domínio.
const ALLOWED_HOSTS = ['scontent.cdninstagram.com', 'instagram.com', 'cdninstagram.com', 'fbcdn.net'];

module.exports = async function handler(req, res) {
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
  const ok = ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith('.' + allowed));
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
};
