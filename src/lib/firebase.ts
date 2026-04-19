import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { envConfig } from "../env";
import { normalizeRankingLevel } from "./rankingLevel";
import type {
  MatchRecord,
  RankingMatch,
  RankingMember,
  SessionPayload,
  SessionRecord,
  UserRecord,
  UserRole,
} from "../types";

let app: FirebaseApp | null = null;
let ready = false;

const RANKING_MEMBERS_COLLECTION = "ranking-members";
const RANKING_MATCHES_COLLECTION = "ranking-matches";
const RANKING_STATE_DOC_ID = "state";
const USERS_COLLECTION = "users";
const MATCHES_COLLECTION = "matches";

function getSessionDateKey(now?: Date): string {
  const current = now || new Date();
  const dd = String(current.getDate()).padStart(2, "0");
  const mm = String(current.getMonth() + 1).padStart(2, "0");
  const yyyy = current.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

function ensureFirebase() {
  if (app) return { app, db: getFirestore(app), ready: true };

  const hasFirebaseApiKey =
    envConfig.firebaseApiKey &&
    !String(envConfig.firebaseApiKey).startsWith("__");
  const hasFirebaseProjectId =
    envConfig.firebaseProjectId &&
    !String(envConfig.firebaseProjectId).startsWith("__");

  if (!hasFirebaseApiKey || !hasFirebaseProjectId) {
    ready = false;
    return { app: null, db: null, ready: false };
  }

  const firebaseConfig = {
    apiKey: envConfig.firebaseApiKey,
    authDomain: `${envConfig.firebaseProjectId}.firebaseapp.com`,
    projectId: envConfig.firebaseProjectId,
    storageBucket: `${envConfig.firebaseProjectId}.firebasestorage.app`,
    messagingSenderId: "827626639989",
    appId: "1:827626639989:web:432cc64bc40b990c0e5e3c",
    measurementId: "G-VZL5Q3J2F2",
  };

  app = initializeApp(firebaseConfig);
  ready = true;
  return { app, db: getFirestore(app), ready: true };
}

function withEnvironmentCollectionPrefix(collectionName: string): string {
  const normalized = String(collectionName || "").trim();
  if (!normalized) return normalized;

  const withoutDevPrefix = normalized.startsWith("dev-")
    ? normalized.slice(4)
    : normalized;

  if (envConfig.isDevelopment) {
    if (!withoutDevPrefix) return "";
    return `dev-${withoutDevPrefix}`;
  }

  return withoutDevPrefix;
}

function getCollectionPath(collectionName: string): string {
  return withEnvironmentCollectionPrefix(collectionName);
}

export function isFirebaseReady(): boolean {
  ensureFirebase();
  return ready;
}

export async function saveDailySummary(
  payload: SessionPayload,
): Promise<{ dateKey: string }> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const dateKey = getSessionDateKey();
  const sessionsCollection = getCollectionPath(envConfig.firebaseCollection);
  const sessionRef = doc(collection(context.db, sessionsCollection), dateKey);

  await setDoc(
    sessionRef,
    {
      dateKey,
      summaryText: payload.summaryText || "",
      courtFee: payload.courtFee ?? 0,
      shuttleCount: payload.shuttleCount ?? 0,
      shuttleFee: payload.shuttleFee ?? 0,
      total: payload.total ?? 0,
      maleFee: payload.maleFee ?? 0,
      femaleFee: payload.femaleFee ?? 0,
      femalesCount: payload.femalesCount ?? 0,
      malesCount: payload.malesCount ?? 0,
      setPlayersCount: payload.setPlayersCount ?? 0,
      players: Array.isArray(payload.players) ? payload.players : [],
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return { dateKey };
}

export async function getRecentSessions(
  maxItems = 14,
): Promise<SessionRecord[]> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const sessionsRef = collection(
    context.db,
    getCollectionPath(envConfig.firebaseCollection),
  );
  const sessionsQuery = query(
    sessionsRef,
    orderBy("updatedAt", "desc"),
    limit(maxItems),
  );
  const snapshot = await getDocs(sessionsQuery);

  return snapshot.docs.map((sessionDoc) => ({
    id: sessionDoc.id,
    ...(sessionDoc.data() as Omit<SessionRecord, "id">),
  }));
}

export async function removeSession(
  sessionId: string,
): Promise<{ id: string }> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const id = String(sessionId || "").trim();
  if (!id) {
    throw new Error("Missing session id");
  }

  await deleteDoc(
    doc(
      collection(context.db, getCollectionPath(envConfig.firebaseCollection)),
      id,
    ),
  );
  return { id };
}

export async function getRankingMembers(): Promise<RankingMember[]> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const stateDocRef = doc(
    collection(context.db, getCollectionPath(RANKING_MEMBERS_COLLECTION)),
    RANKING_STATE_DOC_ID,
  );
  const snapshot = await getDoc(stateDocRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  const membersRaw = Array.isArray(data.members) ? data.members : [];

  return membersRaw
    .map((item) => {
      const id = Number(item?.id);
      const name = String(item?.name || "").trim();
      const level = normalizeRankingLevel(String(item?.level || "Lo"));

      if (!Number.isFinite(id) || !name) return null;
      return { id, name, level };
    })
    .filter((member): member is RankingMember => member !== null);
}

