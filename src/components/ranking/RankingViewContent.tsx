import { useTranslation } from "react-i18next";
import { Award, BarChart2, Settings } from "react-feather";
import {
  useRankingUIContext,
  useRankingMembersContext,
  useRankingMatchesContext,
} from "../../features/ranking/context";
import DashboardSectionHeader from "../dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "../dashboard/DashboardSummaryCards";
import DashboardSummaryCardsSkeleton from "../dashboard/DashboardSummaryCardsSkeleton";
import MembersPanel from "./MembersPanel";
import MembersPanelSkeleton from "./MembersPanelSkeleton";
import MatchFormPanel from "./MatchFormPanel";
import MatchFormPanelSkeleton from "./MatchFormPanelSkeleton";
import RankingPanel from "./RankingPanel";
import RankingPanelSkeleton from "./RankingPanelSkeleton";

export default function RankingViewContent() {
  const { t } = useTranslation();
  const { view } = useRankingUIContext();
  const { members, isLoading: isMembersLoading } = useRankingMembersContext();
  const { matches, isLoading: isMatchesLoading, rankings } = useRankingMatchesContext();

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

  return (
    <div className="max-w-7xl mx-auto">
      <DashboardSectionHeader
        className="mb-5"
        icon={headerIcon}
        title={headerTitle}
        subtitle={t("rankingPage.systemDescription")}
      />

      {isMembersLoading || isMatchesLoading ? (
        <DashboardSummaryCardsSkeleton />
      ) : (
        <DashboardSummaryCards
          items={[
            {
              key: "members",
              label: t("rankingPage.members"),
              value: members.length,
            },
            {
              key: "matches",
              label: t("rankingPage.matches"),
              value: matches.length,
            },
            {
              key: "top-rank",
              label: t("rankingPage.topRank"),
              value: rankings[0]?.name ?? "-",
              valueClassName: "text-sm md:text-base truncate",
            },
          ]}
        />
      )}

      {/* View: Members */}
      {view === "member" && (
        <div className="space-y-4">
          {isMembersLoading ? <MembersPanelSkeleton /> : <MembersPanel />}
        </div>
      )}

      {/* View: Match Form */}
      {view === "match-form" && (
        <div>
          {isMembersLoading ? (
            <MatchFormPanelSkeleton />
          ) : (
            <MatchFormPanel />
          )}
        </div>
      )}

      {/* View: Rankings */}
      {view === "ranking" && (
        <div>
          {isMatchesLoading ? (
            <RankingPanelSkeleton />
          ) : (
            <RankingPanel />
          )}
        </div>
      )}
    </div>
  );
}
