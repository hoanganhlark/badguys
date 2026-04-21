import { Card, Skeleton, Table } from "antd";

export default function CategoryManagementPageSkeleton() {
  // Skeleton for categories table with 10 rows
  const tableData = Array(10)
    .fill(null)
    .map((_, i) => ({
      key: i,
      name: <Skeleton paragraph={{ rows: 1 }} active />,
      displayName: <Skeleton paragraph={{ rows: 1 }} active />,
      order: <Skeleton paragraph={{ rows: 1 }} active />,
      actions: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  const columns = [
    {
      title: "Category",
      dataIndex: "name",
      key: "name",
      render: (text: any) => text,
    },
    {
      title: "Display Name",
      dataIndex: "displayName",
      key: "displayName",
      render: (text: any) => text,
    },
    {
      title: "Order",
      dataIndex: "order",
      key: "order",
      width: "15%",
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
