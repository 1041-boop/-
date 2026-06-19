const CACHE = 'mylifelog-v3';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon.svg',
  'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500&family=Yomogi&family=Hachi+Maru+Pop&family=Kaisei+Decol:wght@400;700&family=Pacifico&family=Caveat:wght@400;600&family=Dancing+Script:wght@400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      // 外部リソースはno-corsで取得してキャッシュ
      return Promise.all(ASSETS.map(url => {
        if (url.startsWith('http')) {
          return fetch(url, { mode: 'no-cors' })
            .then(res => c.put(url, res))
            .catch(() => {}); // 失敗しても続行
        }
        return c.add(url).catch(() => {});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // ネットワーク優先、失敗したらキャッシュ
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // 成功したらキャッシュも更新
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// バックグラウンド通知
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow('./index.html'));
});

// メインスレッドからの通知スケジュール登録
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body } = e.data;
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: './icon.svg',
        badge: './icon.svg',
        tag: 'diary-reminder',
        renotify: true,
      });
      // 翌日も通知（24時間後）
      setTimeout(() => {
        self.registration.showNotification(title, {
          body, icon: './icon.svg', tag: 'diary-reminder', renotify: true,
        });
      }, 86400000);
    }, delay);
  }
});
