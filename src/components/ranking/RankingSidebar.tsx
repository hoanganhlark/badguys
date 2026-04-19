import { useEffect, type ComponentType } from "react";
import {
  Activity,
  Award,
  Grid,
  Home,
  PlusCircle,
  Shield,
  X,
} from "react-feather";
import { useTranslation } from "react-i18next";
import type { RankingView } from "./types";

interface RankingSidebarProps {
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
  onGoHome: () => void;
  isAdmin: boolean;
  onGoUsers: () => void;
  onGoAudit?: () => void;
  showMatchForm?: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  usersActive?: boolean;
  auditActive?: boolean;
  activeView?: RankingView | null;
}

function SidebarItem({
  icon: Icon,
  label,
  id,
  currentView,
  onSetView,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  id: RankingView;
  currentView: RankingView;
  onSetView: (view: RankingView) => void;
}) {
  return (
    <button
      onClick={() => onSetView(id)}
      className={`flex items-center space-x-3 w-full px-3 py-2.5 rounded-xl border transition-all ${
        currentView === id
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

export default function RankingSidebar({
  currentView,
  onSetView,
  onGoHome,
  isAdmin,
  onGoUsers,
  onGoAudit,
  showMatchForm = true,
  mobileOpen,
  onMobileClose,
  usersActive = false,
  auditActive = false,
  activeView,
}: RankingSidebarProps) {
  const { t } = useTranslation();
  const highlightedView = activeView === undefined ? currentView : activeView;

  const navItems: Array<{
    icon: ComponentType<{ className?: string }>;
    label: string;
    id: RankingView;
  }> = [
    { icon: Grid, label: t("rankingSidebar.members"), id: "member" },
    { icon: Award, label: t("rankingSidebar.ranking"), id: "ranking" },
  ];

  if (showMatchForm) {
    navItems.splice(1, 0, {
      icon: PlusCircle,
      label: t("rankingSidebar.addMatch"),
      id: "match-form",
    });
  }

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onMobileClose]);

  const handleSelectView = (nextView: RankingView) => {
    onSetView(nextView);
    onMobileClose();
  };

  return (
    <>
      <div
        onClick={onMobileClose}
        className={`${mobileOpen ? "" : "hidden"} fixed inset-0 panel-backdrop z-[60] md:hidden`}
      />

      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed left-0 top-0 z-[65] h-full w-full max-w-sm sidebar-panel p-5 overflow-y-auto transition-transform duration-200 ease-out md:hidden`}
      >
        <div className="min-h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => {
                onGoHome();
                onMobileClose();
              }}
              className="inline-flex items-center gap-2.5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Award className="h-5 w-5" />
              </span>
              <span>
                <p className="text-base font-bold text-slate-900 leading-none">
                  BadGuys
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {t("rankingSidebar.dashboard")}
                </p>
              </span>
            </button>
            <button
              type="button"
              onClick={onMobileClose}
              className="text-slate-400 hover:text-slate-700"
              aria-label={t("rankingSidebar.closeMenu")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2">
            {navItems.map(({ icon: Icon, label, id }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSelectView(id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                  highlightedView === id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-6 space-y-2">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onGoUsers();
                    onMobileClose();
                  }}
                  className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                    usersActive
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>{t("rankingSidebar.userManagement")}</span>
                </button>

                {onGoAudit ? (
                  <button
                    type="button"
                    onClick={() => {
                      onGoAudit();
                      onMobileClose();
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                      auditActive
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>{t("rankingSidebar.auditLogs")}</span>
                  </button>
                ) : null}
              </>
            ) : null}

            <button
              type="button"
              onClick={() => {
                onGoHome();
                onMobileClose();
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span>{t("rankingSidebar.home")}</span>
            </button>
          </div>

          <div className="mt-auto pt-8 text-[11px] text-slate-400">
            © BadGuys
          </div>
        </div>
      </aside>

      <aside className="w-72 sidebar-panel p-7 hidden md:flex flex-col">
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center space-x-3 mb-10 text-left"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Award className="h-5 w-5" />
          </span>
          <span className="text-2xl font-bold text-slate-900">BadGuys</span>
        </button>

        <nav className="space-y-2.5 flex-1">
          <SidebarItem
            icon={Grid}
            label={t("rankingSidebar.members")}
            id="member"
            currentView={highlightedView ?? "ranking"}
            onSetView={onSetView}
          />
          {showMatchForm ? (
            <SidebarItem
              icon={PlusCircle}
              label={t("rankingSidebar.addMatch")}
              id="match-form"
              currentView={highlightedView ?? "ranking"}
              onSetView={onSetView}
            />
          ) : null}
          <SidebarItem
            icon={Award}
            label={t("rankingSidebar.ranking")}
            id="ranking"
            currentView={highlightedView ?? "member"}
            onSetView={onSetView}
          />
        </nav>

        {isAdmin ? (
          <div className="mb-4 space-y-2">
            <button
              type="button"
              onClick={onGoUsers}
              className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                usersActive
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Shield className="h-4 w-4" />{" "}
              {t("rankingSidebar.userManagement")}
            </button>
            {onGoAudit ? (
              <button
                type="button"
                onClick={onGoAudit}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  auditActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Activity className="h-4 w-4" /> {t("rankingSidebar.auditLogs")}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>© BadGuys Ranking 2026</p>
        </div>
      </aside>
    </>
  );
}
