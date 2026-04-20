import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { envConfig } from "../env";
import { normalizeRankingLevel } from "./rankingLevel";
import { verifyMd5, hashMd5 } from "./hash";
import type {
  AuditEventRecord,
  MatchRecord,
  RankingMatch,
  RankingCategory,
  RankingMember,
  RankingSnapshot,
  RankingSnapshotEntry,
  SessionPayload,
  SessionRecord,
  UserRecord,
  UserRole,
} from "../types";

let supabase: SupabaseClient | null = null;
let ready = false;

function ensureSupabase(): {
  client: SupabaseClient | null;
  ready: boolean;
} {
  if (supabase) return { client: supabase, ready: true };

  const hasUrl = envConfig.supabaseUrl && !String(envConfig.supabaseUrl).startsWith("__");
  const hasKey = envConfig.supabaseAnonKey && !String(envConfig.supabaseAnonKey).startsWith("__");

  if (!hasUrl || !hasKey) {
    ready = false;
    return { client: null, ready: false };
  }

  supabase = createClient(envConfig.supabaseUrl, envConfig.supabaseAnonKey);
  ready = true;
  return { client: supabase, ready: true };
}


function getSessionDateKey(now?: Date): string {
  const current = now || new Date();
  const dd = String(current.getDate()).padStart(2, "0");
  const mm = String(current.getMonth() + 1).padStart(2, "0");
  const yyyy = current.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export function isSupabaseReady(): boolean {
  ensureSupabase();
  return ready;
}

export async function saveDailySummary(payload: SessionPayload): Promise<{ dateKey: string }> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const dateKey = getSessionDateKey();
  const { error } = await context.client.from("sessions").upsert(
    {
      datekey: dateKey,
      summary_text: payload.summaryText || "",
      court_fee: payload.courtFee ?? 0,
      shuttle_count: payload.shuttleCount ?? 0,
      shuttle_fee: payload.shuttleFee ?? 0,
      total: payload.total ?? 0,
      male_fee: payload.maleFee ?? 0,
      female_fee: payload.femaleFee ?? 0,
      females_count: payload.femalesCount ?? 0,
      males_count: payload.malesCount ?? 0,
      set_players_count: payload.setPlayersCount ?? 0,
      players: Array.isArray(payload.players) ? payload.players : [],
      updated_at: new Date().toISOString(),
      client_updated_at: new Date().toISOString(),
    },
    { onConflict: "datekey" }
  );

  if (error) throw error;
  return { dateKey };
}

export async function getRecentSessions(maxItems = 14): Promise<SessionRecord[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client
    .from("sessions")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(maxItems);

  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.datekey,
    dateKey: row.datekey,
    summaryText: row.summary_text,
    courtFee: row.court_fee,
    courtCount: row.court_count,
    shuttleCount: row.shuttle_count,
    shuttleFee: row.shuttle_fee,
    total: row.total,
    maleFee: row.male_fee,
    femaleFee: row.female_fee,
    femalesCount: row.females_count,
    malesCount: row.males_count,
    setPlayersCount: row.set_players_count,
    players: row.players,
    clientUpdatedAt: row.client_updated_at,
  }));
}

export async function removeSession(sessionId: string): Promise<{ id: string }> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const id = String(sessionId || "").trim();
  if (!id) {
    throw new Error("Missing session id");
  }

  const { error } = await context.client
    .from("sessions")
    .delete()
    .eq("datekey", id);

  if (error) throw error;
  return { id };
}

export async function getRankingMembers(): Promise<RankingMember[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client
    .from("ranking_members")
    .select("*, ranking_categories(name)");

  if (error) throw error;

  return (data || [])
    .map((row: any) => {
      const id = Number(row.id);
      const name = String(row.name || "").trim();
      const categoryName = String((row.ranking_categories as any)?.name || "Lo").trim();
      const level = normalizeRankingLevel(categoryName);

      if (!Number.isFinite(id) || !name) return null;
      return { id, name, level };
    })
    .filter((member): member is RankingMember => member !== null);
}

