import { useTranslation } from "react-i18next";
import { Award, BarChart2, Settings } from "react-feather";
import { useAuth } from "../../context/AuthContext";
import {
  useRankingUIContext,
  useRankingMembersContext,
  useRankingMatchesContext,
} from "../../features/ranking/context";
import DashboardSectionHeader from "../dashboard/DashboardSectionHeader";
import DashboardSummaryCards from "../dashboard/DashboardSummaryCards";
import MembersPanel from "./MembersPanel";
import MatchFormPanel from "./MatchFormPanel";
import RankingPanel from "./RankingPanel";

export default function RankingViewContent() {
  const { t } = useTranslation();
  const { isAdmin, currentUser } = useAuth();
  const { view } = useRankingUIContext();
  const { sortedCategories, members } = useRankingMembersContext();
  const {
    matches,
    rankings,
    matchType,
    team1,
    team2,
    sets,
    playedAt,
    setMatchType,
    setTeam1,
    setTeam2,
    setSets,
    setPlayedAt,
    handleSaveMatch,
    pagedHistoryMatches,
    historyMatchesForDisplay,
    isHistoryLoading,
    historyPage,
    historyPageSize,
    rankTrends,
    showRankTrend,
    memberLevelById,
    handleToggleHistory,
    handleHistoryPaginationChange,
    handleClearHistory,
    handleDeleteMatch,
  } = useRankingMatchesContext();
  const { selectedCategoryId, setSelectedCategoryId, setSelectedPlayer } =
    useRankingUIContext();

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

      {/* View: Members */}
      {view === "member" && (
        <div className="space-y-4">
          <MembersPanel />
        </div>
      )}

      {/* View: Match Form */}
      {view === "match-form" && (
        <MatchFormPanel
          members={members}
          categories={sortedCategories}
          matchType={matchType}
          matchData={{
            team1,
            team2,
            sets,
            playedAt,
          }}
          onSetMatchType={setMatchType}
          onSetMatchData={(nextData) => {
            setTeam1(nextData.team1);
            setTeam2(nextData.team2);
            setSets(nextData.sets);
            setPlayedAt(nextData.playedAt);
          }}
          onSaveMatch={handleSaveMatch}
        />
      )}

      {/* View: Rankings */}
      {view === "ranking" && (
        <RankingPanel
          rankings={rankings}
          historyMatches={pagedHistoryMatches}
          isHistoryExpanded={historyMatchesForDisplay.length > 0}
          isHistoryLoading={isHistoryLoading}
          onToggleHistory={handleToggleHistory}
          historyPagination={{
            current: historyPage,
            pageSize: historyPageSize,
            total: historyMatchesForDisplay.length,
          }}
          onHistoryPaginationChange={handleHistoryPaginationChange}
          rankTrends={rankTrends}
          showRankTrend={showRankTrend}
          categories={sortedCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          memberLevelById={memberLevelById}
          onSelectPlayer={setSelectedPlayer}
          onClearHistory={handleClearHistory}
          onDeleteMatch={handleDeleteMatch}
          isAdmin={isAdmin}
          currentUserId={currentUser?.userId || ""}
        />
      )}
    </div>
  );
}
