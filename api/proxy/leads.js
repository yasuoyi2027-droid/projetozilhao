// Endpoint de rastreio de leads. Guarda um registo em KV por leadId (auditoria opcional).
const crypto = require('crypto');
const { kvSet } = require('../_lib/kv');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Site-Key, CF-Turnstile-Token');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  try {
    const action = req.query.action || '';

    if (action === 'check_status') {
      res.status(200).json({ success: true, exists: false, searchCount: 0, canSearch: true });
      return;
    }

    if (action === 'check_status_by_ip') {
      res.status(200).json({
        success: true,
        exists: false,
        searchCount: 0,
        canSearch: true,
        blockReason: null,
        gracePeriodExpired: false,
        gracePeriodRemaining: 0,
        gracePeriodMinutes: 15,
        previousUsername: null,
      });
      return;
    }

    if (action === 'save_search') {
      const data = req.body && typeof req.body === 'object' ? req.body : null;
      if (!data) {
        res.status(400).json({ success: false, error: 'Invalid payload' });
        return;
      }
      try {
        const key = data.leadId || crypto.randomBytes(8).toString('hex');
        const safe = String(key).replace(/[^A-Za-z0-9_\-]/g, '_');
        data._savedAt = new Date().toISOString();
        data._ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0].trim();
        await kvSet('lead:' + safe, data);
      } catch (e) {
        console.error('lead save failed:', e.message);
      }
      res.status(200).json({ success: true, saved: true });
      return;
    }

    res.status(400).json({ success: false, error: 'Unknown action' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
};
