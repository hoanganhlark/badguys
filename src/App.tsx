import { useEffect, useState } from "react";
import { App as AntApp } from "antd";
import { useTranslation } from "react-i18next";
import {
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import LoginModal from "./components/LoginModal";
import { MainLayout } from "./components/MainLayout";
import { useAuth } from "./context/AuthContext";
import { useHistoryModal } from "./hooks/useHistoryModal";
import { useChangePasswordModal } from "./hooks/useChangePasswordModal";
import { useSessionHandlers } from "./hooks/useSessionHandlers";
import { useAnalyticsTracking } from "./hooks/useAnalyticsTracking";
import { useGuestVisitNotification } from "./hooks/useGuestVisitNotification";
import { useAppConfig } from "./hooks/useAppConfig";
import { useAppMenus } from "./hooks/useAppMenus";
import { useSessions } from "./hooks/queries/useSessions";
import { SESSIONS_FETCH_LIMIT } from "./lib/constants";
import {
  AppRoute,
  getLoginRedirectTarget,
  isLoginModalPath,
  isRankingLoginPath,
  toDashboardTarget,
} from "./lib/routes";
import { buildAppRouteConfigs } from "./routes/appRouteConfigs";
import {
  buildDashboardRouteElements,
  buildRankingRouteElement,
} from "./routeElements";

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
  const { appConfig, handleConfigChange } = useAppConfig(storageScopeKey);

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

  const { rankingMenuItems, userMenuItems } = useAppMenus({
    username: currentUser?.username || "",
    onChangePassword: openChangePasswordModal,
    onLogout: logout,
    t,
  });

  const onNavigateHome = () => navigate(AppRoute.Home);

  const loginModalElement = (
    <LoginModal
      open={loginModalOpen}
      redirectTo={loginRedirectTarget}
      onClose={closeLoginModal}
      onSuccess={handleLoginSuccess}
    />
  );

  const {
    usersLegacy: usersLegacyRouteElement,
    dashboardUsers: dashboardUsersRouteElement,
    dashboardAudit: dashboardAuditRouteElement,
    dashboardCategories: dashboardCategoriesRouteElement,
    dashboardWildcard: dashboardWildcardRouteElement,
  } = buildDashboardRouteElements(onNavigateHome);

  const rankingWildcardRouteElement = buildRankingRouteElement(
    onNavigateHome,
    loginModalElement,
  );

  const fallbackRouteElement = (
    <MainLayout
      isAuthenticated={isAuthenticated}
      isAdmin={isAdmin}
      currentUsername={currentUser?.username || ""}
      userId={storageScopeKey}
      appConfig={appConfig}
      rankingMenuItems={rankingMenuItems}
      userMenuItems={userMenuItems}
      configOpen={configOpen}
      onConfigClose={closeConfig}
      onConfigChange={handleConfigChange}
      onOpenSessions={openSessionsModal}
      sessionsOpen={sessionsOpen}
      sessionsLoading={sessionsLoading}
      sessionsError={sessionsError}
      sessions={sessions}
      onSessionsClose={closeSessions}
      onRemoveSession={handleRemoveSession}
      onCopySessionNote={handleCopySessionNote}
      changePasswordOpen={changePasswordOpen}
      changePasswordSubmitting={changePasswordSubmitting}
      changePasswordError={changePasswordError}
      passwordForm={passwordForm}
      onChangePasswordClose={closeChangePasswordModal}
      onChangePasswordSubmit={handleSubmitChangePassword}
      onClearChangePasswordError={clearChangePasswordError}
      loginModalOpen={loginModalOpen}
      loginRedirectTarget={loginRedirectTarget}
      onLoginModalClose={closeLoginModal}
      onLoginSuccess={handleLoginSuccess}
      onLogout={logout}
    />
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
