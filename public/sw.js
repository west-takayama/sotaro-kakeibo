// オフライン対応 Service Worker
// 方針: ページ(HTML)はネット優先（常に最新）→ 圏外時はキャッシュで起動。
//       ビルド済みアセット(/_next/static, cmaps, アイコン等)はキャッシュ優先（ハッシュ付きで不変）。
const CACHE = "kakeibo-sw-v1";
const STATIC_PAT = /^\/(_next\/static\/|cmaps\/|icon-|og\.png|pdf\.worker\.min\.js|manifest\.json)/;

self.addEventListener("install", (e) => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // ページ遷移: ネット優先。成功したらキャッシュ更新、圏外ならキャッシュ(なければ"/")で起動
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) { const c = await caches.open(CACHE); c.put("/", res.clone()); }
        return res;
      } catch {
        const c = await caches.open(CACHE);
        return (await c.match(req)) || (await c.match("/")) || Response.error();
      }
    })());
    return;
  }

  // 静的アセット: キャッシュ優先（初回取得時に保存）
  if (STATIC_PAT.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    })());
  }
});
