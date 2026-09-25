/**
 * Roommate Chore Manager — Browser Push Notifications Manager
 */

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.error('Error requesting notification permission:', e);
    return 'denied';
  }
}

export function sendBrowserPushNotification(title, options = {}) {
  if (!isNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const defaultOptions = {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      ...options,
    };
    new Notification(title, defaultOptions);
  } catch (e) {
    console.error('Failed to trigger browser notification:', e);
  }
}
