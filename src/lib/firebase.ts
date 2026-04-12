import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { envConfig } from "../env";
import type { SessionPayload, SessionRecord } from "../types";

let app: FirebaseApp | null = null;
let ready = false;

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
  const sessionRef = doc(
    collection(context.db, envConfig.firebaseCollection),
    dateKey,
  );

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

  const sessionsRef = collection(context.db, envConfig.firebaseCollection);
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

  await deleteDoc(doc(collection(context.db, envConfig.firebaseCollection), id));
  return { id };
}
