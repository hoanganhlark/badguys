import { Award, BarChart2, Settings, HelpCircle } from "react-feather";
import { ReactNode, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  RankingMatchesContainer,
  RankingMembersContainer,
} from "../../features/ranking/containers";
import { useRankingUIContext } from "../../features/ranking/context";
import {
  useRankingCategories,
  useRankingMembers,
  useUsers,
} from "../../hooks/queries";
import DashboardSectionHeader from "../dashboard/DashboardSectionHeader";
import HowItWorksPanel from "./HowItWorksPanel";
import type { RankingView } from "./types";

interface ViewConfig {
  icon: ReactNode;
  titleKey: string;
  render: () => ReactNode;
}

export default function RankingViewContent() {
  const { t } = useTranslation();
  const { view } = useRankingUIContext();
  const { members, isLoading: isMembersLoading } = useRankingMembers();
  const { categories, isLoading: isCategoriesLoading } = useRankingCategories();
  const { users } = useUsers();

  const usernamesById = users.reduce<Record<string, string>>((acc, user) => {
    acc[user.id] = user.username;
    return acc;
  }, {});

  const viewConfig = useMemo<Record<RankingView, ViewConfig>>(() => ({
    member: {
      icon: <Settings className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />,
      titleKey: "rankingPage.memberManagement",
      render: () => (
        <div className="space-y-4">
          <RankingMembersContainer />
        </div>
      ),
    },
    "match-form": {
      icon: <BarChart2 className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />,
      titleKey: "rankingPage.recordResult",
      render: () => (
        <RankingMatchesContainer
          members={members}
          categories={categories}
          usernamesById={usernamesById}
          isLoadingDependencies={isMembersLoading || isCategoriesLoading}
          view="match-form"
        />
      ),
    },
    "how-it-works": {
      icon: <HelpCircle className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />,
      titleKey: "rankingPage.howItWorks",
      render: () => <HowItWorksPanel />,
    },
    ranking: {
      icon: <Award className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />,
      titleKey: "rankingPage.clubRanking",
      render: () => (
        <RankingMatchesContainer
          members={members}
          categories={categories}
          usernamesById={usernamesById}
          isLoadingDependencies={isMembersLoading || isCategoriesLoading}
          view="ranking"
        />
      ),
    },
  }), [members, categories, usernamesById, isMembersLoading, isCategoriesLoading]);

  const currentConfig = viewConfig[view];

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardSectionHeader
        className="mb-5"
        icon={currentConfig.icon}
        title={t(currentConfig.titleKey)}
        subtitle={t("rankingPage.systemDescription")}
      />

      {currentConfig.render()}
    </div>
  );
}
