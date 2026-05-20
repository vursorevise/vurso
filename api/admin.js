const https = require('https');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

function supabaseRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const bodyString = body ? JSON.stringify(body) : '';
    const bodyBuffer = Buffer.from(bodyString, 'utf8');
    const url = new URL(SUPABASE_URL);
    const key = SUPABASE_SERVICE_KEY.trim();

    const options = {
      hostname: url.hostname,
      path: `/rest/v1/${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=representation',
        'Content-Length': bodyBuffer.length,
      },
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });

    req.on('error', reject);
    if (body) req.write(bodyBuffer);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { password, action, email, is_premium } = req.body || {};

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    if (action === 'list') {
      const result = await supabaseRequest('GET', 'profiles?select=email,is_premium,created_at&order=created_at.desc', null);
      const data = JSON.parse(result.body);
      return res.status(200).json({ users: Array.isArray(data) ? data : [] });
    }

    if (action === 'update') {
      if (!email) return res.status(400).json({ error: 'Email required' });
      const encoded = encodeURIComponent(email);
      const result = await supabaseRequest('PATCH', `profiles?email=eq.${encoded}`, { is_premium: !!is_premium });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Admin error:', err);
    res.status(500).json({ error: err.message });
  }
};
