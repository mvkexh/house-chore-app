import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetUserIds, title, message, houseId } = body;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No target user IDs provided' }, { status: 400 });
    }

    console.log(`[API /api/push-notification] Dispatching FCM push notification to user UIDs:`, targetUserIds, { title, message, houseId });

    const firebaseServerKey = process.env.FIREBASE_SERVER_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'device-streaming-3f82148c';

    // Query Firestore REST API for user push tokens for targetUserIds
    let tokens = [];
    try {
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/userPushTokens`;
      const res = await fetch(firestoreUrl);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.documents)) {
          json.documents.forEach((doc) => {
            const fields = doc.fields || {};
            const uid = fields.userId?.stringValue || fields.user_id?.stringValue;
            const token = fields.token?.stringValue;
            if (uid && token && targetUserIds.includes(uid)) {
              tokens.push(token);
            }
          });
        }
      }
    } catch (fsErr) {
      console.warn('[API /api/push-notification] Could not query userPushTokens from Firestore REST:', fsErr.message);
    }

    let sentCount = 0;
    if (tokens.length > 0 && firebaseServerKey) {
      const sendPromises = tokens.map((token) =>
        fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `key=${firebaseServerKey}`,
          },
          body: JSON.stringify({
            to: token,
            notification: {
              title: title || 'Room Buddy Alert',
              body: message || 'New update in your house',
              icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=roombuddy',
              click_action: '/',
            },
            data: {
              houseId: houseId || '',
              title: title || 'Room Buddy Alert',
              message: message || '',
            },
            priority: 'high',
          }),
        }).then((res) => {
          if (res.ok) sentCount++;
        }).catch((err) => {
          console.warn('[FCM Send Error]', err.message);
        })
      );

      await Promise.all(sendPromises);
    }

    return NextResponse.json({
      success: true,
      message: `Push notification processed for ${targetUserIds.length} recipient(s). Sent ${sentCount} FCM push(es).`,
      recipients: targetUserIds,
      tokensFoundCount: tokens.length,
      sentCount,
    });
  } catch (error) {
    console.error('[API /api/push-notification error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
