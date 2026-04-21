import { Skeleton, Table, type TableColumnsType } from "antd";
import { useTranslation } from "react-i18next";

interface SkeletonRow {
  key: number;
  rank: React.ReactElement;
  name: React.ReactElement;
  score: React.ReactElement;
}

export default function RankingPanelSkeleton() {
  const { t } = useTranslation();

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
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.rank")}
        </span>
      ),
      dataIndex: "rank",
      key: "rank",
      width: 60,
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.athlete")}
        </span>
      ),
      dataIndex: "name",
      key: "name",
    },
    {
      title: (
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
          {t("rankingPanel.points")}
        </span>
      ),
      dataIndex: "score",
      key: "score",
      width: 92,
      align: "right",
    },
  ];

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-3 md:p-4">
        <Table
          columns={columns}
          dataSource={tableData}
          size="small"
          showSorterTooltip={false}
          pagination={false}
          className="ranking-ui-table"
        />
      </div>
    </div>
  );
}
