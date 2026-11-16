
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    self.registration.showNotification(
      '⏰ Study Buddy — Focus Check',
      {
        body: payload.body || '৩ ঘণ্টা হয়েছে! তুমি কি এখনো পড়ছো?',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: 'study-buddy-focus-check',
        renotify: true,
        requireInteraction: true,
        data: {
          url: '/focus',
        },
        actions: [
          {
            action: 'open-focus',
            title: 'উত্তর দাও',
          },
        ],
      },
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destination = new URL('/focus', self.location.origin);

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of windows) {
        const url = new URL(client.url);

        if (url.origin === self.location.origin) {
          await client.navigate(destination.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(destination.href);
    })(),
  );
});
