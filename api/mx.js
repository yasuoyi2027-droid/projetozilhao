// Endpoint único do fluxo México (Zenith) — consolidado num só ficheiro para
// não estourar o limite de Serverless Functions do plano Vercel.
//
// POST /api/mx?action=create   { sku, payment_method, payer, tracking, ..., parent_id } -> cria checkout
// GET  /api/mx?action=status&id=<checkout_id>                                           -> status do pagamento
// GET  /api/mx?action=credentials&id=<checkout_id>                                      -> login/senha pós-pago
const crypto = require('crypto');
const zenith = require('./_lib/zenithApi');
const storage = require('./_lib/storage');

const ID_RE = /^[0-9a-zA-Z_-]{6,100}$/;
const TERMINAL = ['succeeded', 'paid', 'failed', 'canceled', 'refunded'];

const SKUS = {
  core: { id: 'ghostspy-vip', name: 'GhostSpy Acceso VIP', amount: 18900 },
  core_bump: { id: 'ghostspy-vip-multi', name: 'GhostSpy VIP + Multi-Perfil (3 extra)', amount: 47900 },
  core_discount: { id: 'ghostspy-vip-discount', name: 'GhostSpy VIP (Oferta Especial)', amount: 14900 },
  upsell_blindagem: { id: 'ghostspy-blindagem', name: 'GhostSpy — Blindaje de Confidencialidad', amount: 34900 },
  upsell_blindagem_discount: { id: 'ghostspy-blindagem-discount', name: 'GhostSpy — Blindaje (Última Oferta)', amount: 24900 },
  upsell_descoberta: { id: 'ghostspy-descoberta', name: 'GhostSpy — Reporte de Evento Sospechoso', amount: 24900 },
  upsell_descoberta_discount: { id: 'ghostspy-descoberta-discount', name: 'GhostSpy — Evento Sospechoso (Última Oferta)', amount: 18900 },
  upsell_taxa_seguranca: { id: 'ghostspy-taxa-seguranca', name: 'GhostSpy — Cuota de Confidencialidad', amount: 38900 },
  upsell_taxa_seguranca_discount: { id: 'ghostspy-taxa-seguranca-discount', name: 'GhostSpy — Cuota (Última Oferta)', amount: 28900 },
  upsell_alertas_vitalicio: { id: 'ghostspy-alertas-vitalicio', name: 'GhostSpy — Alertas de por Vida', amount: 54900 },
  upsell_alertas_vitalicio_discount: { id: 'ghostspy-alertas-vitalicio-discount', name: 'GhostSpy — Alertas (Última Oferta)', amount: 38900 },
};

const METHODS = ['oxxo', 'spei'];

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress;
}