export async function saveRankingMembers(members: RankingMember[]): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  // Fetch category mappings
  const { data: categories, error: catError } = await context.client
    .from("ranking_categories")
    .select("id, name");

  if (catError) throw catError;

  const categoryMap = new Map(
    (categories || []).map((cat: any) => [String(cat.name).toLowerCase(), Number(cat.id)])
  );

  // Convert to normalized format with category_id and upsert each member
  const rows = members.map((member) => {
    const levelName = String(member.level || "Lo").toLowerCase();
    const categoryId = categoryMap.get(levelName) || categoryMap.get("lo") || 1;

    return {
      id: member.id,
      name: member.name,
      category_id: categoryId,
    };
  });

  const { error } = await context.client
    .from("ranking_members")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;
}


export async function getRankingMatches(): Promise<RankingMatch[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  // Fetch matches with their players and sets
  const { data: matches, error: matchError } = await context.client
    .from("ranking_matches")
    .select("*");

  if (matchError) throw matchError;
  if (!matches || matches.length === 0) return [];

  // Build result map to preserve order
  const result: RankingMatch[] = [];

  for (const match of matches) {
    const matchId = match.id;

    // Get players for this match
    const { data: players, error: playerError } = await context.client
      .from("ranking_match_players")
      .select("ranking_members(name), team")
      .eq("match_id", matchId);

    if (playerError) throw playerError;

    // Get sets for this match
    const { data: sets, error: setsError } = await context.client
      .from("ranking_match_sets")
      .select("*")
      .eq("match_id", matchId)
      .order("set_number", { ascending: true });

    if (setsError) throw setsError;

    // Organize players by team
    const team1Names: string[] = [];
    const team2Names: string[] = [];

    for (const player of players || []) {
      const name = String((player.ranking_members as any)?.name || "").trim();
      if (!name) continue;

      if (player.team === 1) {
        team1Names.push(name);
      } else if (player.team === 2) {
        team2Names.push(name);
      }
    }

    // Format sets as strings (e.g., "21-19")
    const setStrings = (sets || []).map((s: any) => `${s.team1_score}-${s.team2_score}`);

    if (team1Names.length > 0 && team2Names.length > 0) {
      result.push({
        id: matchId,
        type: match.type,
        team1: team1Names,
        team2: team2Names,
        sets: setStrings,
        date: match.date,
      });
    }
  }

  return result;
}

export async function saveRankingMatches(matches: RankingMatch[]): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  for (const match of matches) {
    // Insert or update the match record
    const { data: insertedMatch, error: matchError } = await context.client
      .from("ranking_matches")
      .upsert(
        {
          id: match.id,
          type: match.type,
          date: match.date,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (matchError) throw matchError;

    const matchId = insertedMatch.id;

    // Delete existing players for this match
    const { error: deleteError } = await context.client
      .from("ranking_match_players")
      .delete()
      .eq("match_id", matchId);

    if (deleteError) throw deleteError;

    // Insert new players
    const playerRows = [];
    for (const team of [1, 2]) {
      const teamNames = team === 1 ? match.team1 : match.team2;
      for (const name of teamNames) {
        // Get member ID by name
        const { data: member, error: memberError } = await context.client
          .from("ranking_members")
          .select("id")
          .eq("name", name)
          .single();

        if (memberError && memberError.code !== "PGRST116") throw memberError;
        if (!member) continue;

        playerRows.push({
          match_id: matchId,
          member_id: member.id,
          team,
        });
      }
    }

    if (playerRows.length > 0) {
      const { error: playerError } = await context.client
        .from("ranking_match_players")
        .insert(playerRows);

      if (playerError) throw playerError;
    }

    // Delete existing sets for this match
    const { error: deleteSetError } = await context.client
      .from("ranking_match_sets")
      .delete()
      .eq("match_id", matchId);

    if (deleteSetError) throw deleteSetError;

    // Insert new sets
    const setRows = match.sets.map((setStr, idx) => {
      const [team1Score, team2Score] = setStr.split("-").map((s) => parseInt(s, 10));
      return {
        match_id: matchId,
        set_number: idx + 1,
        team1_score: team1Score || 0,
        team2_score: team2Score || 0,
      };
    });

    if (setRows.length > 0) {
      const { error: setError } = await context.client
        .from("ranking_match_sets")
        .insert(setRows);

      if (setError) throw setError;
    }
  }
}


function mapRankingCategoryRecord(row: any): RankingCategory | null {
  const name = String(row.name || "").trim();
  const displayName = String(row.display_name || "").trim();
  const order = Number(row.order);

  if (!name || !displayName) return null;

  return {
    id: row.id,
    name,
    displayName,
    order: Number.isFinite(order) ? order : 0,
    createdAt: row.client_created_at || row.created_at,
  };
}

export async function getRankingCategories(): Promise<RankingCategory[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client
    .from("ranking_categories")
    .select("*")
    .order("order", { ascending: true });

  if (error) throw error;

  return (data || [])
    .map((row) => mapRankingCategoryRecord(row))
    .filter((category): category is RankingCategory => category !== null)
    .sort((a, b) => a.order - b.order || a.displayName.localeCompare(b.displayName, "vi"));
}

export async function createRankingCategory(input: {
  name: string;
  displayName: string;
  order: number;
}): Promise<RankingCategory> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const name = String(input.name || "").trim();
  const displayName = String(input.displayName || "").trim();
  const order = Number(input.order);

  if (!name) throw new Error("Category name is required");
  if (!displayName) throw new Error("Category displayName is required");
  if (!Number.isFinite(order)) throw new Error("Category order is invalid");

  const { data, error } = await context.client
    .from("ranking_categories")
    .insert({
      name,
      display_name: displayName,
      order,
      created_at: new Date().toISOString(),
      client_created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name,
    displayName,
    order,
    createdAt: new Date().toISOString(),
  };
}

export async function updateRankingCategory(
  id: string,
  patch: Partial<{ displayName: string; order: number }>
): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedId = String(id || "").trim();
  if (!normalizedId) throw new Error("Missing category id");

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    client_updated_at: new Date().toISOString(),
  };

  if (typeof patch.displayName === "string") {
    const displayName = patch.displayName.trim();
    if (!displayName) throw new Error("Category displayName is required");
    updatePayload.display_name = displayName;
  }

  if (patch.order !== undefined) {
    const order = Number(patch.order);
    if (!Number.isFinite(order)) throw new Error("Category order is invalid");
    updatePayload.order = order;
  }

  const { error } = await context.client
    .from("ranking_categories")
    .update(updatePayload)
    .eq("id", normalizedId);

  if (error) throw error;
}

