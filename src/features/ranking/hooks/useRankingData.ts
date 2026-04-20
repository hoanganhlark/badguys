import { useState, useEffect } from "react";
import {
  getRankingMembers,
  subscribeMatches,
  isFirebaseReady,
} from "../../../lib/firebase";
import {
  buildMembersFromMatches,
  loadMembersFromStorage,
  loadMatchesFromStorage,
  saveMembersToStorage,
  saveMatchesToStorage,
} from "../../../lib/rankingStorage";
import type { Member, Match } from "../../../components/ranking/types";
import type { MatchRecord } from "../../../types";

function formatDateTime(value?: string): string {
  if (!value) return "--/--/---- --:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function mapMatchRecordToRankingMatch(record: MatchRecord): Match {
  const team1 = String(record.playerA || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const team2 = String(record.playerB || "")
    .split("/")
    .map((name) => name.trim())
    .filter(Boolean);
  const sets = String(record.score || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const hasDoubleTeams = team1.length > 1 || team2.length > 1;

  return {
    id: record.id,
    type: hasDoubleTeams ? "doubles" : "singles",
    team1,
    team2,
    sets,
    date: formatDateTime(record.playedAt || record.createdAt),
    playedAt: record.playedAt,
    durationMinutes: record.durationMinutes,
    createdBy: record.createdBy,
    createdByUsername: record.createdByUsername,
  };
}

export interface UseRankingDataReturn {
  members: Member[];
  matches: Match[];
  isRemoteHydrated: boolean;
  error: string | null;
}

/**
 * Hook for managing ranking data loading from Firestore and localStorage.
 * Handles subscription to matches and fallback member derivation.
 */
export function useRankingData(): UseRankingDataReturn {
  const [members, setMembers] = useState<Member[]>(() =>
    loadMembersFromStorage(),
  );
  const [matches, setMatches] = useState<Match[]>(() =>
    loadMatchesFromStorage(),
  );
  const [isRemoteHydrated, setIsRemoteHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let unsubscribeMatches: (() => void) | null = null;

    const hydrateRankingData = async () => {
      if (!isFirebaseReady()) {
        if (mounted) setIsRemoteHydrated(true);
        return;
      }

      try {
        const remoteMembers = await getRankingMembers();

        if (!mounted) return;

        const hasRemoteMembers = remoteMembers.length > 0;
        let shouldDeriveMembersFromMatches = !hasRemoteMembers;

        if (hasRemoteMembers) {
          setMembers(remoteMembers);
        }

        unsubscribeMatches = subscribeMatches(
          (remoteMatchRecords) => {
            if (!mounted) return;

            const remoteMatches = remoteMatchRecords.map(
              mapMatchRecordToRankingMatch,
            );

            setMatches(remoteMatches);
            saveMatchesToStorage(remoteMatches);

            if (shouldDeriveMembersFromMatches) {
              const fallbackMembers = buildMembersFromMatches(remoteMatches);

              if (fallbackMembers.length > 0) {
                setMembers(fallbackMembers);
                shouldDeriveMembersFromMatches = false;

                try {
                  saveMembersToStorage(fallbackMembers);
                } catch (err) {
                  console.error(
                    "Failed to backfill ranking members from match history",
                    err,
                  );
                }
              }
            }

            setIsRemoteHydrated(true);
          },
          (err) => {
            console.error("Failed to subscribe ranking matches", err);
            setError("Failed to load matches");
            setIsRemoteHydrated(true);
          },
        );
      } catch (err) {
        console.error("Failed to load ranking data from Firestore", err);
        setError("Failed to load ranking data");
        if (mounted) setIsRemoteHydrated(true);
      }
    };

    void hydrateRankingData();

    return () => {
      mounted = false;
      if (unsubscribeMatches) {
        unsubscribeMatches();
      }
    };
  }, []);

  return { members, matches, isRemoteHydrated, error };
}
