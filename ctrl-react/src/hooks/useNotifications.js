import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from '../firebase';

function getNotificationPermission() {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission || 'default';
}

async function getTokenWithRetry(messaging, options) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await getToken(messaging, options);
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

}

export function useNotifications(userId) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permission, setPermission] = useState(getNotificationPermission);

  useEffect(() => {
    const syncPermission = () => setPermission(getNotificationPermission());
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  const requestNotifications = async () => {
    setError('');
    setSuccess('');

    if (!userId) {
      setError('Bildirishnomalarni yoqish uchun hisobingizga kiring.');
      return;
    }

    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      setError('Brauzeringiz bildirishnomalarni qo‘llab-quvvatlamaydi.');
      return;
    }

    const vapidKey = process.env.REACT_APP_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      setError('FCM VAPID kaliti sozlanmagan. REACT_APP_FIREBASE_VAPID_KEY qiymatini kiriting.');
      return;
    }

    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      if (permission === 'denied') {
        setError('Bildirishnomalar bloklangan. Brauzer sozlamalaridan ruxsat bering.');
        return;
      }
      if (permission !== 'granted') {
        setError('Bildirishnomalarga ruxsat berilmadi.');
        return;
      }

      if (!(await isSupported())) {
        setError('Brauzeringiz Firebase bildirishnomalarini qo‘llab-quvvatlamaydi.');
        return;
      }

      const swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await navigator.serviceWorker.ready;
      const messaging = getMessaging(app);
      const token = await getTokenWithRetry(messaging, {
        vapidKey,
        serviceWorkerRegistration: swRegistration,
      });

      if (!token) {
        setError('Bildirishnoma tokenini olib bo‘lmadi. Qayta urinib ko‘ring.');
        return;
      }

      await updateDoc(doc(db, 'users', userId), { fcmToken: token });
      setSuccess('Bildirishnomalar yoqildi.');
    } catch (requestError) {
      console.error('Bildirishnomalarni yoqishda xatolik:', requestError);
      setError('Bildirishnomalarni yoqib bo‘lmadi. Qayta urinib ko‘ring.');
    } finally {
      setIsRequesting(false);
    }
  };

  return { requestNotifications, isRequesting, error, success, permission };
}
