import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  App as AntApp,
  Button,
  Dropdown,
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
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ConfigSidebar from "./components/ConfigSidebar";
import ChangePasswordModal from "./components/ChangePasswordModal";
import LoginModal from "./components/LoginModal";
import SessionsModal from "./components/SessionsModal";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardPageLoadingFallback from "./components/DashboardPageLoadingFallback";
import { useAuth } from "./context/AuthContext";
import { envConfig } from "./env";
import { useHistoryModal } from "./hooks/useHistoryModal";
import { useChangePasswordModal } from "./hooks/useChangePasswordModal";
import { useSessions } from "./hooks/queries/useSessions";
import { loadStoredConfig, saveConfig } from "./lib/platform";
import type { AppConfig } from "./types";
import { normalizeKLabels } from "./lib/core";
import { SESSIONS_FETCH_LIMIT } from "./lib/constants";
import {
  isSupabaseReady,
} from "./lib/api";
import {
  copyText,
  formatVisitTimestampUTC7,
  markVisitNotifiedToday,
  shouldSendVisitNotificationToday,
} from "./lib/platform";
import {
  AppRoute,
  getLoginRedirectTarget,
  isLoginModalPath,
  isRankingLoginPath,
  toDashboardTarget,
} from "./lib/routes";
import { buildAppRouteConfigs } from "./routes/appRouteConfigs";
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

const Calculator = lazy(() => import("./components/calculator/Calculator"));
const RankingPage = lazy(() => import("./components/RankingPage"));
const AuditPage = lazy(() => import("./components/AuditPage"));
const CategoryManagementPage = lazy(
  () => import("./components/CategoryManagementPage"),
);
const UserManagementPage = lazy(
  () => import("./components/UserManagementPage"),
);

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

  // Sessions data loaded via React Query hook - only when modal is open
  const [sessionsFetched, setSessionsFetched] = useState(false);
  const {
    sessions,
    isLoading: sessionsLoading,
    error: sessionsQueryError,
    refetch: refetchSessions,
    removeSession: removeSessions,
  } = useSessions(SESSIONS_FETCH_LIMIT, sessionsFetched);
  const sessionsError =
    sessionsQueryError instanceof Error ? sessionsQueryError.message : "";

  const {
    open: changePasswordOpen,
    error: changePasswordError,
    submitting: changePasswordSubmitting,
    form: passwordForm,
    handleOpen: openChangePasswordModal,
    handleClose: closeChangePasswordModal,
    handleSubmit: handleSubmitChangePassword,
    clearError: clearChangePasswordError,
  } = useChangePasswordModal(showToast);

  const previousPathRef = useRef("");

  const {
    configOpen,
    sessionsOpen,
    openConfig,
    closeConfig,
    openSessions,
    closeSessions,
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
    closeChangePasswordModal();
  }, [isAuthenticated, closeChangePasswordModal]);

  useEffect(() => {
    saveConfig(appConfig, storageScopeKey);
  }, [appConfig, storageScopeKey]);

  useEffect(() => {
    setAppConfig(loadStoredConfig(envConfig.defaultConfig, storageScopeKey));
  }, [storageScopeKey]);

  function showToast(message: string) {
    messageApi.info(message);
  }

  function openSessionsModal() {
    if (!sessionsFetched) {
      setSessionsFetched(true);
    }
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


  function handleLoginSuccess(target: string) {
    navigate(toDashboardTarget(target), { replace: true });
  }

  function closeLoginModal() {
    if (isRankingLoginPath(location.pathname)) {
      navigate(AppRoute.Ranking, { replace: true });
      return;
    }
    navigate(AppRoute.Home, { replace: true });
  }

  const loginModalOpen = isLoginModalPath(location.pathname);
  const loginRedirectTarget = getLoginRedirectTarget(
    (location.state as LocationState | null)?.from,
  );

  const rankingMenuItems: MenuProps["items"] = [
    {
      key: "ranking-view",
      label: t("app.viewRanking"),
      onClick: () => navigate(AppRoute.Ranking),
    },
    {
      key: "ranking-login",
      label: t("common.login"),
      onClick: () =>
        navigate(AppRoute.Login, {
          state: { from: AppRoute.DashboardRanking },
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
      onClick: () => navigate(AppRoute.DashboardRanking),
    },
    {
      key: "password-change",
      label: t("app.changePasswordTitle"),
      icon: <KeyOutlined />,
      onClick: openChangePasswordModal,
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
        navigate(AppRoute.Home, { replace: true });
        logout();
      },
    },
  ];

  const usersLegacyRouteElement = (
    <Navigate to={AppRoute.DashboardUsers} replace />
  );

  const dashboardUsersRouteElement = (
    <AdminRoute>
      <Suspense fallback={<DashboardPageLoadingFallback />}>
        <UserManagementPage />
      </Suspense>
    </AdminRoute>
  );

  const dashboardAuditRouteElement = (
    <AdminRoute>
      <Suspense fallback={<DashboardPageLoadingFallback />}>
        <AuditPage />
      </Suspense>
    </AdminRoute>
  );

  const dashboardCategoriesRouteElement = (
    <AdminRoute>
      <Suspense fallback={<DashboardPageLoadingFallback />}>
        <CategoryManagementPage />
      </Suspense>
    </AdminRoute>
  );

  const dashboardWildcardRouteElement = (
    <ProtectedRoute>
      <Suspense fallback={<DashboardPageLoadingFallback />}>
        <RankingPage isOpen={true} onClose={() => navigate(AppRoute.Home)} />
      </Suspense>
    </ProtectedRoute>
  );

  const rankingWildcardRouteElement = (
    <>
      <Suspense fallback={<DashboardPageLoadingFallback />}>
        <RankingPage isOpen={true} onClose={() => navigate(AppRoute.Home)} />
      </Suspense>
      <LoginModal
        open={loginModalOpen}
        redirectTo={loginRedirectTarget}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </>
  );

  const fallbackRouteElement = (
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
          <Calculator
            userId={storageScopeKey}
            isAdmin={isAdmin}
            appConfig={appConfig}
          />
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

      <ChangePasswordModal
        open={changePasswordOpen}
        submitting={changePasswordSubmitting}
        error={changePasswordError}
        form={passwordForm}
        onCancel={closeChangePasswordModal}
        onSubmit={handleSubmitChangePassword}
        onClearError={clearChangePasswordError}
      />

      <LoginModal
        open={loginModalOpen}
        redirectTo={loginRedirectTarget}
        onClose={closeLoginModal}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );

  const routeConfigs = buildAppRouteConfigs({
    usersLegacy: usersLegacyRouteElement,
    dashboardUsers: dashboardUsersRouteElement,
    dashboardAudit: dashboardAuditRouteElement,
    dashboardCategories: dashboardCategoriesRouteElement,
    dashboardWildcard: dashboardWildcardRouteElement,
    rankingWildcard: rankingWildcardRouteElement,
    fallback: fallbackRouteElement,
  });

  return (
    <Routes>
      {routeConfigs.map((routeConfig) => (
        <Route
          key={routeConfig.path}
          path={routeConfig.path}
          element={routeConfig.element}
        />
      ))}
    </Routes>
  );
}
