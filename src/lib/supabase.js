/**
 * Roommate Chore Manager — Supabase Cloud Database Client & Integration Layer
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://roommate-chore-manager.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvb21tYXRlLWNob3JlLW1hbmFnZXIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzI2NDgwMCwiZXhwIjoyMDQyODQwODAwfQ.mock_anon_key';

export function isSupabaseConfigured() {
  return (
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://roommate-chore-manager.supabase.co' &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('mock_anon_key')
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Authentication Helpers
 */
export async function signInWithGoogle() {
  if (typeof window === 'undefined') return;

  if (!isSupabaseConfigured()) {
    throw new Error(
      'Google OAuth requires real Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Vercel / .env.local.'
    );
  }

  const redirectUrl = `${window.location.origin}/auth/callback`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
    },
  });

  if (error) {
    console.error('[Supabase Auth Error] Google OAuth error:', error.message);
    throw new Error(`Google OAuth error: ${error.message}`);
  }
  return data;
}

export async function signOutUser() {
  if (!isSupabaseConfigured()) return;
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('[Supabase Auth Warning] Sign out error:', err.message);
  }
}

/**
 * User Profile Persistence
 */
export async function dbUpsertUserProfile(userObj) {
  if (!userObj || !userObj.id || !isSupabaseConfigured()) return userObj;
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        [
          {
            id: userObj.id,
            email: userObj.email,
            full_name: userObj.full_name,
            avatar_url: userObj.avatar_url,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('[Supabase Error] Profile upsert error:', error.message);
      throw new Error(`Database error saving profile: ${error.message}`);
    }
    return data?.[0] || userObj;
  } catch (err) {
    console.error('[Supabase Error] dbUpsertUserProfile failed:', err.message);
    throw err;
  }
}

/**
 * Shared Cloud Database Helper Functions
 */
export async function dbFetchHouseByCode(code) {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  if (!isSupabaseConfigured()) {
    console.warn('[Supabase Warning] Database not configured. Cannot query Supabase for code:', cleanCode);
    return null;
  }

  const { data, error } = await supabase
    .from('houses')
    .select('*')
    .ilike('invite_code', cleanCode)
    .maybeSingle();

  if (error) {
    console.error('[Supabase Error] dbFetchHouseByCode error:', error.message);
    throw new Error(`Database query error looking up house code "${cleanCode}": ${error.message}`);
  }
  return data;
}

export async function dbCreateHouse(houseObj) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Cannot create house in database: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in environment variables.'
    );
  }

  const { data, error } = await supabase
    .from('houses')
    .insert([houseObj])
    .select();

  if (error) {
    console.error('[Supabase Error] Insert house error:', error.message);
    throw new Error(`Database error creating house: ${error.message}`);
  }
  return data?.[0] || houseObj;
}

export async function dbCreateMember(memberObj) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Cannot create house member in database: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing in environment variables.'
    );
  }

  const { data, error } = await supabase
    .from('house_members')
    .insert([memberObj])
    .select();

  if (error) {
    console.error('[Supabase Error] Insert member error:', error.message);
    throw new Error(`Database error adding member to house: ${error.message}`);
  }
  return data?.[0] || memberObj;
}

export async function dbFetchHouseData(houseId) {
  if (!houseId || !isSupabaseConfigured()) return null;

  try {
    const [
      { data: houses, error: errHouses },
      { data: members, error: errMembers },
      { data: chores, error: errChores },
      { data: assignments, error: errAssign },
      { data: completions, error: errComp },
      { data: attentionRequests, error: errAttn },
    ] = await Promise.all([
      supabase.from('houses').select('*').eq('id', houseId),
      supabase.from('house_members').select('*').eq('house_id', houseId),
      supabase.from('chores').select('*').eq('house_id', houseId),
      supabase.from('assignments').select('*').eq('house_id', houseId),
      supabase.from('completion_events').select('*').eq('house_id', houseId),
      supabase.from('attention_requests').select('*').eq('house_id', houseId),
    ]);

    if (errHouses || errMembers || errChores || errAssign || errComp || errAttn) {
      console.warn(
        '[Supabase Warning] Partial fetch warning:',
        errHouses?.message || errMembers?.message || errChores?.message
      );
    }

    return {
      house: houses?.[0] || null,
      members: members || [],
      chores: chores || [],
      assignments: assignments || [],
      completions: completions || [],
      attentionRequests: attentionRequests || [],
    };
  } catch (err) {
    console.error('[Supabase Error] dbFetchHouseData error:', err.message);
    return null;
  }
}
