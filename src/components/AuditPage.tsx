import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Menu } from "react-feather";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeAuditEvents } from "../lib/firebase";
import type { AuditEventRecord } from "../types";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

export default function AuditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const handleSetDashboardView = (view: RankingView) => {
    navigate(`/dashboard/${view}`);
  };

  const uniqueEventsCount = useMemo(() => {
    return new Set(events.map((item) => item.eventName)).size;
  }, [events]);

  const uniqueUsersCount = useMemo(() => {
    const usernames = events
      .map((item) => String(item.userProperties?.username || "").trim())
      .filter(Boolean);
    return new Set(usernames).size;
  }, [events]);

  const formatLocalDateTime = (value?: string): string => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const formatAuditPayload = (
    value?: Record<string, string | number | boolean | null>,
  ): string => {
    if (!value) return "-";
    const entries = Object.entries(value);
    if (entries.length === 0) return "-";
    return JSON.stringify(value);
  };

  useEffect(() => {
    setLoading(true);
    setError("");

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeAuditEvents(
        (nextEvents) => {
          setEvents(nextEvents);
          setLoading(false);
        },
        (loadError) => {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("auditPage.loadAuditFailed"),
          );
          setLoading(false);
        },
        300,
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("auditPage.loadAuditFailed"),
      );
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    const container = mainContentRef.current;
    if (!container) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        !(
          target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement
        )
      ) {
        return;
      }

      window.setTimeout(() => {
        target.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      }, 220);
    };

    container.addEventListener("focusin", handleFocusIn);
    return () => container.removeEventListener("focusin", handleFocusIn);
  }, []);

  return (
    <div className="min-h-screen dashboard-surface text-slate-900 font-sans">
      <header
        className={`app-topbar dashboard-topbar z-[55] ${
          mobileSidebarOpen
            ? "opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto"
            : ""
        }`}
      >
        <div className="flex h-14 items-center justify-between px-4 md:px-6">
          <div>
            {!mobileSidebarOpen ? (
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm inline-flex items-center justify-center hover:bg-slate-50"
                aria-label={t("auditPage.menu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("auditPage.title")}
          </span>
        </div>
      </header>

      <div className="flex min-h-screen flex-col md:flex-row">
        <RankingSidebar
          currentView="ranking"
          onSetView={handleSetDashboardView}
          onGoHome={() => navigate("/")}
          isAdmin={isAdmin}
          onGoUsers={() => navigate("/dashboard/users")}
          onGoAudit={() => navigate("/dashboard/audit")}
          showMatchForm={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          usersActive={false}
          auditActive={true}
          activeView={null}
        />

        <main
          ref={mainContentRef}
          className="dashboard-main-scroll flex-1 overflow-auto px-4 pt-20 md:p-8 md:pt-20"
        >
          <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
            <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6 md:py-5">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 inline-flex items-center gap-3">
                <Activity className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                {t("auditPage.title")}
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-slate-500">
                {t("auditPage.subtitle")}
              </p>
            </header>

            <section className="grid grid-cols-3 gap-2 md:max-w-2xl">
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">
                  {t("auditPage.totalEvents")}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {events.length}
                </p>
              </div>
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">
                  {t("auditPage.uniqueEvents")}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {uniqueEventsCount}
                </p>
              </div>
              <div className="dashboard-card px-3 py-2.5">
                <p className="text-[11px] text-slate-500">
                  {t("auditPage.uniqueUsers")}
                </p>
                <p className="text-lg font-bold text-slate-900">
                  {uniqueUsersCount}
                </p>
              </div>
            </section>

            <section className="dashboard-card p-4 md:p-5">
              {error ? (
                <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {loading ? (
                <p className="text-sm text-slate-500">
                  {t("auditPage.loadingAudit")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                        <th className="px-2 py-3">{t("auditPage.time")}</th>
                        <th className="px-2 py-3">{t("auditPage.event")}</th>
                        <th className="px-2 py-3">{t("auditPage.user")}</th>
                        <th className="px-2 py-3">{t("auditPage.role")}</th>
                        <th className="px-2 py-3">{t("auditPage.path")}</th>
                        <th className="px-2 py-3">{t("auditPage.params")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-100 align-top"
                        >
                          <td className="px-2 py-3 text-slate-600">
                            {formatLocalDateTime(item.createdAt)}
                          </td>
                          <td className="px-2 py-3 font-semibold text-slate-900">
                            {item.eventName}
                          </td>
                          <td className="px-2 py-3 text-slate-700">
                            {String(item.userProperties?.username || "guest")}
                          </td>
                          <td className="px-2 py-3 text-slate-700">
                            {String(item.userProperties?.role || "guest")}
                          </td>
                          <td className="px-2 py-3 text-slate-700 break-all">
                            {item.pagePath || "-"}
                          </td>
                          <td className="px-2 py-3 text-slate-700 break-all">
                            {formatAuditPayload(item.params)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