export async function saveRankingMembers(
  members: RankingMember[],
): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const stateDocRef = doc(
    collection(context.db, getCollectionPath(RANKING_MEMBERS_COLLECTION)),
    RANKING_STATE_DOC_ID,
  );

  await setDoc(
    stateDocRef,
    {
      members,
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function getRankingMatches(): Promise<RankingMatch[]> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const stateDocRef = doc(
    collection(context.db, getCollectionPath(RANKING_MATCHES_COLLECTION)),
    RANKING_STATE_DOC_ID,
  );
  const snapshot = await getDoc(stateDocRef);

  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  const matchesRaw = Array.isArray(data.matches) ? data.matches : [];

  return matchesRaw
    .map((item): RankingMatch | null => {
      const rawId = item?.id;
      const normalizedId =
        typeof rawId === "number" || typeof rawId === "string" ? rawId : null;
      const type = item?.type === "doubles" ? "doubles" : "singles";
      const team1 = Array.isArray(item?.team1)
        ? item.team1.map((name: unknown) => String(name))
        : [];
      const team2 = Array.isArray(item?.team2)
        ? item.team2.map((name: unknown) => String(name))
        : [];
      const sets = Array.isArray(item?.sets)
        ? item.sets.map((set: unknown) => String(set))
        : [];
      const date = String(item?.date || "");

      if (!normalizedId || team1.length === 0 || team2.length === 0) {
        return null;
      }

      return { id: normalizedId, type, team1, team2, sets, date };
    })
    .filter((match): match is RankingMatch => match !== null);
}

export async function saveRankingMatches(
  matches: RankingMatch[],
): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const stateDocRef = doc(
    collection(context.db, getCollectionPath(RANKING_MATCHES_COLLECTION)),
    RANKING_STATE_DOC_ID,
  );

  await setDoc(
    stateDocRef,
    {
      matches,
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

function normalizeUsernameKey(username: string): string {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function resolveDateLikeToIso(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") {
      const date = maybeTimestamp.toDate();
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }

  return undefined;
}

function mapUserRecord(userDoc: {
  id: string;
  data: () => Record<string, unknown>;
}): UserRecord {
  const data = userDoc.data();
  const createdAt =
    resolveDateLikeToIso(data.clientCreatedAt) ??
    resolveDateLikeToIso(data.createdAt);
  const lastLoginAt =
    resolveDateLikeToIso(data.clientLastLoginAt) ??
    resolveDateLikeToIso(data.lastLoginAt);

  return {
    id: userDoc.id,
    username: String(data.username || ""),
    usernameKey: String(data.usernameKey || ""),
    password: String(data.password || ""),
    role: data.role === "admin" ? "admin" : "member",
    createdAt,
    lastLoginAt,
    isDisabled: Boolean(data.isDisabled),
  };
}

export async function getUsers(): Promise<UserRecord[]> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const usersRef = collection(context.db, getCollectionPath(USERS_COLLECTION));
  const usersSnapshot = await getDocs(usersRef);

  return usersSnapshot.docs
    .map((userDoc) => mapUserRecord(userDoc))
    .filter((user) => !!user.username)
    .sort((a, b) => a.username.localeCompare(b.username, "vi"));
}

export function subscribeUsers(
  onData: (users: UserRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const usersRef = collection(context.db, getCollectionPath(USERS_COLLECTION));
  return onSnapshot(
    usersRef,
    (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => mapUserRecord(userDoc))
        .filter((user) => !!user.username)
        .sort((a, b) => a.username.localeCompare(b.username, "vi"));
      onData(users);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
}

export async function getUserByUsername(
  username: string,
): Promise<UserRecord | null> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const usernameKey = normalizeUsernameKey(username);
  if (!usernameKey) return null;

  const usersRef = collection(context.db, getCollectionPath(USERS_COLLECTION));
  const usersQuery = query(
    usersRef,
    where("usernameKey", "==", usernameKey),
    limit(1),
  );
  const snapshot = await getDocs(usersQuery);

  if (snapshot.empty) return null;
  return mapUserRecord(snapshot.docs[0]);
}

export async function createUser(input: {
  username: string;
  passwordHash: string;
  role: UserRole;
}): Promise<UserRecord> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
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

  const usersRef = collection(context.db, getCollectionPath(USERS_COLLECTION));
  const createdRef = await addDoc(usersRef, {
    username,
    usernameKey,
    password: passwordHash,
    role,
    isDisabled: false,
    lastLoginAt: null,
    clientLastLoginAt: null,
    createdAt: serverTimestamp(),
    clientCreatedAt: new Date().toISOString(),
  });

  return {
    id: createdRef.id,
    username,
    usernameKey,
    password: passwordHash,
    role,
    isDisabled: false,
    lastLoginAt: undefined,
    createdAt: new Date().toISOString(),
  };
}

export async function setUserDisabled(
  userId: string,
  disabled: boolean,
): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const userRef = doc(
    collection(context.db, getCollectionPath(USERS_COLLECTION)),
    normalizedUserId,
  );

  await setDoc(
    userRef,
    {
      isDisabled: !!disabled,
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const userRef = doc(
    collection(context.db, getCollectionPath(USERS_COLLECTION)),
    normalizedUserId,
  );

  await setDoc(
    userRef,
    {
      lastLoginAt: serverTimestamp(),
      clientLastLoginAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
      clientUpdatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function deleteUser(userId: string): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  await deleteDoc(
    doc(
      collection(context.db, getCollectionPath(USERS_COLLECTION)),
      normalizedUserId,
    ),
  );
}

export async function updateUserRole(
  userId: string,
  role: UserRole,
): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("Missing user id");

  const userRef = doc(
    collection(context.db, getCollectionPath(USERS_COLLECTION)),
    normalizedUserId,
  );

  await setDoc(
    userRef,
    {
      role: role === "admin" ? "admin" : "member",
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function updateUserPassword(
  userId: string,
  passwordHash: string,
): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedUserId = String(userId || "").trim();
  const normalizedPasswordHash = String(passwordHash || "").trim();

  if (!normalizedUserId) throw new Error("Missing user id");
  if (!normalizedPasswordHash) throw new Error("Missing password hash");

  const userRef = doc(
    collection(context.db, getCollectionPath(USERS_COLLECTION)),
    normalizedUserId,
  );

  await setDoc(
    userRef,
    {
      password: normalizedPasswordHash,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function mapMatchRecord(matchDoc: {
  id: string;
  data: () => Record<string, unknown>;
}): MatchRecord {
  const data = matchDoc.data();
  const durationMinutesRaw = Number(data.durationMinutes);
  return {
    id: matchDoc.id,
    playerA: String(data.playerA || ""),
    playerB: String(data.playerB || ""),
    score: String(data.score || ""),
    playedAt:
      typeof data.playedAt === "string" && data.playedAt.trim()
        ? data.playedAt
        : undefined,
    durationMinutes:
      Number.isFinite(durationMinutesRaw) && durationMinutesRaw > 0
        ? durationMinutesRaw
        : undefined,
    createdBy: String(data.createdBy || ""),
    createdByUsername: String(data.createdByUsername || ""),
    createdAt:
      typeof data.clientCreatedAt === "string"
        ? data.clientCreatedAt
        : undefined,
  };
}

export async function getMatches(): Promise<MatchRecord[]> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const matchesRef = collection(
    context.db,
    getCollectionPath(MATCHES_COLLECTION),
  );
  const snapshot = await getDocs(matchesRef);

  return snapshot.docs
    .map((matchDoc) => mapMatchRecord(matchDoc))
    .filter((match) => match.playerA && match.playerB && match.score)
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function subscribeMatches(
  onData: (matches: MatchRecord[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const matchesRef = collection(
    context.db,
    getCollectionPath(MATCHES_COLLECTION),
  );
  return onSnapshot(
    matchesRef,
    (snapshot) => {
      const matches = snapshot.docs
        .map((matchDoc) => mapMatchRecord(matchDoc))
        .filter((match) => match.playerA && match.playerB && match.score)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      onData(matches);
    },
    (error) => {
      if (onError) {
        onError(error);
      }
    },
  );
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
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const playerA = String(input.playerA || "").trim();
  const playerB = String(input.playerB || "").trim();
  const score = String(input.score || "").trim();
  const playedAt = String(input.playedAt || "").trim();
  const durationMinutes = Number(input.durationMinutes);
  const createdBy = String(input.createdBy || "").trim();
  const createdByUsername = String(input.createdByUsername || "").trim();

  if (!playerA || !playerB || !score) throw new Error("Invalid match payload");
  if (!createdBy) throw new Error("Missing creator");

  const matchesRef = collection(
    context.db,
    getCollectionPath(MATCHES_COLLECTION),
  );
  const createdRef = await addDoc(matchesRef, {
    playerA,
    playerB,
    score,
    playedAt: playedAt || new Date().toISOString(),
    durationMinutes:
      Number.isFinite(durationMinutes) && durationMinutes > 0
        ? durationMinutes
        : null,
    createdBy,
    createdByUsername,
    createdAt: serverTimestamp(),
    clientCreatedAt: new Date().toISOString(),
  });

  return {
    id: createdRef.id,
    playerA,
    playerB,
    score,
    playedAt: playedAt || new Date().toISOString(),
    durationMinutes:
      Number.isFinite(durationMinutes) && durationMinutes > 0
        ? durationMinutes
        : undefined,
    createdBy,
    createdByUsername,
    createdAt: new Date().toISOString(),
  };
}

export async function deleteMatch(matchId: string): Promise<void> {
  const context = ensureFirebase();
  if (!context.db) {
    throw new Error("Firebase is not configured");
  }

  const normalizedMatchId = String(matchId || "").trim();
  if (!normalizedMatchId) throw new Error("Missing match id");

  await deleteDoc(
    doc(
      collection(context.db, getCollectionPath(MATCHES_COLLECTION)),
      normalizedMatchId,
    ),
  );
}