export async function deleteRankingCategory(id: string): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedId = String(id || "").trim();
  if (!normalizedId) throw new Error("Missing category id");

  const { error } = await context.client
    .from("ranking_categories")
    .delete()
    .eq("id", normalizedId);

  if (error) throw error;
}

export async function saveRankingSnapshot(ranks: RankingSnapshotEntry[]): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedRanks = Array.isArray(ranks)
    ? ranks
        .map((entry) => ({
          memberId: Number(entry.memberId),
          memberName: String(entry.memberName || "").trim(),
          rank: Number(entry.rank),
          rankScore: Number(entry.rankScore),
        }))
        .filter(
          (entry) =>
            Number.isFinite(entry.memberId) &&
            !!entry.memberName &&
            Number.isFinite(entry.rank) &&
            Number.isFinite(entry.rankScore)
        )
    : [];

  const { error } = await context.client.from("ranking_snapshots").insert({
    ranks: normalizedRanks,
    created_at: new Date().toISOString(),
    client_created_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getLatestRankingSnapshot(): Promise<RankingSnapshot | null> {
  const context = ensureSupabase();
  if (!context.client) {
    return null;
  }

  const { data, error } = await context.client
    .from("ranking_snapshots")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  const ranksRaw = Array.isArray(data.ranks) ? data.ranks : [];
  const ranks = ranksRaw
    .map((entry: any): RankingSnapshotEntry | null => {
      const memberId = Number(entry?.memberId);
      const memberName = String(entry?.memberName || "").trim();
      const rank = Number(entry?.rank);
      const rankScore = Number(entry?.rankScore);

      if (!Number.isFinite(memberId) || !memberName || !Number.isFinite(rank) || !Number.isFinite(rankScore)) {
        return null;
      }

      return { memberId, memberName, rank, rankScore };
    })
    .filter((entry: any): entry is RankingSnapshotEntry => entry !== null);

  return {
    id: data.id,
    createdAt: data.client_created_at || data.created_at,
    ranks,
  };
}

function normalizeUsernameKey(username: string): string {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function mapUserRecord(row: any): UserRecord {
  return {
    id: row.id,
    username: String(row.username || ""),
    usernameKey: String(row.username_key || ""),
    password: String(row.password || ""),
    role: row.role === "admin" ? "admin" : "member",
    createdAt: row.client_created_at || row.created_at,
    lastLoginAt: row.client_last_login_at || row.last_login_at,
    isDisabled: Boolean(row.is_disabled),
  };
}

export async function getUsers(): Promise<UserRecord[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client.from("users").select("*");

  if (error) throw error;

  return (data || [])
    .map((row) => mapUserRecord(row))
    .filter((user) => !!user.username)
    .sort((a, b) => a.username.localeCompare(b.username, "vi"));
}


// ============================================================================
// PASSWORD VERIFICATION & HASHING
// ============================================================================

export async function verifyPassword(plaintext: string, storedHash: string): Promise<boolean> {
  return verifyMd5(plaintext, storedHash);
}

export async function hashPassword(plaintext: string): Promise<string> {
  return hashMd5(plaintext);
}

export async function getUserByUsername(username: string): Promise<UserRecord | null> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;

  const { data, error } = await context.client
    .from("users")
    .select("*")
    .eq("username_key", usernameKey)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  if (!data) return null;

  return mapUserRecord(data);
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role: UserRole;
}): Promise<UserRecord> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const username = String(input.username || "").trim();
  const usernameKey = normalizeUsernameKey(username);
  const passwordHash = String(input.passwordHash || "").trim();
  const role: UserRole = input.role === "admin" ? "admin" : "member";

  if (!username) throw new Error("Username is required");
  if (!passwordHash) throw new Error("Password hash is required");

  const existingUser = await getUserByUsername(username);
  if (existingUser) {
    throw new Error("Username already exists");
  }

  const { data, error } = await context.client
    .from("users")
    .insert({
      username,
      username_key: usernameKey,
      password: passwordHash,
      role,
      is_disabled: false,
      last_login_at: null,
      client_last_login_at: null,
      created_at: new Date().toISOString(),
      client_created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return mapUserRecord(data);
}

export async function setUserDisabled(userId: string, disabled: boolean): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const { error } = await context.client
    .from("users")
    .update({
      is_disabled: !!disabled,
      updated_at: new Date().toISOString(),
      client_updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedUserId);

  if (error) throw error;
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const now = new Date().toISOString();
  const { error } = await context.client
    .from("users")
    .update({
      last_login_at: now,
      client_last_login_at: now,
      updated_at: now,
      client_updated_at: now,
    })
    .eq("id", normalizedUserId);

  if (error) throw error;
}

export async function deleteUser(userId: string): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const { error } = await context.client
    .from("users")
    .delete()
    .eq("id", normalizedUserId);

  if (error) throw error;
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const { error } = await context.client
    .from("users")
    .update({
      role: role === "admin" ? "admin" : "member",
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedUserId);

  if (error) throw error;
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  const normalizedPasswordHash = String(passwordHash || "").trim();

  if (!normalizedUserId) throw new Error("Missing user id");
  if (!normalizedPasswordHash) throw new Error("Missing password hash");

  const { error } = await context.client
    .from("users")
    .update({
      password: normalizedPasswordHash,
      updated_at: new Date().toISOString(),
    })
    .eq("id", normalizedUserId);

  if (error) throw error;
}

function mapMatchRecord(row: any): MatchRecord {
  const durationMinutesRaw = Number(row.duration_minutes);
  return {
    id: row.id,
    playerA: String(row.player_a || ""),
    playerB: String(row.player_b || ""),
    score: String(row.score || ""),
    playedAt: typeof row.played_at === "string" && row.played_at.trim() ? row.played_at : undefined,
    durationMinutes:
      Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0 ? durationMinutesRaw : undefined,
    createdBy: String(row.created_by || ""),
    createdByUsername: String(row.created_by_username || ""),
    createdAt: typeof row.client_created_at === "string" ? row.client_created_at : undefined,
  };
}

export async function getMatches(): Promise<MatchRecord[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client.from("matches").select("*");

  if (error) throw error;

  return (data || [])
    .map((row) => mapMatchRecord(row))
    .filter((match) => match.playerA && match.playerB && match.score)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}


export async function createMatch(input: {
  playerA: string;
  playerB: string;
  score: string;
  matchType?: "singles" | "doubles";
  playedAt?: string;
  durationMinutes?: number;
  createdBy?: string;
  createdByUsername?: string;
}): Promise<MatchRecord> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const playerA = String(input.playerA || "").trim();
  const playerB = String(input.playerB || "").trim();
  const score = String(input.score || "").trim();
  const playedAt = String(input.playedAt || "").trim();
  const durationMinutes = Number(input.durationMinutes);
  const createdByUsername = String(input.createdByUsername || "").trim();
  const matchType = input.matchType === "singles" ? "singles" : "doubles";

  if (!playerA || !playerB || !score) throw new Error("Invalid match payload");
  if (!createdByUsername) throw new Error("Missing creator username");

  // Look up user UUID by username
  console.log("[createMatch] Looking up user:", { createdByUsername });
  const user = await getUserByUsername(createdByUsername);
  console.log("[createMatch] User lookup result:", { user });
  if (!user) throw new Error(`User not found: ${createdByUsername}`);

  const now = new Date().toISOString();
  const insertPayload = {
    match_type: matchType,
    player_a: playerA,
    player_b: playerB,
    score,
    played_at: playedAt || now,
    duration_minutes:
      Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : null,
    created_by: user.id,
    created_by_username: createdByUsername,
    created_at: now,
    client_created_at: now,
  };

  console.log("[createMatch] Inserting match with payload:", insertPayload);
  const { data, error } = await context.client
    .from("matches")
    .insert(insertPayload)
    .select();

  console.log("[createMatch] Insert result:", { data, error });
  if (error) throw error;

  // Return the inserted record from database
  const inserted = data?.[0];
  if (!inserted) {
    throw new Error("Failed to retrieve inserted match record");
  }

  return mapMatchRecord(inserted);
}

export async function deleteMatch(matchId: string): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const normalizedMatchId = String(matchId || "").trim();
  if (!normalizedMatchId) throw new Error("Missing match id");

  const { error } = await context.client
    .from("matches")
    .delete()
    .eq("id", normalizedMatchId);

  if (error) throw error;
}

