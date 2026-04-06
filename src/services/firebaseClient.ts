import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";
import { browserLocalPersistence, getAuth, setPersistence, signOut, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(String(value).trim()));
const FIREBASE_PROJECT_STORAGE_KEY = "inddia-active-firebase-project";

const getFirebaseProjectFingerprint = () =>
  [firebaseConfig.projectId, firebaseConfig.authDomain, firebaseConfig.appId].filter(Boolean).join("|");

const getFirebaseRuntimeAppName = () =>
  `inddia-erp-${String(firebaseConfig.projectId ?? "runtime").trim() || "runtime"}`;

const doesAppMatchFirebaseConfig = (app: FirebaseApp) =>
  app.options.projectId === firebaseConfig.projectId &&
  app.options.authDomain === firebaseConfig.authDomain &&
  app.options.appId === firebaseConfig.appId;

const createFirebaseApp = (): FirebaseApp | null => {
  if (!hasFirebaseConfig) {
    return null;
  }

  const matchingApp = getApps().find((app) => doesAppMatchFirebaseConfig(app));
  if (matchingApp) {
    return matchingApp;
  }

  const runtimeApp = getApps().find((app) => app.name === getFirebaseRuntimeAppName());
  if (runtimeApp && doesAppMatchFirebaseConfig(runtimeApp)) {
    return runtimeApp;
  }

  return initializeApp(firebaseConfig, getFirebaseRuntimeAppName());
};

export const firebaseApp = createFirebaseApp();
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

let analyticsReady: Promise<Analytics | null> | null = null;

export const getFirebaseAnalytics = async (): Promise<Analytics | null> => {
  if (!firebaseApp || typeof window === "undefined") {
    return null;
  }

  if (!analyticsReady) {
    analyticsReady = isSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }

  return analyticsReady;
};

const clearStoredFirebaseKeys = (storage: Storage) => {
  const keysToRemove: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith("firebase:")) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
};

export const syncFirebaseProjectConnection = async () => {
  if (typeof window === "undefined" || !hasFirebaseConfig) {
    return;
  }

  const nextFingerprint = getFirebaseProjectFingerprint();
  const previousFingerprint = window.localStorage.getItem(FIREBASE_PROJECT_STORAGE_KEY);

  if (previousFingerprint && previousFingerprint !== nextFingerprint) {
    clearStoredFirebaseKeys(window.localStorage);
    clearStoredFirebaseKeys(window.sessionStorage);

    if (firebaseAuth?.currentUser) {
      try {
        await signOut(firebaseAuth);
      } catch {
        // Best effort cleanup during Firebase project switching.
      }
    }
  }

  window.localStorage.setItem(FIREBASE_PROJECT_STORAGE_KEY, nextFingerprint);
};

let persistenceReady: Promise<void> | null = null;

export const ensureFirebasePersistence = async () => {
  if (!firebaseAuth) return;
  if (!persistenceReady) {
    persistenceReady = setPersistence(firebaseAuth, browserLocalPersistence).then(() => undefined);
  }
  await persistenceReady;
};
