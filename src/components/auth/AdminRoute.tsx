import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { currentUser } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  if (currentUser.role !== "admin") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-red-600">403 Forbidden</p>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            {t("adminRoute.noPermissionTitle")}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {t("adminRoute.noPermissionDescription")}
          </p>
          <button
            type="button"
            onClick={() => navigate("/dashboard/ranking")}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {t("adminRoute.backDashboard")}
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
