import { Card, Skeleton, Table } from "antd";

export default function RankingPanelSkeleton() {
  // Skeleton for category filter/controls
  const controlsSkeleton = (
    <Card className="mb-4">
      <Skeleton paragraph={{ rows: 2 }} active />
    </Card>
  );

  // Skeleton for rankings table with 10 rows
  const tableData = Array(10)
    .fill(null)
    .map((_, i) => ({
      key: i,
      rank: <Skeleton paragraph={{ rows: 1 }} active />,
      name: <Skeleton paragraph={{ rows: 1 }} active />,
      score: <Skeleton paragraph={{ rows: 1 }} active />,
      stability: <Skeleton paragraph={{ rows: 1 }} active />,
      trend: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  const columns = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: "10%",
      render: (text: any) => text,
    },
    {
      title: "Player",
      dataIndex: "name",
      key: "name",
      render: (text: any) => text,
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "Stability",
      dataIndex: "stability",
      key: "stability",
      width: "15%",
      render: (text: any) => text,
    },
    {
      title: "Trend",
      dataIndex: "trend",
      key: "trend",
      width: "15%",
      render: (text: any) => text,
    },
  ];

  return (
    <div className="space-y-4">
      {controlsSkeleton}
      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        bordered
      />
    </div>
  );
}
