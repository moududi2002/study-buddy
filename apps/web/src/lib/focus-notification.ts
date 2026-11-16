
import { api } from '@/lib/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat(
    (4 - (base64String.length % 4)) % 4,
  );

  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

export async function enableFocusNotifications() {
  if (
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    !('Notification' in window)
  ) {
    throw new Error(
      'এই Browser-এ Background Push Notification সাপোর্ট নেই',
    );
  }

  if (!window.isSecureContext) {
    throw new Error('Notification-এর জন্য HTTPS প্রয়োজন');
  }

  const permission = await Notification.requestPermission();

  if (permission !== 'granted') {
    throw new Error(
      'Notification Permission দেওয়া হয়নি',
    );
  }

  const config = await api.get<{
    success: true;
    data: { publicKey: string | null };
  }>('/focus/push/config');

  if (!config.data.publicKey) {
    throw new Error(
      'Server-এ Push Notification Configuration নেই',
    );
  }

  const registration = await navigator.serviceWorker.register(
    '/focus-sw.js',
  );

  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        config.data.publicKey,
      ),
    });
  }

  const info = subscription.toJSON();

  if (
    !subscription.endpoint ||
    !info.keys?.p256dh ||
    !info.keys?.auth
  ) {
    throw new Error('Push Subscription অসম্পূর্ণ');
  }

  await api.post('/focus/push/subscribe', {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: info.keys.p256dh,
      auth: info.keys.auth,
    },
  });

  return true;
}



export async function disableFocusNotifications() {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration(
    '/focus',
  );

  const subscription =
    await registration?.pushManager.getSubscription();

  if (!subscription) return;

  try {
    await api.post('/focus/push/unsubscribe', {
      endpoint: subscription.endpoint,
    });
  } finally {
    // Local subscription is removed even if API fails.
    await subscription.unsubscribe();
  }
}

