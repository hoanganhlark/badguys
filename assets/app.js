let players = [];
const ENV = window.BADGUY_ENV || {};
const TELEGRAM_BOT_TOKEN = ENV.telegramBotToken || "__TELEGRAM_BOT_TOKEN__";
const TELEGRAM_GROUP_CHAT_ID =
  ENV.telegramGroupChatId || "__TELEGRAM_GROUP_CHAT_ID__";
const APP_VERSION = ENV.appVersion || "v0.0.0";
const VISIT_DAY_KEY = "badguyVisitNotifiedDate";

function getEnvNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getEnvBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;
  }
  return fallback;
}

const DEFAULT_CONFIG = {
  femaleMax: getEnvNumber(ENV.femaleMax, 60),
  tubePrice: getEnvNumber(ENV.tubePrice, 290),
  setPrice: getEnvNumber(ENV.setPrice, 12),
  shuttlesPerTube: getEnvNumber(ENV.shuttlesPerTube, 12),
  roundResult: getEnvBoolean(ENV.roundResult, true),
};

let config = { ...DEFAULT_CONFIG };
let resetTimer = null;
let lastResult = {
  fFee: 0,
  mFee: 0,
  total: 0,
  setTotal: 0,
  setPlayersCount: 0,
};

function formatVisitTimestampUTC7() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const utc7Date = new Date(utcMs + 7 * 60 * 60000);
  const dd = String(utc7Date.getDate()).padStart(2, "0");
  const mm = String(utc7Date.getMonth() + 1).padStart(2, "0");
  const yyyy = utc7Date.getFullYear();
  const hh = String(utc7Date.getHours()).padStart(2, "0");
  const min = String(utc7Date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function getLocalDateKey(dateValue) {
  const current = dateValue || new Date();
  const yyyy = current.getFullYear();
  const mm = String(current.getMonth() + 1).padStart(2, "0");
  const dd = String(current.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDeviceNameFromUserAgent(userAgent) {
  const ua = String(userAgent || "").toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android device";
  if (ua.includes("windows")) return "Windows device";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "Mac device";
  if (ua.includes("linux")) return "Linux device";
  return "Unknown device";
}

async function getGuestDeviceName() {
  try {
    const nav = window.navigator;
    if (!nav) return "Unknown device";

    const uaData = nav.userAgentData;
    if (uaData && typeof uaData.getHighEntropyValues === "function") {
      const values = await uaData.getHighEntropyValues(["model", "platform"]);
      const model = String(values.model || "").trim();
      const platform = String(values.platform || uaData.platform || "").trim();

      if (model && platform) return `${model} (${platform})`;
      if (model) return model;
      if (platform) return platform;
    }

    const platform = String(nav.platform || "").trim();
    if (platform) {
      const parsed = parseDeviceNameFromUserAgent(nav.userAgent);
      if (parsed === "Unknown device") return platform;
      return `${parsed} (${platform})`;
    }

    return parseDeviceNameFromUserAgent(nav.userAgent);
  } catch {
    return "Unknown device";
  }
}

function isTelegramConfigured() {
  return (
    TELEGRAM_BOT_TOKEN &&
    TELEGRAM_GROUP_CHAT_ID &&
    !TELEGRAM_BOT_TOKEN.startsWith("__") &&
    !TELEGRAM_GROUP_CHAT_ID.startsWith("__")
  );
}

async function sendTelegramMessage(text) {
  if (!isTelegramConfigured()) return;
  const endpoint = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_GROUP_CHAT_ID,
      text,
    }),
  });
}

async function notifyGuestVisited() {
  const todayKey = getLocalDateKey();
  if (localStorage.getItem(VISIT_DAY_KEY) === todayKey) return;
  const deviceName = await getGuestDeviceName();
  const text = `A guest visited BadGuys app at ${formatVisitTimestampUTC7()}\nDevice: ${deviceName}`;

  try {
    await sendTelegramMessage(text);
    localStorage.setItem(VISIT_DAY_KEY, todayKey);
  } catch (error) {
    console.warn("Telegram visit notification failed", error);
  }
}

async function notifyCopyClicked(summaryContent) {
  const text = `A guest clicked copy with the content below:\n${summaryContent}`;
  try {
    await sendTelegramMessage(text);
  } catch (error) {
    console.warn("Telegram copy notification failed", error);
  }
}

function formatK(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}k` : `${rounded.toFixed(1)}k`;
}

function formatSummaryPrice(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}K` : `${rounded.toFixed(1)}K`;
}

