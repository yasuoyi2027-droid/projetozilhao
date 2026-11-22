// Meta Conversions API client (server-side).
const crypto = require('crypto');

const API_VERSION = 'v21.0';

function isConfigured() {
  return !!(process.env.META_PIXEL_ID && process.env.META_CAPI_ACCESS_TOKEN);
}

function hash(kind, value) {
  let v = String(value).trim();
  v = kind === 'ph' ? v.replace(/\D+/g, '') : v.toLowerCase();
  return crypto.createHash('sha256').update(v).digest('hex');
}

function buildPurchase({
  eventId,
  value,
  currency,
  email,
  phone,
  clientIp,
  userAgent,
  fbp,
  fbc,
  sourceUrl,
  productName,
  tracking = {},
}) {
  const userData = {};
  if (email) userData.em = [hash('em', email)];
  if (phone) userData.ph = [hash('ph', phone)];
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const customData = {
    value: Number(value).toFixed(2),
    currency,
    content_name: productName,
    content_type: 'product',
    content_ids: [productName || 'ghostspy-vip'],
  };
  for (const [k, v] of Object.entries(tracking)) {
    if (v && k.startsWith('utm_')) customData[k] = v;
  }

  const event = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: sourceUrl || undefined,
    user_data: userData,
    custom_data: customData,
  };
  Object.keys(event).forEach((k) => event[k] === undefined && delete event[k]);
  return event;
}

async function send(events) {
  if (!isConfigured()) return { status: 0, body: { skipped: 'not_configured' }, raw: '' };

  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.META_TEST_EVENT_CODE || null;

  const payload = { data: events };
  if (testEventCode) payload.test_event_code = testEventCode;

  const url = `https://graph.facebook.com/${API_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let decoded = null;
  try {
    decoded = JSON.parse(raw);
  } catch {}
  return { status: res.status, body: decoded, raw };
}

module.exports = { isConfigured, hash, buildPurchase, send };
