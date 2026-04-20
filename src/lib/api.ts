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
  subscribeMatches as fbSubscribeMatches,
  createRankingCategory as fbCreateRankingCategory,
  deleteRankingCategory as fbDeleteRankingCategory,
  subscribeRankingCategories as fbSubscribeRankingCategories,
  updateRankingCategory as fbUpdateRankingCategory,
  getLatestRankingSnapshot as fbGetLatestRankingSnapshot,
  saveRankingSnapshot as fbSaveRankingSnapshot,
  subscribeAuditEvents as fbSubscribeAuditEvents,
  saveDailySummary as fbSaveDailySummary,
  getRecentSessions as fbGetRecentSessions,
  removeSession as fbRemoveSession,
  getUserByUsername as fbGetUserByUsername,
  updateUserLastLogin as fbUpdateUserLastLogin,
  updateUserPassword as fbUpdateUserPassword,
} from "./firebase";
import type {
  UserRecord,
  UserRole,
  RankingMember,
  MatchRecord,
  RankingCategory,
  RankingSnapshot,
  SessionPayload,
  SessionRecord,
  AuditEventRecord,
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

// Ranking Categories API

export function subscribeRankingCategories(
  onData: (categories: RankingCategory[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return fbSubscribeRankingCategories(onData, onError);
}

export async function createRankingCategory(input: {
  name: string;
  displayName: string;
  order: number;
}): Promise<RankingCategory> {
  return fbCreateRankingCategory(input);
}

export async function updateRankingCategory(
  id: string,
  patch: Partial<{ displayName: string; order: number }>,
): Promise<void> {
  return fbUpdateRankingCategory(id, patch);
}

export async function deleteRankingCategory(id: string): Promise<void> {
  return fbDeleteRankingCategory(id);
}

// Ranking Snapshots API

export async function getLatestRankingSnapshot(): Promise<RankingSnapshot | null> {
  return fbGetLatestRankingSnapshot();
}

export async function saveRankingSnapshot(
  ranks: any[],
): Promise<void> {
  return fbSaveRankingSnapshot(ranks);
}

// Audit Events API

export function subscribeAuditEvents(
  onData: (events: AuditEventRecord[]) => void,
  onError?: (error: Error) => void,
  maxItems?: number,
): () => void {
  return fbSubscribeAuditEvents(onData, onError, maxItems);
}

// Sessions API

export async function saveDailySummary(
  payload: SessionPayload,
): Promise<{ dateKey: string }> {
  return fbSaveDailySummary(payload);
}

// Matches API (subscriptions)

export function subscribeMatches(
  onData: (matches: MatchRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return fbSubscribeMatches(onData, onError);
}

// Sessions API

export async function getRecentSessions(
  maxItems?: number,
): Promise<SessionRecord[]> {
  return fbGetRecentSessions(maxItems);
}

export async function removeSession(sessionId: string): Promise<{ id: string }> {
  return fbRemoveSession(sessionId);
}

// User Auth API

export async function getUserByUsername(
  username: string,
): Promise<UserRecord | null> {
  return fbGetUserByUsername(username);
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  return fbUpdateUserLastLogin(userId);
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  return fbUpdateUserPassword(userId, passwordHash);
}

// Utilities

export function isFirebaseReady(): boolean {
  return fbIsFirebaseReady();
}
