import { useEffect, useMemo, useRef, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Shield, Users } from "react-feather";
import {
  Button,
  Card,
  Form,
  Input,
  Layout,
  Popconfirm,
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
import {
  createUser,
  deleteUser,
  setUserDisabled,
  subscribeUsers,
  updateUserRole,
} from "../lib/firebase";
import { hashMd5 } from "../lib/hash";
import type { UserRecord, UserRole } from "../types";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "member" as UserRole,
  });
  const [saving, setSaving] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username, "vi")),
    [users],
  );
  const adminCount = useMemo(
    () => sortedUsers.filter((user) => user.role === "admin").length,
    [sortedUsers],
  );
  const canCreateUser =
    isAdmin &&
    form.username.trim().length > 0 &&
    form.password.trim().length > 0 &&
    !saving;

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

  const userColumns: TableColumnsType<UserRecord> = [
    {
      title: t("userManagement.username"),
      dataIndex: "username",
      key: "username",
      render: (username: string) => <strong>{username}</strong>,
    },
    {
      title: t("userManagement.role"),
      dataIndex: "role",
      key: "role",
      render: (_, user) => (
        <Select
          value={user.role}
          onChange={(value) => handleUpdateRole(user, value as UserRole)}
          disabled={!isAdmin}
          options={[
            { value: "member", label: t("userManagement.memberOption") },
            { value: "admin", label: t("userManagement.adminOption") },
          ]}
          style={{ width: 140 }}
        />
      ),
    },
    {
      title: t("userManagement.createdAt"),
      key: "createdAt",
      width: 170,
      render: (_, user) => formatLocalDateTime(user.createdAt),
    },
    {
      title: t("userManagement.lastLoginAt"),
      key: "lastLoginAt",
      width: 170,
      render: (_, user) => formatLocalDateTime(user.lastLoginAt),
    },
    {
      title: t("userManagement.actions"),
      key: "actions",
      align: "right",
      render: (_, user) => (
        <div className="inline-flex items-center gap-2">
          <Popconfirm
            title={t("common.confirmDelete")}
            onConfirm={() => handleToggleLockUser(user)}
            okText={t("common.save")}
            cancelText={t("common.cancel")}
            disabled={!isAdmin || user.id === currentUser?.userId}
          >
            <Button
              size="small"
              disabled={!isAdmin || user.id === currentUser?.userId}
            >
              {user.isDisabled
                ? t("userManagement.unlock")
                : t("userManagement.lock")}
            </Button>
          </Popconfirm>

          <Popconfirm
            title={t("common.confirmDelete")}
            onConfirm={() => handleDeleteUser(user)}
            okText={t("common.save")}
            cancelText={t("common.cancel")}
            disabled={!isAdmin || user.id === currentUser?.userId}
          >
            <Button
              danger
              size="small"
              disabled={!isAdmin || user.id === currentUser?.userId}
            >
              {t("userManagement.delete")}
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  useEffect(() => {
    setLoading(true);
    setError("");

    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeUsers(
        (nextUsers) => {
          setUsers(nextUsers);
          setLoading(false);
        },
        (loadError) => {
          setError(
            loadError instanceof Error
              ? loadError.message
              : t("userManagement.loadUsersFailed"),
          );
          setLoading(false);
        },
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : t("userManagement.loadUsersFailed"),
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

  const handleSetDashboardView = (view: RankingView) => {
    navigate(`/dashboard/${view}`);
  };

  async function handleCreateUser() {
    if (!isAdmin) return;

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setError(t("userManagement.enterUsernamePassword"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createUser({
        username,
        passwordHash: hashMd5(password),
        role: form.role,
      });
      setForm({ username: "", password: "", role: "member" });
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("userManagement.createUserFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    if (!isAdmin) return;
    if (user.id === currentUser?.userId) {
      setError(t("userManagement.cannotDeleteSelf"));
      return;
    }

    try {
      await deleteUser(user.id);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("userManagement.deleteUserFailed"),
      );
    }
  }

  async function handleUpdateRole(user: UserRecord, nextRole: UserRole) {
    if (!isAdmin) return;

    try {
      await updateUserRole(user.id, nextRole);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : t("userManagement.updateRoleFailed"),
      );
    }
  }

  async function handleToggleLockUser(user: UserRecord) {
    if (!isAdmin) return;
    if (user.id === currentUser?.userId) {
      setError(t("userManagement.cannotLockSelf"));
      return;
    }

    try {
      await setUserDisabled(user.id, !user.isDisabled);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : t("userManagement.updateLockFailed"),
      );
    }
  }

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
                aria-label={t("userManagement.menu")}
              />
            ) : null}
          </div>
          <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("userManagement.title")}
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
          usersActive={true}
          auditActive={false}
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
            <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6 md:py-5">
              <h1 className="text-xl md:text-3xl font-bold text-slate-900 inline-flex items-center gap-3">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                {t("userManagement.title")}
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-slate-500">
                {t("userManagement.subtitle")}
              </p>
            </header>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-3 md:max-w-3xl">
              <Card>
                <Statistic
                  title={t("userManagement.totalUsers")}
                  value={sortedUsers.length}
                />
              </Card>
              <Card>
                <Statistic
                  title={t("userManagement.admin")}
                  value={adminCount}
                />
              </Card>
              <Card>
                <Statistic
                  title={t("userManagement.member")}
                  value={Math.max(0, sortedUsers.length - adminCount)}
                />
              </Card>
            </section>

            <Card title={t("userManagement.createTitle")}>
              <Form
                layout="vertical"
                requiredMark={false}
                onFinish={handleCreateUser}
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <Form.Item
                    label={t("userManagement.username")}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      value={form.username}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          username: event.target.value,
                        }))
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label={t("userManagement.password")}
                    style={{ marginBottom: 0 }}
                  >
                    <Input.Password
                      value={form.password}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                    />
                  </Form.Item>

                  <Form.Item
                    label={t("userManagement.role")}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      value={form.role}
                      onChange={(value) =>
                        setForm((prev) => ({
                          ...prev,
                          role: value === "admin" ? "admin" : "member",
                        }))
                      }
                      options={[
                        {
                          value: "member",
                          label: t("userManagement.memberOption"),
                        },
                        {
                          value: "admin",
                          label: t("userManagement.adminOption"),
                        },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label=" " style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={saving}
                      disabled={!canCreateUser}
                      block
                    >
                      {saving
                        ? t("userManagement.creating")
                        : t("userManagement.createButton")}
                    </Button>
                  </Form.Item>
                </div>
              </Form>
              <p className="mt-2 text-xs text-slate-500">
                {t("userManagement.passwordStoredMd5")}
              </p>
            </Card>

            <Card
              title={
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4" /> {t("userManagement.usersList")}
                </span>
              }
            >
              {error ? (
                <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {loading ? (
                <div className="py-8 text-center">
                  <Spin tip={t("userManagement.loadingUsers")} />
                </div>
              ) : (
                <Table
                  rowKey="id"
                  columns={userColumns}
                  dataSource={sortedUsers}
                  scroll={{ x: 900 }}
                  pagination={{ pageSize: 20 }}
                />
              )}
            </Card>
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
