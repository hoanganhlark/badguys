import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import {
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
import { useTranslation } from "react-i18next";
import type { Member } from "./types";
import type { RankingLevel } from "../../types";
import {
  getRankingLevelDisplay,
  normalizeRankingLevel,
  sortMembersByLevelAndName,
} from "../../lib/rankingLevel";

interface MembersPanelProps {
  isEditing: number | null;
  newMember: { name: string; level: RankingLevel };
  members: Member[];
  canManage: boolean;
  onSetNewMember: (next: { name: string; level: RankingLevel }) => void;
  onAddOrUpdateMember: () => void;
  onStartEdit: (member: Member) => void;
  onDeleteMember: (id: number) => void;
}

export default function MembersPanel({
  isEditing,
  newMember,
  members,
  canManage,
  onSetNewMember,
  onAddOrUpdateMember,
  onStartEdit,
  onDeleteMember,
}: MembersPanelProps) {
  const { t } = useTranslation();
  const sortedMembers = sortMembersByLevelAndName(members);

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
      filters: ["Yo", "Lo", "Nè"].map((level) => ({
        text: getRankingLevelDisplay(level as RankingLevel),
        value: level,
      })),
      onFilter: (value, record) => record.level === value,
      sorter: (a, b) => {
        if (a.level === b.level) {
          return a.name.localeCompare(b.name, "vi");
        }
        const rankOrder: Record<RankingLevel, number> = {
          Yo: 0,
          Lo: 1,
          "Nè": 2,
        };
        return rankOrder[a.level] - rankOrder[b.level];
      },
      render: (level: RankingLevel) => (
        <Tag color={getRankingLevelColor(level)}>
          {getRankingLevelDisplay(level)}
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
                  onChange={(event) =>
                    onSetNewMember({ ...newMember, name: event.target.value })
                  }
                />
              </Form.Item>

              <Form.Item
                label={t("membersPanel.rank")}
                style={{ marginBottom: 0 }}
              >
                <Select
                  options={[
                    { value: "Yo", label: "Yo" },
                    { value: "Lo", label: "Lo" },
                    { value: "Nè", label: "Nè" },
                  ]}
                  value={newMember.level}
                  onChange={(value: RankingLevel) =>
                    onSetNewMember({
                      ...newMember,
                      level: normalizeRankingLevel(value),
                    })
                  }
                />
              </Form.Item>

              <Button
                type="primary"
                htmlType="submit"
                icon={isEditing ? <SaveOutlined /> : <UserAddOutlined />}
              >
                {isEditing ? t("membersPanel.save") : t("membersPanel.add")}
              </Button>
            </Space>
          </Form>
        </Card>
      ) : null}

      <Card bodyStyle={{ padding: 0 }}>
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
      </Card>
    </Space>
  );
}

function getRankingLevelColor(level: RankingLevel): string {
  if (level === "Yo") return "green";
  if (level === "Lo") return "blue";
  return "gold";
}
