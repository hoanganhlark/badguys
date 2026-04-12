import { useEffect, useMemo, useRef, useState } from "react";
import ConfigSidebar from "./components/ConfigSidebar";
import ExpensesSection from "./components/ExpensesSection";
import PlayersSection from "./components/PlayersSection";
import ResultCard from "./components/ResultCard";
import SessionsModal from "./components/SessionsModal";
import Toast from "./components/Toast";
import { envConfig } from "./env";
import {
  buildSessionPayload,
  buildSummaryText,
  calculateResult,
  cyclePlayerMode,
  formatK,
  normalizeKLabels,
  parsePlayersBulk,
  playersToBulk,
} from "./lib/core";
import {
  getRecentSessions,
  isFirebaseReady,
  removeSession,
  saveDailySummary,
} from "./lib/firebase";
import {
  clearInputDraft,
  copyText,
  formatVisitTimestampUTC7,
  getGuestDeviceName,
  loadStoredConfig,
  loadStoredInputDraft,
  markVisitNotifiedToday,
  saveConfig,
  saveInputDraft,
  shouldSendVisitNotificationToday,
} from "./lib/platform";
import { notifyCopyClicked, notifyGuestVisited } from "./lib/telegram";
import type { AppConfig, Player, SessionRecord } from "./types";

