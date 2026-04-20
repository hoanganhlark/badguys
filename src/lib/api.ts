import {
  createUser as supabaseCreateUser,
  deleteUser as supabaseDeleteUser,
  setUserDisabled as supabaseSetUserDisabled,
  updateUserRole as supabaseUpdateUserRole,
  getRankingMembers as supabaseGetRankingMembers,
  saveRankingMembers as supabaseSaveRankingMembers,
  isSupabaseReady as supabaseIsSupabaseReady,
  getRankingMatches as supabaseGetRankingMatches,
  saveRankingMatches as supabaseSaveRankingMatches,
  createMatch as supabaseCreateMatch,
  deleteMatch as supabaseDeleteMatch,
  getMatches as supabaseGetMatches,
  getRankingCategories as supabaseGetRankingCategories,
  createRankingCategory as supabaseCreateRankingCategory,
  deleteRankingCategory as supabaseDeleteRankingCategory,
  updateRankingCategory as supabaseUpdateRankingCategory,
  getLatestRankingSnapshot as supabaseGetLatestRankingSnapshot,
  saveRankingSnapshot as supabaseSaveRankingSnapshot,
  saveDailySummary as supabaseSaveDailySummary,
  getRecentSessions as supabaseGetRecentSessions,
  removeSession as supabaseRemoveSession,
  getUserByUsername as supabaseGetUserByUsername,
  updateUserLastLogin as supabaseUpdateUserLastLogin,
  updateUserPassword as supabaseUpdateUserPassword,
  verifyPassword as supabaseVerifyPassword,
  hashPassword as supabaseHashPassword,
} from "./supabase";
import type {
  UserRecord,
  UserRole,
  RankingMember,
  MatchRecord,
  RankingCategory,
  RankingSnapshot,
  SessionPayload,
  SessionRecord,
} from "../types";

// Users API

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role: UserRole;
}): Promise<UserRecord> {
  return supabaseCreateUser(input);
}

export async function deleteUser(userId: string): Promise<void> {
  return supabaseDeleteUser(userId);
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  return supabaseUpdateUserRole(userId, role);
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<void> {
  return supabaseSetUserDisabled(userId, disabled);
}

// Ranking Members API

export async function getRankingMembers(): Promise<RankingMember[]> {
  return supabaseGetRankingMembers();
}

export async function saveRankingMembers(
  members: RankingMember[],
): Promise<void> {
  return supabaseSaveRankingMembers(members);
}

// Ranking Matches API

export async function getRankingMatches() {
  return supabaseGetRankingMatches();
}

export async function saveRankingMatches(matches: any[]): Promise<void> {
  return supabaseSaveRankingMatches(matches);
}

export async function createMatch(input: {
  playerA: string;
  playerB: string;
  score: string;
  matchType?: "singles" | "doubles";
  playedAt?: string;
  durationMinutes?: number;
  createdBy: string;
  createdByUsername?: string;
}): Promise<MatchRecord> {
  return supabaseCreateMatch(input);
}

export async function deleteMatch(matchId: string): Promise<void> {
  return supabaseDeleteMatch(matchId);
}

export async function getMatches(): Promise<MatchRecord[]> {
  return supabaseGetMatches();
}

// Ranking Categories API

export async function getRankingCategories(): Promise<RankingCategory[]> {
  return supabaseGetRankingCategories();
}

export async function createRankingCategory(input: {
  name: string;
  displayName: string;
  order: number;
}): Promise<RankingCategory> {
  return supabaseCreateRankingCategory(input);
}

export async function updateRankingCategory(
  id: string,
  patch: Partial<{ displayName: string; order: number }>,
): Promise<void> {
  return supabaseUpdateRankingCategory(id, patch);
}

export async function deleteRankingCategory(id: string): Promise<void> {
  return supabaseDeleteRankingCategory(id);
}

// Ranking Snapshots API

export async function getLatestRankingSnapshot(): Promise<RankingSnapshot | null> {
  return supabaseGetLatestRankingSnapshot();
}

export async function saveRankingSnapshot(
  ranks: any[],
): Promise<void> {
  return supabaseSaveRankingSnapshot(ranks);
}

// Sessions API

export async function saveDailySummary(
  payload: SessionPayload,
): Promise<{ dateKey: string }> {
  return supabaseSaveDailySummary(payload);
}

export async function getRecentSessions(
  maxItems?: number,
): Promise<SessionRecord[]> {
  return supabaseGetRecentSessions(maxItems);
}

export async function removeSession(sessionId: string): Promise<{ id: string }> {
  return supabaseRemoveSession(sessionId);
}

// User Auth API

export async function getUserByUsername(
  username: string,
): Promise<UserRecord | null> {
  return supabaseGetUserByUsername(username);
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  return supabaseUpdateUserLastLogin(userId);
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  return supabaseUpdateUserPassword(userId, passwordHash);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return supabaseVerifyPassword(plaintext, hash);
}

export async function hashPassword(plaintext: string): Promise<string> {
  return supabaseHashPassword(plaintext);
}

// Utilities

export function isSupabaseReady(): boolean {
  return supabaseIsSupabaseReady();
}
