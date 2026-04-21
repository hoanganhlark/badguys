import { lazy, Suspense, useEffect, useState } from "react";
import { App as AntApp } from "antd";
import { useTranslation } from "react-i18next";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import AppHeader from "./components/AppHeader";
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
import { useSessionHandlers } from "./hooks/useSessionHandlers";
import { useAnalyticsTracking } from "./hooks/useAnalyticsTracking";
import { useGuestVisitNotification } from "./hooks/useGuestVisitNotification";
import { useSessions } from "./hooks/queries/useSessions";
import { loadStoredConfig, saveConfig } from "./lib/platform";
import type { AppConfig } from "./types";
import { SESSIONS_FETCH_LIMIT } from "./lib/constants";
import {
  AppRoute,
  getLoginRedirectTarget,
  isLoginModalPath,
  isRankingLoginPath,
  toDashboardTarget,
} from "./lib/routes";
import { buildRankingMenuItems, buildUserMenuItems } from "./lib/menus";
import { buildAppRouteConfigs } from "./routes/appRouteConfigs";

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
    removeSessionAsync,
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

  const {
    configOpen,
    sessionsOpen,
    openConfig,
    closeConfig,
    openSessions,
    closeSessions,
  } = useHistoryModal();

  // Track analytics and page views
  useAnalyticsTracking({
    isAuthenticated,
    username: currentUser?.username,
    role: currentUser?.role,
  });

  // Send guest visit notification once per day
  useGuestVisitNotification({ isAdmin });

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

  const { handleRemoveSession, handleCopySessionNote } = useSessionHandlers({
    showToast,
    removeSessions: removeSessionAsync,
  });

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

  const rankingMenuItems = buildRankingMenuItems({
    onViewRanking: () => navigate(AppRoute.Ranking),
    onLogin: () =>
      navigate(AppRoute.Login, {
        state: { from: AppRoute.DashboardRanking },
      }),
    t,
  });

  const userMenuItems = buildUserMenuItems({
    username: currentUser?.username || "",
    onOpenDashboard: () => navigate(AppRoute.DashboardRanking),
    onChangePassword: openChangePasswordModal,
    onLogout: () => {
      navigate(AppRoute.Home, { replace: true });
      logout();
    },
    t,
  });

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
      <AppHeader
        isAuthenticated={isAuthenticated}
        username={currentUser?.username || ""}
        onOpenConfig={openConfig}
        rankingMenuItems={rankingMenuItems}
        userMenuItems={userMenuItems}
        configOpenLabel={t("app.openConfig")}
        rankingLabel={t("app.ranking")}
        accountMenuLabel={t("app.openAccountMenu")}
      />

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
