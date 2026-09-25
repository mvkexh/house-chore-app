import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error('[Auth Callback Error]', err);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
