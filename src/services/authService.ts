import {
  EmailAuthProvider,
  type User as FirebaseUser,
  getIdTokenResult,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword as updateFirebasePassword,
} from "firebase/auth";
import { ROLES, type AppRole } from "../config/roles";
import { authStore, getBootstrapAdmin, type AppSession, type AuthUser, type CurrentSchool } from "../store/authStore";
import { ensureFirebasePersistence, firebaseAuth, firebaseDb, hasFirebaseConfig } from "./firebaseClient";
import { getFirestoreDocumentCached, queryFirestoreCollectionCached, subscribeToFirebaseAuthState } from "./firebaseService";
import { getAdminApiEndpoints, getAdminApiUnavailableMessage } from "../utils/adminApi";

const DEFAULT_ADMIN = {
  email: "superadmin@gmail.com",
  password: "admin123",
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    name: "INDDIA ERP Super Admin",
    email: "superadmin@gmail.com",
    role: ROLES.SUPER_ADMIN,
    schoolId: null,
    isBootstrapAdmin: true,
  } satisfies AuthUser,
};

const isDefaultAdminLogin = (email: string, password: string) =>
  email.trim().toLowerCase() === DEFAULT_ADMIN.email && password === DEFAULT_ADMIN.password;

type UsersRow = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  school_id: string | null;
};

type SchoolRow = {
  id: string;
  name: string;
  subscription_status: "Active" | "Expired" | "Trial" | "Suspended";
  subscription_plan: string | null;
  expiry_date: string | null;
  theme_color: string | null;
};

const normalizeRole = (role: string | null | undefined): AppRole => {
  const value = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (value === ROLES.SUPER_ADMIN || value === "superadmin" || value === "platform_owner") return ROLES.SUPER_ADMIN;
  if (value === ROLES.ADMIN || value === "school_admin") return ROLES.ADMIN;
  if (value === ROLES.PRINCIPAL) return ROLES.PRINCIPAL;
  if (value === ROLES.PARENT) return ROLES.PARENT;
  if (value === ROLES.STUDENT) return ROLES.STUDENT;
  if (["staff", "teacher", "hr", "accounts", "transport", "admission"].includes(value)) return ROLES.STAFF;
  return ROLES.STAFF;
};

const ensureSingleRow = <T>(rows: T[], emptyMessage: string, duplicateMessage: string) => {
  if (rows.length === 0) {
    throw new Error(emptyMessage);
  }
  if (rows.length > 1) {
    throw new Error(duplicateMessage);
  }
  return rows[0];
};

const mapUser = (user: UsersRow): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  schoolId: user.school_id,
});

const mapSchool = (school: SchoolRow): CurrentSchool => ({
  id: school.id,
  name: school.name,
  subscriptionStatus: school.subscription_status,
  subscriptionPlan: school.subscription_plan,
  expiryDate: school.expiry_date,
  themeColor: school.theme_color,
});

const createSchoolFallback = (schoolId: string): CurrentSchool => ({
  id: schoolId,
  name: "School Workspace",
  subscriptionStatus: "Trial",
  subscriptionPlan: null,
  expiryDate: null,
  themeColor: null,
});

type SessionHints = {
  hintedRole: AppRole;
  hintedSchoolId: string | null;
  hintedName: string;
};

type ResolvedAuthState = {
  user: AuthUser | null;
  role: AppRole | null;
  school: CurrentSchool | null;
  session: AppSession | null;
};

type BackendAuthContext = {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string | null;
    school_id: string | null;
  };
  school: SchoolRow | null;
};

const schoolProfileCache = new Map<string, Promise<CurrentSchool | null>>();
const userProfileCache = new Map<string, Promise<AuthUser>>();
const userProfileByEmailCache = new Map<string, Promise<AuthUser>>();
let lastResolvedAuthState: { uid: string; value: ResolvedAuthState } | null = null;
const AUTH_CONTEXT_CACHE_TTL_MS = 60_000;
const authContextCache = new Map<string, { expiresAt: number; value: ResolvedAuthState }>();

