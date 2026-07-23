/*
 * Service Worker der Feuerwehr Weiden – nur für Web-Push zuständig.
 * (Kein Offline-Cache o. Ä. – die Seite bleibt normal aus dem Netz.)
 *
 * Empfängt Push-Nachrichten (vom ffw-push-Worker / GitHub-Action) und zeigt
 * sie als System-Benachrichtigung. Klick öffnet den mitgeschickten Link.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Feuerwehr Weiden', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'Feuerwehr Weiden';
  const options = {
    body: data.body || '',
    icon: '/bilder/icon-192.png',
    badge: '/bilder/badge-96.png',
    lang: 'de',
    // tag bündelt gleichartige Meldungen (z. B. "einsatz"), renotify lässt
    // eine neue trotzdem erneut aufpoppen statt sie still zu ersetzen.
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const alle = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of alle) {
        // Läuft die Seite schon irgendwo? Dann dorthin navigieren + fokussieren.
        if ('focus' in client) {
          try {
            await client.navigate(url);
          } catch {
            /* z. B. cross-origin – dann einfach nur fokussieren */
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});
