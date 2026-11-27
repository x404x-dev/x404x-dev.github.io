self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      await self.registration.showNotification("DEBUG: Đã vào sự kiện push", {
        body: "SW nhận được tín hiệu push từ FCM.",
        tag: "pillbox-push-debug",
        renotify: true
      });

      let data = {
        title: "Cảnh báo uống thuốc!",
        body: "Hộp thuốc đã nhắc 5 lần nhưng chưa xác nhận.",
        url: "./"
      };

      if (event.data) {
        const rawText = event.data.text();
        try {
          data = { ...data, ...JSON.parse(rawText) };
        } catch {
          if (rawText) data.body = rawText;
        }
      }

      await self.registration.showNotification(data.title, {
        body: data.body,
        tag: "pillbox-alert-5x",
        renotify: true,
        data: { url: data.url || "./" }
      });
    })()
  );
});
