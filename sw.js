// 알림 전용 서비스 워커 (파일을 미리 저장하지 않으므로 앱 업데이트가 막히지 않는다)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { }
  const title = String(d.title || '같은 하늘').slice(0, 40), body = String(d.body || '새 소식이 도착했어요').slice(0, 120);
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (list.some(c => c.visibilityState === 'visible')) return;   // 앱을 보고 있으면 화면 안의 알림으로 충분
    await self.registration.showNotification(title, { body, tag: String(d.tag || 'ss'), icon: 'assets/ui/icon-192.png', badge: 'assets/ui/icon-192.png', renotify: true });
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) { await c.focus(); return; } }
    await self.clients.openWindow('./');
  })());
});
