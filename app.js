const VAPID_PUBLIC_KEY = "BANLcD1Pz5jwms6v8SzhglCgjAlOqiHwUzGecK_g-g0u6A3DBrWQy0dFDK9W5LmBXllJSPjlBq8gpNpfLWPyFqs";
const WORKER_URL = "https://pillbox-push-worker.x404x.workers.dev";

const statusEl = document.getElementById("status");
const btnSub = document.getElementById("btn-sub");
const btnTest = document.getElementById("btn-test");
const btnLocal = document.getElementById("btn-local");

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function subscribeUser() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    statusEl.textContent = "Trình duyệt này không hỗ trợ Web Push.";
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    statusEl.textContent = "Bạn đã từ chối quyền thông báo.";
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
  }

  const res = await fetch(`${WORKER_URL}/api/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: "pillbox-01",
      subscription: sub
    })
  });

  if (!res.ok) {
    statusEl.textContent = "Lỗi lưu subscription lên Worker: HTTP " + res.status;
    return;
  }

  statusEl.textContent = "Đã bật thông báo thành công!\n\n" + JSON.stringify(sub, null, 2);
}

async function simulatePillboxMissed5Times() {
  const payload = {
    deviceId: "pillbox-01",
    reminderCount: 5,
    applied: false,
    message: "Hộp thuốc đã nhắc 5 lần nhưng chưa bấm xác nhận (apply)!"
  };

  const res = await fetch(`${WORKER_URL}/api/pillbox-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  statusEl.textContent = "Kết quả gửi từ Worker:\n" + JSON.stringify(data, null, 2);
}

async function testLocalNotification() {
  try {
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        statusEl.textContent = "Chưa có quyền thông báo: " + perm;
        return;
      }
    }
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification("Test Local SW", {
      body: "Service Worker hiển thị thông báo thành công!",
      icon: "./icon-192.png",
      tag: "pillbox-local-test",
      renotify: true
    });
    statusEl.textContent = "Đã gọi showNotification() local thành công!";
  } catch (err) {
    statusEl.textContent = "Lỗi showNotification() local: " + err.message;
  }
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch((err) => {
    statusEl.textContent = "Lỗi đăng ký SW: " + err.message;
  });
}

btnSub.addEventListener("click", subscribeUser);
btnTest.addEventListener("click", simulatePillboxMissed5Times);
btnLocal.addEventListener("click", testLocalNotification);
