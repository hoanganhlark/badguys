import { lazy, Suspense, ReactNode } from "react";
import { Navigate } from "react-router-dom";
import AdminRoute from "./components/auth/AdminRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import DashboardPageLoadingFallback from "./components/DashboardPageLoadingFallback";
import { AppRoute } from "./lib/routes";

const AuditPage = lazy(() => import("./components/AuditPage"));
const CategoryManagementPage = lazy(
  () => import("./components/CategoryManagementPage"),
);
const UserManagementPage = lazy(
  () => import("./components/UserManagementPage"),
);
const RankingPage = lazy(() => import("./components/RankingPage"));

/**
 * Builds route elements for dashboard admin/protected pages
 */
export function buildDashboardRouteElements(onNavigateHome: () => void) {
  const usersLegacy = <Navigate to={AppRoute.DashboardUsers} replace />;

  const dashboardUsers = (
    <AdminRoute>
      <UserManagementPage />
    </AdminRoute>
  );

  const dashboardAudit = (
    <AdminRoute>
      <AuditPage />
    </AdminRoute>
  );

  const dashboardCategories = (
    <AdminRoute>
      <CategoryManagementPage />
    </AdminRoute>
  );

  const dashboardWildcard = (
    <ProtectedRoute>
      <RankingPage isOpen={true} onClose={onNavigateHome} />
    </ProtectedRoute>
  );

  return {
    usersLegacy,
    dashboardUsers,
    dashboardAudit,
    dashboardCategories,
    dashboardWildcard,
  };
}

/**
 * Builds route element for public ranking page with optional login modal
 */
export function buildRankingRouteElement(
  onNavigateHome: () => void,
  loginModalElement: ReactNode,
): ReactNode {
  return (
    <>
      <RankingPage isOpen={true} onClose={onNavigateHome} />
      {loginModalElement}
    </>
  );
}