function formatSessionDateLabel(session) {
  if (session.dateKey) {
    const [yyyy, mm, dd] = String(session.dateKey).split("-");
    if (yyyy && mm && dd) return `${dd}/${mm}/${yyyy}`;
  }

  if (session.clientUpdatedAt) {
    const d = new Date(session.clientUpdatedAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("vi-VN");
    }
  }

  return "Không rõ ngày";
}

function buildSessionCardHtml(session) {
  const dateLabel = formatSessionDateLabel(session);
  const total = formatK(session.total || 0);
  const maleFee = formatK(session.maleFee || 0);
  const femaleFee = formatK(session.femaleFee || 0);
  const malesCount = session.malesCount || 0;
  const femalesCount = session.femalesCount || 0;
  const setPlayersCount = session.setPlayersCount || 0;
  const summaryText = String(session.summaryText || "").trim();
  const sessionId = String(session.id || "");
  const sessionIdLiteral = JSON.stringify(sessionId);

  let summaryHtml = "";
  if (summaryText) {
    summaryHtml = `<pre class="mt-3 text-xs bg-slate-50 border border-slate-100 rounded-lg p-3 text-slate-600 whitespace-pre-wrap break-words">${summaryText.replace(/</g, "&lt;")}</pre>`;
  }

  return `
    <article class="border border-slate-200 rounded-xl p-4 bg-white">
      <div class="flex items-center justify-between mb-2">
        <h5 class="text-sm font-semibold text-slate-800">Buổi ${dateLabel}</h5>
        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-500">Tổng: ${total}</span>
          <button
            onclick='removeSession(${sessionIdLiteral})'
            class="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            title="Xóa buổi này"
          >
            Xóa
          </button>
        </div>
      </div>
      <p class="text-xs text-slate-500">
        Nam: ${malesCount} người (${maleFee}/người) | Nữ: ${femalesCount} người (${femaleFee}/người) | Đánh set: ${setPlayersCount} người
      </p>
      ${summaryHtml}
    </article>
  `;
}

function showSessionsState(message) {
  const state = document.getElementById("sessionsState");
  const list = document.getElementById("sessionsList");
  state.innerText = message;
  state.classList.remove("hidden");
  list.classList.add("hidden");
}

function showSessionsList(sessions) {
  const state = document.getElementById("sessionsState");
  const list = document.getElementById("sessionsList");

  if (!sessions.length) {
    showSessionsState("Chưa có dữ liệu phiên nào.");
    return;
  }

  list.innerHTML = sessions
    .map((session) => buildSessionCardHtml(session))
    .join("");
  state.classList.add("hidden");
  list.classList.remove("hidden");
}

async function removeSession(sessionId) {
  if (!sessionId) {
    showToast("Thiếu mã buổi cần xóa.");
    return;
  }

  if (!window.badguyDb || !window.badguyDb.removeSession) {
    showToast("Chưa thể xóa lúc này. Firebase chưa sẵn sàng.");
    return;
  }

  const confirmed = window.confirm("Bạn có chắc muốn xóa buổi này?");
  if (!confirmed) return;

  try {
    await window.badguyDb.removeSession(sessionId);
    showToast("Đã xóa buổi khỏi lịch sử.");
    loadLastSessions();
  } catch (error) {
    console.warn("Remove session failed", error);
    showToast("Xóa thất bại. Vui lòng thử lại.");
  }
}

async function loadLastSessions() {
  showSessionsState("Đang tải dữ liệu...");

  try {
    if (!window.badguyDb || !window.badguyDb.getRecentSessions) {
      if (window.badguyDbReady === false) {
        showSessionsState(
          "Firebase chưa khởi tạo được. Kiểm tra kết nối mạng hoặc cấu hình Firestore.",
        );
      } else {
        showSessionsState("Firebase chưa sẵn sàng. Vui lòng thử lại sau.");
      }
      return;
    }

    const sessions = await window.badguyDb.getRecentSessions(20);
    showSessionsList(sessions);
  } catch (error) {
    console.warn("Load recent sessions failed", error);
    showSessionsState(
      "Không thể tải lịch sử. Kiểm tra quyền Firestore và thử lại.",
    );
  }
}

function openSessionsModal() {
  const modal = document.getElementById("sessionsModal");
  modal.classList.remove("hidden");
  loadLastSessions();
}

// Add event listener to close modal when clicking backdrop
document.addEventListener("DOMContentLoaded", function () {
  const modal = document.getElementById("sessionsModal");
  if (modal) {
    modal.addEventListener("click", function (e) {
      // Only close if click is directly on the backdrop (not modal content)
      if (e.target === modal) {
        closeSessionsModal();
      }
    });
  }
});

function closeSessionsModal() {
  const modal = document.getElementById("sessionsModal");
  modal.classList.add("hidden");
}

