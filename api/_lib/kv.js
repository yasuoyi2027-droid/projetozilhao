// Cliente mínimo para Vercel KV / Upstash Redis via REST (sem dependências).
// Usa as env vars KV_REST_API_URL e KV_REST_API_TOKEN (criadas automaticamente
// ao ligar uma Vercel KV store ao projeto).

const BASE = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

function assertConfigured() {
  if (!BASE || !TOKEN) {
    throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not configured');
  }
}

async function command(parts) {
  assertConfigured();
  const res = await fetch(`${BASE}/${parts.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error('KV error: ' + JSON.stringify(json));
  return json.result;
}

async function kvGet(key) {
  const result = await command(['get', key]);
  return result ? JSON.parse(result) : null;
}

async function kvSet(key, value) {
  await command(['set', key, JSON.stringify(value)]);
}

module.exports = { kvGet, kvSet };