export default function App() {
  const [inputDraft] = useState(() => loadStoredInputDraft());
  const [courtFeeInput, setCourtFeeInput] = useState(inputDraft.courtFeeInput);
  const [shuttleCountInput, setShuttleCountInput] = useState(
    inputDraft.shuttleCountInput,
  );
  const [courtCountInput, setCourtCountInput] = useState(
    inputDraft.courtCountInput,
  );
  const [bulkInput, setBulkInput] = useState(inputDraft.bulkInput);
  const [players, setPlayers] = useState<Player[]>(() =>
    parsePlayersBulk(inputDraft.bulkInput),
  );
  const [config, setConfig] = useState<AppConfig>(() =>
    loadStoredConfig(envConfig.defaultConfig),
  );
  const [configOpen, setConfigOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [resetArmed, setResetArmed] = useState(false);

  const resetTimerRef = useRef<number | null>(null);
  const sidebarHistoryActiveRef = useRef(false);
  const modalHistoryActiveRef = useRef(false);

  const courtFee = parseFloat(courtFeeInput) || 0;
  const shuttleCount = parseFloat(shuttleCountInput) || 0;
  const courtCount = parseFloat(courtCountInput) || 0;

  const calc = useMemo(
    () => calculateResult(players, courtFee, shuttleCount, config),
    [players, courtFee, shuttleCount, config],
  );

  const showResult = players.length > 0 && calc.total !== 0;

  useEffect(() => {
    saveConfig(config);
  }, [config]);

  useEffect(() => {
    saveInputDraft({
      courtFeeInput,
      shuttleCountInput,
      courtCountInput,
      bulkInput,
    });
  }, [courtFeeInput, shuttleCountInput, courtCountInput, bulkInput]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!shouldSendVisitNotificationToday()) return;

    (async () => {
      const deviceName = await getGuestDeviceName();
      await notifyGuestVisited(formatVisitTimestampUTC7(), deviceName);
      markVisitNotifiedToday();
    })();
  }, []);

  useEffect(() => {
    const syncModalStateFromHistory = () => {
      const modal = history.state?.modal;
      const nextSessionsOpen = modal === "sessions";
      const nextConfigOpen = modal === "sidebar" || modal === "sessions";

      setSessionsOpen(nextSessionsOpen);
      setConfigOpen(nextConfigOpen);
      modalHistoryActiveRef.current = nextSessionsOpen;
      sidebarHistoryActiveRef.current = nextConfigOpen;
    };

    window.addEventListener("popstate", syncModalStateFromHistory);
    return () =>
      window.removeEventListener("popstate", syncModalStateFromHistory);
  }, []);

  function showToast(message: string) {
    setToastMessage(message);
  }

  function handleBulkInputChange(value: string) {
    setBulkInput(value);
    setPlayers(parsePlayersBulk(value));
  }

  function handleTogglePlayer(index: number) {
    const next = players.map((player, i) =>
      i === index ? cyclePlayerMode(player) : player,
    );
    setPlayers(next);
    setBulkInput(playersToBulk(next));
  }

  function handleRemovePlayer(index: number) {
    const next = players.filter((_, i) => i !== index);
    setPlayers(next);
    setBulkInput(playersToBulk(next));
  }

  function handleConfigChange(next: AppConfig) {
    setConfig({
      ...next,
      femaleMax: Math.max(0, next.femaleMax || 0),
      tubePrice: Math.max(0, next.tubePrice || 0),
      setPrice: Math.max(0, next.setPrice || 0),
      enableCourtCount: !!next.enableCourtCount,
    });
  }

  async function handleCopySummary() {
    const summaryText = buildSummaryText(
      players,
      config,
      calc,
      courtFee,
      courtCount,
      shuttleCount,
    );
    const payload = buildSessionPayload(
      summaryText,
      players,
      courtFee,
      courtCount,
      shuttleCount,
      config,
      calc,
    );

    try {
      await copyText(summaryText);
      showToast("Đã sao chép bảng kê! ✨");
    } catch {
      showToast("Sao chép thất bại.");
      return;
    }

    notifyCopyClicked(summaryText);
    saveDailySummary(payload).catch((error) => {
      console.warn("Save daily session failed", error);
    });
  }

  async function loadLastSessions() {
    setSessionsLoading(true);
    setSessionsError("");

    try {
      if (!isFirebaseReady()) {
        setSessionsError(
          "Firebase chưa khởi tạo được. Kiểm tra kết nối mạng hoặc cấu hình Firestore.",
        );
        return;
      }

      const items = await getRecentSessions(20);
      setSessions(items);
    } catch (error) {
      console.warn("Load recent sessions failed", error);
      setSessionsError(
        "Không thể tải lịch sử. Kiểm tra quyền Firestore và thử lại.",
      );
    } finally {
      setSessionsLoading(false);
    }
  }

  function openConfigPanel() {
    setConfigOpen(true);
    if (!sidebarHistoryActiveRef.current) {
      history.pushState({ modal: "sidebar" }, "");
      sidebarHistoryActiveRef.current = true;
    }
  }

  function closeConfigPanel() {
    if (history.state?.modal === "sidebar") {
      history.back();
      return;
    }

    setConfigOpen(false);
    sidebarHistoryActiveRef.current = false;
  }

  function openSessionsModal() {
    if (sessionsOpen) return;
    setSessionsOpen(true);
    loadLastSessions();

    if (!modalHistoryActiveRef.current) {
      history.pushState({ modal: "sessions" }, "");
      modalHistoryActiveRef.current = true;
    }
  }

  function closeSessionsModal() {
    if (history.state?.modal === "sessions") {
      history.back();
      return;
    }

    setSessionsOpen(false);
    modalHistoryActiveRef.current = false;
  }

  async function handleRemoveSession(sessionId: string) {
    if (!sessionId) {
      showToast("Thiếu mã buổi cần xóa.");
      return;
    }

    if (!isFirebaseReady()) {
      showToast("Chưa thể xóa lúc này. Firebase chưa sẵn sàng.");
      return;
    }

    const confirmed = window.confirm("Bạn có chắc muốn xóa buổi này?");
    if (!confirmed) return;

    try {
      await removeSession(sessionId);
      showToast("Đã xóa buổi khỏi lịch sử.");
      loadLastSessions();
    } catch (error) {
      console.warn("Remove session failed", error);
      showToast("Xóa thất bại. Vui lòng thử lại.");
    }
  }

  async function handleCopySessionNote(summaryText: string) {
    if (!summaryText) return;
    try {
      await copyText(normalizeKLabels(summaryText));
      showToast("Đã copy note!");
    } catch {
      showToast("Sao chép thất bại.");
    }
  }

  function handleReset() {
    if (resetArmed) {
      if (resetTimerRef.current != null) {
        window.clearTimeout(resetTimerRef.current);
      }
      resetTimerRef.current = null;
      setResetArmed(false);
      setCourtFeeInput("");
      setShuttleCountInput("");
      setCourtCountInput("");
      setBulkInput("");
      setPlayers([]);
      clearInputDraft();
      showToast("Dữ liệu đã được xóa.");
      return;
    }

    setResetArmed(true);
    resetTimerRef.current = window.setTimeout(() => {
      setResetArmed(false);
      resetTimerRef.current = null;
    }, 2000);
  }

  return (
    <div className="p-5 md:p-12 relative">
      <div className="max-w-md mx-auto">
        <button
          onClick={openConfigPanel}
          aria-label="Mở cấu hình"
          className="fixed top-5 left-5 md:top-8 md:left-8 z-30 h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12a2.5 2.5 0 0 0 .6 1.62l-.06.14a2 2 0 0 0 .45 2.24l.3.3a2 2 0 0 0 2.24.45l.14-.06a2.5 2.5 0 0 0 3.24 1.47h1.18a2.5 2.5 0 0 0 3.24-1.47l.14.06a2 2 0 0 0 2.24-.45l.3-.3a2 2 0 0 0 .45-2.24l-.06-.14A2.5 2.5 0 0 0 19.5 12a2.5 2.5 0 0 0-.6-1.62l.06-.14a2 2 0 0 0-.45-2.24l-.3-.3a2 2 0 0 0-2.24-.45l-.14.06A2.5 2.5 0 0 0 12.59 5h-1.18a2.5 2.5 0 0 0-3.24 1.47l-.14-.06a2 2 0 0 0-2.24.45l-.3.3a2 2 0 0 0-.45 2.24l.06.14A2.5 2.5 0 0 0 4.5 12Z"
            />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>

        <header className="mb-12 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            BadGuys<span className="text-slate-400">.</span>
          </h1>
        </header>

        <ExpensesSection
          courtFee={courtFeeInput}
          shuttleCount={shuttleCountInput}
          courtCount={courtCountInput}
          showCourtCount={config.enableCourtCount}
          onCourtFeeChange={setCourtFeeInput}
          onShuttleCountChange={setShuttleCountInput}
          onCourtCountChange={setCourtCountInput}
        />

        <PlayersSection
          bulkInput={bulkInput}
          players={players}
          onBulkInputChange={handleBulkInputChange}
          onTogglePlayer={handleTogglePlayer}
          onRemovePlayer={handleRemovePlayer}
        />

        <ResultCard
          visible={showResult}
          totalLabel={formatK(calc.total)}
          maleFeeLabel={formatK(calc.mFee)}
          femaleFeeLabel={formatK(config.femaleMax)}
          setPriceLabel={formatK(config.setPrice)}
          onCopy={handleCopySummary}
        />

        <div className="flex justify-center gap-8">
          <button
            type="button"
            onClick={handleReset}
            className={`text-xs font-medium transition-colors uppercase ${
              resetArmed ? "text-red-600" : "text-slate-400 hover:text-red-500"
            }`}
          >
            {resetArmed ? "XÁC NHẬN XÓA?" : "LÀM MỚI DỮ LIỆU"}
          </button>
        </div>
      </div>

      <ConfigSidebar
        open={configOpen}
        backdropInteractive={!sessionsOpen}
        config={config}
        onClose={closeConfigPanel}
        onOpenSessions={openSessionsModal}
        onConfigChange={handleConfigChange}
        appVersion={envConfig.appVersion}
      />

      <SessionsModal
        open={sessionsOpen}
        loading={sessionsLoading}
        error={sessionsError}
        sessions={sessions}
        onClose={closeSessionsModal}
        onRemove={handleRemoveSession}
        onCopyNote={handleCopySessionNote}
      />

      {toastMessage ? <Toast message={toastMessage} /> : null}
    </div>
  );
}
