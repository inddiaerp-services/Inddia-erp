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
import { authStore } from "../store/authStore";
import { getAdminApiEndpoints, getAdminApiUnavailableMessage } from "../utils/adminApi";

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

const isFirestoreFallbackError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  const code = String((error as { code?: string } | null)?.code ?? "").toLowerCase();
  return (
    message.includes("missing or insufficient permissions") ||
    message.includes("permission-denied") ||
    code.includes("permission-denied") ||
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("quota-exceeded") ||
    code.includes("resource-exhausted") ||
    message.includes("failed-precondition") ||
    code.includes("failed-precondition")
  );
};

const getCurrentSchoolContext = () => {
  const state = authStore.getState();
  return state.school?.id ?? state.user?.schoolId ?? null;
};

const getCurrentAccessToken = async () => {
  const state = authStore.getState();
  if (state.session?.accessToken) {
    return state.session.accessToken;
  }

  if (firebaseAuth?.currentUser) {
    return firebaseAuth.currentUser.getIdToken();
  }

  return "";
};

const postAdminApi = async <T>(action: string, payload: Record<string, unknown>): Promise<T> => {
  const accessToken = await getCurrentAccessToken();
  if (!accessToken) {
    throw new Error("Session not found. Sign in again.");
  }

  const endpoints = getAdminApiEndpoints();
  if (endpoints.length === 0) {
    throw new Error(getAdminApiUnavailableMessage());
  }

  let lastError: unknown = null;

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, payload }),
      });

      const raw = await response.text();
      let parsed: { data?: T; error?: string } = { data: undefined };
      if (raw) {
        try {
          parsed = JSON.parse(raw) as { data?: T; error?: string };
        } catch {
          parsed = { error: raw };
        }
      }

      if (!response.ok || parsed.error) {
        throw new Error(parsed.error ?? `Admin API request failed (${response.status} ${response.statusText}).`);
      }

      return parsed.data as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(getAdminApiUnavailableMessage());
};

const fallbackListFirestoreCollection = async (collectionName: string) =>
  postAdminApi<FirebaseDocRecord[]>("list_firestore_collection", {
    collectionName,
    schoolId: getCurrentSchoolContext(),
  });

const fallbackGetFirestoreDocument = async (collectionName: string, id: string) =>
  postAdminApi<FirebaseDocRecord | null>("get_firestore_document", {
    collectionName,
    id,
    schoolId: getCurrentSchoolContext(),
  });

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
    try {
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
    } catch (error) {
      if (!isFirestoreFallbackError(error)) {
        throw error;
      }

      logFirestoreEvent("fallback", `query:${collectionName}`);
      const docs = await fallbackListFirestoreCollection(collectionName);
      const filtered = docs.filter((item) =>
        filters.every((filter) => {
          const value = item.data[filter.field];
          return serializeValue(value) === serializeValue(filter.value);
        }),
      );

      return typeof limitCount === "number" ? filtered.slice(0, limitCount) : filtered;
    }
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
    try {
      const snapshot = await firebaseGetDoc(firebaseDoc(db, collectionName, id));
      if (!snapshot.exists()) {
        return null;
      }

      return {
        id: snapshot.id,
        data: snapshot.data() as Record<string, unknown>,
      };
    } catch (error) {
      if (!isFirestoreFallbackError(error)) {
        throw error;
      }

      logFirestoreEvent("fallback", `doc:${collectionName}:${id}`);
      return fallbackGetFirestoreDocument(collectionName, id);
    }
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
