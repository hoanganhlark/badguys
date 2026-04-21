import { useEffect, useRef, useState } from "react";
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
import Calculator from "./components/calculator/Calculator";
import ConfigSidebar from "./components/ConfigSidebar";
import ChangePasswordModal from "./components/ChangePasswordModal";
import LoginModal from "./components/LoginModal";
import RankingPage from "./components/RankingPage";
import SessionsModal from "./components/SessionsModal";
import AuditPage from "./components/AuditPage";
import CategoryManagementPage from "./components/CategoryManagementPage";
import UserManagementPage from "./components/UserManagementPage";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { envConfig } from "./env";
import { useHistoryModal } from "./hooks/useHistoryModal";
import { useSessions } from "./hooks/queries/useSessions";
import { loadStoredConfig, saveConfig } from "./lib/platform";
import type { AppConfig } from "./types";
import {
  normalizeKLabels,
} from "./lib/core";
import {
  SESSIONS_FETCH_LIMIT,
} from "./lib/constants";
import {
  getUserByUsername,
  isSupabaseReady,
  updateUserPassword,
} from "./lib/api";
import { hashMd5 } from "./lib/hash";
import {
  copyText,
  formatVisitTimestampUTC7,
  markVisitNotifiedToday,
  shouldSendVisitNotificationToday,
} from "./lib/platform";
import {
  AnalyticsEventName,
  AnalyticsNotificationType,
  AnalyticsParamKey,
  AnalyticsUserPropertyKey,
  initAnalytics,
  setUserProperties,
  trackEvent,
  trackPageView,
  trackRouteChange,
} from "./lib/analytics";
import { notifyGuestVisited } from "./lib/telegram";

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

  const [appConfig, setAppConfig] = useState<AppConfig>(() =>
    loadStoredConfig(envConfig.defaultConfig, storageScopeKey),
  );

  // Sessions data loaded via React Query hook instead of manual state
  const { sessions, isLoading: sessionsLoading, error: sessionsQueryError, refetch: refetchSessions, removeSession: removeSessions } = useSessions(SESSIONS_FETCH_LIMIT);
  const sessionsError = sessionsQueryError instanceof Error ? sessionsQueryError.message : "";

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState("");
  const [changePasswordSubmitting, setChangePasswordSubmitting] =
    useState(false);
  const [passwordForm] = Form.useForm<{
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }>();

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

  useEffect(() => {
    saveConfig(appConfig, storageScopeKey);
  }, [appConfig, storageScopeKey]);

  useEffect(() => {
    setAppConfig(
      loadStoredConfig(envConfig.defaultConfig, storageScopeKey),
    );
  }, [storageScopeKey]);

  function showToast(message: string) {
    messageApi.info(message);
  }

  function openSessionsModal() {
    openSessions();
    refetchSessions();
  }

  async function handleRemoveSession(sessionId: string) {
    if (!sessionId) {
      showToast(t("app.toastMissingSessionId"));
      return;
    }

    if (!isSupabaseReady()) {
      showToast(t("app.toastSupabaseNotReady"));
      return;
    }

    const confirmed = window.confirm(t("common.confirmDelete"));
    if (!confirmed) return;

    try {
      await removeSessions(sessionId);
      showToast(t("app.toastDeletedSession"));
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

  function handleConfigChange(next: AppConfig) {
    setAppConfig({
      ...next,
      femaleMax: Math.max(0, next.femaleMax || 0),
      tubePrice: Math.max(0, next.tubePrice || 0),
      setPrice: Math.max(0, next.setPrice || 0),
      enableCourtCount: !!next.enableCourtCount,
    });
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

  if (location.pathname === "/dashboard/categories") {
    return (
      <AdminRoute>
        <CategoryManagementPage />
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

          <Calculator userId={storageScopeKey} isAdmin={isAdmin} appConfig={appConfig} />
        </div>
      </div>

      <ConfigSidebar
        open={configOpen}
        backdropInteractive={!sessionsOpen}
        config={appConfig}
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
