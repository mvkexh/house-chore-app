import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccount) {
    try {
      const parsed = typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount;
      return initializeApp({
        credential: cert(parsed),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'device-streaming-3f82148c',
      });
    } catch (e) {
      console.warn('[Firebase Admin] Service account parse warning, falling back to ADC:', e.message);
    }
  }

  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'device-streaming-3f82148c',
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { targetUserIds, title, message, houseId } = body;

    if (!Array.isArray(targetUserIds) || targetUserIds.length === 0) {
      return NextResponse.json({ success: false, message: 'No target user IDs provided' }, { status: 400 });
    }

    console.log(`[API /api/push-notification] FCM HTTP v1 push dispatch requested for UIDs:`, targetUserIds, { title, message, houseId });

    const adminApp = getAdminApp();
    const adminDb = getFirestore(adminApp);
    const messaging = getMessaging(adminApp);

    // Query userPushTokens from Firestore server-side using Admin SDK
    const tokensSet = new Set();
    
    try {
      const snap = await adminDb.collection('userPushTokens').get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        const uid = data.userId || data.user_id;
        const token = data.token;
        if (uid && token && targetUserIds.includes(uid)) {
          tokensSet.add(token);
        }
      });
    } catch (fsErr) {
      console.warn('[Firebase Admin Firestore] Error fetching userPushTokens:', fsErr.message);
    }

    const tokens = Array.from(tokensSet);

    if (tokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active FCM tokens found for target user(s).',
        recipients: targetUserIds,
        tokensFoundCount: 0,
        successCount: 0,
      });
    }

    // Send using Firebase Admin SDK FCM HTTP v1 engine
    const multicastMessage = {
      tokens: tokens,
      notification: {
        title: title || 'Room Buddy Alert',
        body: message || 'New update in your house',
      },
      data: {
        houseId: houseId || '',
        title: title || 'Room Buddy Alert',
        message: message || '',
      },
      webpush: {
        notification: {
          title: title || 'Room Buddy Alert',
          body: message || 'New update in your house',
          icon: 'https://api.dicebear.com/7.x/bottts/svg?seed=roombuddy',
        },
        fcmOptions: {
          link: '/',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(multicastMessage);

    console.log(`[FCM HTTP v1 Admin] Successfully sent ${response.successCount} of ${tokens.length} push message(s).`);

    return NextResponse.json({
      success: true,
      message: `FCM HTTP v1 push completed for ${targetUserIds.length} recipient(s).`,
      recipients: targetUserIds,
      tokensFoundCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('[API /api/push-notification error]', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
