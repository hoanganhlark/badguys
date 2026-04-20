import type { ReactNode } from "react";

type DashboardSectionHeaderProps = {
  icon: ReactNode;
  title: string;
  subtitle: string;
  className?: string;
};

export default function DashboardSectionHeader({
  icon,
  title,
  subtitle,
  className = "",
}: DashboardSectionHeaderProps) {
  return (
    <header
      className={`rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6 md:py-5 ${className}`.trim()}
    >
      <h1 className="inline-flex items-center gap-3 text-xl font-bold text-slate-900 md:text-3xl">
        {icon}
        {title}
      </h1>
      <p className="mt-1.5 text-xs text-slate-500 md:text-sm">{subtitle}</p>
    </header>
  );
}
