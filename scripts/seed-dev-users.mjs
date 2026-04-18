import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp } from "firebase/app";
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import md5 from "blueimp-md5";

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

const DEFAULT_USERS = [
  {
    docId: "seed-admin",
    username: "admin",
    password: "loveguitar",
    role: "admin",
  },
  {
    docId: "seed-thien",
    username: "thien",
    password: "badguys",
    role: "member",
  },
];

async function seed() {
  const firebaseConfig = ensureConfig();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  for (const user of DEFAULT_USERS) {
    const userRef = doc(db, "dev-users", user.docId);
    const existingSnapshot = await getDoc(userRef);

    await setDoc(userRef, {
      username: user.username,
      usernameKey: user.username.toLowerCase(),
      password: md5(user.password),
      role: user.role,
      createdAt: serverTimestamp(),
      clientCreatedAt: new Date().toISOString(),
    }, { merge: true });

    if (existingSnapshot.exists()) {
      console.log(`Updated user: ${user.username} (${user.role})`);
    } else {
      console.log(`Created user: ${user.username} (${user.role})`);
    }
  }

  console.log("Seed completed for dev-users.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
