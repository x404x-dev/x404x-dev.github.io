const VAPID_PUBLIC_KEY = "BANLcD1Pz5jwms6v8SzhglCgjAlOqiHwUzGecK_g-g0u6A3DBrWQy0dFDK9W5LmBXllJSPjlBq8gpNpfLWPyFqs";
const WORKER_URL = "https://pillbox-push-worker.x404x.workers.dev";

const statusEl = document.getElementById("status");
const btnSub = document.getElementById("btn-sub");
const btnTest = document.getElementById("btn-test");
const btnLocal = document.getElementById("btn-local");

let swRegistration = null;

function logStatus(msg) {
  statusEl.textContent = msg;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function initServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    logStatus("Trình duyệt không hỗ trợ Service Worker.");
    return null;
  }
  try {
    logStatus("Đang đăng ký sw.js...");
    const reg = await navigator.serviceWorker.register("./sw.js?v=2", { scope: "./" });
    swRegistration = reg;
    logStatus(
      `SW đã đăng ký.\nScope: ${reg.scope}\nInstalling: ${!!reg.installing} | Waiting: ${!!reg.waiting} | Active: ${!!reg.active}`
    );
    return reg;
  } catch (err) {
    logStatus("Lỗi đăng ký sw.js: " + err.message);
    return null;
  }
}

async function getActiveRegistration() {
  if (!swRegistration) {
    await initServiceWorker();
  }
  return await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout chờ serviceWorker.ready (SW chưa active)")), 4000)
    )
  ]);
}

async function subscribeUser() {
  try {
    if (!("PushManager" in window)) {
      logStatus("Trình duyệt không hỗ trợ PushManager.");
      return;
    }

    logStatus("Đang xin quyền Notification...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      logStatus("Quyền thông báo bị từ chối: " + permission);
      return;
    }

    const reg = await getActiveRegistration();
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
      logStatus("Đang tạo PushSubscription với FCM...");
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    logStatus("Đang gửi subscription lên Worker...");
    const res = await fetch(`${WORKER_URL}/api/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "pillbox-01",
        subscription: sub
      })
    });

    if (!res.ok) {
      logStatus("Lỗi lưu subscription lên Worker: HTTP " + res.status);
      return;
    }

    logStatus("Đã bật thông báo thành công!\n\n" + JSON.stringify(sub, null, 2));
  } catch (err) {
    logStatus("Lỗi subscribeUser: " + err.message);
  }
}

async function simulatePillboxMissed5Times() {
  try {
    logStatus("Đang gửi sự kiện giả lập tới Worker...");
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
    logStatus("Kết quả gửi từ Worker:\n" + JSON.stringify(data, null, 2));
  } catch (err) {
    logStatus("Lỗi gửi giả lập: " + err.message);
  }
}

async function testLocalNotification() {
  try {
    logStatus("Bắt đầu test local... Permission = " + Notification.permission);
    if (Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        logStatus("Chưa có quyền thông báo: " + perm);
        return;
      }
    }

    const reg = await getActiveRegistration();
    await reg.showNotification("Test Local SW", {
      body: "Service Worker hiển thị thông báo thành công!",
      tag: "pillbox-local-test",
      renotify: true
    });
    logStatus("Đã gọi reg.showNotification() thành công!");
  } catch (err) {
    logStatus("Lỗi testLocalNotification: " + err.message);
  }
}

btnSub.addEventListener("click", subscribeUser);
btnTest.addEventListener("click", simulatePillboxMissed5Times);
btnLocal.addEventListener("click", testLocalNotification);

initServiceWorker();
