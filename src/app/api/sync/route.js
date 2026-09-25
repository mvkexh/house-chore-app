import { NextResponse } from 'next/server';
import { getServerSyncState, mergeServerSyncState } from '../../../lib/serverSync';

export async function GET() {
  const state = getServerSyncState();
  return NextResponse.json({ success: true, data: state });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const updatedState = mergeServerSyncState(payload);
    return NextResponse.json({ success: true, data: updatedState });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
