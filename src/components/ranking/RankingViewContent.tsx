import { useTranslation } from "react-i18next";
import { Award, BarChart2, Settings } from "react-feather";
import { useRankingUIContext } from "../../features/ranking/context";
import { useRankingMembers, useRankingCategories, useUsers } from "../../hooks/queries";
import {
  RankingMembersContainer,
  RankingMatchesContainer,
} from "../../features/ranking/containers";
import DashboardSectionHeader from "../dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "../dashboard/DashboardSummaryCards";

export default function RankingViewContent() {
  const { t } = useTranslation();
  const { view } = useRankingUIContext();
  const { members, isLoading: isMembersLoading } = useRankingMembers();
  const { categories } = useRankingCategories();
  const { users } = useUsers();

  const headerIcon =
    view === "member" ? (
      <Settings className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
    ) : view === "match-form" ? (
      <BarChart2 className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
    ) : (
      <Award className="h-6 w-6 text-sky-600 md:h-8 md:w-8" />
    );

  const headerTitle =
    view === "member"
      ? t("rankingPage.memberManagement")
      : view === "match-form"
        ? t("rankingPage.recordResult")
        : t("rankingPage.clubRanking");

  // Build usernamesById from users
  const usernamesById = users.reduce<Record<string, string>>(
    (acc, user) => {
      acc[user.id] = user.username;
      return acc;
    },
    {},
  );

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardSectionHeader
        className="mb-5"
        icon={headerIcon}
        title={headerTitle}
        subtitle={t("rankingPage.systemDescription")}
      />

      <DashboardSummaryCards
        loading={isMembersLoading}
        items={[
          {
            key: "members",
            label: t("rankingPage.members"),
            value: members.length,
          },
        ]}
      />

      {/* View: Members */}
      {view === "member" && (
        <div className="space-y-4">
          <RankingMembersContainer />
        </div>
      )}

      {/* View: Match Form and Rankings */}
      {(view === "match-form" || view === "ranking") && (
        <RankingMatchesContainer
          members={members}
          categories={categories}
          usernamesById={usernamesById}
          view={view as "match-form" | "ranking"}
        />
      )}
    </div>
  );
}
