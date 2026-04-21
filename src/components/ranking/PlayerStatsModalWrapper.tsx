import { useRankingUIContext } from "../../features/ranking/context";
import PlayerStatsModal from "./PlayerStatsModal";

const DEFAULT_RANKING_CONFIG = {
  penaltyCoefficient: 0.3,
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    motivation: true,
    winRate: true,
  },
} as const;

export default function PlayerStatsModalWrapper() {
  const { selectedPlayer, setSelectedPlayer } = useRankingUIContext();

  if (!selectedPlayer) return null;

  return (
    <PlayerStatsModal
      stats={selectedPlayer}
      penaltyCoefficient={DEFAULT_RANKING_CONFIG.penaltyCoefficient}
      metricVisibility={DEFAULT_RANKING_CONFIG.metricVisibility}
      onClose={() => setSelectedPlayer(null)}
    />
  );
}
