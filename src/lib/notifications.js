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

import { requestPushNotificationPermission as fcmRequestPushPermission } from './firebase';

export async function requestNotificationPermission(userId) {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && userId) {
      await fcmRequestPushPermission(userId);
    }
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
