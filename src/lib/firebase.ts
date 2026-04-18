import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { envConfig } from "../env";
import { normalizeRankingLevel } from "./rankingLevel";
import type {
  RankingMatch,
  RankingMember,
  SessionPayload,
  SessionRecord,
} from "../types";

let app: FirebaseApp | null = null;
let ready = false;

const RANKING_MEMBERS_COLLECTION = "ranking-members";
const RANKING_MATCHES_COLLECTION = "ranking-matches";
const RANKING_STATE_DOC_ID = "state";

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

function withDevCollectionPrefix(collectionName: string): string {
  const normalized = String(collectionName || "").trim();
  if (!normalized) return normalized;
  if (import.meta.env.DEV && !normalized.startsWith("dev-")) {
    return `dev-${normalized}`;
  }
  return normalized;
}

function getCollectionPath(collectionName: string): string {
  return withDevCollectionPrefix(collectionName);
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
    .map((item) => {
      const id = Number(item?.id);
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

      if (!Number.isFinite(id) || team1.length === 0 || team2.length === 0) {
        return null;
      }

      return { id, type, team1, team2, sets, date };
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
