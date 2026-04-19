import { useEffect, useMemo, useRef, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Activity } from "react-feather";
import {
  Alert,
  Button,
  Card,
  Layout,
  Select,
  Spin,
  Statistic,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { subscribeAuditEvents } from "../lib/firebase";
import type { AuditEventRecord } from "../types";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

type AuditFilterType = "all" | "event" | "route_change";

type StoredAuditFilters = {
  selectedUser: string;
  selectedType: AuditFilterType;
};

const AUDIT_FILTERS_STORAGE_KEY = "auditFilters";

function normalizeAuditFilterType(value: unknown): AuditFilterType {
  if (value === "event" || value === "route_change" || value === "all") {
    return value;
  }
  return "all";
}

function getAuditFilterStorageKey(scopeKey?: string): string {
  const normalizedScope = String(scopeKey || "").trim() || "guest";
  return `${AUDIT_FILTERS_STORAGE_KEY}:${normalizedScope}`;
}

function loadStoredAuditFilters(scopeKey?: string): StoredAuditFilters {
  try {
    const key = getAuditFilterStorageKey(scopeKey);
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { selectedUser: "all", selectedType: "all" };
    }

    const parsed = JSON.parse(raw) as Partial<StoredAuditFilters>;
    const selectedUser = String(parsed.selectedUser || "").trim() || "all";
    const selectedType = normalizeAuditFilterType(parsed.selectedType);

    return { selectedUser, selectedType };
  } catch {
    return { selectedUser: "all", selectedType: "all" };
  }
}

export default function AuditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const auditFilterScopeKey = currentUser?.userId || "guest";
  const [events, setEvents] = useState<AuditEventRecord[]>([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedType, setSelectedType] = useState<AuditFilterType>("all");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
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

  const userFilterOptions = useMemo(() => {
    const usernames = events
      .map((item) => String(item.userProperties?.username || "guest").trim())
      .filter(Boolean);
    return Array.from(new Set(usernames)).sort((a, b) =>
      a.localeCompare(b, "vi"),
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const username = String(item.userProperties?.username || "guest").trim();
      const eventType =
        item.eventType === "route_change"
          ? "route_change"
          : item.eventType === "event"
            ? "event"
            : item.eventName === "route_change"
              ? "route_change"
              : "event";

      const userMatches = selectedUser === "all" || username === selectedUser;
      const typeMatches = selectedType === "all" || eventType === selectedType;
      return userMatches && typeMatches;
    });
  }, [events, selectedType, selectedUser]);

  const getEventTypeLabel = (event: AuditEventRecord): string => {
    const eventType =
      event.eventType === "route_change"
        ? "route_change"
        : event.eventType === "event"
          ? "event"
          : event.eventName === "route_change"
            ? "route_change"
            : "event";

    return eventType === "route_change"
      ? t("auditPage.typeRouteChange")
      : t("auditPage.typeEvent");
  };

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

  const columns: TableColumnsType<AuditEventRecord> = [
    {
      title: t("auditPage.time"),
      key: "time",
      width: 170,
      render: (_, record) => formatLocalDateTime(record.createdAt),
    },
    {
      title: t("auditPage.type"),
      key: "type",
      width: 140,
      render: (_, record) => getEventTypeLabel(record),
    },
    {
      title: t("auditPage.event"),
      dataIndex: "eventName",
      key: "eventName",
      width: 180,
    },
    {
      title: t("auditPage.user"),
      key: "username",
      width: 130,
      render: (_, record) => String(record.userProperties?.username || "guest"),
    },
    {
      title: t("auditPage.role"),
      key: "role",
      width: 130,
      render: (_, record) => String(record.userProperties?.role || "guest"),
    },
    {
      title: t("auditPage.path"),
      dataIndex: "pagePath",
      key: "pagePath",
      width: 220,
      render: (value?: string) => value || "-",
    },
    {
      title: t("auditPage.params"),
      key: "params",
      render: (_, record) => formatAuditPayload(record.params),
    },
  ];

  useEffect(() => {
    setFiltersHydrated(false);
    const stored = loadStoredAuditFilters(auditFilterScopeKey);
    setSelectedUser(stored.selectedUser);
    setSelectedType(stored.selectedType);
    setFiltersHydrated(true);
  }, [auditFilterScopeKey]);

  useEffect(() => {
    if (!filtersHydrated) return;

    const key = getAuditFilterStorageKey(auditFilterScopeKey);
    localStorage.setItem(
      key,
      JSON.stringify({
        selectedUser,
        selectedType,
      } satisfies StoredAuditFilters),
    );
  }, [auditFilterScopeKey, filtersHydrated, selectedType, selectedUser]);

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
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 55,
          height: 56,
          lineHeight: "56px",
          padding: "0 16px",
          borderBottom: "1px solid #e2e8f0",
          background: "rgba(250, 250, 250, 0.92)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className="flex h-14 items-center justify-between">
          <div>
            {!mobileSidebarOpen ? (
              <Button
                type="default"
                shape="circle"
                icon={<MenuOutlined />}
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden"
                aria-label={t("auditPage.menu")}
              />
            ) : null}
          </div>
          <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("auditPage.title")}
          </Typography.Text>
        </div>
      </Layout.Header>

      <Layout
        className="flex min-h-0 flex-col md:flex-row"
        style={{ background: "transparent" }}
      >
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

        <Layout.Content
          ref={mainContentRef}
          className="dashboard-main-scroll flex-1 overflow-auto px-4 py-4 md:p-8"
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

            <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:max-w-3xl">
              <Card>
                <Statistic
                  title={t("auditPage.totalEvents")}
                  value={events.length}
                />
              </Card>
              <Card>
                <Statistic
                  title={t("auditPage.uniqueEvents")}
                  value={uniqueEventsCount}
                />
              </Card>
              <Card>
                <Statistic
                  title={t("auditPage.uniqueUsers")}
                  value={uniqueUsersCount}
                />
              </Card>
            </section>

            <Card>
              {error ? (
                <Alert
                  type="error"
                  message={error}
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              ) : null}

              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select
                  value={selectedUser}
                  onChange={(value) => setSelectedUser(value)}
                  options={[
                    { value: "all", label: t("auditPage.filterAllUsers") },
                    ...userFilterOptions.map((username) => ({
                      value: username,
                      label: username,
                    })),
                  ]}
                  placeholder={t("auditPage.filterByUser")}
                />

                <Select
                  value={selectedType}
                  onChange={(value) =>
                    setSelectedType(value as AuditFilterType)
                  }
                  options={[
                    { value: "all", label: t("auditPage.filterAllTypes") },
                    { value: "event", label: t("auditPage.typeEvent") },
                    {
                      value: "route_change",
                      label: t("auditPage.typeRouteChange"),
                    },
                  ]}
                  placeholder={t("auditPage.filterByType")}
                />
              </div>

              {loading ? (
                <div className="py-8 text-center">
                  <Spin tip={t("auditPage.loadingAudit")} />
                </div>
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={filteredEvents}
                  scroll={{ x: 980 }}
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: t("auditPage.noLogs") }}
                />
              )}
            </Card>
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
