// /api/delete-account.js
// Permanently deletes a user's account and associated data.
//
// REQUIRES the following environment variable to be set in your Vercel project:
//   SUPABASE_SERVICE_ROLE_KEY  — found in Supabase Dashboard > Project Settings > API
//   (this is the SECRET service role key, NOT the anon/public key used in the frontend —
//    never expose this key client-side)
//
// Expects your Supabase URL to already be available as an env var, or falls back to the
// project URL used elsewhere in this app. If you store it under a different env var name,
// update SUPABASE_URL below to match.

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mdzclrqiqpejigzbwymj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SERVICE_ROLE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set in environment variables');
    res.status(500).json({ error: 'Server is not configured for account deletion. Please contact support.' });
    return;
  }

  const { userId, token } = req.body || {};
  if (!userId || !token) {
    res.status(400).json({ error: 'Missing userId or token' });
    return;
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    // 1. Verify the token actually belongs to the userId being deleted —
    //    prevents anyone from deleting an account they don't own.
    const { data: userCheck, error: authError } = await admin.auth.getUser(token);
    if (authError || !userCheck || !userCheck.user || userCheck.user.id !== userId) {
      res.status(401).json({ error: 'Not authorized to delete this account' });
      return;
    }

    // 2. Delete the user's data from app tables.
    //    Wrapped individually so one missing/renamed table doesn't block the rest.
    const tables = ['card_progress', 'flashcard_sets', 'profiles'];
    for (const table of tables) {
      try {
        await admin.from(table).delete().eq('user_id', userId);
      } catch (e) {
        console.warn(`Could not clear table "${table}" for user ${userId}:`, e.message);
      }
    }
    // profiles table sometimes keys on "id" rather than "user_id" — attempt both safely
    try { await admin.from('profiles').delete().eq('id', userId); } catch (e) {}

    // 3. Delete the actual auth user — this is the step that fully removes their account.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ error: 'Something went wrong deleting your account. Please try again or contact support.' });
  }
};
