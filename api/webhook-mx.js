// POST /api/webhook-mx
// Recebe eventos da ZENITH (México OXXO/SPEI + Polónia BLIK — mesma URL, mesma
// assinatura, decide por local.country no storage).
// Assinatura: HMAC-SHA256(ZENITH_WEBHOOK_SECRET, timestamp + "." + rawBody), hex.
const crypto = require('crypto');
const storage = require('./_lib/storage');
const metaCapi = require('./_lib/metaCapi');
const tiktokCapi = require('./_lib/tiktokCapi');
const auth = require('./_lib/auth');
const accounts = require('./_lib/accounts');

const CORE_SKUS = ['core', 'core_bump', 'core_discount'];
const PAID_TYPES = ['checkout.succeeded', 'payment.captured'];
const FAILED_TYPES = ['payment.failed', 'checkout.canceled'];

// Nomes por país — usados no Meta/TikTok Purchase (content_name).
const SKU_MAP = {
  mx: {
    core: { id: 'ghostspy-vip', name: 'GhostSpy Acceso VIP' },
    core_bump: { id: 'ghostspy-vip-multi', name: 'GhostSpy VIP + Multi-Perfil' },
    core_discount: { id: 'ghostspy-vip-discount', name: 'GhostSpy VIP (Oferta Especial)' },
    upsell_blindagem: { id: 'ghostspy-blindagem', name: 'GhostSpy Blindaje de Confidencialidad' },
    upsell_blindagem_discount: { id: 'ghostspy-blindagem-discount', name: 'GhostSpy Blindaje (Última Oferta)' },
    upsell_descoberta: { id: 'ghostspy-descoberta', name: 'GhostSpy Reporte de Evento Sospechoso' },
    upsell_descoberta_discount: { id: 'ghostspy-descoberta-discount', name: 'GhostSpy Evento Sospechoso (Última Oferta)' },
    upsell_taxa_seguranca: { id: 'ghostspy-taxa-seguranca', name: 'GhostSpy Cuota de Confidencialidad' },
    upsell_taxa_seguranca_discount: { id: 'ghostspy-taxa-seguranca-discount', name: 'GhostSpy Cuota (Última Oferta)' },
    upsell_alertas_vitalicio: { id: 'ghostspy-alertas-vitalicio', name: 'GhostSpy Alertas de por Vida' },
    upsell_alertas_vitalicio_discount: { id: 'ghostspy-alertas-vitalicio-discount', name: 'GhostSpy Alertas (Última Oferta)' },
  },
  pl: {
    core: { id: 'ghostspy-vip', name: 'GhostSpy Dostęp VIP' },
    core_bump: { id: 'ghostspy-vip-multi', name: 'GhostSpy VIP + Multi-Profil' },
    core_discount: { id: 'ghostspy-vip-discount', name: 'GhostSpy VIP (Oferta Specjalna)' },
    upsell_blindagem: { id: 'ghostspy-blindagem', name: 'GhostSpy Ochrona Poufności' },
    upsell_blindagem_discount: { id: 'ghostspy-blindagem-discount', name: 'GhostSpy Ochrona (Ostatnia Oferta)' },
    upsell_descoberta: { id: 'ghostspy-descoberta', name: 'GhostSpy Raport Podejrzanego Zdarzenia' },
    upsell_descoberta_discount: { id: 'ghostspy-descoberta-discount', name: 'GhostSpy Podejrzane Zdarzenie (Ostatnia Oferta)' },
    upsell_taxa_seguranca: { id: 'ghostspy-taxa-seguranca', name: 'GhostSpy Opłata za Poufność' },
    upsell_taxa_seguranca_discount: { id: 'ghostspy-taxa-seguranca-discount', name: 'GhostSpy Opłata (Ostatnia Oferta)' },
    upsell_alertas_vitalicio: { id: 'ghostspy-alertas-vitalicio', name: 'GhostSpy Dożywotnie Alerty' },
    upsell_alertas_vitalicio_discount: { id: 'ghostspy-alertas-vitalicio-discount', name: 'GhostSpy Dożywotnie Alerty (Ostatnia Oferta)' },
  },
};

