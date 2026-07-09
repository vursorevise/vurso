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
    // Get profile from Supabase
    const sbRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=email,stripe_customer_id`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      }
    );
    const rows = await sbRes.json();
    const profile = rows?.[0];

    if (!profile) return res.status(404).json({ error: 'User not found' });

    let customerId = profile.stripe_customer_id;

    // If no stripe_customer_id, look up by email in Stripe
    if (!customerId && profile.email) {
      const customers = await stripe.customers.list({ email: profile.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        // Save it back to Supabase for next time
        await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
            },
            body: JSON.stringify({ stripe_customer_id: customerId })
          }
        );
      }
    }

    // If still no customer ID, create a new Stripe customer so they can manage billing
    if (!customerId && profile.email) {
      const customer = await stripe.customers.create({ email: profile.email });
      customerId = customer.id;
      await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
          },
          body: JSON.stringify({ stripe_customer_id: customerId })
        }
      );
    }

    if (!customerId) return res.status(400).json({ error: 'Could not find or create Stripe customer' });

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