function mapAuditEventRecord(row: any): AuditEventRecord {
  const rawParams = row.params && typeof row.params === "object" ? row.params : {};
  const rawUserProperties = row.user_properties && typeof row.user_properties === "object" ? row.user_properties : {};

  const normalizeObject = (
    input: Record<string, unknown>
  ): Record<string, string | number | boolean | null> => {
    return Object.entries(input).reduce<Record<string, string | number | boolean | null>>((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value;
        return acc;
      }
      if (typeof value === "number" && Number.isFinite(value)) {
        acc[key] = value;
        return acc;
      }
      if (typeof value === "boolean") {
        acc[key] = value;
        return acc;
      }
      if (value === null) {
        acc[key] = null;
      }
      return acc;
    }, {});
  };

  const eventName = String(row.event_name || "").trim();
  const rawEventType = String(row.event_type || "").trim();
  const eventType =
    rawEventType === "route_change"
      ? "route_change"
      : rawEventType === "event"
        ? "event"
        : eventName === "route_change"
          ? "route_change"
          : "event";

  return {
    id: row.id,
    eventName,
    eventType,
    params: normalizeObject(rawParams),
    userProperties: normalizeObject(rawUserProperties),
    pagePath: typeof row.page_path === "string" && row.page_path.trim() ? row.page_path : undefined,
    mode: typeof row.mode === "string" && row.mode.trim() ? row.mode : undefined,
    createdAt: row.client_created_at || row.created_at,
  };
}

export async function createAuditEvent(input: {
  eventName: string;
  eventType?: "event" | "route_change";
  params?: Record<string, string | number | boolean | null>;
  userProperties?: Record<string, string | number | boolean | null>;
  pagePath?: string;
  mode?: string;
}): Promise<void> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const eventName = String(input.eventName || "").trim();
  const eventType = input.eventType === "route_change" ? "route_change" : "event";
  if (!eventName) {
    throw new Error("Missing event name");
  }

  const { error } = await context.client.from("audit_events").insert({
    event_name: eventName,
    event_type: eventType,
    params: input.params || {},
    user_properties: input.userProperties || {},
    page_path: String(input.pagePath || "").trim() || null,
    mode: String(input.mode || "").trim() || envConfig.mode,
    created_at: new Date().toISOString(),
    client_created_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getRecentAuditEvents(maxItems = 200): Promise<AuditEventRecord[]> {
  const context = ensureSupabase();
  if (!context.client) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await context.client
    .from("audit_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(maxItems);

  if (error) throw error;

  return (data || [])
    .map((row) => mapAuditEventRecord(row))
    .filter((audit) => !!audit.eventName);
}

