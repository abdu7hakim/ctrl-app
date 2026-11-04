importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/13.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBNOF5jxv4t8Y50JhrD1p2QT1x0aDHCaMk',
  authDomain: 'ctrlwebapp.firebaseapp.com',
  projectId: 'ctrlwebapp',
  messagingSenderId: '147944979842',
  appId: '1:147944979842:web:657eb4b576a7018c18a39b',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const title = notification.title || 'CTRL App';

  return self.registration.showNotification(title, {
    body: notification.body || '',
    icon: notification.icon || '/logo192.png',
  });
});
