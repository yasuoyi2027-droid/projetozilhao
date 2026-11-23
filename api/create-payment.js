// POST /api/create-payment
// Body JSON:
// {
//   "sku": "core" | "core_bump" | "upsell_blindagem" | "upsell_descoberta" ...
//   "phone": "912345678",
//   "country_code": "351",
//   "payer": { "name": "...", "email": "...", "document": "...", "phone": "..." },
//   "tracking": { "utm_source": "...", ... },
//   "fbp": "...", "fbc": "...",
//   "parent_id": "<payment_id_do_core>"
// }
const alfaiaboemia = require('./_lib/alfaiaboemia');
const storage = require('./_lib/storage');

const SKUS = {
  core: { id: 'ghostspy-vip', name: 'GhostSpy Acesso VIP', price: 9.9 },
  core_bump: { id: 'ghostspy-vip-multi', name: 'GhostSpy VIP + Multi-Perfil (3 extras)', price: 24.8 },
  core_discount: { id: 'ghostspy-vip-discount', name: 'GhostSpy VIP (Oferta Especial)', price: 9.9 },
  upsell_blindagem: { id: 'ghostspy-blindagem', name: 'GhostSpy — Blindagem de Confidencialidade', price: 17.9 },
  upsell_blindagem_discount: { id: 'ghostspy-blindagem-discount', name: 'GhostSpy — Blindagem (Última Oferta)', price: 12.9 },
  upsell_descoberta: { id: 'ghostspy-descoberta', name: 'GhostSpy — Relatório de Evento Suspeito', price: 12.9 },
  upsell_descoberta_discount: { id: 'ghostspy-descoberta-discount', name: 'GhostSpy — Evento Suspeito (Última Oferta)', price: 9.9 },
  upsell_taxa_seguranca: { id: 'ghostspy-taxa-seguranca', name: 'GhostSpy — Taxa de Confidencialidade', price: 19.9 },
  upsell_taxa_seguranca_discount: { id: 'ghostspy-taxa-seguranca-discount', name: 'GhostSpy — Taxa (Ultima Oferta)', price: 14.9 },
  upsell_alertas_vitalicio: { id: 'ghostspy-alertas-vitalicio', name: 'GhostSpy — Alertas Vitalicios', price: 27.9 },
  upsell_alertas_vitalicio_discount: { id: 'ghostspy-alertas-vitalicio-discount', name: 'GhostSpy — Alertas Vitalicios (Ultima Oferta)', price: 19.9 },
};

const PAYER_FIELDS = ['name', 'email', 'document', 'phone'];
const TRACK_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src', 'sck'];

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'] || req.headers['cf-connecting-ip'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket && req.socket.remoteAddress;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const input = req.body && typeof req.body === 'object' ? req.body : {};

    const sku = String(input.sku || 'core');
    const skuData = SKUS[sku];
    if (!skuData) {
      res.status(400).json({ error: 'invalid_sku' });
      return;
    }
    const amount = Number(skuData.price);

    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) throw new Error('Missing required config: SITE_URL');
    const callback = siteUrl.replace(/\/+$/, '') + '/api/webhook';

    const payer = input.payer || {};
    const tracking = input.tracking || {};
    const parentId = String(input.parent_id || '');

    const body = { amount, currency: 'EUR', method: 'mbway', callback_url: callback };

    const payerOut = {};
    for (const f of PAYER_FIELDS) {
      if (payer[f] && typeof payer[f] === 'string') payerOut[f] = payer[f].trim();
    }

    let parentData = null;
    async function loadParent() {
      if (!parentId || parentData) return parentData;
      parentData = (await storage.load(parentId)) || {};
      return parentData;
    }

    if (parentId && (!payerOut.email || !payerOut.name)) {
      try {
        const local = await loadParent();
        const parentCreated = local.created || {};
        const parentPayer = parentCreated.payer || {};
        for (const f of PAYER_FIELDS) {
          if (!payerOut[f] && parentPayer[f]) payerOut[f] = parentPayer[f];
        }
      } catch (e) {
        console.error('parent lookup failed:', e.message);
      }
    }
    if (Object.keys(payerOut).length) body.payer = payerOut;

    const trackOut = {};
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
    if (Object.keys(trackOut).length) body.tracking = trackOut;

    body.product = { id: skuData.id, name: skuData.name };

    let phone = String(input.phone || '').replace(/\D+/g, '');
    if (!phone && payerOut.phone) phone = payerOut.phone.replace(/\D+/g, '');
    if (!phone && parentId) {
      try {
        const local = await loadParent();
        const parentCreated = local.created || {};
        const parentPhoneRaw = parentCreated.phone || (parentCreated.payer || {}).phone || '';
        phone = String(parentPhoneRaw).replace(/\D+/g, '');
        if (phone.length > 9 && phone.startsWith('351')) phone = phone.slice(3);
      } catch (e) {}
    }
    if (!phone || phone.length < 9) {
      res.status(400).json({ error: 'invalid_phone', message: 'Número MB WAY inválido' });
      return;
    }
    body.country_code = String(input.country_code || '351');
    body.phone = phone;

    const result = await alfaiaboemia.createPayment(body);

    if (result.status >= 400) {
      res.status(result.status).json({ error: 'gateway_error', status: result.status, gateway: result.body });
      return;
    }

    const data = result.body && result.body.data;
    if (data && data.id) {
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

        await storage.save(data.id, {
          id: data.id,
          status: data.status || 'pending',
          sku,
          parent_id: parentId || null,
          created: Object.assign({}, data, { tracking: trackOut, phone }),
          user_context: userContext,
          events: [],
        });

      } catch (e) {
        console.error('storage save failed:', e.message);
      }
    }

    res.status(201).json(result.body);
  } catch (e) {
    console.error('create-payment error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
};
