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
      vibrate: [200, 100, 200, 100, 200],
      tag: data.tag || 'dinplan-reminder',
      renotify: true,
      requireInteraction: true,
      actions: [
        { action: 'dismiss', title: 'Dismiss' },
        { action: 'snooze', title: 'Snooze 5m' },
      ],
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'snooze') {
    // Snooze — show again in 5 minutes
    setTimeout(() => {
      self.registration.showNotification(event.notification.title, {
        body: event.notification.body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        tag: 'dinplan-reminder-snoozed',
        requireInteraction: true,
      });
    }, 5 * 60 * 1000);
    return;
  }

  // Open app on click
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
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
