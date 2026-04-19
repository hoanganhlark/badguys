import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Award, Key, LogOut, Settings, X } from "react-feather";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import ConfigSidebar from "./components/ConfigSidebar";
import ExpensesSection from "./components/ExpensesSection";
import AuditPage from "./components/AuditPage";
import LoginModal from "./components/LoginModal";
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
import {
  AnalyticsEventName,
  AnalyticsNotificationType,
  AnalyticsParamKey,
  AnalyticsStatus,
  AnalyticsUserPropertyKey,
  initAnalytics,
  setUserProperties,
  trackEvent,
  trackPageView,
} from "./lib/analytics";
import { notifyCopyClicked, notifyGuestVisited } from "./lib/telegram";
import type { AppConfig, Player, SessionRecord } from "./types";

interface LocationState {
  from?: string;
}

export default function App() {
  const { currentUser, isAuthenticated, isAdmin, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [rankingMenuOpen, setRankingMenuOpen] = useState(false);
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
  const rankingMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const lastCalculationTrackedRef = useRef("");

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
  } = useHistoryModal();

  const courtFee = parseFloat(courtFeeInput) || 0;
  const shuttleCount = parseFloat(shuttleCountInput) || 0;
  const courtCount = parseFloat(courtCountInput) || 0;

  const calc = useMemo(
    () => calculateResult(players, courtFee, shuttleCount, config),
    [players, courtFee, shuttleCount, config],
  );

  const showResult = players.length > 0 && calc.total !== 0;

  const calculationTrackingKey = useMemo(() => {
    if (!showResult) return "";

    return JSON.stringify({
      playersCount: players.length,
      courtFee,
      shuttleCount,
      courtCount,
      total: calc.total,
    });
  }, [
    showResult,
    players.length,
    courtFee,
    shuttleCount,
    courtCount,
    calc.total,
  ]);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    setUserProperties({
      [AnalyticsUserPropertyKey.IsAuthenticated]: isAuthenticated,
      [AnalyticsUserPropertyKey.Role]: currentUser?.role || "guest",
      [AnalyticsUserPropertyKey.Username]: currentUser?.username || "guest",
    });
  }, [isAuthenticated, currentUser?.role, currentUser?.username]);

  useEffect(() => {
    if (!calculationTrackingKey) return;
    if (lastCalculationTrackedRef.current === calculationTrackingKey) return;

    lastCalculationTrackedRef.current = calculationTrackingKey;

    trackEvent(AnalyticsEventName.CalculateSession, {
      [AnalyticsParamKey.PlayersCount]: players.length,
      [AnalyticsParamKey.MaleCount]: calc.malesCount,
      [AnalyticsParamKey.FemaleCount]: calc.femalesCount,
      [AnalyticsParamKey.TotalFeeK]: calc.total,
    });
  }, [
    calculationTrackingKey,
    players.length,
    calc.malesCount,
    calc.femalesCount,
    calc.total,
  ]);

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
      trackEvent(AnalyticsEventName.SendTelegramNotification, {
        [AnalyticsParamKey.NotificationType]:
          AnalyticsNotificationType.GuestVisit,
      });
      markVisitNotifiedToday();
    })();
  }, [isAdmin]);

  useEffect(() => {
    if (!rankingMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rankingMenuRef.current) return;
      if (rankingMenuRef.current.contains(event.target as Node)) return;
      setRankingMenuOpen(false);
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [rankingMenuOpen]);

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

  useEffect(() => {
    if (!currentUser) return;
    setRankingMenuOpen(false);
  }, [currentUser]);

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
    const confirmed = window.confirm(t("common.confirmDelete"));
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
      showToast(t("app.toastCopiedSummary"));
    } catch {
      showToast(t("common.copyFailed"));
      return;
    }

    if (!isAdmin) {
      trackEvent(AnalyticsEventName.SendTelegramNotification, {
        [AnalyticsParamKey.NotificationType]:
          AnalyticsNotificationType.CopyClicked,
      });
      void notifyCopyClicked(summaryText);
      void saveDailySummary(payload)
        .then(() => {
          trackEvent(AnalyticsEventName.SaveSession, {
            [AnalyticsParamKey.Status]: AnalyticsStatus.Success,
          });
        })
        .catch((error) => {
          console.warn("Save daily session failed", error);
          trackEvent(AnalyticsEventName.SaveSession, {
            [AnalyticsParamKey.Status]: AnalyticsStatus.Failed,
          });
        });
    }
  }

  async function loadLastSessions() {
    setSessionsLoading(true);
    setSessionsError("");

    try {
      if (!isFirebaseReady()) {
        setSessionsError(t("app.loadSessionsFirebaseError"));
        return;
      }

      const items = await getRecentSessions(SESSIONS_FETCH_LIMIT);
      setSessions(items);
    } catch (error) {
      console.warn("Load recent sessions failed", error);
      setSessionsError(t("app.loadSessionsFailed"));
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
      showToast(t("app.toastMissingSessionId"));
      return;
    }

    if (!isFirebaseReady()) {
      showToast(t("app.toastFirebaseNotReadyDelete"));
      return;
    }

    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    try {
      await removeSession(sessionId);
      showToast(t("app.toastDeletedSession"));
      loadLastSessions();
    } catch (error) {
      console.warn("Remove session failed", error);
      showToast(t("app.toastDeleteFailed"));
    }
  }

  async function handleCopySessionNote(summaryText: string) {
    if (!summaryText) return;
    try {
      await copyText(normalizeKLabels(summaryText));
      showToast(t("app.toastCopiedNote"));
    } catch {
      showToast(t("common.copyFailed"));
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
      showToast(t("app.toastClearedData"));
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
      setChangePasswordError(t("app.notLoggedIn"));
      return;
    }

    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setChangePasswordError(t("app.fillAllFields"));
      return;
    }

    if (newPassword.length < 4) {
      setChangePasswordError(t("app.newPasswordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setChangePasswordError(t("app.confirmPasswordMismatch"));
      return;
    }

    if (newPassword === currentPassword) {
      setChangePasswordError(t("app.newPasswordMustDiffer"));
      return;
    }

    setChangePasswordSubmitting(true);
    setChangePasswordError("");

    try {
      const userRecord = await getUserByUsername(currentUser.username);
      if (!userRecord || userRecord.id !== currentUser.userId) {
        throw new Error(t("app.currentAccountNotFound"));
      }

      const currentPasswordHash = hashMd5(currentPassword);
      if (currentPasswordHash !== userRecord.password) {
        throw new Error(t("app.currentPasswordIncorrect"));
      }

      await updateUserPassword(userRecord.id, hashMd5(newPassword));

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setChangePasswordOpen(false);
      setUserMenuOpen(false);
      showToast(t("app.toastPasswordChanged"));
    } catch (error) {
      setChangePasswordError(
        error instanceof Error ? error.message : t("app.changePasswordFailed"),
      );
    } finally {
      setChangePasswordSubmitting(false);
    }
  }

  function getLoginRedirectTarget(): string {
    const candidate =
      (location.state as LocationState | null)?.from || "/dashboard/ranking";
    return (
      String(candidate || "/dashboard/ranking").trim() || "/dashboard/ranking"
    );
  }

  function toDashboardTarget(target: string): string {
    const normalized = String(target || "").trim() || "/dashboard/ranking";

    if (normalized === "/ranking" || normalized === "/ranking/") {
      return "/dashboard/ranking";
    }

    if (normalized.startsWith("/ranking/")) {
      const suffix = normalized.slice("/ranking/".length);
      if (!suffix || suffix === "login") return "/dashboard/ranking";
      if (suffix === "member") return "/dashboard/member";
      if (suffix === "match-form") return "/dashboard/match-form";
      if (suffix === "ranking") return "/dashboard/ranking";
      return "/dashboard/ranking";
    }

    return normalized;
  }

  function handleLoginSuccess(target: string) {
    navigate(toDashboardTarget(target), { replace: true });
  }

  function closeLoginModal() {
    if (location.pathname === "/ranking/login") {
      navigate("/ranking", { replace: true });
      return;
    }
    navigate("/", { replace: true });
  }

  const loginModalOpen =
    location.pathname === "/login" || location.pathname === "/ranking/login";
  const passwordFormValid =
    passwordForm.currentPassword.trim().length > 0 &&
    passwordForm.newPassword.trim().length >= 4 &&
    passwordForm.confirmPassword.trim().length > 0 &&
    passwordForm.newPassword !== passwordForm.currentPassword &&
    passwordForm.newPassword === passwordForm.confirmPassword;

  if (location.pathname === "/users") {
    return <Navigate to="/dashboard/users" replace />;
  }

  if (location.pathname === "/dashboard/users") {
    return (
      <AdminRoute>
        <UserManagementPage />
      </AdminRoute>
    );
  }

  if (location.pathname === "/dashboard/audit") {
    return (
      <AdminRoute>
        <AuditPage />
      </AdminRoute>
    );
  }

  if (
    location.pathname === "/ranking" ||
    location.pathname.startsWith("/ranking/")
  ) {
    return (
      <>
        <RankingPage isOpen={true} onClose={() => navigate("/")} />
        <LoginModal
          open={loginModalOpen}
          redirectTo={getLoginRedirectTarget()}
          onClose={closeLoginModal}
          onSuccess={handleLoginSuccess}
        />
      </>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#fafafa]">
      <header className="app-topbar z-40">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 md:px-6">
          <button
            onClick={openConfig}
            aria-label={t("app.openConfig")}
            className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
          >
            <Settings className="h-5 w-5" />
          </button>

          {!currentUser ? (
            <div ref={rankingMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  if (currentUser) return;
                  setRankingMenuOpen((prev) => !prev);
                }}
                aria-label={t("app.ranking")}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center"
              >
                <Award className="h-5 w-5" />
              </button>

              {rankingMenuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setRankingMenuOpen(false);
                      openRanking();
                    }}
                    className="w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("app.viewRanking")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRankingMenuOpen(false);
                      navigate("/login", {
                        state: { from: "/dashboard/ranking" },
                      });
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {t("common.login")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {isAuthenticated ? (
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                aria-label={t("app.openAccountMenu")}
                className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center text-sm font-bold uppercase"
              >
                {currentUser?.username?.charAt(0) || "U"}
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                  <p className="px-2 py-1 text-xs font-semibold text-slate-500 truncate">
                    {currentUser?.username}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/dashboard/ranking");
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Award className="h-4 w-4" /> {t("app.openDashboard")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChangePasswordOpen(true);
                      setChangePasswordError("");
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Key className="h-4 w-4" /> {t("app.changePasswordTitle")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate("/", { replace: true });
                      logout();
                    }}
                    className="mt-1 w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50 inline-flex items-center gap-2"
                  >
                    <LogOut className="h-4 w-4" /> {t("common.logout")}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="px-5 pb-5 pt-20 md:px-12 md:pb-12">
        <div className="max-w-md mx-auto">
          <header className="mb-12 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {isAdmin ? "@BadGuys" : "BadGuys"}
              <span className="text-slate-400">.</span>
            </h1>
            {currentUser ? (
              <p className="mt-2 text-xs text-slate-500">
                {t("app.loggedIn", {
                  username: currentUser.username,
                  role: currentUser.role,
                })}
              </p>
            ) : null}
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
                resetArmed
                  ? "text-red-600"
                  : "text-slate-400 hover:text-red-500"
              }`}
            >
              {resetArmed ? t("app.resetConfirm") : t("app.resetData")}
            </button>
          </div>
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
                {t("app.changePasswordTitle")}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setChangePasswordOpen(false);
                  setChangePasswordError("");
                }}
                className="rounded-md p-1 text-slate-400 hover:text-slate-700"
                aria-label={t("app.closeChangePassword")}
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
                  {t("app.currentPassword")}
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
                  {t("app.newPassword")}
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
                  {t("app.confirmNewPassword")}
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
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={!passwordFormValid || changePasswordSubmitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {changePasswordSubmitting
                    ? t("app.saving")
                    : t("app.savePassword")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toastMessage ? <Toast message={toastMessage} /> : null}

      <LoginModal
        open={loginModalOpen}
        redirectTo={getLoginRedirectTarget()}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
