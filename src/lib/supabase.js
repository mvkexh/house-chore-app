/**
 * Roommate Chore Manager — Supabase Cloud Database Client & Integration Layer
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://roommate-chore-manager.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvb21tYXRlLWNob3JlLW1hbmFnZXIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyNzI2NDgwMCwiZXhwIjoyMDQyODQwODAwfQ.mock_anon_key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Shared Cloud Database Helper Functions
 */
export async function dbFetchHouseByCode(code) {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  try {
    const { data, error } = await supabase
      .from('houses')
      .select('*')
      .ilike('invite_code', cleanCode)
      .maybeSingle();

    if (!error && data) return data;
  } catch (err) {
    console.warn('[Supabase Sync Warning] Failed to query Supabase houses table:', err.message);
  }
  return null;
}

export async function dbCreateHouse(houseObj) {
  try {
    const { data, error } = await supabase
      .from('houses')
      .insert([houseObj])
      .select();

    if (error) console.warn('[Supabase Sync Warning] Insert house error:', error.message);
    return data?.[0] || houseObj;
  } catch (err) {
    console.warn('[Supabase Sync Warning] dbCreateHouse error:', err.message);
    return houseObj;
  }
}

export async function dbCreateMember(memberObj) {
  try {
    const { data, error } = await supabase
      .from('house_members')
      .insert([memberObj])
      .select();

    if (error) console.warn('[Supabase Sync Warning] Insert member error:', error.message);
    return data?.[0] || memberObj;
  } catch (err) {
    console.warn('[Supabase Sync Warning] dbCreateMember error:', err.message);
    return memberObj;
  }
}

export async function dbFetchHouseData(houseId) {
  if (!houseId) return null;

  try {
    const [
      { data: houses },
      { data: members },
      { data: chores },
      { data: assignments },
      { data: completions },
      { data: attentionRequests },
    ] = await Promise.all([
      supabase.from('houses').select('*').eq('id', houseId),
      supabase.from('house_members').select('*').eq('house_id', houseId),
      supabase.from('chores').select('*').eq('house_id', houseId),
      supabase.from('assignments').select('*').eq('house_id', houseId),
      supabase.from('completion_events').select('*').eq('house_id', houseId),
      supabase.from('attention_requests').select('*').eq('house_id', houseId),
    ]);

    return {
      house: houses?.[0] || null,
      members: members || [],
      chores: chores || [],
      assignments: assignments || [],
      completions: completions || [],
      attentionRequests: attentionRequests || [],
    };
  } catch (err) {
    console.warn('[Supabase Sync Warning] dbFetchHouseData error:', err.message);
    return null;
  }
}
