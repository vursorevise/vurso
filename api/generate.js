const https = require('https');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Groq API key not configured' });

  try {
    const messages = req.body.messages || [];

    // Convert messages to plain text strings for Groq
    const groqMessages = messages.map(msg => {
      let text = '';
      if (Array.isArray(msg.content)) {
        text = msg.content.filter(p => p.type === 'text').map(p => p.text).join('\n');
      } else {
        text = msg.content || '';
      }
      return { role: msg.role === 'assistant' ? 'assistant' : 'user', content: text };
    });

    const groqBody = JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      max_tokens: 1200,
      temperature: 0.7
    });

    const bodyBuffer = Buffer.from(groqBody, 'utf8');

    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey,
          'Content-Length': bodyBuffer.length,
        },
      };

      const request = https.request(options, (response) => {
        const chunks = [];
        response.on('data', chunk => chunks.push(chunk));
        response.on('end', () => {
          resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') });
        });
      });

      request.on('error', reject);
      request.write(bodyBuffer);
      request.end();
    });

    const data = JSON.parse(result.body);

    if (result.status !== 200) {
      console.error('Groq error:', JSON.stringify(data));
      return res.status(result.status).json({ error: data.error?.message || 'Groq API error' });
    }

    // Convert Groq response to Anthropic format so frontend works unchanged
    const text = data.choices?.[0]?.message?.content || '';
    res.status(200).json({
      content: [{ type: 'text', text }]
    });

  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: err.message });
  }
};