const postToAdminApi = async (body: string, accessToken: string) => {
  let lastError: unknown = null;
  const endpoints = getAdminApiEndpoints();

  if (endpoints.length === 0) {
    throw new Error(getAdminApiUnavailableMessage());
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });

      if (response.status === 404 && endpoint.startsWith("/")) {
        lastError = new Error(`Admin API route not found at ${endpoint}.`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof TypeError) {
    throw new Error(getAdminApiUnavailableMessage());
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to reach the admin API.");
};

const parseAdminApiResponse = async <T>(response: Response) => {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  let result: { data?: T; error?: string } = { data: undefined };

  if (raw) {
    result = contentType.includes("application/json") ? (JSON.parse(raw) as { data?: T; error?: string }) : { error: raw };
  }

  return result;
};

const fetchAuthContextFromServer = async (accessToken: string) => {
  const response = await postToAdminApi(JSON.stringify({ action: "get_auth_context", payload: {} }), accessToken);
  const result = await parseAdminApiResponse<BackendAuthContext>(response);

  if (!response.ok || result.error || !result.data?.user) {
    throw new Error(result.error ?? `Unable to load auth context (${response.status} ${response.statusText}).`);
  }

  return result.data;
};

const isFirebaseQuotaError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  const code = String((error as { code?: string } | null)?.code ?? "").toLowerCase();
  return (
    message.includes("resource_exhausted") ||
    message.includes("quota exceeded") ||
    message.includes("quota-exceeded") ||
    code.includes("resource-exhausted")
  );
};

const isFirebasePermissionError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  const code = String((error as { code?: string } | null)?.code ?? "").toLowerCase();
  return (
    message.includes("missing or insufficient permissions") ||
    message.includes("permission-denied") ||
    code.includes("permission-denied")
  );
};

const isFirebaseSetupError = (error: unknown) => {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "").toLowerCase();
  const code = String((error as { code?: string } | null)?.code ?? "").toLowerCase();
  return (
    message.includes("api has not been used") ||
    message.includes("api is disabled") ||
    message.includes("firestore has not been used") ||
    message.includes("failed-precondition") ||
    code.includes("failed-precondition")
  );
};

const toFirebaseProjectError = (error: unknown, context: string) => {
  if (isFirebaseQuotaError(error)) {
    return new Error(
      `${context} failed because the new Firebase project is rejecting requests. Restart the dev server after changing .env/.env.server, then make sure Firebase Authentication and Firestore are enabled for this project.`,
    );
  }

  if (isFirebasePermissionError(error)) {
    return new Error(
      `${context} failed because Firestore access is blocked for the new Firebase project. Check your Firestore rules and confirm the local admin server was restarted after the Firebase change.`,
    );
  }

  if (isFirebaseSetupError(error)) {
    return new Error(
      `${context} failed because the new Firebase project is not fully enabled yet. Turn on Firebase Authentication and Cloud Firestore in the Firebase console, then restart the local server.`,
    );
  }

  return error instanceof Error ? error : new Error(String(error ?? `${context} failed.`));
};

const mapFirebaseSession = (user: FirebaseUser, tokenResult: Awaited<ReturnType<typeof getIdTokenResult>>): AppSession => {
  return {
    accessToken: tokenResult.token,
    refreshToken: user.refreshToken || null,
    expiresAt: tokenResult.expirationTime ? new Date(tokenResult.expirationTime).getTime() : null,
    uid: user.uid,
    email: user.email,
  };
};

const extractSessionHints = (
  user: FirebaseUser,
  tokenResult: Awaited<ReturnType<typeof getIdTokenResult>>,
): SessionHints => {
  const claims = tokenResult.claims ?? {};
  const hintedRole = normalizeRole(String(claims.role ?? ROLES.STAFF));
  const hintedSchoolId = String(claims.school_id ?? "").trim() || null;
  const hintedName = String(claims.name ?? user.displayName ?? user.email?.split("@")[0] ?? "INDDIA ERP User").trim() || "INDDIA ERP User";
  return { hintedRole, hintedSchoolId, hintedName };
};

