import {
  createUser as fbCreateUser,
  deleteUser as fbDeleteUser,
  setUserDisabled as fbSetUserDisabled,
  subscribeUsers as fbSubscribeUsers,
  updateUserRole as fbUpdateUserRole,
  getRankingMembers as fbGetRankingMembers,
  saveRankingMembers as fbSaveRankingMembers,
  isFirebaseReady as fbIsFirebaseReady,
  getRankingMatches as fbGetRankingMatches,
  saveRankingMatches as fbSaveRankingMatches,
  createMatch as fbCreateMatch,
  deleteMatch as fbDeleteMatch,
  getMatches as fbGetMatches,
} from "./firebase";
import type {
  UserRecord,
  UserRole,
  RankingMember,
  MatchRecord,
} from "../types";

// Users API

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role: UserRole;
}): Promise<UserRecord> {
  return fbCreateUser(input);
}

export async function deleteUser(userId: string): Promise<void> {
  return fbDeleteUser(userId);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  return fbUpdateUserRole(userId, role);
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<void> {
  return fbSetUserDisabled(userId, disabled);
}

export function subscribeUsers(
  onData: (users: UserRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return fbSubscribeUsers(onData, onError);
}

// Ranking Members API

export async function getRankingMembers(): Promise<RankingMember[]> {
  return fbGetRankingMembers();
}

export async function saveRankingMembers(
  members: RankingMember[],
): Promise<void> {
  return fbSaveRankingMembers(members);
}

// Ranking Matches API

export async function getRankingMatches() {
  return fbGetRankingMatches();
}

export async function saveRankingMatches(matches: any[]): Promise<void> {
  return fbSaveRankingMatches(matches);
}

export async function createMatch(input: {
  playerA: string;
  playerB: string;
  score: string;
  playedAt?: string;
  durationMinutes?: number;
  createdBy: string;
  createdByUsername?: string;
}): Promise<MatchRecord> {
  return fbCreateMatch(input);
}

export async function deleteMatch(matchId: string): Promise<void> {
  return fbDeleteMatch(matchId);
}

export async function getMatches(): Promise<MatchRecord[]> {
  return fbGetMatches();
}

// Utilities

export function isFirebaseReady(): boolean {
  return fbIsFirebaseReady();
}
