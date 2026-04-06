import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const loadEnvFile = (filename) => {
  const filepath = resolve(process.cwd(), filename);
  if (!existsSync(filepath)) return;

  const content = readFileSync(filepath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    process.env[key] = value;
  }
};

const stripWrappingQuotes = (value) => {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

loadEnvFile(".env");
loadEnvFile(".env.server");

const firebaseProjectId = stripWrappingQuotes(process.env.FIREBASE_PROJECT_ID || "");
const firebaseClientEmail = stripWrappingQuotes(process.env.FIREBASE_CLIENT_EMAIL || "");
const firebasePrivateKey = stripWrappingQuotes(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

const hasFirebaseAdminConfig = Boolean(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);

const createFirebaseAdminApp = () => {
  if (!hasFirebaseAdminConfig) {
    return null;
  }

  return getApps().length > 0
    ? getApp()
    : initializeApp({
        credential: cert({
          projectId: firebaseProjectId,
          clientEmail: firebaseClientEmail,
          privateKey: firebasePrivateKey,
        }),
      });
};

export const firebaseAdminApp = createFirebaseAdminApp();
export const firebaseAdminAuth = firebaseAdminApp ? getAuth(firebaseAdminApp) : null;
export const firebaseAdminDb = firebaseAdminApp ? getFirestore(firebaseAdminApp) : null;
export { hasFirebaseAdminConfig };
