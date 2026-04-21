import type { ReactNode } from "react";
import { AppRoute } from "../lib/routes";

export interface AppRouteConfig {
  path: string;
  element: ReactNode;
}

interface BuildAppRouteConfigsArgs {
  usersLegacy: ReactNode;
  dashboardUsers: ReactNode;
  dashboardAudit: ReactNode;
  dashboardCategories: ReactNode;
  dashboardWildcard: ReactNode;
  rankingWildcard: ReactNode;
  fallback: ReactNode;
}

export function buildAppRouteConfigs(
  args: BuildAppRouteConfigsArgs,
): AppRouteConfig[] {
  return [
    { path: AppRoute.UsersLegacy, element: args.usersLegacy },
    { path: AppRoute.DashboardUsers, element: args.dashboardUsers },
    { path: AppRoute.DashboardAudit, element: args.dashboardAudit },
    { path: AppRoute.DashboardCategories, element: args.dashboardCategories },
    { path: AppRoute.DashboardWildcard, element: args.dashboardWildcard },
    { path: AppRoute.RankingWildcard, element: args.rankingWildcard },
    { path: AppRoute.Any, element: args.fallback },
  ];
}
