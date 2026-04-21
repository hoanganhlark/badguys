import { useEffect, useMemo, useRef, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Activity } from "react-feather";
import {
  Alert,
  Button,
  Card,
  Layout,
  Select,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAuditEvents } from "../hooks/queries";
import type { AuditEventRecord } from "../types";
import DashboardSectionHeader from "./dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "./dashboard/DashboardSummaryCards";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

type AuditFilterType = "all" | "event" | "route_change";

type StoredAuditFilters = {
  selectedUser: string;
  selectedType: AuditFilterType;
};

const DASHBOARD_APPBAR_STYLE = {
  position: "sticky" as const,
  top: 0,
  zIndex: 55,
  height: 56,
  lineHeight: "56px",
  padding: "0 16px",
  borderBottom: "1px solid #e2e8f0",
  background: "rgba(250, 250, 250, 0.92)",
  backdropFilter: "blur(8px)",
  boxShadow: "0 2px 12px rgba(15, 23, 42, 0.08)",
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

function getEventTypeKey(event: AuditEventRecord): AuditFilterType {
  if (event.eventType === "route_change") return "route_change";
  if (event.eventType === "event") return "event";
  if (event.eventName === "route_change") return "route_change";
  return "event";
}

export default function AuditPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const { events, isLoading, error } = useAuditEvents(300);

  const auditFilterScopeKey = currentUser?.userId || "guest";
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedType, setSelectedType] = useState<AuditFilterType>("all");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
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

  const eventNameFilters = useMemo(
    () =>
      Array.from(new Set(events.map((item) => item.eventName)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((eventName) => ({
          text: eventName,
          value: eventName,
        })),
    [events],
  );

  const tableUserFilters = useMemo(
    () =>
      userFilterOptions.map((username) => ({
        text: username,
        value: username,
      })),
    [userFilterOptions],
  );

  const roleFilters = useMemo(
    () =>
      Array.from(
        new Set(
          events.map((item) =>
            String(item.userProperties?.role || "guest").trim(),
          ),
        ),
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "vi"))
        .map((role) => ({
          text: role,
          value: role,
        })),
    [events],
  );

  const getDateSortValue = (value?: string): number => {
    if (!value) return 0;
    const date = new Date(value);
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  };

  const filteredEvents = useMemo(() => {
    return events.filter((item) => {
      const username = String(item.userProperties?.username || "guest").trim();
      const eventType = getEventTypeKey(item);

      const userMatches = selectedUser === "all" || username === selectedUser;
      const typeMatches = selectedType === "all" || eventType === selectedType;
      return userMatches && typeMatches;
    });
  }, [events, selectedType, selectedUser]);

  const getEventTypeLabel = (event: AuditEventRecord): string => {
    const eventType = getEventTypeKey(event);

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
      sorter: (a, b) =>
        getDateSortValue(a.createdAt) - getDateSortValue(b.createdAt),
      render: (_, record) => formatLocalDateTime(record.createdAt),
    },
    {
      title: t("auditPage.type"),
      key: "type",
      width: 140,
      filters: [
        { text: t("auditPage.typeEvent"), value: "event" },
        { text: t("auditPage.typeRouteChange"), value: "route_change" },
      ],
      onFilter: (value, record) => getEventTypeKey(record) === value,
      sorter: (a, b) => getEventTypeKey(a).localeCompare(getEventTypeKey(b)),
      render: (_, record) => getEventTypeLabel(record),
    },
    {
      title: t("auditPage.event"),
      dataIndex: "eventName",
      key: "eventName",
      width: 180,
      filters: eventNameFilters,
      filterSearch: true,
      onFilter: (value, record) => record.eventName === value,
      sorter: (a, b) => a.eventName.localeCompare(b.eventName, "vi"),
    },
    {
      title: t("auditPage.user"),
      key: "username",
      width: 130,
      filters: tableUserFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        String(record.userProperties?.username || "guest").trim() === value,
      sorter: (a, b) =>
        String(a.userProperties?.username || "guest")
          .trim()
          .localeCompare(
            String(b.userProperties?.username || "guest").trim(),
            "vi",
          ),
      render: (_, record) => String(record.userProperties?.username || "guest"),
    },
    {
      title: t("auditPage.role"),
      key: "role",
      width: 130,
      filters: roleFilters,
      filterSearch: true,
      onFilter: (value, record) =>
        String(record.userProperties?.role || "guest").trim() === value,
      sorter: (a, b) =>
        String(a.userProperties?.role || "guest")
          .trim()
          .localeCompare(
            String(b.userProperties?.role || "guest").trim(),
            "vi",
          ),
      render: (_, record) => String(record.userProperties?.role || "guest"),
    },
    {
      title: t("auditPage.path"),
      dataIndex: "pagePath",
      key: "pagePath",
      width: 220,
      sorter: (a, b) =>
        String(a.pagePath || "").localeCompare(String(b.pagePath || ""), "vi"),
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

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const updateKeyboardInset = () => {
      const keyboardInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        `${keyboardInset}px`,
      );
    };

    viewport.addEventListener("resize", updateKeyboardInset);
    viewport.addEventListener("scroll", updateKeyboardInset);
    updateKeyboardInset();

    return () => {
      viewport.removeEventListener("resize", updateKeyboardInset);
      viewport.removeEventListener("scroll", updateKeyboardInset);
      document.documentElement.style.setProperty(
        "--mobile-keyboard-inset",
        "0px",
      );
    };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: "transparent" }}>
      <Layout.Header style={DASHBOARD_APPBAR_STYLE}>
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
          className="flex-1 overflow-auto px-4 py-4 md:p-8"
          style={{
            paddingBottom: "calc(6rem + var(--mobile-keyboard-inset, 0px))",
          }}
        >
          <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
            <DashboardSectionHeader
              icon={<Activity className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />}
              title={t("auditPage.title")}
              subtitle={t("auditPage.subtitle")}
            />

            <DashboardSummaryCards
              items={[
                {
                  key: "total-events",
                  label: t("auditPage.totalEvents"),
                  value: events.length,
                },
                {
                  key: "unique-events",
                  label: t("auditPage.uniqueEvents"),
                  value: uniqueEventsCount,
                },
                {
                  key: "unique-users",
                  label: t("auditPage.uniqueUsers"),
                  value: uniqueUsersCount,
                },
              ]}
            />

            <Card>
              {error?.message ? (
                <Alert
                  type="error"
                  message={error.message}
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

              <Table
                rowKey="id"
                columns={columns}
                dataSource={filteredEvents}
                loading={isLoading}
                scroll={{ x: 980 }}
                pagination={{
                  defaultPageSize: 10,
                  pageSizeOptions: ["5", "10", "20", "50"],
                  showSizeChanger: true,
                  showQuickJumper: true,
                  hideOnSinglePage: false,
                  position: ["bottomCenter"],
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} / ${total}`,
                }}
                locale={{ emptyText: t("auditPage.noLogs") }}
              />
            </Card>
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
