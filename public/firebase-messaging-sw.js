importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDbzM0q_IdhC3vp4d5W3WgD3xZvNtoA46I",
  authDomain: "device-streaming-3f82148c.firebaseapp.com",
  projectId: "device-streaming-3f82148c",
  storageBucket: "device-streaming-3f82148c.firebasestorage.app",
  messagingSenderId: "165171432088",
  appId: "1:165171432088:web:3e08207a867aadb2419eed"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Room Buddy Alert';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.message || 'New update in your house',
    icon: payload.notification?.icon || payload.data?.icon || '/icon-192.png',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
