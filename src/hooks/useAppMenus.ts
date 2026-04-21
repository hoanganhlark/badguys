import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { TFunction } from "i18next";
import { buildRankingMenuItems, buildUserMenuItems } from "../lib/menus";
import { AppRoute } from "../lib/routes";

interface UseAppMenusProps {
  username: string;
  onChangePassword: () => void;
  onLogout: () => void;
  t: TFunction;
}

/**
 * Builds and memoizes navigation menus for ranking and user account.
 * Handles navigation and modal interactions.
 */
export function useAppMenus({
  username,
  onChangePassword,
  onLogout,
  t,
}: UseAppMenusProps) {
  const navigate = useNavigate();

  const rankingMenuItems = useCallback(
    () =>
      buildRankingMenuItems({
        onViewRanking: () => navigate(AppRoute.Ranking),
        onLogin: () =>
          navigate(AppRoute.Login, {
            state: { from: AppRoute.DashboardRanking },
          }),
        t,
      }),
    [navigate, t],
  );

  const userMenuItems = useCallback(
    () =>
      buildUserMenuItems({
        username,
        onOpenDashboard: () => navigate(AppRoute.DashboardRanking),
        onChangePassword,
        onLogout: () => {
          navigate(AppRoute.Home, { replace: true });
          onLogout();
        },
        t,
      }),
    [username, navigate, onChangePassword, onLogout, t],
  );

  return {
    rankingMenuItems: rankingMenuItems(),
    userMenuItems: userMenuItems(),
  };
}
