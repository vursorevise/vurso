# 🚀 Deploy Revise AI to Vercel — Step by Step

## What you'll have when done
- Your app live at a real URL (e.g. revise-ai.vercel.app)
- Stripe embedded checkout inside the site (no redirects)
- Payments automatically upgrade users in Supabase
- Free: 3 generations/day | Pro: unlimited everything for £4.99/mo

---

## Step 1 — Create a free Vercel account
1. Go to https://vercel.com and click "Sign Up"
2. Sign up with GitHub (easiest) or email
3. If using GitHub, create a free account at https://github.com if you don't have one

---

## Step 2 — Upload your project
### Option A: Drag & Drop (easiest, no GitHub needed)
1. Go to https://vercel.com/new
2. Click "Browse" or drag the revise-app folder onto the page
3. Vercel will detect it automatically

### Option B: GitHub (recommended for future updates)
1. Create a new repo at https://github.com/new
2. Upload the revise-app folder contents
3. In Vercel → New Project → Import from GitHub → select your repo

---

## Step 3 — Add Environment Variables
In Vercel → your project → Settings → Environment Variables, add these one by one:

| Name | Value |
|------|-------|
| ANTHROPIC_API_KEY | [your Anthropic API key — get from console.anthropic.com → API Keys] |
| STRIPE_SECRET_KEY | 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 |
| SUPABASE_URL | https://mdzclrqiqpejigzbwymj.supabase.co |
| SUPABASE_SERVICE_KEY | [get from Supabase → Settings → API → service_role key] |
| STRIPE_WEBHOOK_SECRET | [get this in Step 5 below] |

Click "Save" after each one.

---

## Step 4 — Get your Supabase Service Role Key
1. Go to https://supabase.com → your project
2. Settings → API
3. Copy the "service_role" key (NOT the anon key — this one is secret)
4. Paste it as SUPABASE_SERVICE_KEY in Vercel

---

## Step 5 — Set up Stripe Webhook (so cancellations work)
1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://YOUR-APP-NAME.vercel.app/api/webhook
4. Select these events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_failed
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with whsec_)
7. Add it as STRIPE_WEBHOOK_SECRET in Vercel

---

## Step 6 — Deploy
1. In Vercel click "Deploy"
2. Wait ~60 seconds
3. Your app is live! Click the URL Vercel gives you.

---

## Step 7 — Update the return URL in create-checkout.js
After you know your Vercel URL, open api/create-checkout.js and the return_url is already dynamic — it uses req.headers.origin so it works automatically.

---

## Testing payments
Use Stripe test card: 4242 4242 4242 4242, any future date, any CVC
(Only works if you also have a test mode secret key — your live key is already set)

---

## Troubleshooting
- "Function not found" → make sure vercel.json is in the root folder
- "Stripe error" → check STRIPE_SECRET_KEY is set correctly in Vercel env vars
- "Supabase error" → make sure you used the service_role key, not the anon key
- Payments not upgrading user → check the webhook is set up (Step 5)
