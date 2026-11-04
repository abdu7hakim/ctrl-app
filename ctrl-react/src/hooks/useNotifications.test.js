import { act, renderHook } from '@testing-library/react';
import { updateDoc, doc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app, db } from '../firebase';
import { useNotifications } from './useNotifications';

jest.mock('../firebase', () => ({ app: {}, db: {} }));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('firebase/messaging', () => ({
  getMessaging: jest.fn(),
  getToken: jest.fn(),
  isSupported: jest.fn(),
}));

const originalNotification = global.Notification;
const originalServiceWorker = navigator.serviceWorker;
let serviceWorkerReady;

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REACT_APP_FIREBASE_VAPID_KEY = 'test-vapid-key';
  Object.defineProperty(global, 'Notification', {
    configurable: true,
    value: { requestPermission: jest.fn().mockResolvedValue('granted') },
  });
  serviceWorkerReady = jest.fn().mockResolvedValue({ scope: '/' });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: jest.fn().mockResolvedValue({ scope: '/' }),
      get ready() {
        return serviceWorkerReady();
      },
    },
  });
  isSupported.mockResolvedValue(true);
  getMessaging.mockReturnValue('messaging-instance');
  getToken.mockResolvedValue('fcm-token');
  doc.mockReturnValue('user-document');
  updateDoc.mockResolvedValue();
});

afterEach(() => {
  if (originalNotification) {
    Object.defineProperty(global, 'Notification', { configurable: true, value: originalNotification });
  } else {
    delete global.Notification;
  }
  if (originalServiceWorker) {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: originalServiceWorker });
  } else {
    delete navigator.serviceWorker;
  }
  delete process.env.REACT_APP_FIREBASE_VAPID_KEY;
});

test('requests notification permission, gets an FCM token, and saves it to the user document', async () => {
  const { result } = renderHook(() => useNotifications('user-123'));

  await act(async () => {
    await result.current.requestNotifications();
  });

  expect(global.Notification.requestPermission).toHaveBeenCalledTimes(1);
  expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/firebase-messaging-sw.js');
  expect(serviceWorkerReady).toHaveBeenCalledTimes(1);
  expect(getMessaging).toHaveBeenCalledWith(app);
  expect(getToken).toHaveBeenCalledWith('messaging-instance', {
    vapidKey: 'test-vapid-key',
    serviceWorkerRegistration: { scope: '/' },
  });
  expect(doc).toHaveBeenCalledWith(db, 'users', 'user-123');
  expect(updateDoc).toHaveBeenCalledWith('user-document', { fcmToken: 'fcm-token' });
  expect(result.current.success).toBe('Bildirishnomalar yoqildi.');
});

test('retries token retrieval twice after failures before succeeding', async () => {
  getToken
    .mockRejectedValueOnce(new Error('Service worker is not active'))
    .mockRejectedValueOnce(new Error('Service worker is not active'))
    .mockResolvedValueOnce('fcm-token-after-retry');

  const { result } = renderHook(() => useNotifications('user-123'));

  await act(async () => {
    await result.current.requestNotifications();
  });

  expect(getToken).toHaveBeenCalledTimes(3);
  expect(updateDoc).toHaveBeenCalledWith('user-document', { fcmToken: 'fcm-token-after-retry' });
  expect(result.current.success).toBe('Bildirishnomalar yoqildi.');
});

test('shows the required message when notification permission is denied', async () => {
  global.Notification.requestPermission.mockResolvedValue('denied');
  const { result } = renderHook(() => useNotifications('user-123'));

  await act(async () => {
    await result.current.requestNotifications();
  });

  expect(result.current.error).toBe('Bildirishnomalar bloklangan. Brauzer sozlamalaridan ruxsat bering.');
  expect(getToken).not.toHaveBeenCalled();
  expect(updateDoc).not.toHaveBeenCalled();
});
