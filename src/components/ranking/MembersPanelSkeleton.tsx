import { Card, Skeleton, Table, type TableColumnsType } from "antd";

interface SkeletonRow {
  key: number;
  name: React.ReactElement;
  level: React.ReactElement;
  actions: React.ReactElement;
}

export default function MembersPanelSkeleton() {
  // Skeleton for member form section (add/edit)
  const formSkeleton = (
    <Card>
      <Skeleton paragraph={{ rows: 4 }} active />
    </Card>
  );

  // Skeleton for members table with 6 rows matching actual structure
  const tableData: SkeletonRow[] = Array(6)
    .fill(null)
    .map((_, i) => ({
      key: i,
      name: <Skeleton paragraph={{ rows: 1 }} active />,
      level: <Skeleton paragraph={{ rows: 1 }} active />,
      actions: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  // Columns matching actual MembersPanel structure
  const columns: TableColumnsType<SkeletonRow> = [
    {
      title: "Member",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Rank",
      dataIndex: "level",
      key: "level",
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      align: "right",
    },
  ];

  return (
    <div className="space-y-4">
      {formSkeleton}
      <Table columns={columns} dataSource={tableData} pagination={false} />
    </div>
  );
}
