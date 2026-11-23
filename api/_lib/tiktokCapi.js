// TikTok Events API client (server-side).
const crypto = require('crypto');

const API_VERSION = 'v1.3';

function isConfigured() {
  return !!(process.env.TIKTOK_PIXEL_ID && process.env.TIKTOK_CAPI_ACCESS_TOKEN);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

function buildPurchase({
  eventId,
  value,
  currency,
  email,
  phone,
  clientIp,
  userAgent,
  ttclid,
  ttp,
  sourceUrl,
  productName,
  productId,
}) {
  const userData = {};
  if (email) userData.email = hash(email);
  if (phone) userData.phone = hash(phone);
  if (clientIp) userData.ip = clientIp;
  if (userAgent) userData.user_agent = userAgent;
  if (ttclid) userData.ttclid = ttclid;
  if (ttp) userData.ttp = ttp;

  const event = {
    event: 'CompletePayment',
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    user: userData,
    properties: {
      currency,
      value: Number(value).toFixed(2),
      content_type: 'product',
      content_name: productName,
      contents: [{ content_id: productId || 'ghostspy-vip', content_name: productName }],
    },
    page: sourceUrl ? { url: sourceUrl } : undefined,
  };
  Object.keys(event).forEach((k) => event[k] === undefined && delete event[k]);
  return event;
}

async function send(events) {
  if (!isConfigured()) return { status: 0, body: { skipped: 'not_configured' }, raw: '' };

  const pixelId = process.env.TIKTOK_PIXEL_ID;
  const accessToken = process.env.TIKTOK_CAPI_ACCESS_TOKEN;
  const testEventCode = process.env.TIKTOK_TEST_EVENT_CODE || null;

  const payload = { event_source: 'web', event_source_id: pixelId, data: events };
  if (testEventCode) payload.test_event_code = testEventCode;

  const url = `https://business-api.tiktok.com/open_api/${API_VERSION}/pixel/track/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Token': accessToken,
    },
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
