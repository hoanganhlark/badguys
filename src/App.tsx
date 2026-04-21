import { App as AntApp } from "antd";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import LoginModal from "./components/LoginModal";
import GlobalChangePasswordModal from "./components/GlobalChangePasswordModal";
import { MainLayout } from "./components/MainLayout";
import { useAuth } from "./context/AuthContext";
import { SessionProvider } from "./context/SessionContext";
import { ChangePasswordProvider } from "./context/ChangePasswordContext";
import { useHistoryModal } from "./hooks/useHistoryModal";
import { useAnalyticsTracking } from "./hooks/useAnalyticsTracking";
import { useGuestVisitNotification } from "./hooks/useGuestVisitNotification";
import { useAppConfig } from "./hooks/useAppConfig";
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
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { message: messageApi } = AntApp.useApp();

  const storageScopeKey = currentUser?.userId || "guest";
  const { appConfig, handleConfigChange } = useAppConfig(storageScopeKey);

  const { configOpen, openConfig, closeConfig } = useHistoryModal();

  // Track analytics and page views
  useAnalyticsTracking();

  // Send guest visit notification once per day
  useGuestVisitNotification();

  function showToast(message: string) {
    messageApi.info(message);
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
      userId={storageScopeKey}
      appConfig={appConfig}
      configOpen={configOpen}
      onConfigOpen={openConfig}
      onConfigClose={closeConfig}
      onConfigChange={handleConfigChange}
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
    <ChangePasswordProvider showToast={showToast}>
      <GlobalChangePasswordModal />
      <SessionProvider showToast={showToast}>
        <Routes>
          {routeConfigs.map((routeConfig) => (
            <Route
              key={routeConfig.path}
              path={routeConfig.path}
              element={routeConfig.element}
            />
          ))}
        </Routes>
      </SessionProvider>
    </ChangePasswordProvider>
  );
}
