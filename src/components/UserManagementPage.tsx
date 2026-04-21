import { useMemo, useState } from "react";
import { Shield, Users } from "react-feather";
import {
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Table,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/queries";
import { hashPassword } from "../lib/api";
import type { UserRecord, UserRole } from "../types";
import DashboardPageLayout from "./dashboard/DashboardPageLayout";
import { DashboardPageProvider } from "./dashboard/DashboardPageContext";
import DashboardSectionHeader from "./dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "./dashboard/DashboardSummaryCards";

export default function UserManagementPage() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const {
    users,
    isLoading,
    error,
    createUserAsync,
    deleteUserAsync,
    updateRoleAsync,
    toggleDisabledAsync,
    isCreating,
  } = useUsers();

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "member" as UserRole,
  });
  const [localError, setLocalError] = useState("");

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
    !isCreating;

  const usernameFilters = useMemo(
    () =>
      sortedUsers.map((user) => ({
        text: user.username,
        value: user.username,
      })),
    [sortedUsers],
  );

  const getDateSortValue = (value?: string): number => {
    if (!value) return 0;
    const date = new Date(value);
    const timestamp = date.getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
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

  const userColumns: TableColumnsType<UserRecord> = [
    {
      title: t("userManagement.username"),
      dataIndex: "username",
      key: "username",
      sorter: (a, b) => a.username.localeCompare(b.username, "vi"),
      filters: usernameFilters,
      filterSearch: true,
      onFilter: (value, record) => record.username === value,
      render: (username: string) => <strong>{username}</strong>,
    },
    {
      title: t("userManagement.role"),
      dataIndex: "role",
      key: "role",
      filters: [
        { text: t("userManagement.memberOption"), value: "member" },
        { text: t("userManagement.adminOption"), value: "admin" },
      ],
      onFilter: (value, record) => record.role === value,
      sorter: (a, b) => a.role.localeCompare(b.role, "vi"),
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
      sorter: (a, b) =>
        getDateSortValue(a.createdAt) - getDateSortValue(b.createdAt),
      render: (_, user) => formatLocalDateTime(user.createdAt),
    },
    {
      title: t("userManagement.lastLoginAt"),
      key: "lastLoginAt",
      width: 170,
      sorter: (a, b) =>
        getDateSortValue(a.lastLoginAt) - getDateSortValue(b.lastLoginAt),
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

  async function handleCreateUser() {
    if (!isAdmin) return;

    const username = form.username.trim();
    const password = form.password;

    if (!username || !password) {
      setLocalError(t("userManagement.enterUsernamePassword"));
      return;
    }

    setLocalError("");

    try {
      const passwordHash = await hashPassword(password);
      await createUserAsync({
        username,
        passwordHash,
        role: form.role,
      });
      setForm({ username: "", password: "", role: "member" });
    } catch (createError) {
      setLocalError(
        createError instanceof Error
          ? createError.message
          : t("userManagement.createUserFailed"),
      );
    }
  }

  async function handleDeleteUser(user: UserRecord) {
    if (!isAdmin) return;
    if (user.id === currentUser?.userId) {
      setLocalError(t("userManagement.cannotDeleteSelf"));
      return;
    }

    try {
      await deleteUserAsync(user.id);
    } catch (deleteError) {
      setLocalError(
        deleteError instanceof Error
          ? deleteError.message
          : t("userManagement.deleteUserFailed"),
      );
    }
  }

  async function handleUpdateRole(user: UserRecord, nextRole: UserRole) {
    if (!isAdmin) return;

    try {
      await updateRoleAsync({ userId: user.id, role: nextRole });
    } catch (updateError) {
      setLocalError(
        updateError instanceof Error
          ? updateError.message
          : t("userManagement.updateRoleFailed"),
      );
    }
  }

  async function handleToggleLockUser(user: UserRecord) {
    if (!isAdmin) return;
    if (user.id === currentUser?.userId) {
      setLocalError(t("userManagement.cannotLockSelf"));
      return;
    }

    try {
      await toggleDisabledAsync({
        userId: user.id,
        disabled: !user.isDisabled,
      });
    } catch (updateError) {
      setLocalError(
        updateError instanceof Error
          ? updateError.message
          : t("userManagement.updateLockFailed"),
      );
    }
  }

  return (
    <DashboardPageProvider
      value={{
        pageTitle: t("userManagement.title"),
        menuAriaLabel: t("userManagement.menu"),
        usersActive: true,
      }}
    >
      <DashboardPageLayout>
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <DashboardSectionHeader
            icon={<Shield className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />}
            title={t("userManagement.title")}
            subtitle={t("userManagement.subtitle")}
          />

          <DashboardSummaryCards
            items={[
              {
                key: "total-users",
                label: t("userManagement.totalUsers"),
                value: sortedUsers.length,
              },
              {
                key: "admin-count",
                label: t("userManagement.admin"),
                value: adminCount,
              },
              {
                key: "member-count",
                label: t("userManagement.member"),
                value: Math.max(0, sortedUsers.length - adminCount),
              },
            ]}
          />

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
                    loading={isCreating}
                    disabled={!canCreateUser}
                    block
                  >
                    {isCreating
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
            {error?.message || localError ? (
              <p className="mb-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error?.message || localError}
              </p>
            ) : null}

            <Table
              rowKey="id"
              columns={userColumns}
              dataSource={sortedUsers}
              loading={isLoading}
              scroll={{ x: 900 }}
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
            />
          </Card>
        </div>
      </DashboardPageLayout>
    </DashboardPageProvider>
  );
}
