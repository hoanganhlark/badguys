export enum AppRoute {
  Any = "*",
  Home = "/",
  Login = "/login",
  UsersLegacy = "/users",
  Ranking = "/ranking",
  RankingLogin = "/ranking/login",
  RankingWildcard = "/ranking/*",
  DashboardRanking = "/dashboard/ranking",
  DashboardUsers = "/dashboard/users",
  DashboardAudit = "/dashboard/audit",
  DashboardCategories = "/dashboard/categories",
  DashboardMember = "/dashboard/member",
  DashboardMatchForm = "/dashboard/match-form",
  DashboardWildcard = "/dashboard/*",
}

const rankingSuffixToDashboardRoute: Record<string, AppRoute> = {
  member: AppRoute.DashboardMember,
  "match-form": AppRoute.DashboardMatchForm,
  ranking: AppRoute.DashboardRanking,
};

const loginModalPaths = [AppRoute.Login, AppRoute.RankingLogin] as const;

export function isLoginModalPath(pathname: string): boolean {
  return loginModalPaths.find((path) => path === pathname) !== undefined;
}

export function isRankingLoginPath(pathname: string): boolean {
  return pathname === AppRoute.RankingLogin;
}

export function getDefaultDashboardRoute(): AppRoute {
  return AppRoute.DashboardRanking;
}

export function getLoginRedirectTarget(from?: string): string {
  return (
    String(from || getDefaultDashboardRoute()).trim() ||
    getDefaultDashboardRoute()
  );
}

export function toDashboardTarget(target: string): string {
  const normalized = String(target || "").trim() || getDefaultDashboardRoute();

  if (
    normalized === AppRoute.Ranking ||
    normalized === `${AppRoute.Ranking}/`
  ) {
    return getDefaultDashboardRoute();
  }

  if (!normalized.startsWith(`${AppRoute.Ranking}/`)) {
    return normalized;
  }

  const suffix = normalized.slice(`${AppRoute.Ranking}/`.length);
  if (!suffix || suffix === "login") {
    return getDefaultDashboardRoute();
  }

  return rankingSuffixToDashboardRoute[suffix] || getDefaultDashboardRoute();
}