const mapSessionUserFallback = (user: FirebaseUser, hints: SessionHints): AuthUser => {
  const { hintedRole, hintedSchoolId, hintedName } = hints;
  return {
    id: user.uid,
    name: hintedName,
    email: user.email,
    role: hintedRole,
    schoolId: hintedSchoolId,
  };
};

const mapDefaultAdminSessionUser = (user: FirebaseUser): AuthUser => ({
  id: user.uid,
  name: DEFAULT_ADMIN.user.name,
  email: user.email ?? DEFAULT_ADMIN.email,
  role: ROLES.SUPER_ADMIN,
  schoolId: null,
});

const fetchSchoolProfile = async (schoolId: string | null | undefined): Promise<CurrentSchool | null> => {
  if (!schoolId) return null;
  if (!firebaseDb) throw new Error("Firebase is not configured. Add Firebase environment values.");

  const cacheKey = schoolId.trim();
  const cached = schoolProfileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    try {
      const snapshot = await getFirestoreDocumentCached({
        collectionName: "schools",
        id: cacheKey,
        cacheKey: `auth:school:${cacheKey}`,
      });

      if (!snapshot) {
        return createSchoolFallback(cacheKey);
      }

      return mapSchool({
        id: snapshot.id,
        ...(snapshot.data as Omit<SchoolRow, "id">),
      });
    } catch (error) {
      if (isFirebasePermissionError(error) || isFirebaseQuotaError(error) || isFirebaseSetupError(error)) {
        return createSchoolFallback(cacheKey);
      }
      throw error;
    }
  })().catch((error) => {
    schoolProfileCache.delete(cacheKey);
    throw error;
  });

  schoolProfileCache.set(cacheKey, request);
  return request;
};

const fetchUserProfile = async (userId: string): Promise<AuthUser> => {
  if (!firebaseDb) throw new Error("Firebase is not configured. Add Firebase environment values.");

  const cacheKey = userId.trim();
  const cached = userProfileCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    try {
      const snapshot = await getFirestoreDocumentCached({
        collectionName: "users",
        id: cacheKey,
        cacheKey: `auth:user:${cacheKey}`,
      });

      if (!snapshot) {
        throw new Error("Unable to load the user profile.");
      }

      return mapUser({
        id: snapshot.id,
        ...(snapshot.data as Omit<UsersRow, "id">),
      });
    } catch (error) {
      throw toFirebaseProjectError(error, "Loading the user profile");
    }
  })().catch((error) => {
    userProfileCache.delete(cacheKey);
    throw error;
  });

  userProfileCache.set(cacheKey, request);
  return request;
};

const fetchUserProfileByEmail = async (email: string): Promise<AuthUser> => {
  if (!firebaseDb) throw new Error("Firebase is not configured. Add Firebase environment values.");

  const cacheKey = email.trim().toLowerCase();
  const cached = userProfileByEmailCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const request = (async () => {
    try {
      const rows = (await queryFirestoreCollectionCached({
        collectionName: "users",
        filters: [{ field: "email", value: cacheKey }],
        limitCount: 2,
        cacheKey: `auth:user-by-email:${cacheKey}`,
      })).map((item) => ({
        id: item.id,
        ...(item.data as Omit<UsersRow, "id">),
      }));

      return mapUser(
        ensureSingleRow(
          rows,
          "Unable to load the user profile.",
          "Multiple user profiles were found for this email. Check the users collection.",
        ),
      );
    } catch (error) {
      throw toFirebaseProjectError(error, "Resolving the login profile");
    }
  })().catch((error) => {
    userProfileByEmailCache.delete(cacheKey);
    throw error;
  });

  userProfileByEmailCache.set(cacheKey, request);
  return request;
};

