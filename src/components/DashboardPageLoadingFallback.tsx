import { Skeleton, Space, Card } from "antd";

/**
 * Loading fallback component for Suspense boundaries on dashboard pages
 * Shows skeleton loaders matching the page layout
 */
export default function DashboardPageLoadingFallback() {
  return (
    <div className="mx-auto max-w-7xl space-y-5 md:space-y-6 p-8">
      {/* Section header skeleton */}
      <div className="space-y-3">
        <Skeleton.Button active size="large" block style={{ height: 32 }} />
        <Skeleton.Button active style={{ height: 16, width: "60%" }} />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Skeleton.Button
                active
                size="small"
                style={{ height: 12, width: "40%" }}
              />
              <Skeleton.Button active size="large" block style={{ height: 28 }} />
            </Space>
          </Card>
        ))}
      </div>

      {/* Form/table card skeleton */}
      <Card>
        <Space direction="vertical" style={{ width: "100%" }} size={16}>
          <Skeleton.Button active style={{ height: 16, width: "30%" }} />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton.Button key={i} active block style={{ height: 40 }} />
            ))}
          </div>
        </Space>
      </Card>
    </div>
  );
}
