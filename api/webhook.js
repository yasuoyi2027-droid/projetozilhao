// POST /api/webhook
// Recebe eventos payment.paid / payment.expired / payment.refunded da CHECKOUT ALFAIABOEMIA.
const crypto = require('crypto');
const storage = require('./_lib/storage');
const metaCapi = require('./_lib/metaCapi');
const utmify = require('./_lib/utmify');

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const SKU_MAP = {
  core: { id: 'ghostspy-vip', name: 'GhostSpy Acesso VIP' },
  core_bump: { id: 'ghostspy-vip-multi', name: 'GhostSpy VIP + Multi-Perfil' },
  core_discount: { id: 'ghostspy-vip-discount', name: 'GhostSpy VIP (Oferta Especial)' },
  upsell_blindagem: { id: 'ghostspy-blindagem', name: 'GhostSpy Blindagem de Confidencialidade' },
  upsell_blindagem_discount: { id: 'ghostspy-blindagem-discount', name: 'GhostSpy Blindagem (Ultima Oferta)' },
  upsell_descoberta: { id: 'ghostspy-descoberta', name: 'GhostSpy Relatorio de Evento Suspeito' },
  upsell_descoberta_discount: { id: 'ghostspy-descoberta-discount', name: 'GhostSpy Evento Suspeito (Ultima Oferta)' },
  upsell_taxa_seguranca: { id: 'ghostspy-taxa-seguranca', name: 'GhostSpy Taxa de Confidencialidade' },
  upsell_taxa_seguranca_discount: { id: 'ghostspy-taxa-seguranca-discount', name: 'GhostSpy Taxa (Ultima Oferta)' },
  upsell_alertas_vitalicio: { id: 'ghostspy-alertas-vitalicio', name: 'GhostSpy Alertas Vitalicios' },
  upsell_alertas_vitalicio_discount: { id: 'ghostspy-alertas-vitalicio-discount', name: 'GhostSpy Alertas Vitalicios (Ultima Oferta)' },
};

async function onPaymentPaid(data) {
  const payerEmail = (data.payer || {}).email || null;
  const payerPhone = (data.payer || {}).phone || null;
  const amount = data.amount || 0;
  const method = data.method || null;
  const paymentId = data.id || null;

  console.log(`payment.paid id=${paymentId} amount=${amount} method=${method} email=${payerEmail || '(no email)'}`);

  let local = null;
  async function loadLocal() {
    if (!local && paymentId) local = (await storage.load(paymentId)) || {};
    return local || {};
  }

  // ---- Meta CAPI: Purchase event -----------------------------------------
  try {
    if (metaCapi.isConfigured() && paymentId) {
      const l = await loadLocal();
      const created = l.created || {};
      const tracking = created.tracking || {};
      const ctx = l.user_context || {};
      const sku = l.sku || 'core';
      const mapped = SKU_MAP[sku] || { id: 'ghostspy-vip', name: process.env.PRODUCT_NAME || 'GhostSpy VIP' };

      const event = metaCapi.buildPurchase({
        eventId: paymentId,
        value: Number(amount) || 0,
        currency: data.currency || 'EUR',
        email: payerEmail,
        phone: payerPhone,
        clientIp: ctx.ip || null,
        userAgent: ctx.user_agent || null,
        fbp: ctx.fbp || null,
        fbc: ctx.fbc || null,
        sourceUrl: ctx.source_url || null,
        productName: mapped.name,
        tracking,
      });
      event.custom_data.content_ids = [mapped.id];
      event.custom_data.content_name = mapped.name;
      event.custom_data.content_type = 'product';

      const res = await metaCapi.send([event]);
      console.log('Meta CAPI Purchase status=' + res.status);
    }
  } catch (e) {
    console.error('Meta CAPI failed:', e.message);
  }

  // UTMify — marca o pedido como paid.
  try {
    if (utmify.isConfigured() && paymentId) {
      const l = await loadLocal();
      const created = l.created || {};
      const tracking = created.tracking || {};
      const ctx = l.user_context || {};
      const sku = l.sku || 'core';
      const mapped = SKU_MAP[sku] || { id: 'ghostspy-vip', name: 'GhostSpy VIP' };

      const createdAt = created.created_at
        ? new Date(created.created_at).toISOString().replace('T', ' ').slice(0, 19)
        : new Date().toISOString().replace('T', ' ').slice(0, 19);

      const r = await utmify.sendOrder({
        orderId: String(paymentId),
        status: 'paid',
        priceInCents: Math.round((Number(amount) || 0) * 100),
        productId: mapped.id,
        productName: mapped.name,
        customer: {
          name: (data.payer || {}).name || 'Cliente MB WAY',
          email: (data.payer || {}).email || '',
          phone: (data.payer || {}).phone || '',
          ip: ctx.ip || null,
        },
        tracking,
        createdAt,
        approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      });
      console.log('UTMify paid status=' + r.status);
    }
  } catch (e) {
    console.error('UTMify paid failed:', e.message);
  }
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = await readRawBody(req);
  const event = req.headers['x-webhook-event'] || '';
  const timestamp = req.headers['x-webhook-timestamp'] || '';
  const signature = req.headers['x-webhook-signature'] || '';

  if (!event || !timestamp || !signature) {
    res.status(400).json({ error: 'missing_headers' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(now - ts) > 300) {
    res.status(400).json({ error: 'stale_timestamp' });
    return;
  }

  try {
    const secret = process.env.ALFAIABOEMIA_CLIENT_SECRET;
    if (!secret) throw new Error('Missing required config: ALFAIABOEMIA_CLIENT_SECRET');

    const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
    const sigBuf = Buffer.from(String(signature));
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('webhook bad signature; event=' + event);
      res.status(401).json({ error: 'invalid_signature' });
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }

    const data = payload.data || {};
    const paymentId = String(data.id || '');
    if (!paymentId) {
      res.status(400).json({ error: 'missing_payment_id' });
      return;
    }

    try {
      await storage.appendEvent(paymentId, event, data);
    } catch (e) {
      console.error('webhook storage failed:', e.message);
    }

    switch (event) {
      case 'payment.paid':
        await onPaymentPaid(data);
        break;
      case 'payment.expired':
      case 'payment.refunded':
        break;
      default:
        break;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('webhook error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = handler;
// Precisamos do corpo em bruto para validar a assinatura HMAC.
module.exports.config = { api: { bodyParser: false } };
