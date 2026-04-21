import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from "antd";
import { memo } from "react";
import { useTranslation } from "react-i18next";
import type { Member } from "./types";
import type { RankingCategory, RankingLevel } from "../../types";
import {
  getRankingLevelDisplay,
  normalizeRankingLevel,
} from "../../lib/rankingLevel";
import DashboardTableSkeleton from "../dashboard/DashboardTableSkeleton";

interface MembersPanelProps {
  members: Member[];
  sortedCategories: RankingCategory[];
  isLoading: boolean;
  isEditing: boolean;
  formName: string;
  formLevel: RankingLevel;
  canManage: boolean;
  onDeleteMember: (id: number) => Promise<void>;
  onStartEditMember: (member: Member) => void;
  onSetFormName: (name: string) => void;
  onSetFormLevel: (level: RankingLevel) => void;
  onSubmit: () => Promise<void>;
}

function MembersPanel({
  members,
  sortedCategories,
  isLoading,
  isEditing,
  formName: name,
  formLevel: level,
  canManage,
  onDeleteMember,
  onStartEditMember: onStartEdit,
  onSetFormName: setMemberFormName,
  onSetFormLevel: setMemberFormLevel,
  onSubmit: onAddOrUpdateMember,
}: MembersPanelProps) {
  const { t } = useTranslation();

  const newMember = { name, level };

  const categoryByName = sortedCategories.reduce<
    Record<string, RankingCategory>
  >((acc, category) => {
    acc[category.name] = category;
    return acc;
  }, {});
  const categoryOrderByName = sortedCategories.reduce<Record<string, number>>(
    (acc, category, index) => {
      acc[category.name] = index;
      return acc;
    },
    {},
  );

  const categoryOptions = sortedCategories.map((category) => ({
    value: category.name,
    label: category.displayName,
  }));
  const hasCategoryOptions = categoryOptions.length > 0;

  const knownCategoryValues = new Set(
    categoryOptions.map((option) => option.value),
  );
  if (newMember.level && !knownCategoryValues.has(newMember.level)) {
    categoryOptions.push({
      value: newMember.level,
      label: getRankingLevelDisplay(newMember.level),
    });
  }

  const filterValues = Array.from(
    new Set([
      ...categoryOptions.map((option) => option.value),
      ...members.map((member) => member.level),
    ]),
  );

  const sortedMembers = [...members].sort((a, b) => {
    const levelA = String(a.level || "").trim();
    const levelB = String(b.level || "").trim();
    const orderA = Object.prototype.hasOwnProperty.call(
      categoryOrderByName,
      levelA,
    )
      ? categoryOrderByName[levelA]
      : Number.MAX_SAFE_INTEGER;
    const orderB = Object.prototype.hasOwnProperty.call(
      categoryOrderByName,
      levelB,
    )
      ? categoryOrderByName[levelB]
      : Number.MAX_SAFE_INTEGER;

    if (orderA !== orderB) return orderA - orderB;

    const labelA = categoryByName[levelA]?.displayName || levelA;
    const labelB = categoryByName[levelB]?.displayName || levelB;
    const levelDiff = labelA.localeCompare(labelB, "vi", {
      sensitivity: "base",
    });
    if (levelDiff !== 0) return levelDiff;

    return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
  });

  const baseColumns: TableColumnsType<Member> = [
    {
      title: t("membersPanel.member"),
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name, "vi"),
      render: (name: string) => (
        <Typography.Text strong>{name}</Typography.Text>
      ),
    },
    {
      title: t("membersPanel.rank"),
      key: "level",
      dataIndex: "level",
      filters: filterValues.map((level) => ({
        text:
          categoryByName[level]?.displayName || getRankingLevelDisplay(level),
        value: level,
      })),
      onFilter: (value, record) => record.level === value,
      sorter: (a, b) => {
        const levelA = String(a.level || "").trim();
        const levelB = String(b.level || "").trim();
        const orderA = Object.prototype.hasOwnProperty.call(
          categoryOrderByName,
          levelA,
        )
          ? categoryOrderByName[levelA]
          : Number.MAX_SAFE_INTEGER;
        const orderB = Object.prototype.hasOwnProperty.call(
          categoryOrderByName,
          levelB,
        )
          ? categoryOrderByName[levelB]
          : Number.MAX_SAFE_INTEGER;

        if (orderA !== orderB) return orderA - orderB;

        const labelA = categoryByName[levelA]?.displayName || levelA;
        const labelB = categoryByName[levelB]?.displayName || levelB;
        const levelDiff = labelA.localeCompare(labelB, "vi", {
          sensitivity: "base",
        });
        if (levelDiff !== 0) return levelDiff;

        return a.name.localeCompare(b.name, "vi", { sensitivity: "base" });
      },
      render: (level: RankingLevel) => (
        <Tag color={getRankingLevelColor(level, categoryOrderByName)}>
          {categoryByName[level]?.displayName || getRankingLevelDisplay(level)}
        </Tag>
      ),
    },
  ];

  const columns: TableColumnsType<Member> = canManage
    ? [
        ...baseColumns,
        {
          title: t("membersPanel.action"),
          key: "actions",
          align: "right",
          render: (_, member) => (
            <Space>
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => onStartEdit(member)}
              />
              <Popconfirm
                title={t("common.confirmDelete")}
                onConfirm={() => onDeleteMember(member.id)}
                okText={t("common.save")}
                cancelText={t("common.cancel")}
              >
                <Button type="text" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        },
      ]
    : baseColumns;

  return (
    <Space
      direction="vertical"
      size={16}
      style={{ width: "100%", maxWidth: 980 }}
    >
      {canManage ? (
        <Card
          title={
            <Space>
              {isEditing ? <EditOutlined /> : <PlusOutlined />}
              <span>
                {isEditing
                  ? t("membersPanel.updateMember")
                  : t("membersPanel.addMember")}
              </span>
            </Space>
          }
        >
          <Form
            layout="vertical"
            requiredMark={false}
            onFinish={onAddOrUpdateMember}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Form.Item
                label={t("membersPanel.member")}
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder={t("membersPanel.fullNamePlaceholder")}
                  value={newMember.name}
                  onChange={(event) => setMemberFormName(event.target.value)}
                />
              </Form.Item>

              <Form.Item
                label={t("membersPanel.rank")}
                style={{ marginBottom: 0 }}
              >
                <Select
                  options={categoryOptions}
                  placeholder={
                    hasCategoryOptions
                      ? undefined
                      : t("categoryPage.noCategories")
                  }
                  disabled={!hasCategoryOptions}
                  value={newMember.level}
                  onChange={(value: RankingLevel) =>
                    setMemberFormLevel(normalizeRankingLevel(value))
                  }
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={isEditing ? <SaveOutlined /> : <UserAddOutlined />}
                disabled={!hasCategoryOptions}
              >
                {isEditing ? t("membersPanel.save") : t("membersPanel.add")}
              </Button>

              {!hasCategoryOptions ? (
                <Alert
                  type="warning"
                  showIcon
                  message={t("categoryPage.noCategories")}
                  description={t("categoryPage.subtitle")}
                />
              ) : null}
            </Space>
          </Form>
        </Card>
      ) : null}

      <Card bodyStyle={{ padding: 0 }}>
        {isLoading ? (
          <DashboardTableSkeleton columns={3} rows={5} className="mt-1" />
        ) : (
          <Table<Member>
            rowKey="id"
            columns={columns}
            dataSource={sortedMembers}
            pagination={{
              defaultPageSize: 5,
              pageSizeOptions: ["5", "10", "20", "50"],
              showSizeChanger: true,
              showQuickJumper: true,
              hideOnSinglePage: false,
              position: ["bottomCenter"],
              showTotal: (total, range) => `${range[0]}-${range[1]} / ${total}`,
            }}
            scroll={{ x: 560 }}
          />
        )}
      </Card>
    </Space>
  );
}

export default memo(MembersPanel);

function getRankingLevelColor(
  level: RankingLevel,
  categoryOrderByName: Record<string, number>,
): string {
  if (level === "Yo") return "green";
  if (level === "Lo") return "blue";
  if (level === "Nè") return "gold";

  const palette = ["purple", "magenta", "cyan", "geekblue", "volcano"];
  const order = categoryOrderByName[level];
  if (Number.isFinite(order) && order >= 0) {
    return palette[order % palette.length];
  }
  return "default";
}
