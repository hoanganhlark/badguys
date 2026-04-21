import { Card, Skeleton, Table } from "antd";

export default function AuditPageSkeleton() {
  // Skeleton for audit events table with 10 rows
  const tableData = Array(10)
    .fill(null)
    .map((_, i) => ({
      key: i,
      time: <Skeleton paragraph={{ rows: 1 }} active />,
      event: <Skeleton paragraph={{ rows: 1 }} active />,
      type: <Skeleton paragraph={{ rows: 1 }} active />,
      user: <Skeleton paragraph={{ rows: 1 }} active />,
      role: <Skeleton paragraph={{ rows: 1 }} active />,
      path: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  const columns = [
    {
      title: "Time",
      dataIndex: "time",
      key: "time",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "Event",
      dataIndex: "event",
      key: "event",
      width: "20%",
      render: (text: any) => text,
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "User",
      dataIndex: "user",
      key: "user",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: "10%",
      render: (text: any) => text,
    },
    {
      title: "Path",
      dataIndex: "path",
      key: "path",
      render: (text: any) => text,
    },
  ];

  return (
    <Card>
      <Table columns={columns} dataSource={tableData} pagination={false} />
    </Card>
  );
}
