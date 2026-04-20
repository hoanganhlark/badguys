import { useEffect, useRef, useState } from "react";
import { MenuOutlined } from "@ant-design/icons";
import { Layers } from "react-feather";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Layout,
  Popconfirm,
  Spin,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  createRankingCategory,
  deleteRankingCategory,
  subscribeRankingCategories,
  updateRankingCategory,
} from "../lib/firebase";
import type { RankingCategory } from "../types";
import { useAuth } from "../context/AuthContext";
import RankingSidebar from "./ranking/RankingSidebar";
import type { RankingView } from "./ranking/types";

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

function buildCategoryName(displayName: string): string {
  const slug = displayName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `category-${Date.now()}`;
}

export default function CategoryManagementPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const [categories, setCategories] = useState<RankingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newOrder, setNewOrder] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState("");
  const [editingOrder, setEditingOrder] = useState<number>(1);
  const [updating, setUpdating] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe = subscribeRankingCategories(
      (nextCategories) => {
        setCategories(nextCategories);
        setLoading(false);
      },
      (loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t("categoryPage.loadFailed"),
        );
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [t]);

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

  async function handleCreateCategory() {
    const displayName = newDisplayName.trim();
    if (!isAdmin || !displayName) return;

    setSaving(true);
    setError("");

    try {
      await createRankingCategory({
        name: buildCategoryName(displayName),
        displayName,
        order: Number.isFinite(newOrder) ? Number(newOrder) : 0,
      });
      setNewDisplayName("");
      setNewOrder(1);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : t("categoryPage.createFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  function startEdit(category: RankingCategory) {
    if (!isAdmin) return;
    setEditingId(category.id);
    setEditingDisplayName(category.displayName);
    setEditingOrder(category.order);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingDisplayName("");
    setEditingOrder(1);
  }

  async function handleSaveEdit() {
    if (!isAdmin || !editingId) return;

    const displayName = editingDisplayName.trim();
    if (!displayName) return;

    setUpdating(true);
    setError("");

    try {
      await updateRankingCategory(editingId, {
        displayName,
        order: Number.isFinite(editingOrder) ? Number(editingOrder) : 0,
      });
      cancelEdit();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : t("categoryPage.createFailed"),
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!isAdmin) return;

    setError("");

    try {
      await deleteRankingCategory(id);
      if (editingId === id) {
        cancelEdit();
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : t("categoryPage.deleteFailed"),
      );
    }
  }

  const columns: TableColumnsType<RankingCategory> = [
    {
      title: t("categoryPage.name"),
      dataIndex: "name",
      key: "name",
      render: (name: string) => <Typography.Text code>{name}</Typography.Text>,
    },
    {
      title: t("categoryPage.displayName"),
      dataIndex: "displayName",
      key: "displayName",
      sorter: (a, b) => a.displayName.localeCompare(b.displayName, "vi"),
      render: (_, category) =>
        editingId === category.id ? (
          <Input
            value={editingDisplayName}
            onChange={(event) => setEditingDisplayName(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <Typography.Text>{category.displayName}</Typography.Text>
        ),
    },
    {
      title: t("categoryPage.order"),
      dataIndex: "order",
      key: "order",
      width: 130,
      align: "right",
      sorter: (a, b) => a.order - b.order,
      render: (_, category) =>
        editingId === category.id ? (
          <InputNumber
            value={editingOrder}
            onChange={(value) => setEditingOrder(Number(value ?? 0))}
            onClick={(event) => event.stopPropagation()}
            style={{ width: "100%" }}
          />
        ) : (
          category.order
        ),
    },
    {
      title: t("userManagement.actions"),
      key: "actions",
      align: "right",
      width: 170,
      render: (_, category) =>
        editingId === category.id ? (
          <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              type="primary"
              size="small"
              onClick={handleSaveEdit}
              loading={updating}
            >
              {t("common.save")}
            </Button>
            <Button size="small" onClick={cancelEdit}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Popconfirm
            title={t("common.confirmDelete")}
            onConfirm={() => handleDeleteCategory(category.id)}
            okText={t("common.save")}
            cancelText={t("common.cancel")}
            disabled={!isAdmin}
          >
            <Button
              danger
              size="small"
              disabled={!isAdmin}
              onClick={(event) => event.stopPropagation()}
            >
              {t("categoryPage.delete")}
            </Button>
          </Popconfirm>
        ),
    },
  ];

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
                aria-label={t("categoryPage.menu")}
              />
            ) : null}
          </div>
          <Typography.Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t("categoryPage.title")}
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
          onGoCategories={() => navigate("/dashboard/categories")}
          showMatchForm={true}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          usersActive={false}
          auditActive={false}
          categoriesActive={true}
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
                <Layers className="h-6 w-6 md:h-8 md:w-8 text-sky-600" />
                {t("categoryPage.title")}
              </h1>
              <p className="mt-1.5 text-xs md:text-sm text-slate-500">
                {t("categoryPage.subtitle")}
              </p>
            </header>

            <Card title={t("categoryPage.createTitle")}>
              <Form layout="vertical" requiredMark={false} onFinish={handleCreateCategory}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Form.Item
                    label={t("categoryPage.displayName")}
                    style={{ marginBottom: 0 }}
                  >
                    <Input
                      value={newDisplayName}
                      onChange={(event) => setNewDisplayName(event.target.value)}
                    />
                  </Form.Item>

                  <Form.Item label={t("categoryPage.order")} style={{ marginBottom: 0 }}>
                    <InputNumber
                      value={newOrder}
                      onChange={(value) => setNewOrder(Number(value ?? 0))}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>

                  <Form.Item label=" " style={{ marginBottom: 0 }}>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={saving}
                      disabled={!isAdmin || !newDisplayName.trim()}
                      block
                    >
                      {saving
                        ? t("categoryPage.creating")
                        : t("categoryPage.createButton")}
                    </Button>
                  </Form.Item>
                </div>
              </Form>
            </Card>

            <Card title={t("categoryPage.title")}>
              {error ? (
                <Alert
                  className="mb-3"
                  message={error || t("categoryPage.loadFailed")}
                  type="error"
                  showIcon
                />
              ) : null}

              {loading ? (
                <div className="py-8 text-center">
                  <Spin />
                </div>
              ) : (
                <Table
                  rowKey="id"
                  columns={columns}
                  dataSource={categories}
                  locale={{ emptyText: t("categoryPage.noCategories") }}
                  scroll={{ x: 720 }}
                  onRow={(record) => ({
                    onClick: () => startEdit(record),
                    style: { cursor: isAdmin ? "pointer" : "default" },
                  })}
                  pagination={false}
                />
              )}
            </Card>
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
}