function toggleConfigPanel(show) {
  const panel = document.getElementById("configPanel");
  const backdrop = document.getElementById("configBackdrop");
  panel.classList.toggle("hidden", !show);
  backdrop.classList.toggle("hidden", !show);
}

function saveConfig() {
  localStorage.setItem("badguyConfig", JSON.stringify(config));
}

function loadConfig() {
  const raw = localStorage.getItem("badguyConfig");
  if (!raw) return;

  try {
    const stored = JSON.parse(raw);
    config = {
      femaleMax: Number(stored.femaleMax) || DEFAULT_CONFIG.femaleMax,
      tubePrice: Number(stored.tubePrice) || DEFAULT_CONFIG.tubePrice,
      setPrice: Number(stored.setPrice) || DEFAULT_CONFIG.setPrice,
      shuttlesPerTube: DEFAULT_CONFIG.shuttlesPerTube,
      roundResult:
        typeof stored.roundResult === "boolean"
          ? stored.roundResult
          : DEFAULT_CONFIG.roundResult,
    };
  } catch {
    config = { ...DEFAULT_CONFIG };
  }
}

function syncConfigInputs() {
  document.getElementById("cfgFemaleMax").value = config.femaleMax;
  document.getElementById("cfgTubePrice").value = config.tubePrice;
  document.getElementById("cfgSetPrice").value = config.setPrice;
  document.getElementById("setPriceDisplay").innerText = formatK(
    config.setPrice,
  );
  document.getElementById("femalePriceDisplay").innerText = formatK(
    config.femaleMax,
  );
  document.getElementById("cfgRoundResult").checked = !!config.roundResult;
}

function updateConfig() {
  config.femaleMax = Math.max(
    0,
    parseFloat(document.getElementById("cfgFemaleMax").value) || 0,
  );
  config.tubePrice = Math.max(
    0,
    parseFloat(document.getElementById("cfgTubePrice").value) || 0,
  );
  config.setPrice = Math.max(
    0,
    parseFloat(document.getElementById("cfgSetPrice").value) || 0,
  );
  config.roundResult = document.getElementById("cfgRoundResult").checked;

  syncConfigInputs();
  saveConfig();
  calculate();
}

function processBulkInput() {
  const inputEl = document.getElementById("bulkInput");
  const lines = inputEl.value.split("\n");
  const newPlayers = [];

  lines.forEach((line) => {
    let raw = line.trim();
    if (!raw) return;

    let isFemale = false;
    let sets = 0;
    let customFee = null;
    let extraFee = null;

    // Xử lý nữ
    if (raw.toLowerCase().endsWith(" n")) {
      isFemale = true;
      raw = raw.substring(0, raw.length - 2).trim();
    }

    // Xử lý set
    const setMatch = raw.toLowerCase().match(/\s(\d+)s$/);
    if (setMatch) {
      sets = parseInt(setMatch[1], 10);
      raw = raw.replace(setMatch[0], "").trim();
    }

    // Xử lý extraFee: +10k, +20, ...
    const extraMatch = raw.match(/\+\s*(\d+)(k)?/i);
    if (extraMatch) {
      extraFee = parseInt(extraMatch[1], 10);
      raw = raw.replace(extraMatch[0], "").trim();
    }

    // Xử lý customFee: 10k, 50, 70k, ... (phải ở cuối tên)
    const customMatch = raw.match(/(\d+)(k)?$/i);
    if (customMatch) {
      customFee = parseInt(customMatch[1], 10);
      raw = raw.replace(customMatch[0], "").trim();
    }

    let name = raw.trim();
    if (name) {
      newPlayers.push({ name, isFemale, sets, customFee, extraFee });
    }
  });

  players = newPlayers;
  renderPlayers();
  calculate();
}

function updateTextAreaFromPlayers() {
  const inputEl = document.getElementById("bulkInput");
  inputEl.value = players
    .map((p) => {
      let suffix = "";
      if (p.sets > 0) suffix += ` ${p.sets}s`;
      if (p.isFemale) suffix += " n";
      if (p.customFee != null) suffix += ` ${p.customFee}k`;
      if (p.extraFee != null) suffix += ` +${p.extraFee}k`;
      return p.name + suffix;
    })
    .join("\n");
}

function toggleGender(index) {
  const p = players[index];

  if (!p.isFemale && p.sets === 0) {
    p.isFemale = true;
  } else if (p.isFemale) {
    p.isFemale = false;
    p.sets = 1;
  } else {
    p.sets = 0;
  }

  updateTextAreaFromPlayers();
  renderPlayers();
  calculate();
}

