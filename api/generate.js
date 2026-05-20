module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    function cleanText(obj) {
      if (typeof obj === 'string') {
        return obj
          .replace(/\u2192/g, '->')
          .replace(/\u2190/g, '<-')
          .replace(/\u2191/g, '^')
          .replace(/\u2193/g, 'v')
          .replace(/\u2014/g, '--')
          .replace(/\u2013/g, '-')
          .replace(/\u2026/g, '...')
          .replace(/\u00d7/g, 'x')
          .replace(/\u00f7/g, '/')
          .replace(/[^\x00-\x7F]/g, ' ');
      }
      if (Array.isArray(obj)) return obj.map(cleanText);
      if (obj && typeof obj === 'object') {
        const out = {};
        for (const key of Object.keys(obj)) out[key] = cleanText(obj[key]);
        return out;
      }
      return obj;
    }

    const cleanedBody = cleanText(req.body);
    const bodyString = JSON.stringify(cleanedBody);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: bodyString,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
};
