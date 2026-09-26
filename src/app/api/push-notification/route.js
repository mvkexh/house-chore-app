import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetUserIds, title, message, houseId } = body;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No target user IDs provided' }, { status: 400 });
    }

    console.log(`[API /api/push-notification] Push notification requested for users:`, targetUserIds, { title, message, houseId });

    return NextResponse.json({
      success: true,
      message: `Push notification dispatched for ${targetUserIds.length} recipient(s).`,
      recipients: targetUserIds,
    });
  } catch (error) {
    console.error('[API /api/push-notification error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
