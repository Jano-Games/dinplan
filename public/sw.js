const CACHE_NAME = 'dinplan-v1';
const STATIC_ASSETS = ['/', '/favicon.svg', '/manifest.json'];

// Install — cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Push notification received
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'DinPlan', body: 'Reminder!' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      image: data.image || undefined,
      vibrate: [300, 100, 300, 100, 300, 100, 300],
      tag: data.tag || 'dinplan-reminder',
      renotify: true,
      requireInteraction: true,
      silent: false,
      data: {
        title: data.title,
        body: data.body,
        reminderId: data.reminderId || data.tag,
        url: data.url || '/',
      },
      actions: [
        { action: 'view', title: '👀 View' },
        { action: 'snooze', title: '⏰ Snooze 5m' },
        { action: 'dismiss', title: '✕ Dismiss' },
      ],
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};

  if (event.action === 'dismiss') {
    return;
  }

  if (event.action === 'snooze') {
    // Snooze — show again in 5 minutes
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [300, 100, 300, 100, 300],
        tag: 'dinplan-reminder-snoozed',
        requireInteraction: true,
        data: notifData,
        actions: [
          { action: 'view', title: '👀 View' },
          { action: 'dismiss', title: '✕ Dismiss' },
        ],
      });
    }, 5 * 60 * 1000);
    return;
  }

  // Open app with notification data (view action or body click)
  const urlWithParams = `/?notification=true&title=${encodeURIComponent(notifData.title || '')}&body=${encodeURIComponent(notifData.body || '')}&id=${encodeURIComponent(notifData.reminderId || '')}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        // Post message to existing window
        clients[0].postMessage({
          type: 'NOTIFICATION_CLICK',
          title: notifData.title,
          body: notifData.body,
          reminderId: notifData.reminderId,
        });
        return clients[0].focus();
      }
      return self.clients.openWindow(urlWithParams);
    })
  );
});

// Background timer — check reminders periodically
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_REMINDERS') {
    // Client asks SW to show notification
    const { title, body } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'dinplan-reminder',
      renotify: true,
      requireInteraction: true,
    });
  }
});
