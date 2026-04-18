import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from "firebase/firestore";

function loadEnvFile() {
  const localEnvPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(localEnvPath)) return;

  const content = fs.readFileSync(localEnvPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value.replace(/^['\"]|['\"]$/g, "");
    }
  }
}

function ensureConfig() {
  loadEnvFile();

  const apiKey = process.env.VITE_FIREBASE_API_KEY || "";
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "";

  if (!apiKey || !projectId) {
    throw new Error(
      "Missing VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID. Add them in shell env or .env.local.",
    );
  }

  return {
    apiKey,
    projectId,
    authDomain: `${projectId}.firebaseapp.com`,
    storageBucket: `${projectId}.firebasestorage.app`,
    messagingSenderId: "827626639989",
    appId: "1:827626639989:web:432cc64bc40b990c0e5e3c",
    measurementId: "G-VZL5Q3J2F2",
  };
}

async function runMigration() {
  const firebaseConfig = ensureConfig();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const usersRef = collection(db, "dev-users");
  const adminUsersSnapshot = await getDocs(
    query(usersRef, where("usernameKey", "==", "admin")),
  );

  if (adminUsersSnapshot.empty) {
    console.log("No user with usernameKey=admin found in dev-users.");
  } else {
    for (const userDoc of adminUsersSnapshot.docs) {
      await setDoc(
        userDoc.ref,
        {
          username: "bi",
          usernameKey: "bi",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      console.log(`Updated user ${userDoc.id}: admin -> bi`);
    }
  }

  const matchesRef = collection(db, "dev-matches");
  const adminMatchesSnapshot = await getDocs(
    query(matchesRef, where("createdByUsername", "==", "admin")),
  );

  if (adminMatchesSnapshot.empty) {
    console.log(
      "No matches with createdByUsername=admin found in dev-matches.",
    );
  } else {
    const batch = writeBatch(db);
    for (const matchDoc of adminMatchesSnapshot.docs) {
      batch.set(
        matchDoc.ref,
        {
          createdByUsername: "bi",
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
    await batch.commit();
    console.log(
      `Updated ${adminMatchesSnapshot.size} match documents: createdByUsername admin -> bi`,
    );
  }

  console.log("Migration completed.");
}

runMigration().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
