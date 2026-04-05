import {
  collection as firebaseCollection,
  doc as firebaseDoc,
  getDoc as firebaseGetDoc,
  getDocs as firebaseGetDocs,
  limit as firebaseLimit,
  query as firebaseQuery,
  where as firebaseWhere,
  type QueryConstraint,
} from "firebase/firestore";
import { onAuthStateChanged, type Unsubscribe, type User as FirebaseUser } from "firebase/auth";
import { firebaseAuth, firebaseDb } from "./firebaseClient";

export type FirebaseFilter = {
  field: string;
  value: unknown;
};

export type FirebaseDocRecord = {
  id: string;
  data: Record<string, unknown>;
};

type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  promise?: Promise<T>;
};

type QueryCollectionOptions = {
  collectionName: string;
  filters?: FirebaseFilter[];
  limitCount?: number;
  cacheKey?: string;
  ttlMs?: number;
};

type GetDocumentOptions = {
  collectionName: string;
  id: string;
  cacheKey?: string;
  ttlMs?: number;
};

const FIREBASE_CACHE_TTL_MS = 30_000;
const firebaseCache = new Map<string, CacheEntry<unknown>>();
const FIRESTORE_DEBUG_PREFIX = "[Firestore]";

const isDev = () => Boolean(import.meta.env.DEV);

const serializeValue = (value: unknown) => {
  if (value == null) return "null";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const buildDefaultQueryCacheKey = ({ collectionName, filters = [], limitCount }: QueryCollectionOptions) =>
  `${collectionName}::${filters.map((filter) => `${filter.field}=${serializeValue(filter.value)}`).join("&")}::limit=${limitCount ?? "none"}`;

const logFirestoreEvent = (event: string, detail: string) => {
  if (!isDev()) return;
  console.debug(`${FIRESTORE_DEBUG_PREFIX} ${event} ${detail}`);
};

const readCachedValue = async <T>(cacheKey: string, loader: () => Promise<T>, ttlMs: number) => {
  const now = Date.now();
  const cached = firebaseCache.get(cacheKey) as CacheEntry<T> | undefined;

  if (cached?.value !== undefined && cached.expiresAt > now) {
    logFirestoreEvent("cache-hit", cacheKey);
    return cached.value;
  }

  if (cached?.promise) {
    logFirestoreEvent("dedupe-hit", cacheKey);
    return cached.promise;
  }

  logFirestoreEvent("read", cacheKey);
  const promise = loader()
    .then((value) => {
      firebaseCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      firebaseCache.delete(cacheKey);
      throw error;
    });

  firebaseCache.set(cacheKey, {
    expiresAt: now + ttlMs,
    promise,
  });

  return promise;
};

export const invalidateFirebaseCache = (prefixes?: string[]) => {
  if (!prefixes?.length) {
    firebaseCache.clear();
    return;
  }

  Array.from(firebaseCache.keys())
    .filter((key) => prefixes.some((prefix) => key.startsWith(prefix)))
    .forEach((key) => firebaseCache.delete(key));
};

export const queryFirestoreCollectionCached = async ({
  collectionName,
  filters = [],
  limitCount,
  cacheKey = buildDefaultQueryCacheKey({ collectionName, filters, limitCount }),
  ttlMs = FIREBASE_CACHE_TTL_MS,
}: QueryCollectionOptions): Promise<FirebaseDocRecord[]> => {
  if (!firebaseDb) return [];
  const db = firebaseDb;

  return readCachedValue(cacheKey, async () => {
    const constraints: QueryConstraint[] = filters.map((filter) =>
      firebaseWhere(filter.field, "==", filter.value),
    );

    if (typeof limitCount === "number") {
      constraints.push(firebaseLimit(limitCount));
    }

    const snapshot = await firebaseGetDocs(
      firebaseQuery(firebaseCollection(db, collectionName), ...constraints),
    );

    return snapshot.docs.map((item) => ({
      id: item.id,
      data: item.data() as Record<string, unknown>,
    }));
  }, ttlMs);
};

export const getFirestoreDocumentCached = async ({
  collectionName,
  id,
  cacheKey = `${collectionName}::doc::${id}`,
  ttlMs = FIREBASE_CACHE_TTL_MS,
}: GetDocumentOptions): Promise<FirebaseDocRecord | null> => {
  if (!firebaseDb) return null;
  const db = firebaseDb;

  return readCachedValue(cacheKey, async () => {
    const snapshot = await firebaseGetDoc(firebaseDoc(db, collectionName, id));
    if (!snapshot.exists()) {
      return null;
    }

    return {
      id: snapshot.id,
      data: snapshot.data() as Record<string, unknown>,
    };
  }, ttlMs);
};

const authListeners = new Set<(user: FirebaseUser | null) => void>();
let authSubscription: Unsubscribe | null = null;

export const subscribeToFirebaseAuthState = (listener: (user: FirebaseUser | null) => void) => {
  authListeners.add(listener);

  if (firebaseAuth && !authSubscription) {
    authSubscription = onAuthStateChanged(firebaseAuth, (user) => {
      authListeners.forEach((currentListener) => currentListener(user));
    });
  }

  return () => {
    authListeners.delete(listener);

    if (authListeners.size === 0 && authSubscription) {
      authSubscription();
      authSubscription = null;
    }
  };
};
