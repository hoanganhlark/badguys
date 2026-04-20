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

const DEFAULT_CATEGORIES = [
  {
    docId: "yo",
    name: "Yo",
    displayName: "Yo",
    order: 1,
  },
  {
    docId: "lo",
    name: "Lo",
    displayName: "Lo",
    order: 2,
  },
  {
    docId: "ne",
    name: "Nè",
    displayName: "Nè",
    order: 3,
  },
];

function resolveCollectionName() {
  const useProductionCollection = process.argv.includes("--prod");
  return useProductionCollection
    ? "ranking-categories"
    : "dev-ranking-categories";
}

async function seed() {
  const firebaseConfig = ensureConfig();
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const collectionName = resolveCollectionName();

  for (const category of DEFAULT_CATEGORIES) {
    const categoryRef = doc(db, collectionName, category.docId);
    const existingSnapshot = await getDoc(categoryRef);

    await setDoc(
      categoryRef,
      {
        name: category.name,
        displayName: category.displayName,
        order: category.order,
        updatedAt: serverTimestamp(),
        clientUpdatedAt: new Date().toISOString(),
        createdAt: serverTimestamp(),
        clientCreatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    if (existingSnapshot.exists()) {
      console.log(
        `Updated category: ${category.displayName} (${collectionName}/${category.docId})`,
      );
    } else {
      console.log(
        `Created category: ${category.displayName} (${collectionName}/${category.docId})`,
      );
    }
  }

  console.log(`Seed completed for ${collectionName}.`);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});

