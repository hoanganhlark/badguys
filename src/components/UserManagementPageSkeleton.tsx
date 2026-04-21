import { Card, Skeleton, Table } from "antd";

export default function UserManagementPageSkeleton() {
  // Skeleton for users table with 10 rows
  const tableData = Array(10)
    .fill(null)
    .map((_, i) => ({
      key: i,
      username: <Skeleton paragraph={{ rows: 1 }} active />,
      role: <Skeleton paragraph={{ rows: 1 }} active />,
      createdAt: <Skeleton paragraph={{ rows: 1 }} active />,
      actions: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      render: (text: any) => text,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      width: "20%",
      render: (text: any) => text,
    },
    {
      title: "Actions",
      dataIndex: "actions",
      key: "actions",
      width: "15%",
      render: (text: any) => text,
    },
  ];

  return (
    <Card>
      <Table columns={columns} dataSource={tableData} pagination={false} />
    </Card>
  );
}
