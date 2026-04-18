import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Award, Key, LogOut, Settings, User, X } from "react-feather";
import { useLocation } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import ConfigSidebar from "./components/ConfigSidebar";
import ExpensesSection from "./components/ExpensesSection";
import PlayersSection from "./components/PlayersSection";
import RankingPage from "./components/RankingPage";
import ResultCard from "./components/ResultCard";
import SessionsModal from "./components/SessionsModal";
import Toast from "./components/Toast";
import UserManagementPage from "./components/UserManagementPage";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { envConfig } from "./env";
import { useHistoryModal } from "./hooks/useHistoryModal";
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
  RESET_CONFIRM_TIMEOUT_MS,
  SESSIONS_FETCH_LIMIT,
  TOAST_DURATION_MS,
} from "./lib/constants";
import {
  getUserByUsername,
  getRecentSessions,
  isFirebaseReady,
  removeSession,
  saveDailySummary,
  updateUserPassword,
} from "./lib/firebase";
import { hashMd5 } from "./lib/hash";
import {
  clearInputDraft,
  copyText,
  formatVisitTimestampUTC7,
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
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const location = useLocation();

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
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [resetArmed, setResetArmed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSubmitting, setChangePasswordSubmitting] =
    useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const resetTimerRef = useRef<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const {
    configOpen,
    sessionsOpen,
    rankingOpen,
    openConfig,
    closeConfig,
    openSessions,
    closeSessions,
    openRanking,
    closeRanking,
  } = useHistoryModal(isAuthenticated);

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
    const timer = window.setTimeout(
      () => setToastMessage(""),
      TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (isAdmin) return;
    if (!shouldSendVisitNotificationToday()) return;

    (async () => {
      await notifyGuestVisited(formatVisitTimestampUTC7());
      markVisitNotifiedToday();
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (userMenuRef.current.contains(event.target as Node)) return;
      setUserMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  useEffect(() => {
    if (isAuthenticated) return;
    setUserMenuOpen(false);
    setChangePasswordOpen(false);
    setChangePasswordError("");
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [isAuthenticated]);

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
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
    if (!confirmed) return;

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

    if (!isAdmin) {
      notifyCopyClicked(summaryText);
      saveDailySummary(payload).catch((error) => {
        console.warn("Save daily session failed", error);
      });
    }
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

      const items = await getRecentSessions(SESSIONS_FETCH_LIMIT);
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

  function openSessionsModal() {
    openSessions();
    loadLastSessions();
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

    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa không?");
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
    }, RESET_CONFIRM_TIMEOUT_MS);
  }

  async function handleSubmitChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setChangePasswordError("Bạn chưa đăng nhập.");
      return;
    }

    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (newPassword.length < 4) {
      setChangePasswordError("Mật khẩu mới cần ít nhất 4 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError("Mật khẩu xác nhận không khớp.");
      return;
    }

    if (newPassword === currentPassword) {
      setChangePasswordError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }

    setChangePasswordSubmitting(true);
    setChangePasswordError("");

    try {
      const userRecord = await getUserByUsername(currentUser.username);
      if (!userRecord || userRecord.id !== currentUser.userId) {
        throw new Error("Không tìm thấy tài khoản hiện tại.");
      }

      const currentPasswordHash = hashMd5(currentPassword);
      if (currentPasswordHash !== userRecord.password) {
        throw new Error("Mật khẩu hiện tại không đúng.");
      }

      await updateUserPassword(userRecord.id, hashMd5(newPassword));

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setChangePasswordOpen(false);
      setUserMenuOpen(false);
      showToast("Đổi mật khẩu thành công.");
    } catch (error) {
      setChangePasswordError(
        error instanceof Error
          ? error.message
          : "Đổi mật khẩu thất bại. Vui lòng thử lại.",
      );
    } finally {
      setChangePasswordSubmitting(false);
    }
  }

  if (location.pathname === "/login") {
    return <LoginPage />;
  }

  if (location.pathname === "/users") {
    return (
      <AdminRoute>
        <UserManagementPage />
      </AdminRoute>
    );
  }

  return (
    <div className="p-5 md:p-12 relative">
      <div className="max-w-md mx-auto">
        <button
          onClick={openConfig}
          aria-label="Mở cấu hình"
          className="fixed top-5 left-5 md:top-8 md:left-8 z-30 h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
        >
          <Settings className="h-5 w-5" />
        </button>

        <button
          onClick={openRanking}
          aria-label="Bảng xếp hạng"
          className={`fixed top-5 ${isAuthenticated ? "right-20 md:right-24" : "right-5 md:right-8"} md:top-8 z-30 h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center`}
        >
          <Award className="h-5 w-5" />
        </button>

        {isAuthenticated ? (
          <div
            ref={userMenuRef}
            className="fixed top-5 right-5 md:top-8 md:right-8 z-40"
          >
            <button
              type="button"
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-label="Mở menu tài khoản"
              className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
            >
              <User className="h-5 w-5" />
            </button>

            {userMenuOpen ? (
              <div className="mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                <p className="px-2 py-1 text-xs font-semibold text-slate-500 truncate">
                  {currentUser?.username}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordOpen(true);
                    setChangePasswordError("");
                  }}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                >
                  <Key className="h-4 w-4" /> Đổi mật khẩu
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        <header className="mb-12 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isAdmin ? "@BadGuys" : "BadGuys"}
            <span className="text-slate-400">.</span>
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            {currentUser
              ? `Đăng nhập: ${currentUser.username} (${currentUser.role})`
              : "Chưa đăng nhập"}
          </p>
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
        isAdmin={isAdmin}
        currentUsername={currentUser?.username || ""}
        onClose={closeConfig}
        onOpenSessions={openSessionsModal}
        onConfigChange={handleConfigChange}
        onLogout={logout}
        appVersion={envConfig.appVersion}
      />

      <SessionsModal
        open={sessionsOpen}
        loading={sessionsLoading}
        error={sessionsError}
        sessions={sessions}
        canRemove={isAdmin}
        onClose={closeSessions}
        onRemove={handleRemoveSession}
        onCopyNote={handleCopySessionNote}
      />

      {rankingOpen ? (
        <ProtectedRoute>
          <RankingPage isOpen={rankingOpen} onClose={closeRanking} />
        </ProtectedRoute>
      ) : null}

      {changePasswordOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mt-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Đổi mật khẩu
              </h3>
              <button
                type="button"
                onClick={() => {
                  setChangePasswordOpen(false);
                  setChangePasswordError("");
                }}
                className="rounded-md p-1 text-slate-400 hover:text-slate-700"
                aria-label="Đóng đổi mật khẩu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="mt-4 space-y-3"
              onSubmit={handleSubmitChangePassword}
            >
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      newPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600">
                  Xác nhận mật khẩu mới
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      confirmPassword: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  autoComplete="new-password"
                  required
                />
              </div>

              {changePasswordError ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {changePasswordError}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordOpen(false);
                    setChangePasswordError("");
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changePasswordSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {changePasswordSubmitting ? "Đang lưu..." : "Lưu mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} /> : null}
    </div>
  );
}
