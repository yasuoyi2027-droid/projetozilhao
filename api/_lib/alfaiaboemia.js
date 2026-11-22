// Cliente HTTP para a API CHECKOUT ALFAIABOEMIA (EuronPay).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function env(key) {
  const v = process.env[key];
  if (!v) throw new Error('Missing required config: ' + key);
  return v;
}

async function request(method, path, body) {
  const baseUrl = env('ALFAIABOEMIA_BASE_URL').replace(/\/+$/, '');
  const clientId = env('ALFAIABOEMIA_CLIENT_ID');
  const clientSecret = env('ALFAIABOEMIA_CLIENT_SECRET');

  const res = await fetch(baseUrl + path, {
    method,
    headers: {
      'X-Client-Id': clientId,
      'X-Client-Secret': clientSecret,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'GhostSpyPT/1.0',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let decoded;
  try {
    decoded = JSON.parse(raw);
  } catch {
    decoded = { _raw: raw };
  }
  return { status: res.status, body: decoded, raw };
}

function createPayment(body) {
  return request('POST', '/payments', body);
}

function getPayment(paymentId) {
  if (!UUID_RE.test(paymentId)) throw new Error('Invalid payment id');
  return request('GET', '/payments/' + paymentId);
}

module.exports = { createPayment, getPayment };
