import { NextResponse } from 'next/server';
import { addServerMember, getServerHouseMembers, getServerSyncState } from '../../../lib/serverSync';
import { dbCreateMember } from '../../../lib/firebase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const houseId = searchParams.get('house_id');

  if (houseId) {
    const members = getServerHouseMembers(houseId);
    return NextResponse.json({ success: true, members });
  }

  const state = getServerSyncState();
  return NextResponse.json({ success: true, members: state.house_members });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.house_id || !body.user_id) {
      return NextResponse.json({ success: false, error: 'Invalid member payload.' }, { status: 400 });
    }

    const savedMember = addServerMember(body);

    // Sync to Cloud Firestore DB
    dbCreateMember(body).catch((err) => {
      console.warn('[API /members POST Firebase Sync Warning]', err);
    });

    return NextResponse.json({ success: true, member: savedMember });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