const CURRENCY_BY_COUNTRY = { mx: 'MXN', pl: 'PLN' };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function onPaid(data) {
  const checkoutId = String(data.checkoutId || data.paymentId || '');
  if (!checkoutId) return;

  let local = (await storage.load(checkoutId)) || {};
  const created = local.created || {};
  const payer = created.payer || {};
  const amount = Number(data.amount != null ? data.amount / 100 : created.amount || 0);
  const email = payer.email || null;
  const country = (local.country === 'pl' ? 'pl' : 'mx');
  const currency = CURRENCY_BY_COUNTRY[country];
  const skuMap = SKU_MAP[country];

  console.log(`[zenith:${country}] payment confirmed checkout=${checkoutId} amount=${amount} email=${email || '(sem email)'}`);

  // ---- Meta CAPI: Purchase event -----------------------------------------
  try {
    if (metaCapi.isConfigured()) {
      const ctx = local.user_context || {};
      const sku = local.sku || 'core';
      const mapped = skuMap[sku] || { id: 'ghostspy-vip', name: 'GhostSpy VIP' };

      const event = metaCapi.buildPurchase({
        eventId: checkoutId,
        value: amount,
        currency,
        email,
        phone: null,
        clientIp: ctx.ip || null,
        userAgent: ctx.user_agent || null,
        fbp: ctx.fbp || null,
        fbc: ctx.fbc || null,
        sourceUrl: ctx.source_url || null,
        productName: mapped.name,
        tracking: created.tracking || {},
      });
      event.custom_data.content_ids = [mapped.id];
      event.custom_data.content_name = mapped.name;
      event.custom_data.content_type = 'product';

      const res = await metaCapi.send([event]);
      console.log(`[zenith:${country}] Meta CAPI Purchase status=${res.status}`);

      // Poland: send the same Purchase to the second pixel if configured.
      if (country === 'pl' && process.env.META_PIXEL_ID_PL_B && process.env.META_CAPI_ACCESS_TOKEN_PL_B) {
        const res2 = await metaCapi.send([event], {
          pixelId: process.env.META_PIXEL_ID_PL_B,
          accessToken: process.env.META_CAPI_ACCESS_TOKEN_PL_B,
        });
        console.log(`[zenith:${country}] Meta CAPI Purchase (pixel B) status=${res2.status}`);
      }
    }
  } catch (e) {
    console.error(`[zenith:${country}] Meta CAPI failed:`, e.message);
  }

  // ---- TikTok Events API --------------------------------------------------
  try {
    if (tiktokCapi.isConfigured()) {
      const ctx = local.user_context || {};
      const sku = local.sku || 'core';
      const mapped = skuMap[sku] || { id: 'ghostspy-vip', name: 'GhostSpy VIP' };

      const event = tiktokCapi.buildPurchase({
        eventId: checkoutId,
        value: amount,
        currency,
        email,
        phone: null,
        clientIp: ctx.ip || null,
        userAgent: ctx.user_agent || null,
        ttclid: ctx.ttclid || null,
        ttp: ctx.ttp || null,
        sourceUrl: ctx.source_url || null,
        productName: mapped.name,
        productId: mapped.id,
      });

      const res = await tiktokCapi.send([event]);
      console.log(`[zenith:${country}] TikTok CAPI CompletePayment status=${res.status}`);
    }
  } catch (e) {
    console.error(`[zenith:${country}] TikTok CAPI failed:`, e.message);
  }

  // ---- Painel do cliente: gera conta --------------------------------------
  try {
    const sku = local.sku || 'core';
    if (CORE_SKUS.includes(sku) && !local.account) {
      const username = auth.genUsername(email || checkoutId);
      const password = auth.genPassword(8);
      const account = {
        id: checkoutId,
        role: 'customer',
        username,
        password_hash: auth.hashPassword(password),
        target_username: created.target_username || null,
        name: payer.name || null,
        email,
        sku,
        country,
        created_at: new Date().toISOString(),
      };
      await accounts.saveAccount(checkoutId, account);
      await accounts.saveUsernameIndex(username, checkoutId);
      await accounts.addToIndex(checkoutId);

      local.account = { username, password };
      console.log(`[zenith:${country}] Painel: conta criada username=${username}`);
    }
  } catch (e) {
    console.error(`[zenith:${country}] Painel account creation failed:`, e.message);
  }

  local.id = checkoutId;
  local.status = 'succeeded';
  await storage.save(checkoutId, local);
}

async function onFailed(data) {
  const checkoutId = String(data.checkoutId || data.paymentId || '');
  if (!checkoutId) return;
  const local = (await storage.load(checkoutId)) || { id: checkoutId, events: [] };
  local.id = checkoutId;
  local.status = 'failed';
  await storage.save(checkoutId, local);
}

async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const rawBody = await readRawBody(req);
  const eventId = req.headers['x-zenith-event-id'] || '';
  const eventType = req.headers['x-zenith-event-type'] || '';
  const timestamp = req.headers['x-zenith-timestamp'] || '';
  const signature = req.headers['x-zenith-signature'] || '';

  if (!eventId || !eventType || !timestamp || !signature) {
    res.status(400).json({ error: 'missing_headers' });
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (!ts || Math.abs(now - ts) > 300) {
    res.status(401).json({ error: 'stale_timestamp' });
    return;
  }

  try {
    const secret = process.env.ZENITH_WEBHOOK_SECRET;
    if (!secret) throw new Error('Missing required config: ZENITH_WEBHOOK_SECRET');

    const expected = crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex');
    const sigBuf = Buffer.from(String(signature), 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      console.error('[zenith] webhook bad signature; type=' + eventType);
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
    const checkoutId = String(data.checkoutId || data.paymentId || '');

    // Idempotência: não repete o efeito colateral se já processámos este event id.
    let already = false;
    if (checkoutId) {
      try {
        const existing = await storage.load(checkoutId);
        const existingEvents = (existing && existing.events) || [];
        already = existingEvents.some((e) => e.payload && e.payload.event_id === eventId);
        await storage.appendEvent(checkoutId, eventType, Object.assign({}, data, { event_id: eventId }));
      } catch (e) {
        console.error('[zenith] webhook storage failed:', e.message);
      }
    }

    if (!already) {
      if (PAID_TYPES.includes(eventType)) {
        await onPaid(data);
      } else if (FAILED_TYPES.includes(eventType)) {
        await onFailed(data);
      }
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[zenith] webhook error:', e.message);
    res.status(500).json({ error: 'internal_error' });
  }
}

module.exports = handler;
// Precisamos do corpo em bruto para validar a assinatura HMAC.
module.exports.config = { api: { bodyParser: false } };
