import { Skeleton } from "antd";

type DashboardTableSkeletonProps = {
  columns?: number;
  rows?: number;
  className?: string;
};

export default function DashboardTableSkeleton({
  columns = 3,
  rows = 4,
  className = "",
}: DashboardTableSkeletonProps) {
  const safeColumns = Math.max(1, columns);
  const safeRows = Math.max(1, rows);

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`.trim()}
    >
      <div
        className="grid gap-3 border-b border-slate-200 px-4 py-3"
        style={{
          gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
        }}
      >
        {Array.from({ length: safeColumns }, (_, index) => (
          <Skeleton.Input
            key={`header-${index}`}
            active
            size="small"
            style={{ width: "70%", minWidth: 56, height: 14 }}
          />
        ))}
      </div>

      <div className="divide-y divide-slate-100">
        {Array.from({ length: safeRows }, (_, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="grid gap-3 px-4 py-3"
            style={{
              gridTemplateColumns: `repeat(${safeColumns}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: safeColumns }, (_, colIndex) => (
              <Skeleton.Input
                key={`cell-${rowIndex}-${colIndex}`}
                active
                size="small"
                style={{ width: colIndex === 0 ? "72%" : "88%", minWidth: 56 }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
