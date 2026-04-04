import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "",
};

export const hasFirebaseConfig = Object.values(firebaseConfig).every((value) => Boolean(String(value).trim()));

const createFirebaseApp = (): FirebaseApp | null => {
  if (!hasFirebaseConfig) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
};

export const firebaseApp = createFirebaseApp();
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null;
export const firebaseDb: Firestore | null = firebaseApp ? getFirestore(firebaseApp) : null;

let persistenceReady: Promise<void> | null = null;

export const ensureFirebasePersistence = async () => {
  if (!firebaseAuth) return;
  if (!persistenceReady) {
    persistenceReady = setPersistence(firebaseAuth, browserLocalPersistence).then(() => undefined);
  }
  await persistenceReady;
};