async function handleCreate(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const input = req.body && typeof req.body === 'object' ? req.body : {};

  const sku = String(input.sku || 'core');
  const skuData = SKUS[sku];
  if (!skuData) {
    res.status(400).json({ error: 'invalid_sku' });
    return;
  }

  const paymentMethod = METHODS.includes(input.payment_method) ? input.payment_method : 'oxxo';

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) throw new Error('Missing required config: SITE_URL');
  const base = siteUrl.replace(/\/+$/, '');

  const payer = input.payer || {};
  const tracking = input.tracking || {};
  const parentId = String(input.parent_id || '');

  let parentData = null;
  async function loadParent() {
    if (!parentId || parentData) return parentData;
    parentData = (await storage.load(parentId)) || {};
    return parentData;
  }

  let name = typeof payer.name === 'string' ? payer.name.trim() : '';
  let email = typeof payer.email === 'string' ? payer.email.trim() : '';
  if ((!name || !email) && parentId) {
    try {
      const local = await loadParent();
      const parentPayer = ((local.created || {}).payer) || {};
      if (!name) name = parentPayer.name || '';
      if (!email) email = parentPayer.email || '';
    } catch (e) {}
  }
  if (!name) name = 'Cliente GhostSpy';
  if (!email) {
    res.status(400).json({ error: 'invalid_email', message: 'Correo inválido.' });
    return;
  }

  const trackOut = {};
  const TRACK_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];
  for (const f of TRACK_FIELDS) {
    if (tracking[f] && typeof tracking[f] === 'string') trackOut[f] = tracking[f].trim();
  }
  if (!Object.keys(trackOut).length && parentId) {
    try {
      const local = await loadParent();
      const parentTracking = (local.created || {}).tracking || {};
      for (const f of TRACK_FIELDS) {
        if (parentTracking[f] && typeof parentTracking[f] === 'string') trackOut[f] = parentTracking[f];
      }
    } catch (e) {}
  }

  var targetUsername = typeof input.target_username === 'string' ? input.target_username.replace(/^@+/, '').trim().slice(0, 60) || null : null;
  if (!targetUsername && parentId) {
    try {
      const local = await loadParent();
      targetUsername = ((local.created || {}).target_username) || null;
    } catch (e) {}
  }

  const referenceId = 'gs-mx-' + crypto.randomBytes(6).toString('hex');
  const idempotencyKey = crypto.randomBytes(16).toString('hex');

  const result = await zenith.createCheckout({
    amount: skuData.amount,
    currency: 'MXN',
    country: 'MX',
    paymentMethod,
    referenceId,
    customerName: name,
    customerEmail: email,
    returnUrl: base + '/obrigado-mx/?ref=' + encodeURIComponent(referenceId),
    cancelUrl: base + '/checkout-mx/',
    idempotencyKey,
  });

  if (result.status >= 400) {
    res.status(result.status).json({ error: 'gateway_error', status: result.status, gateway: result.body });
    return;
  }

  const checkout = (result.body && result.body.checkout) || {};
  const checkoutId = checkout.id;
  if (!checkoutId) {
    res.status(502).json({ error: 'gateway_error', message: 'Respuesta inválida de la pasarela de pago.' });
    return;
  }

  try {
    const ip = clientIp(req);
    const userContext = {
      ip,
      user_agent: req.headers['user-agent'] || null,
      fbp: input.fbp || (req.cookies && req.cookies._fbp) || null,
      fbc: input.fbc || (req.cookies && req.cookies._fbc) || null,
      ttclid: input.ttclid || (req.cookies && req.cookies.ttclid) || null,
      ttp: input.ttp || (req.cookies && req.cookies._ttp) || null,
      source_url: req.headers['referer'] || null,
    };

    await storage.save(checkoutId, {
      id: checkoutId,
      status: (checkout.status || 'pending'),
      sku,
      country: 'mx',
      parent_id: parentId || null,
      created: {
        id: checkoutId,
        reference_id: referenceId,
        amount: skuData.amount / 100,
        currency: 'MXN',
        payer: { name, email },
        tracking: trackOut,
        target_username: targetUsername,
      },
      user_context: userContext,
      events: [],
    });
  } catch (e) {
    console.error('storage save failed:', e.message);
  }

  res.status(201).json({
    data: {
      id: checkoutId,
      reference_id: referenceId,
      status: checkout.status || 'pending',
      amount: skuData.amount / 100,
      currency: 'MXN',
      method: (result.body && result.body.method) || { code: paymentMethod },
      next_action: (result.body && result.body.nextAction) || null,
    },
  });
}

async function handleStatus(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = String(req.query.id || '');
  if (!ID_RE.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

  const local = await storage.load(id);

  if (local && TERMINAL.includes(local.status)) {
    res.status(200).json({ id, status: local.status, source: 'webhook', data: local });
    return;
  }

  const result = await zenith.getCheckout(id);

  if (result.status === 404) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  if (result.status >= 400) {
    res.status(result.status).json({ error: 'gateway_error', status: result.status });
    return;
  }

  const checkout = (result.body && result.body.checkout) || {};
  const status = checkout.status || 'unknown';

  if (checkout.id && !(local && TERMINAL.includes(local.status))) {
    try {
      const merged = Object.assign({}, local || {}, { id, status });
      await storage.save(id, merged);
    } catch (e) {
      console.error('storage update failed:', e.message);
    }
  }

  res.status(200).json({ id, status, source: 'gateway', data: result.body });
}

async function handleCredentials(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const id = String(req.query.id || '');
  if (!ID_RE.test(id)) {
    res.status(400).json({ error: 'invalid_id' });
    return;
  }

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
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store');

  const action = String(req.query.action || '');

  try {
    if (action === 'create') return await handleCreate(req, res);
    if (action === 'status') return await handleStatus(req, res);
    if (action === 'credentials') return await handleCredentials(req, res);
    res.status(400).json({ error: 'invalid_action' });
  } catch (e) {
    console.error('api/mx error (action=' + action + '):', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
