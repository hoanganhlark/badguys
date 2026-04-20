type DashboardSummaryItem = {
  key: string;
  label: string;
  value: string | number;
  valueClassName?: string;
};

type DashboardSummaryCardsProps = {
  items: DashboardSummaryItem[];
  className?: string;
};

export default function DashboardSummaryCards({
  items,
  className = "",
}: DashboardSummaryCardsProps) {
  return (
    <section
      className={`mb-4 grid grid-cols-3 gap-2 md:mb-6 md:max-w-2xl ${className}`.trim()}
    >
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-center"
        >
          <p className="text-center text-[11px] text-slate-500">{item.label}</p>
          <p
            className={`text-center text-lg font-bold text-slate-900 ${item.valueClassName || ""}`.trim()}
          >
            {item.value}
          </p>
        </div>
      ))}
    </section>
  );
}

export type { DashboardSummaryItem };
