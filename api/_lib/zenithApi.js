// Zenith payment gateway client (Mexico / MXN).
// Docs: https://docs.zenithworld.com.br/

const BASE_URL = 'https://api.zenithworld.com.br';

function authHeaders() {
  const key = process.env.ZENITH_PUBLIC_KEY;
  const secret = process.env.ZENITH_SECRET_KEY;
  if (!key || !secret) throw new Error('Missing required config: ZENITH_PUBLIC_KEY / ZENITH_SECRET_KEY');
  return { 'X-API-Key': key, 'X-API-Secret': secret };
}

function environment() {
  return process.env.ZENITH_ENVIRONMENT || 'production';
}

async function createCheckout({
  amount,
  currency = 'MXN',
  country = 'MX',
  paymentMethod,
  referenceId,
  customerName,
  customerEmail,
  returnUrl,
  cancelUrl,
  metadata,
  idempotencyKey,
}) {
  const body = {
    amount,
    currency,
    country,
    environment: environment(),
    paymentMethod,
    referenceId,
    customerName,
    customerEmail,
    returnUrl,
    cancelUrl,
  };
  if (metadata && Object.keys(metadata).length) body.metadata = metadata;

  const res = await fetch(BASE_URL + '/integrations/checkouts', {
    method: 'POST',
    headers: Object.assign(
      { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      authHeaders()
    ),
    body: JSON.stringify(body),
  });
  const raw = await res.text();
  let decoded = null;
  try {
    decoded = JSON.parse(raw);
  } catch {}
  return { status: res.status, body: decoded, raw };
}

async function getCheckout(checkoutId) {
  const res = await fetch(BASE_URL + '/integrations/checkouts/' + encodeURIComponent(checkoutId), {
    method: 'GET',
    headers: authHeaders(),
  });
  const raw = await res.text();
  let decoded = null;
  try {
    decoded = JSON.parse(raw);
  } catch {}
  return { status: res.status, body: decoded, raw };
}

async function paymentMethods({ country = 'MX', currency = 'MXN' } = {}) {
  const qs = new URLSearchParams({ country, currency, environment: environment() });
  const res = await fetch(BASE_URL + '/integrations/payment-methods?' + qs.toString(), {
    method: 'GET',
    headers: authHeaders(),
  });
  const raw = await res.text();
  let decoded = null;
  try {
    decoded = JSON.parse(raw);
  } catch {}
  return { status: res.status, body: decoded, raw };
}

module.exports = { createCheckout, getCheckout, paymentMethods };
