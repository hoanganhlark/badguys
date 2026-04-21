import { useState } from "react";
import { Layers } from "react-feather";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Table,
  Typography,
  type TableColumnsType,
} from "antd";
import { useTranslation } from "react-i18next";
import { useRankingCategories } from "../hooks/queries";
import type { RankingCategory } from "../types";
import { useAuth } from "../context/AuthContext";
import DashboardPageLayout from "./dashboard/DashboardPageLayout";
import { DashboardPageProvider } from "./dashboard/DashboardPageContext";
import DashboardSectionHeader from "./dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "./dashboard/DashboardSummaryCards";

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
  const { t } = useTranslation();
  const { currentUser } = useAuth();

  const {
    categories,
    isLoading,
    error,
    createCategoryAsync,
    updateCategoryAsync,
    deleteCategoryAsync,
    isCreating,
    isUpdating,
  } = useRankingCategories();

  const [newDisplayName, setNewDisplayName] = useState("");
  const [newOrder, setNewOrder] = useState<number>(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState("");
  const [editingOrder, setEditingOrder] = useState<number>(1);
  const [localError, setLocalError] = useState("");

  const isAdmin = currentUser?.role === "admin";

  async function handleCreateCategory() {
    const displayName = newDisplayName.trim();
    if (!isAdmin || !displayName) return;

    setLocalError("");

    try {
      await createCategoryAsync({
        name: buildCategoryName(displayName),
        displayName,
        order: Number.isFinite(newOrder) ? Number(newOrder) : 0,
      });
      setNewDisplayName("");
      setNewOrder(1);
    } catch (createError) {
      setLocalError(
        createError instanceof Error
          ? createError.message
          : t("categoryPage.createFailed"),
      );
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

    setLocalError("");

    try {
      await updateCategoryAsync({
        id: editingId,
        patch: {
          displayName,
          order: Number.isFinite(editingOrder) ? Number(editingOrder) : 0,
        },
      });
      cancelEdit();
    } catch (updateError) {
      setLocalError(
        updateError instanceof Error
          ? updateError.message
          : t("categoryPage.createFailed"),
      );
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!isAdmin) return;

    setLocalError("");

    try {
      await deleteCategoryAsync(id);
      if (editingId === id) {
        cancelEdit();
      }
    } catch (deleteError) {
      setLocalError(
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
          <div
            className="inline-flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              type="primary"
              size="small"
              onClick={handleSaveEdit}
              loading={isUpdating}
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
    <DashboardPageProvider
      value={{
        pageTitle: t("categoryPage.title"),
        menuAriaLabel: t("categoryPage.menu"),
        categoriesActive: true,
        showCategoriesLink: true,
      }}
    >
      <DashboardPageLayout>
        <div className="mx-auto max-w-7xl space-y-5 md:space-y-6">
          <DashboardSectionHeader
            icon={<Layers className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />}
            title={t("categoryPage.title")}
            subtitle={t("categoryPage.subtitle")}
          />

          <DashboardSummaryCards
            items={[
              {
                key: "total-categories",
                label: t("categoryPage.title"),
                value: categories.length,
              },
            ]}
            className="grid-cols-1 md:max-w-xs"
            loading={isLoading}
          />

          <Card title={t("categoryPage.createTitle")}>
            <Form
              layout="vertical"
              requiredMark={false}
              onFinish={handleCreateCategory}
            >
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

                <Form.Item
                  label={t("categoryPage.order")}
                  style={{ marginBottom: 0 }}
                >
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
                    loading={isCreating}
                    disabled={!isAdmin || !newDisplayName.trim()}
                    block
                  >
                    {isCreating
                      ? t("categoryPage.creating")
                      : t("categoryPage.createButton")}
                  </Button>
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Card title={t("categoryPage.title")}>
            {error || localError ? (
              <Alert
                className="mb-3"
                message={
                  error?.message || localError || t("categoryPage.loadFailed")
                }
                type="error"
                showIcon
              />
            ) : null}

            <Table
              rowKey="id"
              columns={columns}
              dataSource={categories}
              loading={isLoading}
              locale={{ emptyText: t("categoryPage.noCategories") }}
              scroll={{ x: 720 }}
              onRow={(record) => ({
                onClick: () => startEdit(record),
                style: { cursor: isAdmin ? "pointer" : "default" },
              })}
              pagination={false}
            />
          </Card>
        </div>
      </DashboardPageLayout>
    </DashboardPageProvider>
  );
}
