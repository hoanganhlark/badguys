import { useRankingUIContext } from "../../features/ranking/context";
import PlayerStatsModal from "./PlayerStatsModal";

const DEFAULT_RANKING_CONFIG = {
  metricVisibility: {
    skill: true,
    stability: true,
    uncertainty: true,
    winRate: true,
  },
} as const;

export default function PlayerStatsModalWrapper() {
  const { selectedPlayer, setSelectedPlayer } = useRankingUIContext();

  if (!selectedPlayer) return null;

  return (
    <PlayerStatsModal
      stats={selectedPlayer}
      metricVisibility={DEFAULT_RANKING_CONFIG.metricVisibility}
      onClose={() => setSelectedPlayer(null)}
    />
  );
}
