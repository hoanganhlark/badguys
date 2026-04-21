import { Card, Skeleton, Table, type TableColumnsType } from "antd";

interface SkeletonRow {
  key: number;
  rank: React.ReactElement;
  name: React.ReactElement;
  score: React.ReactElement;
}

export default function RankingPanelSkeleton() {
  // Skeleton for category filter/controls
  const controlsSkeleton = (
    <Card className="mb-4">
      <Skeleton paragraph={{ rows: 2 }} active />
    </Card>
  );

  // Skeleton for rankings table with 8 rows - matching actual RankingPanel columns
  const tableData: SkeletonRow[] = Array(8)
    .fill(null)
    .map((_, i) => ({
      key: i,
      rank: <Skeleton paragraph={{ rows: 1 }} active />,
      name: <Skeleton paragraph={{ rows: 1 }} active />,
      score: <Skeleton paragraph={{ rows: 1 }} active />,
    }));

  // Columns matching the actual RankingPanel structure
  const columns: TableColumnsType<SkeletonRow> = [
    {
      title: "Rank",
      dataIndex: "rank",
      key: "rank",
      width: 72,
    },
    {
      title: "Athlete",
      dataIndex: "name",
      key: "name",
      width: 140,
    },
    {
      title: "Points",
      dataIndex: "score",
      key: "score",
      width: 104,
      align: "right",
    },
  ];

  return (
    <div className="space-y-4">
      {controlsSkeleton}
      <Table columns={columns} dataSource={tableData} pagination={false} />
    </div>
  );
}
