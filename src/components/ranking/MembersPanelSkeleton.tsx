import { Card, Skeleton, Table } from "antd";

export default function MembersPanelSkeleton() {
  // Skeleton for form section
  const formSkeleton = (
    <Card className="mb-4">
      <Skeleton paragraph={{ rows: 3 }} active />
    </Card>
  );

  // Skeleton for table with 5 rows
  const tableData = Array(5)
    .fill(null)
    .map((_, i) => ({
      key: i,
      name: <Skeleton paragraph={{ rows: 1 }} active />,
      level: <Skeleton paragraph={{ rows: 1 }} active />,
      actions: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  const columns = [
    {
      title: "Member",
      dataIndex: "name",
      key: "name",
      render: (text: any) => text,
    },
    {
      title: "Rank",
      dataIndex: "level",
      key: "level",
      render: (text: any) => text,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      render: (text: any) => text,
    },
  ];

  return (
    <div className="space-y-4">
      {formSkeleton}
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        bordered
      />
    </div>
  );
}