function removePlayer(index, event) {
  event.stopPropagation();
  players.splice(index, 1);
  updateTextAreaFromPlayers();
  renderPlayers();
  calculate();
}

function renderPlayers() {
  const list = document.getElementById("playerList");
  const counter = document.getElementById("playerCounter");
  list.innerHTML = "";

  if (players.length === 0) {
    counter.innerText = "0 người";
    return;
  }

  players.forEach((player, index) => {
    const tag = document.createElement("div");

    let typeClass = "tag-male";
    let label = player.name;
    if (player.sets > 0) {
      typeClass = "tag-set";
      label += ` (${player.sets}s)`;
    } else if (player.isFemale) {
      typeClass = "tag-female";
      label += " (n)";
    }
    if (player.customFee != null) {
      label += ` [${player.customFee}k]`;
    }
    if (player.extraFee != null) {
      label += ` [+${player.extraFee}k]`;
    }

    tag.className = `tag ${typeClass} px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center animate-fade`;
    tag.onclick = () => toggleGender(index);
    tag.innerHTML = `
      <span class="mr-1.5 opacity-40">#</span>
      <span>${label}</span>
      <button onclick="removePlayer(${index}, event)" class="ml-2 opacity-40 hover:opacity-100">&times;</button>
    `;
    list.appendChild(tag);
  });

  counter.innerText = `${players.length} người`;
}

function calculate() {
  const court = parseFloat(document.getElementById("courtFee").value) || 0;
  const shuttleCount =
    parseFloat(document.getElementById("shuttleCount").value) || 0;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;
  const total = court + shuttle;

  if (players.length === 0 || total === 0) {
    document.getElementById("resultCard").classList.add("hidden");
    return;
  }

  // Tính các nhóm
  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);
  const females = nonSetPlayers.filter((p) => p.isFemale);
  const males = nonSetPlayers.filter((p) => !p.isFemale);

  // Tổng tiền set
  let totalSetRevenue = 0;
  setPlayers.forEach((p) => {
    totalSetRevenue += p.sets * config.setPrice;
  });

  // Tổng customFee và extraFee
  let totalCustomFee = 0;
  let totalExtraFee = 0;
  nonSetPlayers.forEach((p) => {
    if (p.customFee != null) totalCustomFee += p.customFee;
    if (p.extraFee != null) totalExtraFee += p.extraFee;
  });

  // Những người chia đều là nonSetPlayers không có customFee
  const sharedPlayers = nonSetPlayers.filter((p) => p.customFee == null);
  const sharedFemales = sharedPlayers.filter((p) => p.isFemale);
  const sharedMales = sharedPlayers.filter((p) => !p.isFemale);

  // Tổng còn lại để chia đều
  const remainingTotal = total - totalSetRevenue - totalCustomFee;
  let fFee = 0;
  let mFee = 0;

  if (sharedPlayers.length > 0) {
    const avg = remainingTotal / sharedPlayers.length;
    if (avg <= config.femaleMax || sharedMales.length === 0) {
      fFee = config.roundResult ? Math.round(avg) : avg;
      mFee = fFee;
    } else {
      fFee = config.femaleMax;
      mFee = config.roundResult
        ? Math.round(
            (remainingTotal - fFee * sharedFemales.length) / sharedMales.length,
          )
        : (remainingTotal - fFee * sharedFemales.length) / sharedMales.length;
    }
  }

  lastResult = {
    fFee,
    mFee,
    total,
    setTotal: totalSetRevenue,
    setPlayersCount: setPlayers.length,
    femalesCount: sharedFemales.length,
    malesCount: sharedMales.length,
    totalCustomFee,
    totalExtraFee,
  };

  document.getElementById("billTotal").innerText = formatK(total);
  document.getElementById("maleFeeDisplay").innerText = formatK(mFee);
  document.getElementById("resultCard").classList.remove("hidden");
}

