import { useEffect, useMemo, useRef, useState } from "react";
import {
  App as AntApp,
  Button,
  Dropdown,
  Form,
  Layout,
  Typography,
  type MenuProps,
} from "antd";
import {
  LogoutOutlined,
  SettingOutlined,
  KeyOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import ConfigSidebar from "./components/ConfigSidebar";
import ChangePasswordModal from "./components/ChangePasswordModal";
import ExpensesSection from "./components/ExpensesSection";
import AuditPage from "./components/AuditPage";
import LoginModal from "./components/LoginModal";
import PlayersSection from "./components/PlayersSection";
import RankingPage from "./components/RankingPage";
import ResultCard from "./components/ResultCard";
import SessionsModal from "./components/SessionsModal";
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
  trackRouteChange,
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
  const { message: messageApi } = AntApp.useApp();

  const storageScopeKey = currentUser?.userId || "guest";

  const [courtFeeInput, setCourtFeeInput] = useState(
    () => loadStoredInputDraft(storageScopeKey).courtFeeInput,
  );
  const [shuttleCountInput, setShuttleCountInput] = useState(
    () => loadStoredInputDraft(storageScopeKey).shuttleCountInput,
  );
  const [courtCountInput, setCourtCountInput] = useState(
    () => loadStoredInputDraft(storageScopeKey).courtCountInput,
  );
  const [bulkInput, setBulkInput] = useState(
    () => loadStoredInputDraft(storageScopeKey).bulkInput,
  );
  const [players, setPlayers] = useState<Player[]>(() =>
    parsePlayersBulk(loadStoredInputDraft(storageScopeKey).bulkInput),
  );
  const [config, setConfig] = useState<AppConfig>(() =>
    loadStoredConfig(envConfig.defaultConfig, storageScopeKey),
  );
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [resetArmed, setResetArmed] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSubmitting, setChangePasswordSubmitting] =
    useState(false);
  const [passwordForm] = Form.useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

  const resetTimerRef = useRef<number | null>(null);
  const previousPathRef = useRef("");

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

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    const previousPath = previousPathRef.current;

    if (!previousPath) {
      previousPathRef.current = nextPath;
      return;
    }

    if (isAuthenticated && previousPath !== nextPath) {
      trackRouteChange(previousPath, nextPath);
    }

    previousPathRef.current = nextPath;
  }, [isAuthenticated, location.pathname, location.search, location.hash]);

  useEffect(() => {
    setUserProperties({
      [AnalyticsUserPropertyKey.IsAuthenticated]: isAuthenticated,
      [AnalyticsUserPropertyKey.Role]: currentUser?.role || "guest",
      [AnalyticsUserPropertyKey.Username]: currentUser?.username || "guest",
    });
  }, [isAuthenticated, currentUser?.role, currentUser?.username]);

  useEffect(() => {
    saveConfig(config, storageScopeKey);
  }, [config, storageScopeKey]);

  useEffect(() => {
    saveInputDraft(
      {
        courtFeeInput,
        shuttleCountInput,
        courtCountInput,
        bulkInput,
      },
      storageScopeKey,
    );
  }, [
    courtFeeInput,
    shuttleCountInput,
    courtCountInput,
    bulkInput,
    storageScopeKey,
  ]);

  useEffect(() => {
    const draft = loadStoredInputDraft(storageScopeKey);
    setCourtFeeInput(draft.courtFeeInput);
    setShuttleCountInput(draft.shuttleCountInput);
    setCourtCountInput(draft.courtCountInput);
    setBulkInput(draft.bulkInput);
    setPlayers(parsePlayersBulk(draft.bulkInput));
    setConfig(loadStoredConfig(envConfig.defaultConfig, storageScopeKey));
    setResetArmed(false);
  }, [storageScopeKey]);

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
    if (isAuthenticated) return;
    setChangePasswordOpen(false);
    setChangePasswordError("");
    passwordForm.resetFields();
  }, [isAuthenticated]);

  function showToast(message: string) {
    messageApi.info(message);
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
    trackEvent(AnalyticsEventName.CalculateSession, {
      [AnalyticsParamKey.PlayersCount]: players.length,
      [AnalyticsParamKey.MaleCount]: calc.malesCount,
      [AnalyticsParamKey.FemaleCount]: calc.femalesCount,
      [AnalyticsParamKey.TotalFeeK]: calc.total,
    });

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
      clearInputDraft(storageScopeKey);
      showToast(t("app.toastClearedData"));
      return;
    }

    setResetArmed(true);
    resetTimerRef.current = window.setTimeout(() => {
      setResetArmed(false);
      resetTimerRef.current = null;
    }, RESET_CONFIRM_TIMEOUT_MS);
  }

  async function handleSubmitChangePassword(values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (!currentUser) {
      setChangePasswordError(t("app.notLoggedIn"));
      return;
    }

    const currentPassword = String(values.currentPassword || "");
    const newPassword = String(values.newPassword || "");
    const confirmPassword = String(values.confirmPassword || "");

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

      passwordForm.resetFields();
      setChangePasswordOpen(false);
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

  const rankingMenuItems: MenuProps["items"] = [
    {
      key: "ranking-view",
      label: t("app.viewRanking"),
      onClick: openRanking,
    },
    {
      key: "ranking-login",
      label: t("common.login"),
      onClick: () =>
        navigate("/login", {
          state: { from: "/dashboard/ranking" },
        }),
    },
  ];

  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-name",
      label: (
        <Typography.Text strong style={{ maxWidth: 130 }} ellipsis>
          {currentUser?.username}
        </Typography.Text>
      ),
      disabled: true,
    },
    {
      key: "dashboard-open",
      label: t("app.openDashboard"),
      icon: <TrophyOutlined />,
      onClick: () => navigate("/dashboard/ranking"),
    },
    {
      key: "password-change",
      label: t("app.changePasswordTitle"),
      icon: <KeyOutlined />,
      onClick: () => {
        setChangePasswordOpen(true);
        setChangePasswordError("");
        passwordForm.resetFields();
      },
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: t("common.logout"),
      icon: <LogoutOutlined />,
      danger: true,
      onClick: () => {
        navigate("/", { replace: true });
        logout();
      },
    },
  ];

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
    location.pathname === "/dashboard" ||
    location.pathname === "/dashboard/" ||
    location.pathname.startsWith("/dashboard/")
  ) {
    return (
      <ProtectedRoute>
        <RankingPage isOpen={true} onClose={() => navigate("/")} />
      </ProtectedRoute>
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
      <Layout.Header
        className="z-40"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 56,
          lineHeight: "56px",
          padding: 0,
          borderBottom: "1px solid #e2e8f0",
          background: "rgba(250, 250, 250, 0.92)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4 md:px-6">
          <Button
            shape="circle"
            icon={<SettingOutlined />}
            onClick={openConfig}
            aria-label={t("app.openConfig")}
          />

          {!currentUser ? (
            <Dropdown menu={{ items: rankingMenuItems }} trigger={["click"]}>
              <Button
                shape="circle"
                icon={<TrophyOutlined />}
                aria-label={t("app.ranking")}
              />
            </Dropdown>
          ) : null}

          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} trigger={["click"]}>
              <Button shape="circle" aria-label={t("app.openAccountMenu")}>
                {currentUser?.username?.charAt(0)?.toUpperCase() || (
                  <UserOutlined />
                )}
              </Button>
            </Dropdown>
          ) : null}
        </div>
      </Layout.Header>

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

      <ChangePasswordModal
        open={changePasswordOpen}
        submitting={changePasswordSubmitting}
        error={changePasswordError}
        form={passwordForm}
        onCancel={() => {
          setChangePasswordOpen(false);
          setChangePasswordError("");
          passwordForm.resetFields();
        }}
        onSubmit={handleSubmitChangePassword}
        onClearError={() => setChangePasswordError("")}
      />

      <LoginModal
        open={loginModalOpen}
        redirectTo={getLoginRedirectTarget()}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