const resolveAuthFromUser = async (firebaseUser: FirebaseUser) => {
  const cachedAuthState = authContextCache.get(firebaseUser.uid);
  if (cachedAuthState && cachedAuthState.expiresAt > Date.now()) {
    return cachedAuthState.value;
  }

  if (lastResolvedAuthState?.uid === firebaseUser.uid) {
    return lastResolvedAuthState.value;
  }

  const tokenResult = await getIdTokenResult(firebaseUser);
  const hints = extractSessionHints(firebaseUser, tokenResult);
  const session = mapFirebaseSession(firebaseUser, tokenResult);

  try {
    const backendContext = await fetchAuthContextFromServer(session.accessToken);
    const user = mapUser({
      id: backendContext.user.id,
      name: backendContext.user.name ?? firebaseUser.displayName ?? firebaseUser.email?.split("@")[0] ?? "INDDIA ERP User",
      email: backendContext.user.email ?? firebaseUser.email,
      role: backendContext.user.role ?? hints.hintedRole,
      school_id: backendContext.user.school_id,
    });
    const resolvedUser =
      user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
        ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
        : user;
    const school = backendContext.school
      ? mapSchool({
          id: backendContext.school.id,
          name: backendContext.school.name,
          subscription_status: backendContext.school.subscription_status,
          subscription_plan: backendContext.school.subscription_plan,
          expiry_date: backendContext.school.expiry_date,
          theme_color: backendContext.school.theme_color,
        })
      : await fetchSchoolProfile(resolvedUser.schoolId);
    const result = { user: resolvedUser, role: resolvedUser.role, school, session };
    lastResolvedAuthState = { uid: firebaseUser.uid, value: result };
    authContextCache.set(firebaseUser.uid, {
      value: result,
      expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
    });
    return result;
  } catch (profileError) {
    const sessionEmail = firebaseUser.email?.trim().toLowerCase();
    if (sessionEmail === DEFAULT_ADMIN.email) {
      const result = { user: mapDefaultAdminSessionUser(firebaseUser), role: ROLES.SUPER_ADMIN, school: null, session };
      lastResolvedAuthState = { uid: firebaseUser.uid, value: result };
      authContextCache.set(firebaseUser.uid, {
        value: result,
        expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
      });
      return result;
    }

    if (firebaseUser.email) {
      try {
        const user = await fetchUserProfileByEmail(firebaseUser.email);
        const resolvedUser =
          user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
            ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
            : user;
        const school = await fetchSchoolProfile(resolvedUser.schoolId);
        const result = { user: resolvedUser, role: resolvedUser.role, school, session };
        lastResolvedAuthState = { uid: firebaseUser.uid, value: result };
        authContextCache.set(firebaseUser.uid, {
          value: result,
          expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
        });
        return result;
      } catch {
        const fallbackUser = mapSessionUserFallback(firebaseUser, hints);
        const school = await fetchSchoolProfile(fallbackUser.schoolId);
        const result = { user: fallbackUser, role: fallbackUser.role, school, session };
        lastResolvedAuthState = { uid: firebaseUser.uid, value: result };
        authContextCache.set(firebaseUser.uid, {
          value: result,
          expiresAt: Date.now() + AUTH_CONTEXT_CACHE_TTL_MS,
        });
        return result;
      }
    }

    throw profileError;
  }
};

const ensureFirebaseReady = async () => {
  if (!firebaseAuth || !hasFirebaseConfig) {
    throw new Error("Firebase is not configured. Add Firebase environment values.");
  }

  await ensureFirebasePersistence();
  return firebaseAuth;
};

const signInAndResolve = async (email: string, password: string) => {
  try {
    const auth = await ensureFirebaseReady();
    const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    return resolveAuthFromUser(credential.user);
  } catch (error) {
    throw toFirebaseProjectError(error, "Signing in");
  }
};

