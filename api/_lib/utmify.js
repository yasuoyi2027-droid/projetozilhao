// Cliente UTMify (api.utmify.com.br).

function isConfigured() {
  return !!process.env.UTMIFY_API_TOKEN;
}

async function sendOrder(order) {
  if (!isConfigured()) return { status: 0, body: { skipped: 'not_configured' }, raw: '' };

  const createdAt = order.createdAt || new Date().toISOString().replace('T', ' ').slice(0, 19);
  const approvedAt = order.approvedAt || null;
  const price = Number(order.priceInCents || 0);
  const tracking = order.tracking || {};
  const customer = order.customer || {};

  const payload = {
    orderId: String(order.orderId),
    platform: 'AlfaiaBoemia',
    currency: 'EUR',
    paymentMethod: 'pix',
    status: String(order.status),
    createdAt,
    approvedDate: order.status === 'paid' ? approvedAt || createdAt : null,
    refundedAt: order.status === 'refunded' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null,
    customer: {
      name: customer.name || 'Cliente MB WAY',
      email: customer.email || '',
      phone: customer.phone || '',
      document: customer.document || null,
      country: 'PT',
      ip: customer.ip || '0.0.0.0',
    },
    products: [
      {
        id: String(order.productId || 'ghostspy-vip'),
        name: String(order.productName || 'GhostSpy VIP'),
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: price,
        currency: 'EUR',
      },
    ],
    trackingParameters: {
      src: tracking.src || null,
      sck: tracking.sck || null,
      utm_source: tracking.utm_source || null,
      utm_campaign: tracking.utm_campaign || null,
      utm_medium: tracking.utm_medium || null,
      utm_content: tracking.utm_content || null,
      utm_term: tracking.utm_term || null,
    },
    commission: {
      totalPriceInCents: price,
      gatewayFeeInCents: 0,
      userCommissionInCents: price,
      currency: 'EUR',
    },
    isTest: false,
  };

  const res = await fetch('https://api.utmify.com.br/api-credentials/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-token': process.env.UTMIFY_API_TOKEN },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let decoded = null;
  try {
    decoded = JSON.parse(raw);
  } catch {}
  return { status: res.status, body: decoded, raw };
}

module.exports = { isConfigured, sendOrder };
