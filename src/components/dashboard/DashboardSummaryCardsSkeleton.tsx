import { Skeleton } from "antd";

export default function DashboardSummaryCardsSkeleton() {
  return (
    <section className="mb-4 grid grid-cols-3 gap-2 md:mb-6 md:max-w-2xl">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
        >
          <Skeleton paragraph={{ rows: 2 }} active />
        </div>
      ))}
    </section>
  );
}