export const loginStaff = async (email: string, password: string) => {
  const trimmedEmail = email.trim().toLowerCase();

  if (isDefaultAdminLogin(trimmedEmail, password) && !hasFirebaseConfig) {
    return { user: DEFAULT_ADMIN.user, role: ROLES.SUPER_ADMIN, school: null, session: null as AppSession | null };
  }

  const result = await signInAndResolve(trimmedEmail, password);

  if (
    !result.role ||
    (
      result.role !== ROLES.ADMIN &&
      result.role !== ROLES.PRINCIPAL &&
      result.role !== ROLES.STAFF &&
      result.role !== ROLES.SUPER_ADMIN
    )
  ) {
    throw new Error("This account is not configured as a staff login.");
  }

  return result;
};

export const loginParent = async (email: string, password: string) => {
  const result = await signInAndResolve(email, password);

  if (result.role !== ROLES.PARENT) {
    throw new Error("This account is not configured as a parent login.");
  }

  return result;
};

export const loginStudent = async (studentId: string, password: string) => {
  const auth = await ensureFirebaseReady();
  const normalizedStudentId = studentId.trim().toUpperCase();
  const fallbackEmail = `${normalizedStudentId.toLowerCase()}@students.inddiaerp.local`;
  const credential = await signInWithEmailAndPassword(auth, fallbackEmail, password);
  const result = await resolveAuthFromUser(credential.user);

  if (result.role !== ROLES.STUDENT) {
    throw new Error("This account is not configured as a student login.");
  }

  return result;
};

export const loginWithIdentifier = async (identifier: string, password: string) => {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    throw new Error("Email or Student ID is required.");
  }

  if (normalizedIdentifier.includes("@")) {
    const trimmedEmail = normalizedIdentifier.toLowerCase();

    if (isDefaultAdminLogin(trimmedEmail, password) && !hasFirebaseConfig) {
      return { user: DEFAULT_ADMIN.user, role: ROLES.SUPER_ADMIN, school: null, session: null as AppSession | null };
    }

    return signInAndResolve(trimmedEmail, password);
  }

  return loginStudent(normalizedIdentifier, password);
};

export const changeCurrentUserPassword = async (currentPassword: string, nextPassword: string) => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin?.isBootstrapAdmin) {
    throw new Error("Password change is not available for the local bootstrap super admin.");
  }

  const auth = await ensureFirebaseReady();
  const currentUser = auth.currentUser;
  if (!currentUser?.email) {
    throw new Error("Active session not found. Please sign in again.");
  }

  const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
  await reauthenticateWithCredential(currentUser, credential);
  await updateFirebasePassword(currentUser, nextPassword);
};

let restoreSessionPromise: Promise<{
  user: AuthUser | null;
  role: AppRole | null;
  school: CurrentSchool | null;
  session: AppSession | null;
}> | null = null;

export const restoreSession = async () => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin) {
    return { user: bootstrapAdmin, role: bootstrapAdmin.role, school: null, session: null as AppSession | null };
  }

  if (!firebaseAuth || !hasFirebaseConfig) {
    return { user: null, role: null, school: null, session: null as AppSession | null };
  }

  await ensureFirebasePersistence();

  if (!restoreSessionPromise) {
    restoreSessionPromise = (async () => {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) {
        return { user: null, role: null, school: null, session: null as AppSession | null };
      }

      return resolveAuthFromUser(currentUser);
    })().finally(() => {
      restoreSessionPromise = null;
    });
  }

  return restoreSessionPromise;
};

export const hydrateAuthSession = async (firebaseUser: FirebaseUser | null) => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin) {
    return { user: bootstrapAdmin, role: bootstrapAdmin.role, school: null, session: null as AppSession | null };
  }

  if (!firebaseUser) {
    return { user: null, role: null, school: null, session: null as AppSession | null };
  }

  return resolveAuthFromUser(firebaseUser);
};

export const logoutUser = async () => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin || !firebaseAuth) {
    return;
  }

  lastResolvedAuthState = null;
  authContextCache.clear();
  await signOut(firebaseAuth);
  authStore.getState().logout();
};

export const subscribeToAuthSessionChanges = (
  listener: (firebaseUser: FirebaseUser | null) => void,
) => subscribeToFirebaseAuthState(listener);
