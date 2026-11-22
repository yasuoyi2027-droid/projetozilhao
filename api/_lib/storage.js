const { kvGet, kvSet } = require('./kv');

const ID_RE = /^[0-9a-f-]{32,}$/i;

async function save(paymentId, data) {
  if (!ID_RE.test(paymentId)) throw new Error('Invalid payment id');
  await kvSet('payment:' + paymentId, data);
}

async function load(paymentId) {
  if (!ID_RE.test(paymentId)) return null;
  return kvGet('payment:' + paymentId);
}

async function appendEvent(paymentId, event, payload) {
  const existing = (await load(paymentId)) || { id: paymentId, events: [] };
  existing.events = existing.events || [];
  existing.events.push({ event, at: new Date().toISOString(), payload });
  existing.status = payload.status || existing.status || null;
  await save(paymentId, existing);
}

module.exports = { save, load, appendEvent };
