let players = [];
const ENV = window.BADGUY_ENV || {};
const TELEGRAM_BOT_TOKEN = ENV.telegramBotToken || "__TELEGRAM_BOT_TOKEN__";
const TELEGRAM_GROUP_CHAT_ID = ENV.telegramGroupChatId || "__TELEGRAM_GROUP_CHAT_ID__";
const APP_VERSION = ENV.appVersion || "v0.0.0";
const VISIT_SESSION_KEY = "badguyVisitNotified";
const DEFAULT_CONFIG = {
  femaleMax: 60,
  tubePrice: 290,
  setPrice: 12,
  shuttlesPerTube: 12,
  roundResult: true,
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
  if (sessionStorage.getItem(VISIT_SESSION_KEY)) return;
  const text = `A guest visited BadGuys app at ${formatVisitTimestampUTC7()}`;

  try {
    await sendTelegramMessage(text);
    sessionStorage.setItem(VISIT_SESSION_KEY, "1");
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
  document.getElementById("setPriceDisplay").innerText = formatK(config.setPrice);
  document.getElementById("femalePriceDisplay").innerText = formatK(config.femaleMax);
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
    let rawName = line.trim();
    if (!rawName) return;

    let isFemale = false;
    let sets = 0;

    if (rawName.toLowerCase().endsWith(" n")) {
      isFemale = true;
      rawName = rawName.substring(0, rawName.length - 2).trim();
    }

    const setMatch = rawName.toLowerCase().match(/\s(\d+)s$/);
    if (setMatch) {
      sets = parseInt(setMatch[1], 10);
      rawName = rawName.replace(setMatch[0], "").trim();
    }

    if (rawName) {
      newPlayers.push({ name: rawName, isFemale, sets });
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
  const shuttleCount = parseFloat(document.getElementById("shuttleCount").value) || 0;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;
  const total = court + shuttle;

  if (players.length === 0 || total === 0) {
    document.getElementById("resultCard").classList.add("hidden");
    return;
  }

  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);
  const females = nonSetPlayers.filter((p) => p.isFemale);
  const males = nonSetPlayers.filter((p) => !p.isFemale);

  let totalSetRevenue = 0;
  setPlayers.forEach((p) => {
    totalSetRevenue += p.sets * config.setPrice;
  });

  const remainingTotal = total - totalSetRevenue;
  let fFee = 0;
  let mFee = 0;

  if (nonSetPlayers.length > 0) {
    const avg = remainingTotal / nonSetPlayers.length;

    if (avg <= config.femaleMax || males.length === 0) {
      fFee = config.roundResult ? Math.round(avg) : avg;
      mFee = fFee;
    } else {
      fFee = config.femaleMax;
      mFee = config.roundResult
        ? Math.round((remainingTotal - fFee * females.length) / males.length)
        : (remainingTotal - fFee * females.length) / males.length;
    }
  }

  lastResult = {
    fFee,
    mFee,
    total,
    setTotal: totalSetRevenue,
    setPlayersCount: setPlayers.length,
    femalesCount: females.length,
    malesCount: males.length,
  };

  document.getElementById("billTotal").innerText = formatK(total);
  document.getElementById("maleFeeDisplay").innerText = formatK(mFee);
  document.getElementById("resultCard").classList.remove("hidden");
}

function copySummary() {
  const { fFee, mFee, total, malesCount, femalesCount } = lastResult;
  const court = parseFloat(document.getElementById("courtFee").value) || 0;
  const shuttleCount = parseFloat(document.getElementById("shuttleCount").value) || 0;
  const shuttle = (shuttleCount * config.tubePrice) / config.shuttlesPerTube;

  const setPlayers = players.filter((p) => p.sets > 0);
  const nonSetPlayers = players.filter((p) => p.sets === 0);
  const males = nonSetPlayers.filter((p) => !p.isFemale);
  const females = nonSetPlayers.filter((p) => p.isFemale);

  let text = `NAY CHƠI ${formatSummaryPrice(mFee)} / NGƯỜI\n\u200B\n`;

  const summaryParts = [];
  if (malesCount > 0) summaryParts.push(`${malesCount} người chia đều`);
  if (femalesCount > 0) {
    summaryParts.push(`${femalesCount} nữ ${formatSummaryPrice(fFee * femalesCount)}`);
  }
  if (setPlayers.length > 0) {
    const totalSetMoney = setPlayers.reduce((sum, p) => sum + p.sets * config.setPrice, 0);
    summaryParts.push(`${setPlayers.length} đánh ít ${formatSummaryPrice(totalSetMoney)}`);
  }

  text += summaryParts.join(" + ") + "\n";
  text += `${formatK(court)} tiền sân + ${formatK(shuttle)} tiền cầu (${shuttleCount} trái) = ${formatK(total)} tổng cộng\n\u200B\n`;
  text += "Players:\n\u200B\n";

  let count = 1;

  males.forEach((p) => {
    text += `${count}. ${p.name}\n`;
    count += 1;
  });

  females.forEach((p) => {
    text += `${count}. ${p.name} ${formatSummaryPrice(fFee)}\n`;
    count += 1;
  });

  setPlayers.forEach((p) => {
    text += `${count}. ${p.name} ${formatSummaryPrice(p.sets * config.setPrice)} (${p.sets} set)\n`;
    count += 1;
  });

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Đã sao chép bảng kê! ✨");
      notifyCopyClicked(text);
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

document.addEventListener("DOMContentLoaded", init);
