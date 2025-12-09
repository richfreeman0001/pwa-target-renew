// ===========================================================
// app.js — PWA External Page Auto Reload (v1.2 Advanced)
// 新增功能：目前 IP、IP 變化日誌、手動 reload、iframe 錯誤提示
// ===========================================================

// -------- Service Worker 註冊 ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch((err) => console.error("Service Worker 註冊失敗：", err));
  });
}

// -------- DOM ----------
const networkStatusEl = document.getElementById("network-status");
const connectionInfoEl = document.getElementById("connection-info");
const overlayEl = document.getElementById("overlay-message");
const overlayTextEl = document.getElementById("overlay-text");
const iframeEl = document.getElementById("external-frame");
const urlInputEl = document.getElementById("target-url");
const loadBtnEl = document.getElementById("load-btn");

// v1.2 新增
const currentIpEl = document.getElementById("current-ip");
const reloadCountEl = document.getElementById("reload-count");
const logOutputEl = document.getElementById("log-output");
const manualReloadBtn = document.getElementById("manual-reload");

let reloadCount = 0;

// -------- Log 系統 ----------
function log(msg) {
  const time = new Date().toLocaleTimeString();
  const line = `[${time}] ${msg}\n`;
  logOutputEl.textContent += line;

  // 保持捲到最底部
  logOutputEl.scrollTop = logOutputEl.scrollHeight;
}

// -------- UI 工具 ----------
function setNetworkStatus(status) {
  networkStatusEl.classList.remove("online", "offline", "changing");

  if (status === "online") {
    networkStatusEl.textContent = "線上中";
    networkStatusEl.classList.add("online");
  } else if (status === "offline") {
    networkStatusEl.textContent = "離線中";
    networkStatusEl.classList.add("offline");
  } else {
    networkStatusEl.textContent = "連線變更中…";
    networkStatusEl.classList.add("changing");
  }
}

function updateConnectionInfo() {
  const nav = navigator;
  const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

  if (!connection) {
    connectionInfoEl.textContent = "裝置不支援 Network Information API";
    return;
  }

  connectionInfoEl.textContent = `連線型態：${connection.type || connection.effectiveType}`;
}

function showOverlay(message) {
  overlayTextEl.textContent = message;
  overlayEl.classList.remove("hidden");
}

function hideOverlay() {
  overlayEl.classList.add("hidden");
}

// -------- iframe 載入 ----------
function loadExternalUrl(url) {

    pushHistory(url);


  if (!url) return;

  try {
    const u = new URL(url);
    iframeEl.src = u.toString();

    log(`載入目標網址：${u.toString()}`);
  } catch (e) {
    alert("網址格式錯誤");
  }
}

// iframe error detect（被 X-Frame-Options 擋住）
iframeEl.onerror = () => {
  log("iframe 載入失敗（可能被 X-Frame-Options 阻擋）");
  showOverlay("目標網站拒絕被嵌入 iframe。");
};

// -------- Debounce reload ----------
let reloadTimeout = null;
function scheduleIframeReload(reason) {
  if (reloadTimeout) clearTimeout(reloadTimeout);

  setNetworkStatus("changing");
  showOverlay(`偵測到 ${reason}，正在準備重新載入…`);
  log(`準備重新載入（原因：${reason}）`);

  reloadTimeout = setTimeout(() => {
    if (iframeEl.src) {
      iframeEl.src = iframeEl.src;

      reloadCount++;
      reloadCountEl.textContent = reloadCount;

      log(`iframe 已重新載入（原因：${reason}）`);
    }

    hideOverlay();
    setNetworkStatus(navigator.onLine ? "online" : "offline");
  }, 1200);
}

// -------- 事件綁定 ----------
loadBtnEl.addEventListener("click", () => {
  loadExternalUrl(urlInputEl.value.trim());
});

urlInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    loadExternalUrl(urlInputEl.value.trim());
  }
});

manualReloadBtn.addEventListener("click", () => {
  if (iframeEl.src) {
    iframeEl.src = iframeEl.src;
    reloadCount++;
    reloadCountEl.textContent = reloadCount;
    log("使用者手動重新連線");
  }
});

