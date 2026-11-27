self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "Cảnh báo uống thuốc!",
    body: "Hộp thuốc đã nhắc 5 lần nhưng chưa xác nhận.",
    url: "./"
  };

  if (event.data) {
    const rawText = event.data.text();
    console.log("[SW] Push payload nhận được:", rawText);
    try {
      data = { ...data, ...JSON.parse(rawText) };
    } catch {
      data.body = rawText;
    }
  } else {
    console.log("[SW] Push nhận được nhưng event.data rỗng");
  }

  event.waitUntil(
    self.registration
      .showNotification(data.title, {
        body: data.body,
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: "pillbox-alert-5x",
        renotify: true,
        data: { url: data.url || "./" }
      })
      .then(() => {
        console.log("[SW] showNotification thành công");
      })
      .catch((err) => {
        console.error("[SW] showNotification lỗi:", err);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
