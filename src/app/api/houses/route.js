import { NextResponse } from 'next/server';
import { addServerHouse, findServerHouseByCode, getServerSyncState, deleteServerHouse } from '../../../lib/serverSync';
import { dbFetchHouseByCode, dbCreateHouse, dbDeleteHouse } from '../../../lib/firebase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const id = searchParams.get('id');

  if (code) {
    const cleanCode = code.trim().toUpperCase();
    
    // 1. Check server memory store
    let house = findServerHouseByCode(cleanCode);
    if (house) {
      return NextResponse.json({ success: true, house });
    }

    // 2. Check Firebase Cloud Firestore DB
    const dbHouse = await dbFetchHouseByCode(cleanCode);
    if (dbHouse) {
      addServerHouse(dbHouse);
      return NextResponse.json({ success: true, house: dbHouse });
    }

    return NextResponse.json({ success: false, error: `House code "${cleanCode}" not found.` }, { status: 404 });
  }

  if (id) {
    const state = getServerSyncState();
    const house = state.houses.find((h) => h.id === id);
    if (house) return NextResponse.json({ success: true, house });
    return NextResponse.json({ success: false, error: 'House not found.' }, { status: 404 });
  }

  const state = getServerSyncState();
  return NextResponse.json({ success: true, houses: state.houses });
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body || !body.name || !body.invite_code) {
      return NextResponse.json({ success: false, error: 'Invalid house payload.' }, { status: 400 });
    }

    const savedHouse = addServerHouse(body);

    // Sync to Cloud Firestore DB asynchronously
    dbCreateHouse(body).catch((err) => {
      console.warn('[API /houses POST Firebase Sync Warning]', err);
    });

    return NextResponse.json({ success: true, house: savedHouse });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const houseId = searchParams.get('id');
    if (!houseId) {
      return NextResponse.json({ success: false, error: 'House ID is required.' }, { status: 400 });
    }

    deleteServerHouse(houseId);
    dbDeleteHouse(houseId).catch((err) => {
      console.warn('[API /houses DELETE Firebase Sync Warning]', err);
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
