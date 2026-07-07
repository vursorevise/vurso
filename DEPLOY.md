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

| Name | Where to get it |
|------|----------------|
| `GROQ_API_KEY` | console.groq.com → API Keys → Create (free) |
| `STRIPE_SECRET_KEY` | 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 |
| `SUPABASE_URL` | https://mdzclrqiqpejigzbwymj.supabase.co |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role key |
| `SUPABASE_ANON_KEY` | Supabase → Settings → API → anon / public key |
| `STRIPE_WEBHOOK_SECRET` | Get this in Step 7 below |
| `ADMIN_PASSWORD` | Pick any password you want for the admin panel |

Click "Save" after each one.

---

## Step 4 — Get your Groq API key
1. Go to https://console.groq.com
2. Sign up for a free account
3. Go to API Keys → Create API Key
4. Copy it and paste it as `GROQ_API_KEY` in Vercel

> **Why Groq?** Your app uses Groq (with Llama 3.3 70B) to generate flashcards, quizzes, and notes. It's free and very fast.

---

## Step 5 — Get your Supabase keys
1. Go to https://supabase.com → your project
2. Settings → API
3. Copy the **anon / public** key → paste as `SUPABASE_ANON_KEY` in Vercel
4. Copy the **service_role** key (the longer secret one) → paste as `SUPABASE_SERVICE_KEY` in Vercel

---

## Step 6 — Set up your Supabase database tables
In Supabase → SQL Editor, paste and run this:

```sql
create table profiles (
  id uuid primary key,
  email text,
  is_premium boolean default false,
  free_generates_used int default 0,
  stripe_customer_id text,
  created_at timestamptz default now()
);

create table flashcard_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  title text,
  subject text,
  level text,
  cards jsonb,
  created_at timestamptz default now()
);

create table card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  set_id uuid,
  card_index int,
  ease_factor float default 2.5,
  interval_days int default 1,
  next_review timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## Step 7 — Deploy
1. In Vercel click "Deploy"
2. Wait ~60 seconds
3. Your app is live! Click the URL Vercel gives you.

---

## Step 8 — Set up Stripe Webhook (so payments upgrade users automatically)
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
7. Add it as `STRIPE_WEBHOOK_SECRET` in Vercel → Settings → Environment Variables
8. Go back to Vercel → Deployments → click the three dots on your latest deployment → Redeploy

---

## Testing
Use Stripe test card: **4242 4242 4242 4242**, any future date, any CVC
(Only works if you swap in a Stripe test mode secret key — your live key is already set)

---

## Accessing the Admin Panel
Go to: **https://YOUR-APP-NAME.vercel.app/admin.html**
Log in with whatever you set as `ADMIN_PASSWORD`
From here you can make any user Pro or remove Pro manually.

---

## Troubleshooting
- "Function not found" → make sure vercel.json is in the root folder
- "Groq error" → check `GROQ_API_KEY` is set correctly in Vercel env vars
- "Supabase error" → make sure you have both `SUPABASE_SERVICE_KEY` and `SUPABASE_ANON_KEY` set
- Payments not upgrading user → check the webhook is set up (Step 8) and redeployed after adding the secret
- Auth not working → make sure `SUPABASE_ANON_KEY` is set (this is what the login/signup uses)
