const https = require('https');

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

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Get profile
    const result = await supabaseRequest('GET', `profiles?id=eq.${userId}&select=*`, null);
    const rows = JSON.parse(result.body);

    if (!Array.isArray(rows) || rows.length === 0) {
      // Create profile if doesn't exist
      const created = await supabaseRequest('POST', 'profiles', {
        id: userId,
        is_premium: false,
        free_generates_used: 0
      });
      const newRows = JSON.parse(created.body);
      return res.status(200).json({ profile: Array.isArray(newRows) ? newRows[0] : newRows });
    }

    return res.status(200).json({ profile: rows[0] });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: err.message });
  }
};
