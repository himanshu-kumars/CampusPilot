/* CampusPilot service worker (Phase 4: honest offline mode).
 *
 * What it does:
 * - Precaches the offline fallback page + manifest + icon.
 * - Navigation requests: network-first, fall back to /offline when unreachable.
 * - Same-origin GET assets: stale-while-revalidate.
 *
 * What it does NOT do: fake offline data. App data needs a connection;
 * the worker just makes losing it graceful instead of a browser error page.
 */

const VERSION = "cp-v1";
const CORE = ["/offline", "/manifest.webmanifest", "/icon.svg"];
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE && k !== PAGES_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .catch(() => undefined)
  );
});

/* Phase 5: push reminders. Payload shape: { title, body, url }. */
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }
  const title = data.title || "CampusPilot";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "You have an update.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const c of list) {
          if (c.url.indexOf(self.location.origin) === 0 && "focus" in c) {
            if ("navigate" in c) c.navigate(url);
            return c.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(url);
        return undefined;
      })
      .catch(() => undefined)
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Page navigations: try network, fall back to cached page, then /offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req).catch(() => undefined);
          if (cached) return cached;
          const offline = await caches.match("/offline").catch(() => undefined);
          if (offline) return offline;
          return new Response("You're offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate. Never cache API/auth responses.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/login") || url.pathname.startsWith("/signup")) {
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
