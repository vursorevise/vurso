const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Get stripe_customer_id from Supabase
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=stripe_customer_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    const rows = await sbRes.json();
    const customerId = rows?.[0]?.stripe_customer_id;
    if (!customerId) return res.status(400).json({ error: 'No subscription found' });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: req.headers.origin || 'https://your-app.vercel.app'
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Billing portal error:', err);
    res.status(500).json({ error: err.message });
  }
};
