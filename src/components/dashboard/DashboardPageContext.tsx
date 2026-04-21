import { createContext, useContext, type ReactNode } from "react";

type DashboardPageConfig = {
  pageTitle: string;
  menuAriaLabel: string;
  usersActive?: boolean;
  auditActive?: boolean;
  categoriesActive?: boolean;
  showCategoriesLink?: boolean;
};

const DashboardPageContext = createContext<DashboardPageConfig | null>(null);

export function DashboardPageProvider({
  value,
  children,
}: {
  value: DashboardPageConfig;
  children: ReactNode;
}) {
  return (
    <DashboardPageContext.Provider value={value}>
      {children}
    </DashboardPageContext.Provider>
  );
}

export function useDashboardPageConfig(): DashboardPageConfig {
  const context = useContext(DashboardPageContext);
  if (!context) {
    throw new Error(
      "useDashboardPageConfig must be used within DashboardPageProvider",
    );
  }
  return context;
}

export type { DashboardPageConfig };
