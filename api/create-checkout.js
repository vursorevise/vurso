const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, userId } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      ui_mode: 'embedded',
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'Revise AI Pro',
              description: 'Unlimited flashcards, quizzes, essay feedback, PDF upload & spaced repetition',
              images: [],
            },
            unit_amount: 499, // £4.99 in pence
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      metadata: { userId: userId || '' },
      return_url: `${req.headers.origin || 'https://your-app.vercel.app'}/public/index.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    });

    res.status(200).json({
      clientSecret: session.client_secret,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: err.message });
  }
};