function copySummary() {
  const { fFee, mFee, total, malesCount, femalesCount } = lastResult;
  const court = parseFloat(document.getElementById("courtFee").value) || 0;
  const shuttleCount =
    parseFloat(document.getElementById("shuttleCount").value) || 0;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;

  // Phân loại lại cho summary
  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);
  const customFeePlayers = nonSetPlayers.filter((p) => p.customFee != null);
  const sharedPlayers = nonSetPlayers.filter((p) => p.customFee == null);
  const sharedMales = sharedPlayers.filter((p) => !p.isFemale);
  const sharedFemales = sharedPlayers.filter((p) => p.isFemale);

  let text = `NAY CHƠI ${formatSummaryPrice(mFee)} / NGƯỜI\n\u200B\n`;

  const summaryParts = [];
  if (sharedMales.length > 0)
    summaryParts.push(`${sharedMales.length} người chia đều`);
  if (sharedFemales.length > 0) {
    summaryParts.push(
      `${sharedFemales.length} nữ ${formatSummaryPrice(fFee * sharedFemales.length)}`,
    );
  }

  // Gộp tổng tiền chơi riêng và đánh ít
  const totalCustomFee = customFeePlayers.reduce(
    (sum, p) => sum + (p.customFee || 0),
    0,
  );
  const totalSetMoney = setPlayers.reduce(
    (sum, p) => sum + p.sets * config.setPrice,
    0,
  );
  const totalSpecial = totalCustomFee + totalSetMoney;
  const specialCount = customFeePlayers.length + setPlayers.length;
  if (specialCount > 0) {
    summaryParts.push(
      `${specialCount} người đánh ít ${formatSummaryPrice(totalSpecial)}`,
    );
  }

  text += summaryParts.join(" + ") + "\n";
  text += `${formatK(court)} tiền sân + ${formatK(shuttle)} tiền cầu (${shuttleCount} trái) = ${formatK(total)} tổng cộng\n\u200B\n`;
  text += "Players:\n\u200B\n";

  let count = 1;
  // Giữ nguyên thứ tự nhập
  players.forEach((p) => {
    let line = `${count}. ${p.name}`;
    if (p.sets > 0) {
      line += ` ${formatSummaryPrice(p.sets * config.setPrice)} (${p.sets} set)`;
    } else if (p.customFee != null) {
      line += ` ${formatSummaryPrice(p.customFee)}`;
    } else if (p.isFemale) {
      line += ` ${formatSummaryPrice(fFee)}`;
    }
    if (p.extraFee != null) {
      line += ` +${formatSummaryPrice(p.extraFee)}`;
    }
    text += line + "\n";
    count += 1;
  });

  const payload = {
    summaryText: text,
    courtFee: court,
    shuttleCount,
    shuttleFee: shuttle,
    total,
    maleFee: mFee,
    femaleFee: fFee,
    malesCount,
    femalesCount,
    setPlayersCount: setPlayers.length,
    players: players.map((p) => ({
      name: p.name,
      isFemale: !!p.isFemale,
      sets: p.sets || 0,
    })),
  };

  const saveDailySession = () => {
    if (!window.badguyDb || !window.badguyDb.saveDailySummary) return;
    window.badguyDb.saveDailySummary(payload).catch((error) => {
      console.warn("Save daily session failed", error);
    });
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Đã sao chép bảng kê! ✨");
      notifyCopyClicked(text);
      saveDailySession();
    });
  } else {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    showToast("Đã sao chép bảng kê! ✨");
    notifyCopyClicked(text);
    saveDailySession();
  }
}

function handleReset() {
  const btn = document.getElementById("btnReset");

  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
    document.getElementById("courtFee").value = "";
    document.getElementById("shuttleCount").value = "";
    document.getElementById("bulkInput").value = "";
    players = [];
    renderPlayers();
    document.getElementById("resultCard").classList.add("hidden");
    btn.innerText = "LÀM MỚI DỮ LIỆU";
    btn.classList.replace("text-red-600", "text-slate-400");
    showToast("Dữ liệu đã được xóa.");
    return;
  }

  btn.innerText = "XÁC NHẬN XÓA?";
  btn.classList.replace("text-slate-400", "text-red-600");
  resetTimer = setTimeout(() => {
    btn.innerText = "LÀM MỚI DỮ LIỆU";
    btn.classList.replace("text-red-600", "text-slate-400");
    resetTimer = null;
  }, 2000);
}

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.innerText = msg;
  toast.classList.remove("opacity-0");
  toast.classList.add("opacity-100");

  setTimeout(() => {
    toast.classList.replace("opacity-100", "opacity-0");
  }, 2000);
}

function init() {
  const versionEl = document.getElementById("appVersionDisplay");
  if (versionEl) {
    versionEl.innerText = APP_VERSION;
  }

  loadConfig();
  syncConfigInputs();
  notifyGuestVisited();
}

window.toggleConfigPanel = toggleConfigPanel;
window.updateConfig = updateConfig;
window.calculate = calculate;
window.processBulkInput = processBulkInput;
window.copySummary = copySummary;
window.handleReset = handleReset;
window.removePlayer = removePlayer;
window.toggleGender = toggleGender;
window.openSessionsModal = openSessionsModal;
window.closeSessionsModal = closeSessionsModal;
window.removeSession = removeSession;

document.addEventListener("DOMContentLoaded", init);