// online/offline
window.addEventListener("online", () => {
  setNetworkStatus("online");
  hideOverlay();
  scheduleIframeReload("從離線恢復線上");
});

window.addEventListener("offline", () => {
  setNetworkStatus("offline");
  showOverlay("網路中斷，恢復後會重新載入");
  log("偵測到 offline");
});

// Network Information API（iOS 不支援）
const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
if (connection && connection.addEventListener) {
  connection.addEventListener("change", () => {
    updateConnectionInfo();
    scheduleIframeReload("網路型態變更");
  });
}

// -------- 初始狀態 --------
document.addEventListener("DOMContentLoaded", () => {
  setNetworkStatus(navigator.onLine ? "online" : "offline");
  updateConnectionInfo();

  const defaultUrl = urlInputEl.value.trim();
  if (defaultUrl) loadExternalUrl(defaultUrl);
});

// ========== v1.3 Bookmark & History ==========

// 讀取 LocalStorage
let bookmarks = JSON.parse(localStorage.getItem("bookmarks") || "[]");
let historyList = JSON.parse(localStorage.getItem("historyList") || "[]");

// DOM
const bookmarkListEl = document.getElementById("bookmark-list");
const historyListEl = document.getElementById("history-list");

// 書籤渲染
function renderBookmarks() {
  bookmarkListEl.innerHTML = "";
  bookmarks.forEach((b) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = b;
    bookmarkListEl.appendChild(opt);
  });
}

// 歷史渲染
function renderHistory() {
  historyListEl.innerHTML = "";
  historyList.forEach((h) => {
    const opt = document.createElement("option");
    opt.value = opt.textContent = h;
    historyListEl.appendChild(opt);
  });
}

// 書籤新增
document.getElementById("add-bookmark").addEventListener("click", () => {
  const url = urlInputEl.value.trim();
  if (!url) return;
  bookmarks.push(url);
  bookmarks = [...new Set(bookmarks)];
  localStorage.setItem("bookmarks", JSON.stringify(bookmarks));
  renderBookmarks();
});

// 選擇書籤 → 載入
bookmarkListEl.addEventListener("change", () => {
  const url = bookmarkListEl.value;
  urlInputEl.value = url;
  loadExternalUrl(url);
});

// 選擇歷史 → 載入
historyListEl.addEventListener("change", () => {
  const url = historyListEl.value;
  urlInputEl.value = url;
  loadExternalUrl(url);
});

// 加入瀏覽歷史
function pushHistory(url) {
  historyList.unshift(url);
  historyList = [...new Set(historyList)].slice(0, 20);
  localStorage.setItem("historyList", JSON.stringify(historyList));
  renderHistory();
}

// 初始渲染
renderBookmarks();
renderHistory();


// ===========================================================
// ============ Cloudflare Worker — Public IP 偵測 ===========
// ===========================================================

const WORKER_IP_API = "https://ping-get-ip.richfreeman0001.workers.dev/";

let lastIP = null;
let checking = false;
let lastReloadAt = 0;

async function checkIPChange() {
  if (checking) return;
  checking = true;

  try {
    const res = await fetch(WORKER_IP_API, { cache: "no-store" });
    const data = await res.json();
    const currentIP = data.ip;

    currentIpEl.textContent = currentIP;
    log(`目前 IP：${currentIP}`);

    // 第一次 → 不 reload
    if (!lastIP) {
      lastIP = currentIP;
      checking = false;
      return;
    }

    // IP 變化
    if (currentIP !== lastIP) {
      log(`偵測到 IP 變化：${lastIP} → ${currentIP}`);

      const now = Date.now();
      if (now - lastReloadAt > 5000) {
        iframeEl.src = iframeEl.src;

        reloadCount++;
        reloadCountEl.textContent = reloadCount;

        log("iframe 已因 IP 變化重新載入");
        lastReloadAt = now;
      }

      lastIP = currentIP;
    }
  } catch (err) {
    log("IP 偵測失敗：" + err);
  }

  checking = false;
}

// 每 7 秒檢查 IP
setInterval(checkIPChange, 7000);
checkIPChange();
