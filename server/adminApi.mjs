import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createSign } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { firebaseAdminAuth, firebaseAdminDb, hasFirebaseAdminConfig } from "./firebaseAdmin.mjs";

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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(".env");
loadEnvFile(".env.server");

const databaseUrl = process.env.DATABASE_URL || "";
const databaseAnonKey = process.env.DATABASE_ANON_KEY || "";
const databaseServiceRoleKey = process.env.DATABASE_SERVICE_ROLE_KEY || "";
const googleClientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";
const googlePrivateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const googleCalendarId = process.env.GOOGLE_CALENDAR_ID || "";
const googleCalendarTimezone = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";
const googleCalendarSyncDays = Number(process.env.GOOGLE_CALENDAR_SYNC_DAYS || "180");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const missingLegacyDatabaseMessage =
  "This backend module is still being migrated to Firebase. Configure Firebase Admin in `.env.server` and use Firebase-backed pages only until the remaining legacy modules are rewritten.";

const createMissingLegacyQueryBuilder = (state = { operation: "read", single: false, head: false, count: false }) => {
  const proxyTarget = () => proxy;

  const buildResult = () => {
    if (state.operation === "write") {
      return {
        data: null,
        error: { message: missingLegacyDatabaseMessage },
        count: null,
      };
    }

    if (state.head || state.count) {
      return {
        data: null,
        error: null,
        count: 0,
      };
    }

    if (state.single) {
      return {
        data: null,
        error: null,
      };
    }

    return {
      data: [],
      error: null,
    };
  };

  const proxy = new Proxy(proxyTarget, {
    apply() {
      return proxy;
    },
    get(_target, prop) {
      if (prop === "then") {
        const result = buildResult();
        return (resolve, reject) => Promise.resolve(result).then(resolve, reject);
      }

      if (prop === "single" || prop === "maybeSingle") {
        return () => createMissingLegacyQueryBuilder({ ...state, single: true });
      }

      if (prop === "select") {
        return (_columns, options = {}) =>
          createMissingLegacyQueryBuilder({
            ...state,
            operation: state.operation === "write" ? "write" : "read",
            head: Boolean(options?.head),
            count: Boolean(options?.count),
          });
      }

      if (prop === "insert" || prop === "update" || prop === "delete" || prop === "upsert") {
        return () => createMissingLegacyQueryBuilder({ ...state, operation: "write" });
      }

      if (
        [
          "eq",
          "neq",
          "in",
          "order",
          "limit",
          "lte",
          "gte",
          "lt",
          "gt",
          "or",
          "not",
          "match",
        ].includes(String(prop))
      ) {
        return () => createMissingLegacyQueryBuilder({ ...state });
      }

      return createMissingLegacyServiceProxy();
    },
  });

  return proxy;
};

const createMissingLegacyServiceProxy = () => {
  const proxyTarget = () => {
    throw new Error(missingLegacyDatabaseMessage);
  };

  return new Proxy(proxyTarget, {
    apply() {
      throw new Error(missingLegacyDatabaseMessage);
    },
    get(_target, prop) {
      if (prop === "from") {
        return () => createMissingLegacyQueryBuilder();
      }

      if (prop === "auth") {
        return {
          getUser: async () => {
            throw new Error(missingLegacyDatabaseMessage);
          },
          admin: {
            createUser: async () => ({ data: null, error: { message: missingLegacyDatabaseMessage } }),
            updateUserById: async () => ({ error: { message: missingLegacyDatabaseMessage } }),
            deleteUser: async () => ({ error: { message: missingLegacyDatabaseMessage } }),
            listUsers: async () => ({ data: { users: [] }, error: { message: missingLegacyDatabaseMessage } }),
          },
        };
      }

      return createMissingLegacyServiceProxy();
    },
  });
};

const service = databaseUrl && databaseAnonKey && databaseServiceRoleKey
  ? createClient(databaseUrl, databaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : createMissingLegacyServiceProxy();

const send = (res, status, body) => {
  res.writeHead(status, corsHeaders);
  res.end(JSON.stringify(body));
};

const extractAccessToken = (authHeader) => {
  const value = String(authHeader ?? "").trim();
  if (!value) return "";

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
};

const readJson = (req) =>
  new Promise((resolveJson, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolveJson(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });

const cleanupUser = async (userId) => {
  if (!userId) return;

  if (firebaseAdminAuth && hasFirebaseAdminConfig) {
    try {
      await firebaseAdminAuth.deleteUser(userId);
      return;
    } catch (error) {
      if (String(error?.message ?? "").toLowerCase().includes("not found")) {
        return;
      }
    }
  }

  const { error } = await service.auth.admin.deleteUser(userId);
  if (error && !error.message.toLowerCase().includes("not found")) {
    throw new Error(error.message);
  }
};

const cleanupTable = async (table, column, value) => {
  if (!value) return;
  if (firebaseAdminDb) {
    await deleteFirestoreByField(table, column, value);
    return;
  }
  const { error } = await service.from(table).delete().eq(column, value);
  if (error) {
    throw new Error(error.message);
  }
};

const toImportText = (value) => String(value ?? "").trim();

const toImportBoolean = (value) => {
  const normalized = toImportText(value).toLowerCase();
  return ["true", "yes", "y", "1"].includes(normalized);
};

const normalizeImportKey = (value) =>
  String(value ?? "")
    .replace(/^\ufeff/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const normalizeImportRow = (rawRow) => {
  if (!rawRow || typeof rawRow !== "object" || Array.isArray(rawRow)) {
    return {};
  }

  const normalizedRow = {};

  for (const [rawKey, rawValue] of Object.entries(rawRow)) {
    const normalizedKey = normalizeImportKey(rawKey);
    if (!normalizedKey) continue;

    const existingValue = normalizedRow[normalizedKey];
    if (!toImportText(existingValue) && toImportText(rawValue)) {
      normalizedRow[normalizedKey] = rawValue;
      continue;
    }

    if (!(normalizedKey in normalizedRow)) {
      normalizedRow[normalizedKey] = rawValue;
    }
  }

  return normalizedRow;
};

const getImportValue = (normalizedRow, aliases) => {
  for (const alias of aliases) {
    const value = normalizedRow[normalizeImportKey(alias)];
    if (toImportText(value)) {
      return value;
    }
  }

  return "";
};

const isImportRowEmpty = (normalizedRow) =>
  Object.values(normalizedRow).every((value) => !toImportText(value));

const runImportInBatches = async (rows, batchSize, mapper) => {
  const results = [];

  for (const batch of chunkValues(rows, batchSize)) {
    const batchResults = await Promise.all(batch.map(mapper));
    results.push(...batchResults);
  }

  return results;
};

const isAuditLogUserForeignKeyError = (message) => {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("audit_logs_user_id_fkey") ||
    (normalized.includes("audit_logs") &&
      normalized.includes("foreign key") &&
      normalized.includes("user_id"))
  );
};

const isAuditLogSchoolForeignKeyError = (message) => {
  const normalized = String(message ?? "").toLowerCase();
  return (
    normalized.includes("audit_logs_school_id_fkey") ||
    (normalized.includes("audit_logs") &&
      normalized.includes("foreign key") &&
      normalized.includes("school_id"))
  );
};

const isUsersEmailUniqueError = (message) => {
  const normalized = String(message ?? "").toLowerCase();
  return normalized.includes("users_email_key") || (normalized.includes("duplicate key value") && normalized.includes("email"));
};

const getDuplicateEmailMessage = (email) => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  return normalizedEmail
    ? `A user with email "${normalizedEmail}" already exists. Please use a different email address.`
    : "This email address is already being used by another user.";
};

const getFirestoreField = (record, keys) => {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }
  return undefined;
};

const getFirestoreString = (record, keys) => {
  const value = getFirestoreField(record, keys);
  if (value === null || value === undefined) return null;
  return String(value);
};

const getFirestoreNumber = (record, keys) => {
  const value = getFirestoreField(record, keys);
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getFirestoreUserPayload = (id, data) => ({
  id,
  name: getFirestoreString(data, ["name"]) ?? "INDDIA ERP User",
  email: getFirestoreString(data, ["email"]),
  role: getFirestoreString(data, ["role"]) ?? "staff",
  school_id: getFirestoreString(data, ["schoolId", "school_id"]),
});

const getFirestoreSchoolPayload = (id, data) => ({
  id,
  name: getFirestoreString(data, ["name"]) ?? `School ${id.slice(0, 8)}`,
  subscription_status: getFirestoreString(data, ["subscriptionStatus", "subscription_status"]) ?? "Trial",
});

const findFirestoreUserById = async (id) => {
  if (!firebaseAdminDb) return null;
  const snapshot = await firebaseAdminDb.collection("users").doc(id).get();
  if (!snapshot.exists) return null;
  return getFirestoreUserPayload(snapshot.id, snapshot.data() ?? {});
};

const findFirestoreUserByEmail = async (email) => {
  if (!firebaseAdminDb || !email) return null;

  const primary = await firebaseAdminDb.collection("users").where("email", "==", email).limit(1).get();
  if (!primary.empty) {
    const doc = primary.docs[0];
    return getFirestoreUserPayload(doc.id, doc.data());
  }

  const legacy = await firebaseAdminDb.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
  if (!legacy.empty) {
    const doc = legacy.docs[0];
    return getFirestoreUserPayload(doc.id, doc.data());
  }

  return null;
};

const hasFirestoreUserReference = async (collectionName, userId) => {
  if (!firebaseAdminDb || !userId) return false;

  const camel = await firebaseAdminDb.collection(collectionName).where("userId", "==", userId).limit(1).get();
  if (!camel.empty) return true;

  const snake = await firebaseAdminDb.collection(collectionName).where("user_id", "==", userId).limit(1).get();
  return !snake.empty;
};

const cleanupStaleFirebaseAuthUserByEmail = async ({ email, role, schoolId }) => {
  if (!firebaseAdminAuth || !firebaseAdminDb || !email) return false;

  try {
    const existingUser = await firebaseAdminAuth.getUserByEmail(email);
    const existingProfile = await findFirestoreUserById(existingUser.uid);

    if (!existingProfile) {
      await cleanupUser(existingUser.uid);
      return true;
    }

    const existingRole = String(existingProfile.role ?? "").trim().toLowerCase();
    const existingSchoolId = String(existingProfile.school_id ?? "").trim() || null;
    const requestedRole = String(role ?? "").trim().toLowerCase();
    const requestedSchoolId = schoolId || null;

    if (existingRole !== requestedRole || existingSchoolId !== requestedSchoolId) {
      return false;
    }

    const hasLinkedRecord =
      (existingRole === "staff" && (await hasFirestoreUserReference("staff", existingUser.uid))) ||
      (existingRole === "parent" && (await hasFirestoreUserReference("parents", existingUser.uid))) ||
      (existingRole === "student" && (await hasFirestoreUserReference("students", existingUser.uid))) ||
      (existingRole === "admin" && (await hasFirestoreUserReference("users", existingUser.uid)));

    if (hasLinkedRecord) {
      return false;
    }

    await cleanupTable("users", "id", existingUser.uid);
    await cleanupUser(existingUser.uid);
    return true;
  } catch (error) {
    const message = String(error?.message ?? "").toLowerCase();
    if (message.includes("no user record") || message.includes("not found")) {
      return false;
    }
    throw error;
  }
};

const cleanupStaleFirestoreUserByEmail = async ({ email, role, schoolId, excludedUserId = null }) => {
  if (!firebaseAdminDb || !email) return false;

  const byEmail = await findFirestoreUserByEmail(email);
  if (!byEmail || byEmail.id === excludedUserId) {
    return false;
  }

  const existingRole = String(byEmail.role ?? "").trim().toLowerCase();
  const existingSchoolId = String(byEmail.school_id ?? "").trim() || null;
  const requestedRole = String(role ?? "").trim().toLowerCase();
  const requestedSchoolId = schoolId || null;

  if (!requestedRole || existingRole !== requestedRole || existingSchoolId !== requestedSchoolId) {
    return false;
  }

  const hasLinkedRecord =
    (existingRole === "staff" && (await hasFirestoreUserReference("staff", byEmail.id))) ||
    (existingRole === "parent" && (await hasFirestoreUserReference("parents", byEmail.id))) ||
    (existingRole === "student" && (await hasFirestoreUserReference("students", byEmail.id))) ||
    (existingRole === "admin" && (await hasFirestoreUserReference("schools", existingSchoolId)));

  if (hasLinkedRecord) {
    return false;
  }

  await cleanupTable("users", "id", byEmail.id);
  return true;
};

const ensureFirestoreSchool = async (schoolId, schoolName) => {
  if (!firebaseAdminDb || !schoolId) return;
  const ref = firebaseAdminDb.collection("schools").doc(schoolId);
  const snapshot = await ref.get();
  if (snapshot.exists) return;

  await ref.set(
    {
      name: schoolName ?? `School ${schoolId.slice(0, 8)}`,
      subscriptionStatus: "Trial",
      subscriptionPlan: null,
      expiryDate: null,
      themeColor: null,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
};

const buildFirebaseClaims = ({ name, role, schoolId, extra = {} }) => ({
  ...(name ? { name } : {}),
  ...(role ? { role } : {}),
  ...(schoolId ? { school_id: schoolId, schoolId } : {}),
  ...extra,
});

const createManagedAuthUser = async ({ email, password, name, role, schoolId, extra = {} }) => {
  if (firebaseAdminAuth && hasFirebaseAdminConfig) {
    let user;

    try {
      user = await firebaseAdminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: name || undefined,
      });
    } catch (error) {
      const message = String(error?.message ?? "").toLowerCase();
      const code = String(error?.code ?? "").toLowerCase();
      const duplicateEmail =
        code.includes("email-already-exists") ||
        message.includes("email already exists") ||
        message.includes("email-already-exists");

      if (!duplicateEmail) {
        throw error;
      }

      const cleaned = await cleanupStaleFirebaseAuthUserByEmail({ email, role, schoolId });
      if (!cleaned) {
        throw new Error(getDuplicateEmailMessage(email));
      }

      user = await firebaseAdminAuth.createUser({
        email,
        password,
        emailVerified: true,
        displayName: name || undefined,
      });
    }

    await firebaseAdminAuth.setCustomUserClaims(user.uid, buildFirebaseClaims({ name, role, schoolId, extra }));
    return { user: { id: user.uid, email: user.email ?? email } };
  }

  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    ...buildAuthMetadata({ name, role, schoolId, extra }),
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? "Unable to create auth user.");
  }

  return { user: { id: data.user.id, email: data.user.email ?? email } };
};

const updateManagedAuthUser = async (userId, { email, password, name, role, schoolId, extra = {} }) => {
  if (firebaseAdminAuth && hasFirebaseAdminConfig) {
    await firebaseAdminAuth.updateUser(userId, {
      ...(email ? { email } : {}),
      ...(password ? { password } : {}),
      ...(name ? { displayName: name } : {}),
    });
    await firebaseAdminAuth.setCustomUserClaims(userId, buildFirebaseClaims({ name, role, schoolId, extra }));
    return;
  }

  const { error } = await service.auth.admin.updateUserById(userId, {
    ...(email ? { email } : {}),
    ...(password ? { password } : {}),
    ...buildAuthMetadata({ name, role, schoolId, extra }),
  });
  if (error) throw new Error(error.message);
};

const getFirestoreSchoolScopedQuery = (collectionName, schoolId) => {
  if (!firebaseAdminDb) return null;
  return firebaseAdminDb.collection(collectionName).where("schoolId", "==", schoolId);
};

const FIRESTORE_BOOTSTRAP_COLLECTIONS = [
  "staff",
  "parents",
  "students",
  "classes",
  "subjects",
  "attendance",
  "notifications",
];

const FIRESTORE_SCHOOL_SCOPED_COLLECTIONS = new Set([
  "staff",
  "parents",
  "students",
  "classes",
  "subjects",
  "attendance",
  "notifications",
  "holidays",
  "fees",
  "results",
  "marks",
  "timetable",
  "salary",
  "routes",
  "vehicles",
  "applicants",
  "leaves",
  "staff_attendance",
  "employees",
  "timetable_adjustments",
]);

const FIRESTORE_GLOBAL_COLLECTIONS = new Set([
  "schools",
  "users",
  "subscriptions",
  "payments",
  "auditLogs",
]);

const isFirestoreSystemMetaDoc = (data) =>
  Boolean(data?.systemMeta) || String(data?.kind ?? "").toLowerCase() === "system_meta";

const getFirestoreSchoolScopedDocs = async (collectionName, schoolId) => {
  if (!firebaseAdminDb) return [];

  let snapshot = await firebaseAdminDb.collection(collectionName).where("schoolId", "==", schoolId).get();
  if (!snapshot.empty) {
    return snapshot.docs.filter((doc) => !isFirestoreSystemMetaDoc(doc.data() ?? {}));
  }

  snapshot = await firebaseAdminDb.collection(collectionName).where("school_id", "==", schoolId).get();
  return snapshot.docs.filter((doc) => !isFirestoreSystemMetaDoc(doc.data() ?? {}));
};

const getAllFirestoreDocs = async (collectionName) => {
  if (!firebaseAdminDb) return [];
  const snapshot = await firebaseAdminDb.collection(collectionName).get();
  return snapshot.docs.filter((doc) => !isFirestoreSystemMetaDoc(doc.data() ?? {}));
};

const bootstrapSchoolCollections = async (schoolId) => {
  if (!firebaseAdminDb || !schoolId) return;

  const batch = firebaseAdminDb.batch();
  const createdAt = new Date().toISOString();

  FIRESTORE_BOOTSTRAP_COLLECTIONS.forEach((collectionName) => {
    const ref = firebaseAdminDb.collection(collectionName).doc(`__meta__${schoolId}`);
    batch.set(
      ref,
      {
        schoolId,
        collectionName,
        kind: "system_meta",
        systemMeta: true,
        createdAt,
      },
      { merge: true },
    );
  });

  await batch.commit();
};

const getFirestoreAllowedSchoolId = async (authHeader) => {
  const context = await getUserProfile(authHeader);
  const role = String(context?.profile?.role ?? "").trim().toLowerCase();
  const schoolId = String(context?.profile?.school_id ?? "").trim() || null;
  return {
    role,
    schoolId,
    isSuperAdmin: role === "super_admin",
  };
};

const listFirestoreCollectionForClient = async (payload, authHeader) => {
  if (!firebaseAdminDb) {
    throw new Error("Firebase Admin is not configured.");
  }

  const collectionName = String(payload.collectionName ?? "").trim();
  if (!collectionName) {
    throw new Error("Collection name is required.");
  }

  if (!FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName) && !FIRESTORE_GLOBAL_COLLECTIONS.has(collectionName)) {
    throw new Error("Collection is not allowed.");
  }

  const access = await getFirestoreAllowedSchoolId(authHeader);
  const requestedSchoolId = String(payload.schoolId ?? "").trim() || null;

  if (FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName)) {
    const effectiveSchoolId = access.isSuperAdmin ? requestedSchoolId : access.schoolId;
    if (!effectiveSchoolId) {
      throw new Error("School context is missing.");
    }

    const docs = await getFirestoreSchoolScopedDocs(collectionName, effectiveSchoolId);
    return docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
  }

  const docs = await getAllFirestoreDocs(collectionName);
  return docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
};

const getFirestoreDocumentForClient = async (payload, authHeader) => {
  if (!firebaseAdminDb) {
    throw new Error("Firebase Admin is not configured.");
  }

  const collectionName = String(payload.collectionName ?? "").trim();
  const id = String(payload.id ?? "").trim();
  if (!collectionName || !id) {
    throw new Error("Collection name and document id are required.");
  }

  if (!FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName) && !FIRESTORE_GLOBAL_COLLECTIONS.has(collectionName)) {
    throw new Error("Collection is not allowed.");
  }

  const snapshot = await firebaseAdminDb.collection(collectionName).doc(id).get();
  if (!snapshot.exists) {
    return null;
  }

  const data = snapshot.data() ?? {};
  if (isFirestoreSystemMetaDoc(data)) {
    return null;
  }

  const access = await getFirestoreAllowedSchoolId(authHeader);

  if (FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName)) {
    const documentSchoolId =
      String(data.schoolId ?? data.school_id ?? "").trim() || null;
    const requestedSchoolId = String(payload.schoolId ?? "").trim() || null;
    const effectiveSchoolId = access.isSuperAdmin ? requestedSchoolId ?? documentSchoolId : access.schoolId;

    if (!effectiveSchoolId || !documentSchoolId || documentSchoolId !== effectiveSchoolId) {
      throw new Error("You do not have access to this document.");
    }
  }

  if (collectionName === "schools" && !access.isSuperAdmin) {
    if (!access.schoolId || access.schoolId !== snapshot.id) {
      throw new Error("You do not have access to this school.");
    }
  }

  if (collectionName === "users" && !access.isSuperAdmin) {
    const documentSchoolId = String(data.schoolId ?? data.school_id ?? "").trim() || null;
    const role = String(data.role ?? "").trim().toLowerCase();
    if (role !== "super_admin" && documentSchoolId && access.schoolId !== documentSchoolId) {
      throw new Error("You do not have access to this user.");
    }
  }

  return { id: snapshot.id, data };
};

const setFirestoreDocumentForClient = async (payload, authHeader) => {
  if (!firebaseAdminDb) {
    throw new Error("Firebase Admin is not configured.");
  }

  const collectionName = String(payload.collectionName ?? "").trim();
  const id = String(payload.id ?? "").trim();
  const data = payload.data && typeof payload.data === "object" ? payload.data : null;
  const merge = Boolean(payload.merge);

  if (!collectionName || !id || !data) {
    throw new Error("Collection name, document id, and data are required.");
  }

  if (!FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName)) {
    throw new Error("Collection is not allowed for client writes.");
  }

  const access = await getFirestoreAllowedSchoolId(authHeader);
  const snapshot = await firebaseAdminDb.collection(collectionName).doc(id).get();

  if (snapshot.exists) {
    const existing = snapshot.data() ?? {};
    if (isFirestoreSystemMetaDoc(existing)) {
      throw new Error("System documents cannot be modified.");
    }

    const existingSchoolId = String(existing.schoolId ?? existing.school_id ?? "").trim() || null;
    const effectiveSchoolId = access.isSuperAdmin
      ? String(payload.schoolId ?? existingSchoolId ?? "").trim() || null
      : access.schoolId;

    if (!effectiveSchoolId || existingSchoolId !== effectiveSchoolId) {
      throw new Error("You do not have access to this document.");
    }

    const nextData = {
      ...data,
      schoolId: effectiveSchoolId,
    };
    await snapshot.ref.set(nextData, { merge });
    return { id: snapshot.id, data: { ...existing, ...nextData } };
  }

  const effectiveSchoolId = access.isSuperAdmin
    ? String(payload.schoolId ?? "").trim() || null
    : access.schoolId;

  if (!effectiveSchoolId) {
    throw new Error("School context is missing.");
  }

  const nextData = {
    ...data,
    schoolId: effectiveSchoolId,
  };
  await firebaseAdminDb.collection(collectionName).doc(id).set(nextData, { merge });
  return { id, data: nextData };
};

const deleteFirestoreDocumentForClient = async (payload, authHeader) => {
  if (!firebaseAdminDb) {
    throw new Error("Firebase Admin is not configured.");
  }

  const collectionName = String(payload.collectionName ?? "").trim();
  const id = String(payload.id ?? "").trim();

  if (!collectionName || !id) {
    throw new Error("Collection name and document id are required.");
  }

  if (!FIRESTORE_SCHOOL_SCOPED_COLLECTIONS.has(collectionName)) {
    throw new Error("Collection is not allowed for client deletes.");
  }

  const access = await getFirestoreAllowedSchoolId(authHeader);
  const snapshot = await firebaseAdminDb.collection(collectionName).doc(id).get();
  if (!snapshot.exists) {
    return { ok: true };
  }

  const data = snapshot.data() ?? {};
  if (isFirestoreSystemMetaDoc(data)) {
    throw new Error("System documents cannot be deleted.");
  }

  const documentSchoolId = String(data.schoolId ?? data.school_id ?? "").trim() || null;
  const effectiveSchoolId = access.isSuperAdmin
    ? String(payload.schoolId ?? documentSchoolId ?? "").trim() || null
    : access.schoolId;

  if (!effectiveSchoolId || !documentSchoolId || documentSchoolId !== effectiveSchoolId) {
    throw new Error("You do not have access to this document.");
  }

  await snapshot.ref.delete();
  return { ok: true };
};

const deleteFirestoreDocs = async (docs) => {
  if (!firebaseAdminDb || !docs.length) return;
  const batch = firebaseAdminDb.batch();
  docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

const deleteFirestoreByField = async (collectionName, field, value) => {
  if (!firebaseAdminDb || value === null || value === undefined || value === "") return;
  if (field === "id") {
    const directRef = firebaseAdminDb.collection(collectionName).doc(String(value));
    const directSnapshot = await directRef.get();
    if (directSnapshot.exists) {
      await directRef.delete();
      return;
    }
  }
  const snapshot = await firebaseAdminDb.collection(collectionName).where(field, "==", value).get();
  await deleteFirestoreDocs(snapshot.docs);
};

const getFirestoreDocByField = async (collectionName, field, value) => {
  if (!firebaseAdminDb || value === null || value === undefined || value === "") return null;
  const snapshot = await firebaseAdminDb.collection(collectionName).where(field, "==", value).limit(1).get();
  return snapshot.empty ? null : snapshot.docs[0];
};

const findFirestoreStaffDocByUserId = async (userId) => {
  if (!firebaseAdminDb || !userId) return null;
  return (
    (await getFirestoreDocByField("staff", "userId", userId)) ||
    (await getFirestoreDocByField("staff", "user_id", userId))
  );
};

const upsertFirebaseStaffAccount = async ({
  existingUserId = null,
  tenantSchoolId,
  name,
  email,
  mobileNumber,
  photoUrl,
  password,
  role,
  dateOfJoining,
  monthlySalary,
  subjectId,
  assignedClass,
  assignedSection,
  isClassCoordinator,
}) => {
  let authUser = null;
  let createdAuthUser = false;

  if (existingUserId) {
    await updateManagedAuthUser(existingUserId, {
      email,
      password,
      name,
      role: "staff",
      schoolId: tenantSchoolId,
    });
    authUser = { user: { id: existingUserId, email } };
  } else {
    authUser = await createManagedAuthUser({
      email,
      password,
      name,
      role: "staff",
      schoolId: tenantSchoolId,
    });
    createdAuthUser = true;
  }

  try {
    await updatePublicUserProfile(authUser.user.id, {
      name,
      email,
      phone: mobileNumber,
      role: "staff",
      school_id: tenantSchoolId,
      photo_url: photoUrl,
    });

    const existingStaffDoc = await findFirestoreStaffDocByUserId(authUser.user.id);
    const staffRef = existingStaffDoc ?? firebaseAdminDb.collection("staff").doc();
    const createdAt =
      getFirestoreString(existingStaffDoc?.data() ?? {}, ["createdAt", "created_at"]) ?? new Date().toISOString();

    await staffRef.set(
      {
        userId: authUser.user.id,
        schoolId: tenantSchoolId,
        name,
        role,
        mobileNumber,
        dateOfJoining,
        monthlySalary,
        subjectId,
        isClassCoordinator,
        assignedClass,
        assignedSection,
        createdAt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      id: staffRef.id,
      userId: authUser.user.id,
      name,
      email,
      mobileNumber,
      photoUrl,
      role,
      dateOfJoining,
      monthlySalary,
      subjectId,
      assignedClass,
      assignedSection,
      isClassCoordinator,
    };
  } catch (error) {
    if (createdAuthUser) {
      await cleanupTable("staff", "userId", authUser.user.id);
      await cleanupTable("users", "id", authUser.user.id);
      await cleanupUser(authUser.user.id);
    }
    throw error;
  }
};

const upsertFirestoreUser = async (payload) => {
  if (!firebaseAdminDb) return payload;

  await firebaseAdminDb.collection("users").doc(payload.id).set(
    {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      schoolId: payload.school_id ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );

  return {
    id: payload.id,
    role: payload.role,
    email: payload.email,
    school_id: payload.school_id ?? null,
    name: payload.name,
  };
};

const ensurePublicUserEmailAvailable = async (email, excludedUserId = null, options = {}) => {
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  if (!normalizedEmail) return;

  if (firebaseAdminDb) {
    let byEmail = await findFirestoreUserByEmail(normalizedEmail);
    if (byEmail && byEmail.id !== excludedUserId) {
      const cleaned = await cleanupStaleFirestoreUserByEmail({
        email: normalizedEmail,
        role: options.role ?? null,
        schoolId: options.schoolId ?? null,
        excludedUserId,
      });
      if (cleaned) {
        byEmail = await findFirestoreUserByEmail(normalizedEmail);
      }
    }
    if (byEmail && byEmail.id !== excludedUserId) {
      throw new Error(getDuplicateEmailMessage(normalizedEmail));
    }
    return;
  }

  const { data, error } = await service
    .from("users")
    .select("id, email")
    .eq("email", normalizedEmail)
    .limit(2);

  if (error) {
    throw new Error(error.message);
  }

  const conflict = (data ?? []).find((row) => row.id !== excludedUserId);
  if (conflict) {
    throw new Error(getDuplicateEmailMessage(normalizedEmail));
  }
};

const insertPublicUserProfile = async (payload) => {
  await ensurePublicUserEmailAvailable(payload.email, payload.id ?? null, {
    role: payload.role ?? null,
    schoolId: payload.school_id ?? null,
  });
  if (firebaseAdminDb) {
    await upsertFirestoreUser(payload);
    return;
  }
  const { error } = await service.from("users").insert(payload);
  if (error) {
    if (isUsersEmailUniqueError(error.message)) {
      throw new Error(getDuplicateEmailMessage(payload.email));
    }
    throw new Error(error.message);
  }
};

const updatePublicUserProfile = async (userId, payload) => {
  await ensurePublicUserEmailAvailable(payload.email, userId, {
    role: payload.role ?? null,
    schoolId: payload.school_id ?? null,
  });
  if (firebaseAdminDb) {
    await upsertFirestoreUser({ ...payload, id: userId });
    return;
  }
  const { error } = await service.from("users").update(payload).eq("id", userId);
  if (error) {
    if (isUsersEmailUniqueError(error.message)) {
      throw new Error(getDuplicateEmailMessage(payload.email));
    }
    throw new Error(error.message);
  }
};

const buildAuthMetadata = ({ name, role, schoolId, extra = {} }) => {
  const shared = {
    ...(name ? { name } : {}),
    ...(role ? { role } : {}),
    ...(schoolId ? { school_id: schoolId } : {}),
    ...extra,
  };

  return {
    user_metadata: shared,
    app_metadata: shared,
  };
};

const normalizeRoleValue = (value) => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!normalized) return null;
  if (normalized === "superadmin" || normalized === "platform_owner") return "super_admin";
  if (normalized === "school_admin") return "admin";
  if (["super_admin", "admin", "staff", "student", "parent", "teacher", "hr", "accounts", "transport", "admission"].includes(normalized)) {
    return normalized;
  }
  return null;
};

const getAuthUserMetadata = (authUser) => {
  const appMetadata = authUser.app_metadata ?? {};
  const userMetadata = authUser.user_metadata ?? {};
  const role = normalizeRoleValue(appMetadata.role ?? userMetadata.role ?? null);
  const schoolId = String(appMetadata.school_id ?? userMetadata.school_id ?? "").trim() || null;
  const schoolName = String(appMetadata.school_name ?? userMetadata.school_name ?? "").trim() || null;
  const name =
    String(userMetadata.name ?? appMetadata.name ?? authUser.email?.split("@")[0] ?? "INDDIA ERP User").trim() ||
    "INDDIA ERP User";

  return { role, schoolId, schoolName, name };
};

const ensurePublicUserProfile = async (authUser) => {
  const { role, schoolId, name } = getAuthUserMetadata(authUser);
  const email = String(authUser.email ?? "").trim().toLowerCase() || null;

  if (!role) {
    const existingProfile = authUser.id
      ? await findPublicUserProfile(authUser)
      : null;

    if (existingProfile?.role) {
      return existingProfile;
    }

    throw new Error("User role is missing from your Firebase profile. Add the role in the `users` collection for this account.");
  }

  if (role !== "super_admin") {
    if (!schoolId) {
      throw new Error("School context is missing. Sign out and sign in again.");
    }

    if (firebaseAdminDb) {
      await ensureFirestoreSchool(schoolId, getAuthSchoolName(authUser) ?? `School ${schoolId.slice(0, 8)}`);
    } else {
      const { data: school, error: schoolError } = await service
        .from("schools")
        .select("id")
        .eq("id", schoolId)
        .maybeSingle();

      if (schoolError) {
        throw new Error(schoolError.message);
      }

      if (!school) {
        const { error: insertSchoolError } = await service.from("schools").insert({
          id: schoolId,
          name: getAuthSchoolName(authUser) ?? `School ${schoolId.slice(0, 8)}`,
          subscription_status: "Trial",
        });

        if (insertSchoolError) {
          throw new Error(insertSchoolError.message);
        }
      }
    }
  }

  const payload = {
    id: authUser.id,
    name,
    email,
    role,
    school_id: role === "super_admin" ? null : schoolId,
  };

  const existingById = firebaseAdminDb
    ? await findFirestoreUserById(authUser.id)
    : await (async () => {
        const { data, error } = await service
          .from("users")
          .select("id")
          .eq("id", authUser.id)
          .maybeSingle();
        if (error) {
          throw new Error(error.message);
        }
        return data;
      })();

  if (existingById) {
    await updatePublicUserProfile(authUser.id, payload);
  } else {
    await insertPublicUserProfile(payload);
  }

  if (firebaseAdminDb) {
    const profile = await findFirestoreUserById(authUser.id);
    if (!profile) {
      throw new Error("User profile not found.");
    }
    return profile;
  }

  const { data: profile, error: profileError } = await service
    .from("users")
    .select("id, role, email, school_id, name")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "User profile not found.");
  }

  return profile;
};

const listAllAuthUsers = async () => {
  if (firebaseAdminAuth && hasFirebaseAdminConfig) {
    const users = [];
    let pageToken = undefined;

    while (true) {
      const result = await firebaseAdminAuth.listUsers(1000, pageToken);
      users.push(...result.users.map((user) => ({
        id: user.uid,
        email: user.email ?? "",
        app_metadata: user.customClaims ?? {},
        user_metadata: {
          ...(user.customClaims ?? {}),
          name: user.displayName ?? user.email?.split("@")[0] ?? "INDDIA ERP User",
        },
      })));

      if (!result.pageToken) {
        break;
      }

      pageToken = result.pageToken;
    }

    return users;
  }

  const users = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(error.message);
    }

    const batch = data?.users ?? [];
    users.push(...batch);

    if (batch.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
};

const syncAuthDirectoryToPublic = async () => {
  const authUsers = await listAllAuthUsers();
  let publicUserIds;
  let schoolIds;

  if (firebaseAdminDb) {
    const [publicUsers, schools] = await Promise.all([
      firebaseAdminDb.collection("users").get(),
      firebaseAdminDb.collection("schools").get(),
    ]);
    publicUserIds = new Set(publicUsers.docs.map((row) => row.id));
    schoolIds = new Set(schools.docs.map((row) => row.id));
  } else {
    const [{ data: publicUsers, error: usersError }, { data: schools, error: schoolsError }] = await Promise.all([
      service.from("users").select("id, email"),
      service.from("schools").select("id"),
    ]);

    if (usersError) throw new Error(usersError.message);
    if (schoolsError) throw new Error(schoolsError.message);
    publicUserIds = new Set((publicUsers ?? []).map((row) => row.id));
    schoolIds = new Set((schools ?? []).map((row) => row.id));
  }

  const missingSchools = [];
  const missingUsers = [];

  authUsers.forEach((authUser) => {
    const { role, schoolId, schoolName, name } = getAuthUserMetadata(authUser);
    const email = String(authUser.email ?? "").trim().toLowerCase() || null;

    if (role && role !== "super_admin" && schoolId && !schoolIds.has(schoolId)) {
      missingSchools.push({
        id: schoolId,
        name: schoolName ?? `School ${schoolId.slice(0, 8)}`,
        subscription_status: "Trial",
      });
      schoolIds.add(schoolId);
    }

    if (publicUserIds.has(authUser.id) || !role) {
      return;
    }

    if (role !== "super_admin" && !schoolId) {
      return;
    }

    missingUsers.push({
      id: authUser.id,
      name,
      email,
      role,
      school_id: role === "super_admin" ? null : schoolId,
    });
    publicUserIds.add(authUser.id);
  });

  if (missingSchools.length) {
    if (firebaseAdminDb) {
      await Promise.all(
        missingSchools.map((school) => ensureFirestoreSchool(school.id, school.name)),
      );
    } else {
      const { error } = await service.from("schools").insert(missingSchools);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  if (missingUsers.length) {
    for (const user of missingUsers) {
      await insertPublicUserProfile(user);
    }
  }
};

const chunkValues = (values, size) => {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
};

const parseStorageObjectReference = (rawValue) => {
  const value = String(rawValue ?? "").trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const parts = url.pathname.split("/").filter(Boolean);
    const storageIndex = parts.findIndex(
      (part, index) => part === "storage" && parts[index + 1] === "v1" && parts[index + 2] === "object",
    );

    if (storageIndex === -1) {
      return null;
    }

    const bucketId = parts[storageIndex + 4];
    const objectPath = parts.slice(storageIndex + 5).join("/");

    if (!bucketId || !objectPath) {
      return null;
    }

    return {
      bucketId,
      objectPath: decodeURIComponent(objectPath),
    };
  } catch {
    return null;
  }
};

const listStorageObjectsByReference = async (references) => {
  const refsByBucket = new Map();

  references.forEach((reference) => {
    const key = `${reference.bucketId}:${reference.objectPath}`;
    if (refsByBucket.has(key)) return;
    refsByBucket.set(key, reference);
  });

  const bucketPathMap = new Map();
  Array.from(refsByBucket.values()).forEach((reference) => {
    const current = bucketPathMap.get(reference.bucketId) ?? [];
    current.push(reference.objectPath);
    bucketPathMap.set(reference.bucketId, current);
  });

  const rows = [];

  for (const [bucketId, objectPaths] of bucketPathMap.entries()) {
    for (const namesChunk of chunkValues(objectPaths, 100)) {
      const { data, error } = await service
        .schema("storage")
        .from("objects")
        .select("bucket_id, name, metadata")
        .eq("bucket_id", bucketId)
        .in("name", namesChunk);

      if (error) {
        throw new Error(error.message);
      }

      rows.push(...(data ?? []));
    }
  }

  return rows;
};

const estimateUtf8Bytes = (value) => Buffer.byteLength(String(value ?? ""), "utf8");

const estimateDataUrlBytes = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw.startsWith("data:")) {
    return 0;
  }

  const separatorIndex = raw.indexOf(",");
  if (separatorIndex === -1) {
    return 0;
  }

  const meta = raw.slice(0, separatorIndex);
  const payload = raw.slice(separatorIndex + 1);

  if (meta.includes(";base64")) {
    try {
      return Buffer.from(payload, "base64").length;
    } catch {
      return 0;
    }
  }

  try {
    return Buffer.byteLength(decodeURIComponent(payload), "utf8");
  } catch {
    return Buffer.byteLength(payload, "utf8");
  }
};

const estimateRowBytes = (row) =>
  Object.values(row ?? {}).reduce((sum, value) => {
    if (value == null) return sum;
    if (typeof value === "string") {
      return sum + estimateUtf8Bytes(value) + estimateDataUrlBytes(value);
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return sum + estimateUtf8Bytes(value);
    }
    return sum + estimateUtf8Bytes(JSON.stringify(value));
  }, 0);

const SCHOOL_STORAGE_TABLES = [
  "users",
  "parents",
  "subjects",
  "classes",
  "holidays",
  "staff",
  "students",
  "timetable",
  "attendance",
  "exams",
  "exam_subjects",
  "results",
  "marks",
  "fees",
  "employees",
  "leaves",
  "notifications",
  "timetable_adjustments",
  "salary",
  "vehicles",
  "routes",
  "applicants",
  "audit_logs",
  "subscriptions",
  "payments",
];

const getSchoolDatabaseUsage = async (schoolId) => {
  const tableResults = await Promise.all(
    SCHOOL_STORAGE_TABLES.map(async (tableName) => {
      const { data, error } = await service.from(tableName).select("*").eq("school_id", schoolId);
      if (error) {
        throw new Error(error.message);
      }

      const rows = data ?? [];
      return {
        tableName,
        rowCount: rows.length,
        bytes: rows.reduce((sum, row) => sum + estimateRowBytes(row), 0),
      };
    }),
  );

  return tableResults.reduce(
    (summary, result) => ({
      totalBytes: summary.totalBytes + result.bytes,
      totalRows: summary.totalRows + result.rowCount,
    }),
    { totalBytes: 0, totalRows: 0 },
  );
};

const makeStudentCodePrefix = (schoolName) => {
  const sanitized = String(schoolName ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  return (sanitized || "STUDENT").slice(0, 6);
};

const generateStudentIdentifier = async (tenantSchoolId) => {
  if (firebaseAdminDb) {
    const schoolSnapshot = await firebaseAdminDb.collection("schools").doc(tenantSchoolId).get();
    if (!schoolSnapshot.exists) {
      throw new Error("School not found for student creation.");
    }

    const prefix = makeStudentCodePrefix(getFirestoreString(schoolSnapshot.data() ?? {}, ["name"]));
    const studentDocs = await getFirestoreSchoolScopedDocs("students", tenantSchoolId);
    let sequence = studentDocs.length + 1;

    for (;;) {
      const candidate = `${prefix}-${String(sequence).padStart(4, "0")}`;
      const email = `${candidate.toLowerCase()}@students.inddiaerp.local`;
      const existingUser = await findFirestoreUserByEmail(email);
      if (!existingUser) {
        return candidate;
      }
      sequence += 1;
    }
  }

  const { data: school, error: schoolError } = await service
    .from("schools")
    .select("name")
    .eq("id", tenantSchoolId)
    .single();

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "School not found for student creation.");
  }

  const prefix = makeStudentCodePrefix(school.name);
  const { count, error: countError } = await service
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", tenantSchoolId);

  if (countError) {
    throw new Error(countError.message);
  }

  let sequence = Number(count ?? 0) + 1;

  for (;;) {
    const candidate = `${prefix}-${String(sequence).padStart(4, "0")}`;
    const email = `${candidate.toLowerCase()}@students.inddiaerp.local`;
    const { data: existingUser, error: existingUserError } = await service
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(existingUserError.message);
    }

    if (!existingUser) {
      return candidate;
    }

    sequence += 1;
  }
};

const resolveStudentIdentifier = async (tenantSchoolId, requestedIdentifier, existingEmail = "") => {
  const trimmed = String(requestedIdentifier ?? "").trim().toUpperCase();
  if (trimmed) {
    const email = `${trimmed.toLowerCase()}@students.inddiaerp.local`;
    if (firebaseAdminDb) {
      const existingUser = await findFirestoreUserByEmail(email);
      if (!existingUser || String(existingUser.email ?? "").toLowerCase() === String(existingEmail ?? "").toLowerCase()) {
        return trimmed;
      }

      throw new Error("Student ID already exists. Please choose a different student ID.");
    }

    const { data: existingUser, error } = await service
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existingUser || String(existingUser.email ?? "").toLowerCase() === String(existingEmail ?? "").toLowerCase()) {
      return trimmed;
    }

    throw new Error("Student ID already exists. Please choose a different student ID.");
  }

  const existingLocalPart = String(existingEmail ?? "").trim().split("@")[0]?.toUpperCase();
  if (existingLocalPart) {
    return existingLocalPart;
  }

  return generateStudentIdentifier(tenantSchoolId);
};

const toOptionalText = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
};

const toOptionalNumber = (value, label) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a valid non-negative number.`);
  }
  return parsed;
};

const ensureClassSectionExists = async (schoolId, className, section) => {
  if (firebaseAdminDb) {
    const classDocs = await getFirestoreSchoolScopedDocs("classes", schoolId);
    const existingClass = classDocs.find((doc) => {
      const data = doc.data() ?? {};
      const existingClassName = getFirestoreString(data, ["className", "class_name"]);
      const existingSection = getFirestoreString(data, ["section"]);
      return existingClassName === className && existingSection === section;
    });

    if (!existingClass) {
      throw new Error("Selected class and section do not exist. Create them first in Classes.");
    }
    return;
  }

  const { data, error } = await service
    .from("classes")
    .select("id")
    .eq("school_id", schoolId)
    .eq("class_name", className)
    .eq("section", section)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Selected class and section do not exist. Create them first in Classes.");
  }
};

const assertGoogleEnv = () => {
  if (!googleClientEmail || !googlePrivateKey || !googleCalendarId) {
    throw new Error(
      "Missing Google Calendar env. Required: GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_CALENDAR_ID",
    );
  }
};

const base64UrlEncode = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const getGoogleAccessToken = async () => {
  assertGoogleEnv();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: googleClientEmail,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(googlePrivateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  const assertion = `${unsignedToken}.${signature}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || "Failed to get Google access token.");
  }

  return result.access_token;
};

const googleCalendarRequest = async (path, options = {}) => {
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (response.status === 204) {
    return null;
  }

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok) {
    throw new Error(data?.error?.message || "Google Calendar request failed.");
  }
  return data;
};

const addDays = (dateString, amount) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};

const parseDateString = (dateString) => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1, 12, 0, 0));
};

const dayForDate = (dateString) =>
  parseDateString(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });

const getCurrentDateInTimeZone = (timeZone) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
};

const syncGoogleCalendarFull = async (authHeader) => {
  const user = await requireAuthenticatedUser(authHeader);
  const profile = await findPublicUserProfile(user, "id, role, email, school_id");

  if (!profile) {
    throw new Error("User profile not found.");
  }

  const isAdmin = String(profile.role ?? "").toLowerCase() === "admin";
  let canSync = isAdmin;
  let timetableRows = [];
  let holidayRows = [];
  let subjectMap = new Map();
  let staffMap = new Map();

  if (firebaseAdminDb) {
    if (!canSync) {
      const staff =
        (await getFirestoreDocByField("staff", "userId", user.id)) ??
        (await getFirestoreDocByField("staff", "user_id", user.id));
      canSync = Boolean(getFirestoreField(staff?.data ?? {}, ["isClassCoordinator", "is_class_coordinator"]));
    }

    if (!canSync) {
      throw new Error("You don't have permission to sync Google Calendar.");
    }

    const schoolId = await resolveAuditSchoolId(profile, user);
    if (!schoolId) {
      throw new Error("School context is missing.");
    }

    const [timetableDocs, holidayDocs, subjectDocs, staffDocs] = await Promise.all([
      getFirestoreSchoolScopedDocs("timetable", schoolId),
      getFirestoreSchoolScopedDocs("holidays", schoolId),
      getFirestoreSchoolScopedDocs("subjects", schoolId),
      getFirestoreSchoolScopedDocs("staff", schoolId),
    ]);

    timetableRows = timetableDocs
      .map(({ id, data }) => ({
        id,
        class: getFirestoreString(data, ["className", "class"]) ?? "",
        section: getFirestoreString(data, ["section"]) ?? "",
        subject_id: getFirestoreString(data, ["subjectId", "subject_id"]) ?? "",
        teacher_id: getFirestoreString(data, ["teacherId", "teacher_id"]) ?? "",
        day: getFirestoreString(data, ["day"]) ?? "",
        start_time: getFirestoreString(data, ["startTime", "start_time"]) ?? "",
        end_time: getFirestoreString(data, ["endTime", "end_time"]) ?? "",
      }))
      .sort((left, right) =>
        `${left.day}-${left.start_time}`.localeCompare(`${right.day}-${right.start_time}`),
      );

    holidayRows = holidayDocs
      .map(({ id, data }) => ({
        id,
        holiday_date: getFirestoreString(data, ["holidayDate", "holiday_date"]) ?? "",
        title: getFirestoreString(data, ["title"]) ?? "Holiday",
        description: getFirestoreString(data, ["description"]) ?? "",
      }))
      .sort((left, right) => left.holiday_date.localeCompare(right.holiday_date));

    subjectMap = new Map(
      subjectDocs.map(({ id, data }) => [id, getFirestoreString(data, ["name"]) ?? "Subject"]),
    );
    staffMap = new Map(
      staffDocs.map(({ id, data }) => [id, getFirestoreString(data, ["name"]) ?? "Teacher"]),
    );
  } else {
    if (!canSync) {
      const { data: staff } = await service
        .from("staff")
        .select("is_class_coordinator")
        .eq("user_id", user.id)
        .maybeSingle();
      canSync = Boolean(staff?.is_class_coordinator);
    }

    if (!canSync) {
      throw new Error("You don't have permission to sync Google Calendar.");
    }

    const [timetableRowsResult, holidaysResult, subjectRowsResult, staffRowsResult] = await Promise.all([
      service
        .from("timetable")
        .select("id, class, section, subject_id, teacher_id, day, start_time, end_time")
        .order("day")
        .order("start_time"),
      service
        .from("holidays")
        .select("id, holiday_date, title, description")
        .order("holiday_date"),
      service.from("subjects").select("id, name"),
      service.from("staff").select("id, name"),
    ]);

    if (timetableRowsResult.error) throw new Error(timetableRowsResult.error.message);
    if (holidaysResult.error) throw new Error(holidaysResult.error.message);
    if (subjectRowsResult.error) throw new Error(subjectRowsResult.error.message);
    if (staffRowsResult.error) throw new Error(staffRowsResult.error.message);

    timetableRows = timetableRowsResult.data ?? [];
    holidayRows = holidaysResult.data ?? [];
    subjectMap = new Map((subjectRowsResult.data ?? []).map((item) => [item.id, item.name]));
    staffMap = new Map((staffRowsResult.data ?? []).map((item) => [item.id, item.name]));
  }

  const existingEvents = await googleCalendarRequest(
    `/calendars/${encodeURIComponent(googleCalendarId)}/events?singleEvents=false&showDeleted=false&maxResults=2500&privateExtendedProperty=managedBy=inddia-erp`,
  );

  for (const event of existingEvents?.items ?? []) {
    await googleCalendarRequest(
      `/calendars/${encodeURIComponent(googleCalendarId)}/events/${encodeURIComponent(event.id)}`,
      { method: "DELETE" },
    );
  }

  let created = 0;
  let deleted = (existingEvents?.items ?? []).length;

  const holidaySet = new Set(holidayRows.map((holiday) => holiday.holiday_date));
  const startDate = getCurrentDateInTimeZone(googleCalendarTimezone);
  const syncDates = Array.from({ length: Math.max(1, googleCalendarSyncDays) }, (_, index) =>
    addDays(startDate, index),
  );

  for (const row of timetableRows) {
    for (const date of syncDates) {
      if (holidaySet.has(date)) continue;
      if (dayForDate(date) !== row.day) continue;

      const eventBody = {
        summary: `${subjectMap.get(row.subject_id) ?? "Subject"} - Class ${row.class}/${row.section}`,
        description: `Teacher: ${staffMap.get(row.teacher_id) ?? "Teacher"}\nManaged by INDDIA ERP`,
        start: {
          dateTime: `${date}T${String(row.start_time).slice(0, 8)}`,
          timeZone: googleCalendarTimezone,
        },
        end: {
          dateTime: `${date}T${String(row.end_time).slice(0, 8)}`,
          timeZone: googleCalendarTimezone,
        },
        extendedProperties: {
          private: {
            managedBy: "inddia-erp",
            type: "timetable",
            timetableId: row.id,
            slotDate: date,
            className: row.class,
            section: row.section,
          },
        },
      };

      await googleCalendarRequest(`/calendars/${encodeURIComponent(googleCalendarId)}/events`, {
        method: "POST",
        body: JSON.stringify(eventBody),
      });
      created += 1;
    }
  }

  for (const holiday of holidayRows) {
    await googleCalendarRequest(`/calendars/${encodeURIComponent(googleCalendarId)}/events`, {
      method: "POST",
      body: JSON.stringify({
        summary: holiday.title,
        description: holiday.description || "School holiday managed by INDDIA ERP",
        start: { date: holiday.holiday_date },
        end: { date: addDays(holiday.holiday_date, 1) },
        extendedProperties: {
          private: {
            managedBy: "inddia-erp",
            type: "holiday",
            holidayId: holiday.id,
          },
        },
      }),
    });
    created += 1;
  }

  return {
    created,
    deleted,
    calendarId: googleCalendarId,
    timezone: googleCalendarTimezone,
  };
};

const cleanupStaffDependencies = async (staffId) => {
  if (!staffId) return;

  if (firebaseAdminDb) {
    await deleteFirestoreByField("timetable", "teacherId", staffId);
    await deleteFirestoreByField("timetable", "teacher_id", staffId);
    await deleteFirestoreByField("attendance", "teacherId", staffId);
    await deleteFirestoreByField("attendance", "teacher_id", staffId);
    await deleteFirestoreByField("notifications", "receiverId", staffId);
    await deleteFirestoreByField("notifications", "receiver_id", staffId);
    await deleteFirestoreByField("timetable_adjustments", "replacementTeacherId", staffId);
    await deleteFirestoreByField("timetable_adjustments", "replacement_teacher_id", staffId);
    return;
  }

  const { error: timetableError } = await service.from("timetable").delete().eq("teacher_id", staffId);
  if (timetableError) {
    throw new Error(`Unable to remove timetable assignments: ${timetableError.message}`);
  }

  const { error: attendanceError } = await service.from("attendance").delete().eq("teacher_id", staffId);
  if (attendanceError) {
    throw new Error(`Unable to remove attendance records: ${attendanceError.message}`);
  }
};

const requireAdmin = async (authHeader) => {
  const context = await getUserProfile(authHeader);
  if (String(context.profile.role ?? "").toLowerCase() !== "admin") {
    throw new Error("Admin access is required.");
  }

  return context.user;
};

const requireAuthenticatedUser = async (authHeader) => {
  const accessToken = extractAccessToken(authHeader);
  if (!accessToken) {
    throw new Error("Missing authorization header.");
  }

  if (firebaseAdminAuth && hasFirebaseAdminConfig) {
    try {
      const decodedToken = await firebaseAdminAuth.verifyIdToken(accessToken);
      return {
        id: decodedToken.uid,
        email: decodedToken.email ?? "",
        app_metadata: {
          role: decodedToken.role ?? null,
          school_id: decodedToken.school_id ?? null,
          school_name: decodedToken.school_name ?? null,
          name: decodedToken.name ?? null,
        },
        user_metadata: {
          role: decodedToken.role ?? null,
          school_id: decodedToken.school_id ?? null,
          school_name: decodedToken.school_name ?? null,
          name: decodedToken.name ?? null,
        },
      };
    } catch {
      // Fall through to Supabase verification while the backend migration is still in progress.
    }
  }

  if (!hasFirebaseAdminConfig && !(databaseUrl && databaseAnonKey && databaseServiceRoleKey)) {
    throw new Error(
      "Missing Firebase Admin setup. Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to `.env.server`.",
    );
  }

  const {
    data: { user },
    error: userError,
  } = await service.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized.");
  }

  return user;
};

const findPublicUserProfile = async (user, selectClause = "id, role, email, school_id, name") => {
  const authUserId = String(user?.id ?? "").trim();
  const normalizedEmail = String(user?.email ?? "").trim().toLowerCase();

  if (firebaseAdminDb) {
    if (authUserId) {
      const byId = await findFirestoreUserById(authUserId);
      if (byId) {
        return byId;
      }
    }

    if (!normalizedEmail) {
      return null;
    }

    return findFirestoreUserByEmail(normalizedEmail);
  }

  if (authUserId) {
    const { data: byId, error: byIdError } = await service
      .from("users")
      .select(selectClause)
      .eq("id", authUserId)
      .maybeSingle();

    if (byIdError) {
      throw new Error(byIdError.message);
    }

    if (byId) {
      return byId;
    }
  }

  if (!normalizedEmail) {
    return null;
  }

  const { data: byEmail, error: byEmailError } = await service
    .from("users")
    .select(selectClause)
    .eq("email", normalizedEmail)
    .limit(1);

  if (byEmailError) {
    throw new Error(byEmailError.message);
  }

  return byEmail?.[0] ?? null;
};

const getUserProfile = async (authHeader) => {
  const user = await requireAuthenticatedUser(authHeader);
  await syncAuthDirectoryToPublic();
  const profile = await findPublicUserProfile(user);

  if (profile) {
    return { user, profile };
  }

  const repairedProfile = await ensurePublicUserProfile(user);
  return { user, profile: repairedProfile };
};

const getAuthContext = async (authHeader) => {
  const { user, profile } = await getUserProfile(authHeader);
  const role = normalizeRoleValue(profile?.role ?? null);
  const schoolId = String(profile?.school_id ?? "").trim() || null;

  let school = null;

  if (schoolId) {
    if (firebaseAdminDb) {
      const schoolSnapshot = await firebaseAdminDb.collection("schools").doc(schoolId).get();
      if (schoolSnapshot.exists) {
        const data = schoolSnapshot.data() ?? {};
        school = {
          id: schoolSnapshot.id,
          name: getFirestoreString(data, ["name"]) ?? `School ${schoolId.slice(0, 8)}`,
          subscription_status: getFirestoreString(data, ["subscriptionStatus", "subscription_status"]) ?? "Trial",
          subscription_plan: getFirestoreString(data, ["subscriptionPlan", "subscription_plan"]),
          expiry_date: getFirestoreString(data, ["expiryDate", "expiry_date"]),
          theme_color: getFirestoreString(data, ["themeColor", "theme_color"]),
        };
      } else {
        school = {
          id: schoolId,
          name: `School ${schoolId.slice(0, 8)}`,
          subscription_status: "Trial",
          subscription_plan: null,
          expiry_date: null,
          theme_color: null,
        };
      }
    } else {
      const { data, error } = await service
        .from("schools")
        .select("id, name, subscription_status, subscription_plan, expiry_date, theme_color")
        .eq("id", schoolId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      school =
        data ?? {
          id: schoolId,
          name: `School ${schoolId.slice(0, 8)}`,
          subscription_status: "Trial",
          subscription_plan: null,
          expiry_date: null,
          theme_color: null,
        };
    }
  }

  return {
    user: {
      id: String(profile?.id ?? user?.id ?? "").trim(),
      name: String(profile?.name ?? user?.email?.split("@")[0] ?? "INDDIA ERP User").trim() || "INDDIA ERP User",
      email: String(profile?.email ?? user?.email ?? "").trim().toLowerCase() || null,
      role,
      school_id: role === "super_admin" ? null : schoolId,
    },
    school,
  };
};

const getAuthSchoolName = (user) => {
  const appMetadata = user?.app_metadata ?? {};
  const userMetadata = user?.user_metadata ?? {};
  const schoolName = String(appMetadata.school_name ?? userMetadata.school_name ?? "").trim();
  return schoolName || null;
};

const ensureTenantSchoolExists = async (context) => {
  const schoolId = String(context?.profile?.school_id ?? "").trim();
  if (!schoolId) {
    throw new Error("School context is missing. Sign in again.");
  }

  if (firebaseAdminDb) {
    await ensureFirestoreSchool(schoolId, getAuthSchoolName(context.user) ?? `School ${schoolId.slice(0, 8)}`);
    return schoolId;
  }

  const { data: existingSchool, error: schoolLookupError } = await service
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolLookupError) {
    throw new Error(schoolLookupError.message);
  }

  if (existingSchool) {
    return schoolId;
  }

  const schoolName = getAuthSchoolName(context.user) ?? `School ${schoolId.slice(0, 8)}`;
  const { error: insertError } = await service.from("schools").insert({
    id: schoolId,
    name: schoolName,
    subscription_status: "Trial",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return schoolId;
};

const requireSuperAdmin = async (authHeader) => {
  const context = await getUserProfile(authHeader);
  if (String(context.profile.role ?? "").toLowerCase() !== "super_admin") {
    throw new Error("Super Admin access is required.");
  }

  return context;
};

const resolveAuditSchoolId = async (schoolId) => {
  const normalizedSchoolId = String(schoolId ?? "").trim();
  if (!normalizedSchoolId) return null;

  if (firebaseAdminDb) {
    const snapshot = await firebaseAdminDb.collection("schools").doc(normalizedSchoolId).get();
    return snapshot.exists ? snapshot.id : null;
  }

  const { data, error } = await service
    .from("schools")
    .select("id")
    .eq("id", normalizedSchoolId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
};

const insertAuditLog = async ({ schoolId = null, userId = null, action, module, recordId = null }) => {
  const safeSchoolId = await resolveAuditSchoolId(schoolId);

  if (firebaseAdminDb) {
    await firebaseAdminDb.collection("auditLogs").add({
      schoolId: safeSchoolId,
      userId,
      action,
      module,
      recordId,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const { error } = await service.from("audit_logs").insert({
    school_id: safeSchoolId,
    user_id: userId,
    action,
    module,
    record_id: recordId,
  });

  if (error) {
    if (isAuditLogUserForeignKeyError(error.message)) {
      return;
    }

    if (safeSchoolId && isAuditLogSchoolForeignKeyError(error.message)) {
      const retry = await service.from("audit_logs").insert({
        school_id: null,
        user_id: userId,
        action,
        module,
        record_id: recordId,
      });

      if (!retry.error || isAuditLogUserForeignKeyError(retry.error.message)) {
        return;
      }

      throw new Error(retry.error.message);
    }

    throw new Error(error.message);
  }
};

const logSuperAdminAuditEvent = async (context, schoolId, action, module, recordId = null) => {
  await insertAuditLog({
    schoolId,
    userId: context?.profile?.id ?? null,
    action,
    module,
    recordId,
  });
};

const normalizeStaffWorkspace = (role) => {
  const value = String(role ?? "").trim().toLowerCase();
  if (value.includes("human") || value === "hr") return "hr";
  if (value.includes("account") || value.includes("finance")) return "accounts";
  if (value.includes("transport")) return "transport";
  if (value.includes("admission")) return "admission";
  return "teacher";
};

const requireAdminOrWorkspace = async (authHeader, allowedWorkspaces) => {
  const context = await getUserProfile(authHeader);
  const { user, profile } = context;

  if (String(profile.role ?? "").toLowerCase() === "admin") {
    return context.user;
  }

  if (String(profile.role ?? "").toLowerCase() !== "staff") {
    throw new Error("You don't have permission for this action.");
  }

  const { data: staff, error: staffError } = await service
    .from("staff")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (staffError || !staff) {
    throw new Error(staffError?.message ?? "Staff profile not found.");
  }

  const workspace = normalizeStaffWorkspace(staff.role);
  if (!allowedWorkspaces.includes(workspace)) {
    throw new Error("You don't have permission for this action.");
  }

  return user;
};

const getAttendanceWeekday = (date) => {
  const [year, month, day] = String(date ?? "").split("-").map((value) => Number(value));
  if (!year || !month || !day) {
    throw new Error("A valid attendance date is required.");
  }

  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const weekdayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return weekdayMap[weekdayIndex];
};

const listTeacherEffectiveAttendanceAssignments = async ({ className, section, date, teacherId }) => {
  const attendanceDay = getAttendanceWeekday(date);

  const { data: baseSlots, error: baseSlotsError } = await service
    .from("timetable")
    .select("id, class, section, subject_id, teacher_id, day, is_break, is_cancelled")
    .eq("class", className)
    .eq("section", section)
    .eq("day", attendanceDay);

  if (baseSlotsError) {
    throw new Error(baseSlotsError.message);
  }

  const usableBaseSlots = (baseSlots ?? []).filter(
    (slot) => !Boolean(slot.is_break) && !Boolean(slot.is_cancelled),
  );
  if (usableBaseSlots.length === 0) {
    return [];
  }

  const baseSlotIds = usableBaseSlots.map((slot) => slot.id);
  const { data: adjustmentRows, error: adjustmentError } = await service
    .from("timetable_adjustments")
    .select("id, timetable_id, impact_date, status, replacement_teacher_id, replacement_subject_id")
    .eq("impact_date", date)
    .in("timetable_id", baseSlotIds);

  if (adjustmentError) {
    throw new Error(adjustmentError.message);
  }

  const adjustmentBySlotId = new Map((adjustmentRows ?? []).map((row) => [row.timetable_id, row]));

  return usableBaseSlots
    .map((slot) => {
      const adjustment = adjustmentBySlotId.get(slot.id) ?? null;
      if (adjustment?.status === "Cancelled") {
        return null;
      }

      const effectiveTeacherId =
        adjustment?.status === "Rescheduled" && adjustment.replacement_teacher_id
          ? adjustment.replacement_teacher_id
          : slot.teacher_id;
      const effectiveSubjectId =
        adjustment?.status === "Rescheduled" && adjustment.replacement_subject_id
          ? adjustment.replacement_subject_id
          : slot.subject_id;

      if (String(effectiveTeacherId ?? "").trim() !== teacherId) {
        return null;
      }

      return {
        slotId: slot.id,
        subjectId: String(effectiveSubjectId ?? "").trim() || null,
      };
    })
    .filter(Boolean);
};

const saveTeacherAttendance = async (payload, authHeader) => {
  const { user, profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const subjectId = String(payload.subjectId ?? "").trim();
  const date = String(payload.date ?? "").trim();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const teacherLatitude = Number(payload.teacherLocation?.latitude ?? payload.teacherLatitude);
  const teacherLongitude = Number(payload.teacherLocation?.longitude ?? payload.teacherLongitude);

  if (!className || !section || !subjectId || !date || rows.length === 0) {
    throw new Error("Attendance session is incomplete.");
  }
  if (!tenantSchoolId) {
    throw new Error("School context is missing for attendance save.");
  }

  const isAdmin = String(profile.role ?? "").toLowerCase() === "admin";
  let teacherId = null;

  if (!isAdmin) {
    const { data: staff, error: staffError } = await service
      .from("staff")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (staffError || !staff) {
      throw new Error("Teacher profile not found.");
    }

    teacherId = staff.id;
    const effectiveAssignments = await listTeacherEffectiveAttendanceAssignments({
      className,
      section,
      date,
      teacherId,
    });

    if (effectiveAssignments.length === 0) {
        throw new Error("No timetable is assigned to this teacher for the selected class and section on this day.");
    }

    const matchingSubjectAssignment = effectiveAssignments.find(
      (assignment) => String(assignment.subjectId ?? "").trim() === subjectId,
    );

    if (!matchingSubjectAssignment) {
        throw new Error("This subject is not assigned to this teacher for the selected class and section.");
    }

    const { data: school, error: schoolError } = await service
      .from("schools")
      .select("attendance_geo_latitude, attendance_geo_longitude, attendance_geo_radius_meters")
      .eq("id", profile.school_id)
      .maybeSingle();

    if (schoolError) {
      throw new Error(schoolError.message);
    }

    const schoolLatitude =
      school?.attendance_geo_latitude == null ? null : Number(school.attendance_geo_latitude);
    const schoolLongitude =
      school?.attendance_geo_longitude == null ? null : Number(school.attendance_geo_longitude);
    const schoolRadiusMeters =
      school?.attendance_geo_radius_meters == null ? null : Number(school.attendance_geo_radius_meters);
    const hasGeoFence =
      schoolLatitude !== null &&
      schoolLongitude !== null &&
      schoolRadiusMeters !== null &&
      Number.isFinite(schoolLatitude) &&
      Number.isFinite(schoolLongitude) &&
      Number.isFinite(schoolRadiusMeters) &&
      schoolRadiusMeters > 0;

    if (hasGeoFence) {
      if (!Number.isFinite(teacherLatitude) || !Number.isFinite(teacherLongitude)) {
        throw new Error("Current teacher location is required to save attendance for this school.");
      }

      const distanceMeters = calculateDistanceMeters(
        schoolLatitude,
        schoolLongitude,
        teacherLatitude,
        teacherLongitude,
      );

      if (distanceMeters > schoolRadiusMeters) {
        throw new Error("You are not in the school. Attendance can only be saved within the allowed school GPS area.");
      }
    }
  }

  const studentIds = rows
    .map((row) => String(row.studentId ?? "").trim())
    .filter(Boolean);

  const { data: studentRows, error: studentError } = await service
    .from("students")
    .select("id")
    .eq("school_id", tenantSchoolId)
    .eq("class", className)
    .eq("section", section)
    .in("id", studentIds);

  if (studentError) throw new Error(studentError.message);

  const allowedStudentIds = new Set((studentRows ?? []).map((row) => row.id));
  if (allowedStudentIds.size !== studentIds.length) {
    throw new Error("Attendance roster does not match the selected class and section.");
  }

  const { data: existingRows, error: existingError } = await service
    .from("attendance")
    .select("id, student_id")
    .eq("school_id", tenantSchoolId)
    .eq("date", date)
    .eq("subject_id", subjectId)
    .in("student_id", studentIds);

  if (existingError) throw new Error(existingError.message);

  const existingMap = new Map((existingRows ?? []).map((row) => [row.student_id, row.id]));

  for (const row of rows) {
    const studentId = String(row.studentId ?? "").trim();
    if (!studentId) continue;

    const status = row.status === "Absent" ? "Absent" : "Present";
    const payloadTeacherId = String(payload.teacherId ?? "").trim() || null;
    const rowTeacherId = teacherId ?? payloadTeacherId;
    const existingId = existingMap.get(studentId);

    if (existingId) {
      const { error } = await service
        .from("attendance")
        .update({
          status,
          teacher_id: rowTeacherId,
        })
        .eq("id", existingId);
      if (error) throw new Error(error.message);
      continue;
    }

    const { error } = await service.from("attendance").insert({
      school_id: tenantSchoolId,
      student_id: studentId,
      subject_id: subjectId,
      teacher_id: rowTeacherId,
      date,
      status,
    });
    if (error) throw new Error(error.message);
  }

  return { ok: true };
};

const normalizeOptionalTime = (value, label) => {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;
  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new Error(`${label} must use HH:MM format.`);
  }
  return normalized;
};

const saveStaffAttendance = async (payload, authHeader) => {
  const { user, profile } = await getUserProfile(authHeader);
  const tenantSchoolId = await ensureTenantSchoolExists({ user, profile });
  const date = String(payload.date ?? "").trim();
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const today = getCurrentDateInTimeZone("Asia/Kolkata");

  if (!date) {
    throw new Error("Attendance date is required.");
  }

  if (date !== today) {
    throw new Error(`HR can mark staff attendance only for today (${today}).`);
  }

  if (entries.length === 0) {
    throw new Error("Add at least one staff attendance entry.");
  }

  const normalizedEntries = entries
    .map((entry) => ({
      staffId: String(entry.staffId ?? "").trim(),
      status: String(entry.status ?? "").trim(),
      checkInTime: normalizeOptionalTime(entry.checkInTime, "Check-in time"),
      checkOutTime: normalizeOptionalTime(entry.checkOutTime, "Check-out time"),
      notes: String(entry.notes ?? "").trim() || null,
    }))
    .filter((entry) => entry.staffId);

  if (normalizedEntries.length === 0) {
    throw new Error("Add at least one valid staff attendance entry.");
  }

  const invalidStatusEntry = normalizedEntries.find(
    (entry) => !["Present", "Absent", "Late", "Half Day", "On Leave"].includes(entry.status),
  );
  if (invalidStatusEntry) {
    throw new Error(`Invalid attendance status for staff ${invalidStatusEntry.staffId}.`);
  }

  const invalidTimeRangeEntry = normalizedEntries.find(
    (entry) => entry.checkInTime && entry.checkOutTime && entry.checkInTime > entry.checkOutTime,
  );
  if (invalidTimeRangeEntry) {
    throw new Error("Check-out time must be later than or equal to check-in time.");
  }

  const staffIds = Array.from(new Set(normalizedEntries.map((entry) => entry.staffId)));
  const { data: staffRows, error: staffError } = await service
    .from("staff")
    .select("id")
    .eq("school_id", tenantSchoolId)
    .in("id", staffIds);

  if (staffError) {
    throw new Error(staffError.message);
  }

  const validStaffIds = new Set((staffRows ?? []).map((row) => row.id));
  if (validStaffIds.size !== staffIds.length) {
    throw new Error("One or more selected staff records do not belong to this school.");
  }

  const rowsToUpsert = normalizedEntries.map((entry) => ({
    school_id: tenantSchoolId,
    staff_id: entry.staffId,
    attendance_date: date,
    status: entry.status,
    check_in_time: entry.checkInTime,
    check_out_time: entry.checkOutTime,
    notes: entry.notes,
    marked_by: profile.id ?? user.id,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await service
    .from("staff_attendance")
    .upsert(rowsToUpsert, {
      onConflict: "school_id,staff_id,attendance_date",
    });

  if (error) {
    if (String(error.message).toLowerCase().includes("staff_attendance")) {
      throw new Error("Staff attendance requires the latest database schema. Run the updated schema.sql in Supabase first.");
    }
    throw new Error(error.message);
  }

  await insertAuditLog({
    schoolId: tenantSchoolId,
    userId: profile.id ?? user.id,
    action: "UPDATE",
    module: "STAFF_ATTENDANCE",
    recordId: null,
  });

  return { ok: true };
};

const listStaffAttendance = async (payload, authHeader) => {
  const { user, profile } = await getUserProfile(authHeader);
  const tenantSchoolId = await ensureTenantSchoolExists({ user, profile });
  const date = String(payload.date ?? "").trim();
  const month = String(payload.month ?? "").trim();
  const staffId = String(payload.staffId ?? "").trim();
  const status = String(payload.status ?? "").trim();

  let query = service
    .from("staff_attendance")
    .select("id, staff_id, attendance_date, status, check_in_time, check_out_time, notes, marked_by, created_at, updated_at")
    .eq("school_id", tenantSchoolId)
    .order("attendance_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (date) {
    query = query.eq("attendance_date", date);
  }

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    query = query
      .gte("attendance_date", `${month}-01`)
      .lt("attendance_date", `${month}-32`);
  }

  if (staffId) {
    query = query.eq("staff_id", staffId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data: attendanceRows, error: attendanceError } = await query;
  if (attendanceError) {
    if (String(attendanceError.message).toLowerCase().includes("staff_attendance")) {
      throw new Error("Staff attendance requires the latest database schema. Run the updated schema.sql in Supabase first.");
    }
    throw new Error(attendanceError.message);
  }

  const rows = attendanceRows ?? [];
  const staffIds = Array.from(new Set(rows.map((row) => String(row.staff_id ?? "").trim()).filter(Boolean)));
  const markedByIds = Array.from(new Set(rows.map((row) => String(row.marked_by ?? "").trim()).filter(Boolean)));

  const [{ data: staffRows, error: staffError }, { data: userRows, error: userError }] = await Promise.all([
    staffIds.length > 0
      ? service
          .from("staff")
          .select("id, name, role")
          .eq("school_id", tenantSchoolId)
          .in("id", staffIds)
      : Promise.resolve({ data: [], error: null }),
    markedByIds.length > 0
      ? service
          .from("users")
          .select("id, name")
          .in("id", markedByIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (staffError) throw new Error(staffError.message);
  if (userError) throw new Error(userError.message);

  const staffMap = new Map((staffRows ?? []).map((row) => [row.id, row]));
  const userMap = new Map((userRows ?? []).map((row) => [row.id, row]));

  return rows.map((row) => {
    const staff = staffMap.get(row.staff_id) ?? null;
    const markedByUser = row.marked_by ? userMap.get(row.marked_by) ?? null : null;

    return {
      id: row.id,
      staffId: row.staff_id,
      staffName: staff?.name ?? "Unknown staff",
      role: staff?.role ?? "Staff",
      attendanceDate: row.attendance_date,
      status: row.status,
      checkInTime: row.check_in_time ? String(row.check_in_time).slice(0, 5) : null,
      checkOutTime: row.check_out_time ? String(row.check_out_time).slice(0, 5) : null,
      notes: row.notes ?? null,
      markedByUserId: row.marked_by ?? null,
      markedByName: markedByUser?.name ?? null,
      createdAt: row.created_at ?? null,
      updatedAt: row.updated_at ?? null,
    };
  });
};

const createStaff = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const mobileNumber = String(payload.mobileNumber ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const password = String(payload.password ?? "");
  const role = String(payload.role ?? "").trim() || "Teacher";
  const dateOfJoining = String(payload.dateOfJoining ?? "").trim();
  const monthlySalaryValue = String(payload.monthlySalary ?? "").trim();
  const subjectId = String(payload.subjectId ?? "").trim() || null;
  const assignedClass = null;
  const assignedSection = null;
  const isClassCoordinator = false;
  const overwriteExisting = Boolean(payload.overwriteExisting);

  if (!name || !email || !mobileNumber || !password || !dateOfJoining || !monthlySalaryValue) {
    throw new Error("Name, mobile number, date of joining, monthly salary, email, and password are required.");
  }

  const monthlySalary = Number(monthlySalaryValue);
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    throw new Error("Monthly salary must be a valid non-negative number.");
  }

  if (!tenantSchoolId) {
    throw new Error("School context is missing for this staff creation request.");
  }

  if (firebaseAdminDb) {
    try {
      return await upsertFirebaseStaffAccount({
        tenantSchoolId,
        name,
        email,
        mobileNumber,
        photoUrl,
        password,
        role,
        dateOfJoining,
        monthlySalary,
        subjectId,
        assignedClass,
        assignedSection,
        isClassCoordinator,
      });
    } catch (error) {
      const duplicateEmailMessage = getDuplicateEmailMessage(email);
      if (!(error instanceof Error) || error.message !== duplicateEmailMessage || !firebaseAdminAuth || !overwriteExisting) {
        throw error;
      }

      const existingAuthUser = await firebaseAdminAuth.getUserByEmail(email);
      const existingProfile = await findFirestoreUserById(existingAuthUser.uid);

      if (
        existingProfile &&
        (String(existingProfile.role ?? "").trim().toLowerCase() !== "staff" ||
          String(existingProfile.school_id ?? "").trim() !== tenantSchoolId)
      ) {
        throw error;
      }

      return upsertFirebaseStaffAccount({
        existingUserId: existingAuthUser.uid,
        tenantSchoolId,
        name,
        email,
        mobileNumber,
        photoUrl,
        password,
        role,
        dateOfJoining,
        monthlySalary,
        subjectId,
        assignedClass,
        assignedSection,
        isClassCoordinator,
      });
    }
  }

  const authUser = await createManagedAuthUser({
    email,
    password,
    name,
    role: "staff",
    schoolId: tenantSchoolId,
  });

  try {
    await insertPublicUserProfile({
      id: authUser.user.id,
      name,
      email,
      phone: mobileNumber,
      role: "staff",
      school_id: tenantSchoolId,
      photo_url: photoUrl,
    });

    const { data, error } = await service
      .from("staff")
      .insert({
        user_id: authUser.user.id,
        school_id: tenantSchoolId,
        name,
        role,
        mobile_number: mobileNumber,
        date_of_joining: dateOfJoining,
        monthly_salary: monthlySalary,
        subject_id: subjectId,
        is_class_coordinator: isClassCoordinator,
        assigned_class: assignedClass,
        assigned_section: assignedSection,
      })
      .select("id")
      .single();

    if (error || !data) throw new Error(error?.message ?? "Unable to create staff record.");

    return {
      id: data.id,
      userId: authUser.user.id,
      name,
      email,
      mobileNumber,
      photoUrl,
      role,
      dateOfJoining,
      monthlySalary,
      subjectId,
      assignedClass,
      assignedSection,
      isClassCoordinator,
    };
  } catch (error) {
    await cleanupTable("staff", "user_id", authUser.user.id);
    await cleanupTable("users", "id", authUser.user.id);
    await cleanupUser(authUser.user.id);
    throw error;
  }
};

const staffImportRoleMap = new Map(
  ["Teacher", "HR", "Accounts", "Transport", "Admission", "Non-Teaching Staff"].map((role) => [
    role.toLowerCase(),
    role,
  ]),
);

const normalizeStaffImportRole = (value) => {
  const normalized = toImportText(value).toLowerCase();
  if (!normalized) return "Teacher";
  if (staffImportRoleMap.has(normalized)) {
    return staffImportRoleMap.get(normalized);
  }
  if (normalized.includes("non") && normalized.includes("teach")) {
    return "Non-Teaching Staff";
  }
  throw new Error(`Unsupported staff role "${toImportText(value)}".`);
};

const normalizeSubjectLookupKey = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const STAFF_IMPORT_BATCH_SIZE = 5;
const STUDENT_IMPORT_BATCH_SIZE = 3;

const bulkImportStaff = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  const overwriteExisting = Boolean(payload.overwriteExisting);

  if (!tenantSchoolId) {
    throw new Error("School context is missing for this staff import request.");
  }

  if (rows.length === 0) {
    throw new Error("Add at least one staff row to import.");
  }

  let subjectRows = [];

  if (firebaseAdminDb) {
    const docs = await getFirestoreSchoolScopedDocs("subjects", tenantSchoolId);
    subjectRows = docs.map((doc) => ({
      id: doc.id,
      name: getFirestoreString(doc.data() ?? {}, ["name"]),
    }));
  } else {
    const { data, error: subjectError } = await service
      .from("subjects")
      .select("id, name")
      .eq("school_id", tenantSchoolId);

    if (subjectError) {
      throw new Error(subjectError.message);
    }

    subjectRows = data ?? [];
  }

  const subjectMap = new Map(
    subjectRows
      .filter((row) => String(row?.name ?? "").trim())
      .map((row) => [normalizeSubjectLookupKey(row.name), row.id]),
  );

  const normalizedRows = rows
    .map((rawRow, index) => ({ index, row: normalizeImportRow(rawRow) }))
    .filter(({ row }) => !isImportRowEmpty(row));

  if (normalizedRows.length === 0) {
    throw new Error("The selected file only contains empty rows.");
  }

  const results = await runImportInBatches(normalizedRows, STAFF_IMPORT_BATCH_SIZE, async ({ index, row }) => {
    const name = toImportText(getImportValue(row, ["name", "staffName", "staff name", "fullName", "full name"]));
    const email = toImportText(getImportValue(row, ["email", "emailAddress", "email address", "mail"])).toLowerCase();
    const identifier = email || name || `Row ${index + 2}`;

    try {
      const role = normalizeStaffImportRole(getImportValue(row, ["role", "staffRole", "staff role", "designation"]));
      const subjectName = toImportText(getImportValue(row, ["subjectName", "subject name", "subject"]));
      const subjectIdFromSheet = toImportText(getImportValue(row, ["subjectId", "subject id"]));
      const resolvedSubjectId =
        subjectIdFromSheet || (subjectName ? subjectMap.get(normalizeSubjectLookupKey(subjectName)) ?? "" : "");

      if (subjectName && !resolvedSubjectId) {
        throw new Error(`Subject "${subjectName}" was not found in this school.`);
      }

      const createdStaff = await createStaff(
        {
          name,
          email,
          mobileNumber: toImportText(
            getImportValue(row, ["mobileNumber", "mobile number", "phone", "phoneNumber", "phone number"]),
          ),
          photoUrl: toImportText(getImportValue(row, ["photoUrl", "photo url", "image", "imageUrl", "image url"])),
          password: toImportText(getImportValue(row, ["password", "staffPassword", "staff password"])),
          role,
          dateOfJoining: toImportText(getImportValue(row, ["dateOfJoining", "date of joining", "joiningDate", "joining date"])),
          monthlySalary: toImportText(getImportValue(row, ["monthlySalary", "monthly salary", "salary"])),
          subjectId: role === "Teacher" ? resolvedSubjectId : "",
          assignedClass: "",
          assignedSection: "",
          isClassCoordinator: false,
          overwriteExisting,
        },
        authHeader,
      );

      return {
        rowNumber: index + 2,
        identifier,
        success: true,
        message: `Created staff account for ${createdStaff.name}.`,
      };
    } catch (error) {
      return {
        rowNumber: index + 2,
        identifier,
        success: false,
        message: error instanceof Error ? error.message : "Staff import failed.",
      };
    }
  });

  const created = results.filter((item) => item.success).length;
  const failed = results.length - created;
  return { created, failed, results };
};

const previewBulkImportStaff = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (!tenantSchoolId) {
    throw new Error("School context is missing for this staff import request.");
  }

  const normalizedRows = rows
    .map((rawRow, index) => ({ index, row: normalizeImportRow(rawRow) }))
    .filter(({ row }) => !isImportRowEmpty(row));

  const emailEntries = normalizedRows
    .map(({ index, row }) => ({
      rowNumber: index + 2,
      email: toImportText(getImportValue(row, ["email", "emailAddress", "email address", "mail"])).toLowerCase(),
    }))
    .filter((entry) => entry.email);

  const uniqueEmails = [...new Set(emailEntries.map((entry) => entry.email))];
  const conflicts = [];

  for (const email of uniqueEmails) {
    let authUser = null;
    let existingProfile = null;

    if (firebaseAdminAuth) {
      try {
        authUser = await firebaseAdminAuth.getUserByEmail(email);
      } catch (error) {
        const message = String(error?.message ?? "").toLowerCase();
        if (!message.includes("no user record") && !message.includes("not found")) {
          throw error;
        }
      }
    }

    existingProfile = firebaseAdminDb ? await findFirestoreUserByEmail(email) : null;

    if (!authUser && !existingProfile) {
      continue;
    }

    const replaceable =
      !existingProfile ||
      (String(existingProfile.role ?? "").trim().toLowerCase() === "staff" &&
        String(existingProfile.school_id ?? "").trim() === tenantSchoolId);

    conflicts.push({
      email,
      rows: emailEntries.filter((entry) => entry.email === email).map((entry) => entry.rowNumber),
      replaceable,
    });
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    replaceableCount: conflicts.filter((item) => item.replaceable).length,
    blockingCount: conflicts.filter((item) => !item.replaceable).length,
  };
};

const updateStaff = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const id = String(payload.id ?? "");
  const userId = String(payload.userId ?? "");
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase();
  const mobileNumber = String(payload.mobileNumber ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const password = String(payload.password ?? "");
  const role = String(payload.role ?? "").trim() || "Teacher";
  const dateOfJoining = String(payload.dateOfJoining ?? "").trim();
  const monthlySalaryValue = String(payload.monthlySalary ?? "").trim();
  const subjectId = String(payload.subjectId ?? "").trim() || null;
  const { data: existingStaff, error: existingStaffError } = await service
    .from("staff")
    .select("is_class_coordinator, assigned_class, assigned_section")
    .eq("id", id)
    .single();

  if (existingStaffError || !existingStaff) {
    throw new Error(existingStaffError?.message ?? "Staff member not found.");
  }

  const assignedClass = existingStaff.assigned_class ?? null;
  const assignedSection = existingStaff.assigned_section ?? null;
  const isClassCoordinator = Boolean(existingStaff.is_class_coordinator);

  if (!id || !userId || !name || !email || !mobileNumber || !dateOfJoining || !monthlySalaryValue) {
    throw new Error("Staff id, user id, name, mobile number, date of joining, monthly salary, and email are required.");
  }

  const monthlySalary = Number(monthlySalaryValue);
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    throw new Error("Monthly salary must be a valid non-negative number.");
  }

  if (!tenantSchoolId) {
    throw new Error("School context is missing for this staff update request.");
  }

  if (firebaseAdminDb) {
    await updateManagedAuthUser(userId, {
      email,
      password,
      name,
      role: "staff",
      schoolId: tenantSchoolId,
    });

    await updatePublicUserProfile(userId, {
      name,
      email,
      phone: mobileNumber,
      role: "staff",
      school_id: tenantSchoolId,
      photo_url: photoUrl,
    });

    const staffRef = firebaseAdminDb.collection("staff").doc(id);
    await staffRef.set(
      {
        userId,
        schoolId: tenantSchoolId,
        name,
        role,
        mobileNumber,
        dateOfJoining,
        monthlySalary,
        subjectId,
        assignedClass,
        assignedSection,
        isClassCoordinator,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      id,
      userId,
      name,
      email,
      mobileNumber,
      photoUrl,
      role,
      dateOfJoining,
      monthlySalary,
      subjectId,
      assignedClass,
      assignedSection,
      isClassCoordinator,
    };
  }

  await updateManagedAuthUser(userId, {
    email,
    password,
    name,
    role: "staff",
    schoolId: tenantSchoolId,
  });

  await updatePublicUserProfile(userId, {
    name,
    email,
    phone: mobileNumber,
    role: "staff",
    school_id: tenantSchoolId,
    photo_url: photoUrl,
  });

  const { error: staffError } = await service
    .from("staff")
    .update({
      school_id: tenantSchoolId,
      name,
      role,
      mobile_number: mobileNumber,
      date_of_joining: dateOfJoining,
      monthly_salary: monthlySalary,
      subject_id: subjectId,
      is_class_coordinator: isClassCoordinator,
      assigned_class: assignedClass,
      assigned_section: assignedSection,
    })
    .eq("id", id);
  if (staffError) throw new Error(staffError.message);

  return {
    id,
    userId,
    name,
    email,
    mobileNumber,
    photoUrl,
    role,
    dateOfJoining,
    monthlySalary,
    subjectId,
    assignedClass,
    assignedSection,
    isClassCoordinator,
  };
};

const createClass = async (payload, authHeader) => {
  const context = await getUserProfile(authHeader);
  const schoolId = await ensureTenantSchoolExists(context);
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const roomNumber = String(payload.roomNumber ?? "").trim() || null;
  const floor = String(payload.floor ?? "").trim() || null;
  const capacityValue = String(payload.capacity ?? "").trim();

  if (!className) throw new Error("Class name is required.");
  if (!section) throw new Error("Section is required.");

  let capacity = null;
  if (capacityValue) {
    capacity = Number(capacityValue);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("Capacity must be a positive whole number.");
    }
  }

  if (firebaseAdminDb) {
    const ref = firebaseAdminDb.collection("classes").doc();
    await ref.set({
      schoolId,
      className,
      section,
      roomNumber,
      floor,
      capacity,
      createdAt: new Date().toISOString(),
    });

    return {
      id: ref.id,
      className,
      section,
      roomNumber,
      floor,
      capacity,
      coordinatorId: null,
      coordinatorName: null,
    };
  }

  const { data, error } = await service
    .from("classes")
    .insert({
      school_id: schoolId,
      class_name: className,
      section,
      room_number: roomNumber,
      floor,
      capacity,
    })
    .select("id, class_name, section, room_number, floor, capacity")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create class.");
  }

  return {
    id: data.id,
    className: data.class_name,
    section: data.section,
    roomNumber: data.room_number,
    floor: data.floor,
    capacity: data.capacity,
    coordinatorId: null,
    coordinatorName: null,
  };
};

const updateClass = async (payload, authHeader) => {
  const context = await getUserProfile(authHeader);
  const schoolId = await ensureTenantSchoolExists(context);
  const id = String(payload.id ?? "").trim();
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const roomNumber = String(payload.roomNumber ?? "").trim() || null;
  const floor = String(payload.floor ?? "").trim() || null;
  const capacityValue = String(payload.capacity ?? "").trim();

  if (!id) throw new Error("Class id is required.");
  if (!className) throw new Error("Class name is required.");
  if (!section) throw new Error("Section is required.");

  let capacity = null;
  if (capacityValue) {
    capacity = Number(capacityValue);
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error("Capacity must be a positive whole number.");
    }
  }

  if (firebaseAdminDb) {
    const ref = firebaseAdminDb.collection("classes").doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new Error("Unable to update class.");
    }

    await ref.set(
      {
        schoolId,
        className,
        section,
        roomNumber,
        floor,
        capacity,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      id,
      className,
      section,
      roomNumber,
      floor,
      capacity,
      coordinatorId: null,
      coordinatorName: null,
    };
  }

  const { data, error } = await service
    .from("classes")
    .update({
      school_id: schoolId,
      class_name: className,
      section,
      room_number: roomNumber,
      floor,
      capacity,
    })
    .eq("id", id)
    .eq("school_id", schoolId)
    .select("id, class_name, section, room_number, floor, capacity")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update class.");
  }

  return {
    id: data.id,
    className: data.class_name,
    section: data.section,
    roomNumber: data.room_number,
    floor: data.floor,
    capacity: data.capacity,
    coordinatorId: null,
    coordinatorName: null,
  };
};

const deleteClass = async (payload, authHeader) => {
  const context = await getUserProfile(authHeader);
  const schoolId = await ensureTenantSchoolExists(context);
  const id = String(payload.id ?? "").trim();
  if (!id) throw new Error("Class id is required.");

  if (firebaseAdminDb) {
    const classRef = firebaseAdminDb.collection("classes").doc(id);
    const classSnapshot = await classRef.get();
    if (!classSnapshot.exists) throw new Error("Class not found.");

    const classData = classSnapshot.data() ?? {};
    const className = getFirestoreString(classData, ["className", "class_name"]);
    const section = getFirestoreString(classData, ["section"]);

    const studentDocs = await getFirestoreSchoolScopedDocs("students", schoolId);
    const assignedStudents = studentDocs.filter((doc) => {
      const data = doc.data() ?? {};
      return (
        getFirestoreString(data, ["className", "class"]) === className &&
        getFirestoreString(data, ["section"]) === section
      );
    });

    if (assignedStudents.length > 0) {
      throw new Error("Students are still assigned to this class. Remove or move them first.");
    }

    await classRef.delete();
    return null;
  }

  const { data: classRow, error: classLookupError } = await service
    .from("classes")
    .select("id, class_name, section")
    .eq("id", id)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (classLookupError) throw new Error(classLookupError.message);
  if (!classRow) throw new Error("Class not found.");

  const { count, error: studentsError } = await service
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .eq("class", classRow.class_name)
    .eq("section", classRow.section);

  if (studentsError) throw new Error(studentsError.message);
  if ((count ?? 0) > 0) {
    throw new Error("Students are still assigned to this class. Remove or move them first.");
  }

  const { error } = await service.from("classes").delete().eq("id", id).eq("school_id", schoolId);
  if (error) throw new Error(error.message);
  return null;
};

const deleteStaff = async (payload) => {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("Staff id is required.");

  if (firebaseAdminDb) {
    const staffRef = firebaseAdminDb.collection("staff").doc(id);
    const staffSnapshot = await staffRef.get();
    if (!staffSnapshot.exists) throw new Error("Staff member not found.");
    const userId = getFirestoreString(staffSnapshot.data() ?? {}, ["userId", "user_id"]);

    await cleanupStaffDependencies(id);
    await staffRef.delete();
    await cleanupTable("users", "id", userId);
    await cleanupUser(userId);
    return null;
  }

  const { data, error } = await service.from("staff").select("user_id").eq("id", id).single();
  if (error || !data) throw new Error(error?.message ?? "Staff member not found.");

  await cleanupStaffDependencies(id);

  const { error: staffError } = await service.from("staff").delete().eq("id", id);
  if (staffError) throw new Error(staffError.message);

  const { error: userDeleteError } = await service.from("users").delete().eq("id", data.user_id);
  if (userDeleteError) throw new Error(userDeleteError.message);

  const { error: authDeleteError } = await service.auth.admin.deleteUser(data.user_id);
  if (authDeleteError && !authDeleteError.message.toLowerCase().includes("not found")) {
    throw new Error(authDeleteError.message);
  }

  return null;
};

const deleteAllStaff = async (_payload, authHeader) => {
  const context = await getUserProfile(authHeader);
  const schoolId = await ensureTenantSchoolExists(context);

  if (firebaseAdminDb) {
    const staffDocs = await getFirestoreSchoolScopedDocs("staff", schoolId);
    const rows = staffDocs.map((doc) => ({
      id: doc.id,
      user_id: getFirestoreString(doc.data() ?? {}, ["userId", "user_id"]),
    }));

    for (const row of rows) {
      await cleanupStaffDependencies(row.id);
    }

    await deleteFirestoreDocs(staffDocs);
    for (const row of rows) {
      await cleanupTable("users", "id", row.user_id);
      await cleanupUser(row.user_id);
    }

    await insertAuditLog({
      schoolId,
      userId: context.profile.id ?? context.user.id,
      action: "DELETE",
      module: "STAFF_BULK_DELETE",
      recordId: null,
    });

    return { deleted: rows.length };
  }

  const { data: staffRows, error: staffError } = await service
    .from("staff")
    .select("id, user_id")
    .eq("school_id", schoolId);

  if (staffError) throw new Error(staffError.message);

  const rows = staffRows ?? [];
  for (const row of rows) {
    await cleanupStaffDependencies(row.id);
  }

  const userIds = rows.map((row) => String(row.user_id ?? "").trim()).filter(Boolean);
  const staffIds = rows.map((row) => String(row.id ?? "").trim()).filter(Boolean);

  if (staffIds.length > 0) {
    const { error: notificationsError } = await service
      .from("notifications")
      .delete()
      .in("receiver_id", staffIds);
    if (notificationsError) throw new Error(notificationsError.message);

    const { error: adjustmentsError } = await service
      .from("timetable_adjustments")
      .delete()
      .in("replacement_teacher_id", staffIds);
    if (adjustmentsError) throw new Error(adjustmentsError.message);
  }

  const { error: staffDeleteError } = await service.from("staff").delete().eq("school_id", schoolId);
  if (staffDeleteError) throw new Error(staffDeleteError.message);

  if (userIds.length > 0) {
    const { error: userDeleteError } = await service.from("users").delete().in("id", userIds);
    if (userDeleteError) throw new Error(userDeleteError.message);

    for (const userId of userIds) {
      await cleanupUser(userId);
    }
  }

  await insertAuditLog({
    schoolId,
    userId: context.profile.id ?? context.user.id,
    action: "DELETE",
    module: "STAFF_BULK_DELETE",
    recordId: null,
  });

  return { deleted: rows.length };
};

const createStudentBundle = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const studentName = String(payload.studentName ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const studentIdentifier = await resolveStudentIdentifier(tenantSchoolId, payload.schoolId);
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const admissionDate = toOptionalText(payload.admissionDate);
  const discountFee = toOptionalNumber(payload.discountFee, "Discount fee");
  const studentAadharNumber = toOptionalText(payload.studentAadharNumber);
  const studentPassword = String(payload.studentPassword ?? "");
  const dateOfBirth = toOptionalText(payload.dateOfBirth);
  const birthId = toOptionalText(payload.birthId);
  const isOrphan = Boolean(payload.isOrphan);
  const gender = toOptionalText(payload.gender);
  const caste = toOptionalText(payload.caste);
  const osc = toOptionalText(payload.osc);
  const identificationMark = toOptionalText(payload.identificationMark);
  const previousSchool = toOptionalText(payload.previousSchool);
  const region = toOptionalText(payload.region);
  const bloodGroup = toOptionalText(payload.bloodGroup);
  const previousBoardRollNo = toOptionalText(payload.previousBoardRollNo);
  const address = toOptionalText(payload.address);
  const fatherName = String(payload.fatherName ?? "").trim();
  const fatherAadharNumber = toOptionalText(payload.fatherAadharNumber);
  const fatherOccupation = toOptionalText(payload.fatherOccupation);
  const fatherEducation = toOptionalText(payload.fatherEducation);
  const fatherMobileNumber = String(payload.fatherMobileNumber ?? "").trim();
  const fatherProfession = toOptionalText(payload.fatherProfession);
  const fatherIncome = toOptionalNumber(payload.fatherIncome, "Father income");
  const fatherEmail = String(payload.fatherEmail ?? "").trim().toLowerCase();
  const fatherPassword = String(payload.fatherPassword ?? "");
  const motherName = toOptionalText(payload.motherName);
  const motherAadharNumber = toOptionalText(payload.motherAadharNumber);
  const motherOccupation = toOptionalText(payload.motherOccupation);
  const motherEducation = toOptionalText(payload.motherEducation);
  const motherMobileNumber = toOptionalText(payload.motherMobileNumber);
  const motherProfession = toOptionalText(payload.motherProfession);
  const motherIncome = toOptionalNumber(payload.motherIncome, "Mother income");
  const studentEmail = `${studentIdentifier.toLowerCase()}@students.inddiaerp.local`;

  if (
    !studentName ||
    !studentIdentifier ||
    !className ||
    !section ||
    !studentPassword ||
    !fatherName ||
    !fatherEmail ||
    !fatherMobileNumber ||
    !fatherPassword
  ) {
    throw new Error("Student details and required father account fields are required.");
  }

  if (!tenantSchoolId) {
    throw new Error("School context is missing for this student creation request.");
  }

  await ensureClassSectionExists(tenantSchoolId, className, section);

  let parentUserId;
  let parentId;
  let studentUserId;

  if (firebaseAdminDb) {
    try {
      const parentAuth = await createManagedAuthUser({
        email: fatherEmail,
        password: fatherPassword,
        name: fatherName,
        role: "parent",
        schoolId: tenantSchoolId,
      });
      parentUserId = parentAuth.user.id;

      await insertPublicUserProfile({
        id: parentUserId,
        name: fatherName,
        email: fatherEmail,
        role: "parent",
        school_id: tenantSchoolId,
      });

      const parentRef = firebaseAdminDb.collection("parents").doc();
      await parentRef.set({
        userId: parentUserId,
        schoolId: tenantSchoolId,
        name: fatherName,
        email: fatherEmail,
        phone: fatherMobileNumber,
        fatherName,
        fatherAadharNumber,
        fatherOccupation,
        fatherEducation,
        fatherMobileNumber,
        fatherProfession,
        fatherIncome,
        motherName,
        motherAadharNumber,
        motherOccupation,
        motherEducation,
        motherMobileNumber,
        motherProfession,
        motherIncome,
        createdAt: new Date().toISOString(),
      });
      parentId = parentRef.id;

      const studentAuth = await createManagedAuthUser({
        email: studentEmail,
        password: studentPassword,
        name: studentName,
        role: "student",
        schoolId: tenantSchoolId,
        extra: { student_code: studentIdentifier, studentCode: studentIdentifier },
      });
      studentUserId = studentAuth.user.id;

      await insertPublicUserProfile({
        id: studentUserId,
        name: studentName,
        email: studentEmail,
        role: "student",
        school_id: tenantSchoolId,
        photo_url: photoUrl,
      });

      const studentRef = firebaseAdminDb.collection("students").doc();
      await studentRef.set({
        userId: studentUserId,
        schoolId: tenantSchoolId,
        name: studentName,
        studentCode: studentIdentifier,
        className,
        section,
        admissionDate,
        discountFee,
        studentAadharNumber,
        dateOfBirth,
        birthId,
        isOrphan,
        gender,
        caste,
        osc,
        identificationMark,
        previousSchool,
        region,
        bloodGroup,
        previousBoardRollNo,
        address,
        parentId,
        photoUrl,
        createdAt: new Date().toISOString(),
      });

      return {
        id: studentRef.id,
        userId: studentUserId,
        name: studentName,
        photoUrl,
        schoolId: studentIdentifier,
        className,
        section,
        admissionDate,
        discountFee,
        studentAadharNumber,
        dateOfBirth,
        birthId,
        isOrphan,
        gender,
        caste,
        osc,
        identificationMark,
        previousSchool,
        region,
        bloodGroup,
        previousBoardRollNo,
        address,
        parentId,
        parentUserId,
        parentName: fatherName,
        parentEmail: fatherEmail,
        parentPhone: fatherMobileNumber,
        fatherName,
        fatherAadharNumber,
        fatherOccupation,
        fatherEducation,
        fatherMobileNumber,
        fatherProfession,
        fatherIncome,
        fatherEmail,
        motherName,
        motherAadharNumber,
        motherOccupation,
        motherEducation,
        motherMobileNumber,
        motherProfession,
        motherIncome,
      };
    } catch (error) {
      await cleanupTable("students", "userId", studentUserId);
      await cleanupTable("users", "id", studentUserId);
      await cleanupUser(studentUserId);
      await cleanupTable("parents", "id", parentId);
      await cleanupTable("users", "id", parentUserId);
      await cleanupUser(parentUserId);
      throw error;
    }
  }

  try {
    const parentAuth = await createManagedAuthUser({
      email: fatherEmail,
      password: fatherPassword,
      name: fatherName,
      role: "parent",
      schoolId: tenantSchoolId,
    });
    parentUserId = parentAuth.user.id;

    await insertPublicUserProfile({
      id: parentUserId,
      name: fatherName,
      email: fatherEmail,
      role: "parent",
      school_id: tenantSchoolId,
    });

    const { data: parentRow, error: parentError } = await service
      .from("parents")
      .insert({
        user_id: parentUserId,
        school_id: tenantSchoolId,
        name: fatherName,
        email: fatherEmail,
        phone: fatherMobileNumber,
        father_name: fatherName,
        father_aadhar_number: fatherAadharNumber,
        father_occupation: fatherOccupation,
        father_education: fatherEducation,
        father_mobile_number: fatherMobileNumber,
        father_profession: fatherProfession,
        father_income: fatherIncome,
        mother_name: motherName,
        mother_aadhar_number: motherAadharNumber,
        mother_occupation: motherOccupation,
        mother_education: motherEducation,
        mother_mobile_number: motherMobileNumber,
        mother_profession: motherProfession,
        mother_income: motherIncome,
      })
      .select("id")
      .single();
    if (parentError || !parentRow) throw new Error(parentError?.message ?? "Unable to create parent record.");
    parentId = parentRow.id;

    const studentAuth = await createManagedAuthUser({
      email: studentEmail,
      password: studentPassword,
      name: studentName,
      role: "student",
      schoolId: tenantSchoolId,
      extra: { student_code: studentIdentifier, studentCode: studentIdentifier },
    });
    studentUserId = studentAuth.user.id;

    await insertPublicUserProfile({
      id: studentUserId,
      name: studentName,
      email: studentEmail,
      role: "student",
      school_id: tenantSchoolId,
      photo_url: photoUrl,
    });

    const { data: studentRow, error: studentError } = await service
      .from("students")
      .insert({
        user_id: studentUserId,
        school_id: tenantSchoolId,
        name: studentName,
        student_code: studentIdentifier,
        class: className,
        section,
        admission_date: admissionDate,
        discount_fee: discountFee,
        aadhar_number: studentAadharNumber,
        date_of_birth: dateOfBirth,
        birth_id: birthId,
        is_orphan: isOrphan,
        gender,
        caste,
        osc,
        identification_mark: identificationMark,
        previous_school: previousSchool,
        region,
        blood_group: bloodGroup,
        previous_board_roll_no: previousBoardRollNo,
        address,
        parent_id: parentId,
      })
      .select("id")
      .single();
    if (studentError || !studentRow) throw new Error(studentError?.message ?? "Unable to create student record.");

    return {
      id: studentRow.id,
      userId: studentUserId,
      name: studentName,
      photoUrl,
      schoolId: studentIdentifier,
      className,
      section,
      admissionDate,
      discountFee,
      studentAadharNumber,
      dateOfBirth,
      birthId,
      isOrphan,
      gender,
      caste,
      osc,
      identificationMark,
      previousSchool,
      region,
      bloodGroup,
      previousBoardRollNo,
      address,
      parentId,
      parentUserId,
      parentName: fatherName,
      parentEmail: fatherEmail,
      parentPhone: fatherMobileNumber,
      fatherName,
      fatherAadharNumber,
      fatherOccupation,
      fatherEducation,
      fatherMobileNumber,
      fatherProfession,
      fatherIncome,
      fatherEmail,
      motherName,
      motherAadharNumber,
      motherOccupation,
      motherEducation,
      motherMobileNumber,
      motherProfession,
      motherIncome,
    };
  } catch (error) {
    await cleanupTable("students", "user_id", studentUserId);
    await cleanupTable("users", "id", studentUserId);
    await cleanupUser(studentUserId);
    await cleanupTable("parents", "id", parentId);
    await cleanupTable("users", "id", parentUserId);
    await cleanupUser(parentUserId);
    throw error;
  }
};

const bulkImportStudents = async (payload, authHeader) => {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];

  if (rows.length === 0) {
    throw new Error("Add at least one student row to import.");
  }

  const normalizedRows = rows
    .map((rawRow, index) => ({ index, row: normalizeImportRow(rawRow) }))
    .filter(({ row }) => !isImportRowEmpty(row));

  if (normalizedRows.length === 0) {
    throw new Error("The selected file only contains empty rows.");
  }

  const results = await runImportInBatches(normalizedRows, STUDENT_IMPORT_BATCH_SIZE, async ({ index, row }) => {
    const studentName = toImportText(getImportValue(row, ["studentName", "student name", "name", "fullName", "full name"]));
    const studentCode = toImportText(
      getImportValue(row, ["schoolId", "school id", "studentCode", "student code", "admissionNo", "admission no", "admissionNumber", "admission number"]),
    );
    const identifier = studentCode || studentName || `Row ${index + 2}`;

    try {
      const student = await createStudentBundle(
        {
          studentName,
          photoUrl: toImportText(getImportValue(row, ["photoUrl", "photo url", "image", "imageUrl", "image url"])),
          schoolId: studentCode,
          className: toImportText(getImportValue(row, ["className", "class name", "class"])),
          section: toImportText(getImportValue(row, ["section"])),
          admissionDate: toImportText(getImportValue(row, ["admissionDate", "admission date"])),
          discountFee: toImportText(getImportValue(row, ["discountFee", "discount fee"])),
          studentAadharNumber: toImportText(
            getImportValue(row, ["studentAadharNumber", "student aadhar number", "studentAadhaarNumber", "student aadhaar number", "aadharNumber", "aadhaarNumber"]),
          ),
          studentPassword: toImportText(getImportValue(row, ["studentPassword", "student password", "password"])),
          dateOfBirth: toImportText(getImportValue(row, ["dateOfBirth", "date of birth", "dob"])),
          birthId: toImportText(getImportValue(row, ["birthId", "birth id"])),
          isOrphan: toImportBoolean(getImportValue(row, ["isOrphan", "is orphan", "orphan"])),
          gender: toImportText(getImportValue(row, ["gender"])),
          caste: toImportText(getImportValue(row, ["caste"])),
          osc: toImportText(getImportValue(row, ["osc"])),
          identificationMark: toImportText(getImportValue(row, ["identificationMark", "identification mark"])),
          previousSchool: toImportText(getImportValue(row, ["previousSchool", "previous school"])),
          region: toImportText(getImportValue(row, ["region"])),
          bloodGroup: toImportText(getImportValue(row, ["bloodGroup", "blood group"])),
          previousBoardRollNo: toImportText(getImportValue(row, ["previousBoardRollNo", "previous board roll no"])),
          address: toImportText(getImportValue(row, ["address"])),
          fatherName: toImportText(getImportValue(row, ["fatherName", "father name", "parentName", "parent name"])),
          fatherAadharNumber: toImportText(
            getImportValue(row, ["fatherAadharNumber", "father aadhar number", "fatherAadhaarNumber", "father aadhaar number"]),
          ),
          fatherOccupation: toImportText(getImportValue(row, ["fatherOccupation", "father occupation"])),
          fatherEducation: toImportText(getImportValue(row, ["fatherEducation", "father education"])),
          fatherMobileNumber: toImportText(
            getImportValue(row, ["fatherMobileNumber", "father mobile number", "parentPhone", "parent phone", "fatherPhone", "father phone"]),
          ),
          fatherProfession: toImportText(getImportValue(row, ["fatherProfession", "father profession"])),
          fatherIncome: toImportText(getImportValue(row, ["fatherIncome", "father income"])),
          fatherEmail: toImportText(
            getImportValue(row, ["fatherEmail", "father email", "parentEmail", "parent email"]),
          ).toLowerCase(),
          fatherPassword: toImportText(getImportValue(row, ["fatherPassword", "father password", "parentPassword", "parent password"])),
          motherName: toImportText(getImportValue(row, ["motherName", "mother name"])),
          motherAadharNumber: toImportText(
            getImportValue(row, ["motherAadharNumber", "mother aadhar number", "motherAadhaarNumber", "mother aadhaar number"]),
          ),
          motherOccupation: toImportText(getImportValue(row, ["motherOccupation", "mother occupation"])),
          motherEducation: toImportText(getImportValue(row, ["motherEducation", "mother education"])),
          motherMobileNumber: toImportText(getImportValue(row, ["motherMobileNumber", "mother mobile number", "motherPhone", "mother phone"])),
          motherProfession: toImportText(getImportValue(row, ["motherProfession", "mother profession"])),
          motherIncome: toImportText(getImportValue(row, ["motherIncome", "mother income"])),
        },
        authHeader,
      );

      return {
        rowNumber: index + 2,
        identifier,
        success: true,
        message: `Created student account for ${student.name}.`,
      };
    } catch (error) {
      return {
        rowNumber: index + 2,
        identifier,
        success: false,
        message: error instanceof Error ? error.message : "Student import failed.",
      };
    }
  });

  const created = results.filter((item) => item.success).length;
  const failed = results.length - created;
  return { created, failed, results };
};

const approveApplicant = async (payload, authHeader) => {
  const applicantId = String(payload.applicantId ?? "");
  const section = String(payload.section ?? "").trim();
  const studentPassword = String(payload.studentPassword ?? "");
  const parentPassword = String(payload.parentPassword ?? "");

  if (!applicantId || !section || !studentPassword || !parentPassword) {
    throw new Error("Applicant approval requires section, student password, and parent password.");
  }

  const { data: applicant, error: applicantError } = await service
    .from("applicants")
    .select("id, name, email, class, parent_name, parent_email, parent_phone, status")
    .eq("id", applicantId)
    .single();

  if (applicantError || !applicant) {
    throw new Error(applicantError?.message ?? "Applicant not found.");
  }

  if (String(applicant.status ?? "").toLowerCase() === "approved") {
    throw new Error("Applicant is already approved.");
  }

  const student = await createStudentBundle({
    studentName: applicant.name,
    className: applicant.class,
    section,
    studentPassword,
    parentName: applicant.parent_name || `${applicant.name} Parent`,
    parentEmail: applicant.parent_email || applicant.email,
    parentPhone: applicant.parent_phone || "0000000000",
    parentPassword,
  }, authHeader);

  const { error: updateError } = await service
    .from("applicants")
    .update({ status: "Approved" })
    .eq("id", applicantId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return student;
};

const updateStudentBundle = async (payload, authHeader) => {
  const { profile } = await getUserProfile(authHeader);
  const tenantSchoolId = String(profile.school_id ?? "").trim();
  const id = String(payload.id ?? "");
  const userId = String(payload.userId ?? "");
  const parentId = String(payload.parentId ?? "");
  const parentUserId = String(payload.parentUserId ?? "");
  const studentName = String(payload.studentName ?? "").trim();
  const photoUrl = String(payload.photoUrl ?? "").trim() || null;
  const className = String(payload.className ?? "").trim();
  const section = String(payload.section ?? "").trim();
  const admissionDate = toOptionalText(payload.admissionDate);
  const discountFee = toOptionalNumber(payload.discountFee, "Discount fee");
  const studentAadharNumber = toOptionalText(payload.studentAadharNumber);
  const studentPassword = String(payload.studentPassword ?? "");
  const dateOfBirth = toOptionalText(payload.dateOfBirth);
  const birthId = toOptionalText(payload.birthId);
  const isOrphan = Boolean(payload.isOrphan);
  const gender = toOptionalText(payload.gender);
  const caste = toOptionalText(payload.caste);
  const osc = toOptionalText(payload.osc);
  const identificationMark = toOptionalText(payload.identificationMark);
  const previousSchool = toOptionalText(payload.previousSchool);
  const region = toOptionalText(payload.region);
  const bloodGroup = toOptionalText(payload.bloodGroup);
  const previousBoardRollNo = toOptionalText(payload.previousBoardRollNo);
  const address = toOptionalText(payload.address);
  const fatherName = String(payload.fatherName ?? "").trim();
  const fatherAadharNumber = toOptionalText(payload.fatherAadharNumber);
  const fatherOccupation = toOptionalText(payload.fatherOccupation);
  const fatherEducation = toOptionalText(payload.fatherEducation);
  const fatherMobileNumber = String(payload.fatherMobileNumber ?? "").trim();
  const fatherProfession = toOptionalText(payload.fatherProfession);
  const fatherIncome = toOptionalNumber(payload.fatherIncome, "Father income");
  const fatherEmail = String(payload.fatherEmail ?? "").trim().toLowerCase();
  const fatherPassword = String(payload.fatherPassword ?? "");
  const motherName = toOptionalText(payload.motherName);
  const motherAadharNumber = toOptionalText(payload.motherAadharNumber);
  const motherOccupation = toOptionalText(payload.motherOccupation);
  const motherEducation = toOptionalText(payload.motherEducation);
  const motherMobileNumber = toOptionalText(payload.motherMobileNumber);
  const motherProfession = toOptionalText(payload.motherProfession);
  const motherIncome = toOptionalNumber(payload.motherIncome, "Mother income");
  const { data: existingStudentUser } = await service
    .from("users")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const studentIdentifier = await resolveStudentIdentifier(tenantSchoolId, payload.schoolId, existingStudentUser?.email ?? "");
  const studentEmail = `${studentIdentifier.toLowerCase()}@students.inddiaerp.local`;

  if (!id || !userId || !parentId || !parentUserId) {
    throw new Error("Student and parent identifiers are required.");
  }

  if (!studentName || !studentIdentifier || !className || !section || !fatherName || !fatherEmail || !fatherMobileNumber) {
    throw new Error("Student details and required father account fields are required.");
  }

  await ensureClassSectionExists(tenantSchoolId, className, section);

  if (firebaseAdminDb) {
    await updateManagedAuthUser(parentUserId, {
      email: fatherEmail,
      password: fatherPassword,
      name: fatherName,
      role: "parent",
      schoolId: tenantSchoolId,
    });
    await updateManagedAuthUser(userId, {
      email: studentEmail,
      password: studentPassword,
      name: studentName,
      role: "student",
      schoolId: tenantSchoolId,
      extra: { student_code: studentIdentifier, studentCode: studentIdentifier },
    });

    await updatePublicUserProfile(parentUserId, {
      name: fatherName,
      email: fatherEmail,
      role: "parent",
      school_id: tenantSchoolId,
    });
    await updatePublicUserProfile(userId, {
      name: studentName,
      email: studentEmail,
      role: "student",
      school_id: tenantSchoolId,
      photo_url: photoUrl,
    });

    await firebaseAdminDb.collection("parents").doc(parentId).set(
      {
        userId: parentUserId,
        schoolId: tenantSchoolId,
        name: fatherName,
        email: fatherEmail,
        phone: fatherMobileNumber,
        fatherName,
        fatherAadharNumber,
        fatherOccupation,
        fatherEducation,
        fatherMobileNumber,
        fatherProfession,
        fatherIncome,
        motherName,
        motherAadharNumber,
        motherOccupation,
        motherEducation,
        motherMobileNumber,
        motherProfession,
        motherIncome,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    await firebaseAdminDb.collection("students").doc(id).set(
      {
        userId,
        schoolId: tenantSchoolId,
        name: studentName,
        studentCode: studentIdentifier,
        className,
        section,
        admissionDate,
        discountFee,
        studentAadharNumber,
        dateOfBirth,
        birthId,
        isOrphan,
        gender,
        caste,
        osc,
        identificationMark,
        previousSchool,
        region,
        bloodGroup,
        previousBoardRollNo,
        address,
        parentId,
        photoUrl,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return {
      id,
      userId,
      name: studentName,
      photoUrl,
      schoolId: studentIdentifier,
      className,
      section,
      admissionDate,
      discountFee,
      studentAadharNumber,
      dateOfBirth,
      birthId,
      isOrphan,
      gender,
      caste,
      osc,
      identificationMark,
      previousSchool,
      region,
      bloodGroup,
      previousBoardRollNo,
      address,
      parentId,
      parentUserId,
      parentName: fatherName,
      parentEmail: fatherEmail,
      parentPhone: fatherMobileNumber,
      fatherName,
      fatherAadharNumber,
      fatherOccupation,
      fatherEducation,
      fatherMobileNumber,
      fatherProfession,
      fatherIncome,
      fatherEmail,
      motherName,
      motherAadharNumber,
      motherOccupation,
      motherEducation,
      motherMobileNumber,
      motherProfession,
      motherIncome,
    };
  }

  const parentAuthUpdate = {
    email: fatherEmail,
    ...(fatherPassword ? { password: fatherPassword } : {}),
    ...buildAuthMetadata({ name: fatherName, role: "parent", schoolId: tenantSchoolId }),
  };
  const studentAuthUpdate = {
    email: studentEmail,
    ...(studentPassword ? { password: studentPassword } : {}),
    ...buildAuthMetadata({ name: studentName, role: "student", schoolId: tenantSchoolId, extra: { student_code: studentIdentifier } }),
  };

  const { error: parentAuthError } = await service.auth.admin.updateUserById(parentUserId, parentAuthUpdate);
  if (parentAuthError) throw new Error(parentAuthError.message);
  const { error: studentAuthError } = await service.auth.admin.updateUserById(userId, studentAuthUpdate);
  if (studentAuthError) throw new Error(studentAuthError.message);

  const { error: parentUserError } = await service
    .from("users")
    .update({ name: fatherName, email: fatherEmail, role: "parent", school_id: tenantSchoolId })
    .eq("id", parentUserId);
  if (parentUserError) throw new Error(parentUserError.message);

  const { error: parentError } = await service
    .from("parents")
    .update({
      school_id: tenantSchoolId,
      name: fatherName,
      email: fatherEmail,
      phone: fatherMobileNumber,
      father_name: fatherName,
      father_aadhar_number: fatherAadharNumber,
      father_occupation: fatherOccupation,
      father_education: fatherEducation,
      father_mobile_number: fatherMobileNumber,
      father_profession: fatherProfession,
      father_income: fatherIncome,
      mother_name: motherName,
      mother_aadhar_number: motherAadharNumber,
      mother_occupation: motherOccupation,
      mother_education: motherEducation,
      mother_mobile_number: motherMobileNumber,
      mother_profession: motherProfession,
      mother_income: motherIncome,
    })
    .eq("id", parentId);
  if (parentError) throw new Error(parentError.message);

  const { error: studentUserError } = await service
    .from("users")
    .update({ name: studentName, email: studentEmail, role: "student", school_id: tenantSchoolId, photo_url: photoUrl })
    .eq("id", userId);
  if (studentUserError) throw new Error(studentUserError.message);

  const { error: studentError } = await service
    .from("students")
    .update({
      school_id: tenantSchoolId,
      name: studentName,
      student_code: studentIdentifier,
      class: className,
      section,
      admission_date: admissionDate,
      discount_fee: discountFee,
      aadhar_number: studentAadharNumber,
      date_of_birth: dateOfBirth,
      birth_id: birthId,
      is_orphan: isOrphan,
      gender,
      caste,
      osc,
      identification_mark: identificationMark,
      previous_school: previousSchool,
      region,
      blood_group: bloodGroup,
      previous_board_roll_no: previousBoardRollNo,
      address,
      parent_id: parentId,
    })
    .eq("id", id);
  if (studentError) throw new Error(studentError.message);

  return {
    id,
    userId,
    name: studentName,
    photoUrl,
    schoolId: studentIdentifier,
    className,
    section,
    admissionDate,
    discountFee,
    studentAadharNumber,
    dateOfBirth,
    birthId,
    isOrphan,
    gender,
    caste,
    osc,
    identificationMark,
    previousSchool,
    region,
    bloodGroup,
    previousBoardRollNo,
    address,
    parentId,
    parentUserId,
    parentName: fatherName,
    parentEmail: fatherEmail,
    parentPhone: fatherMobileNumber,
    fatherName,
    fatherAadharNumber,
    fatherOccupation,
    fatherEducation,
    fatherMobileNumber,
    fatherProfession,
    fatherIncome,
    fatherEmail,
    motherName,
    motherAadharNumber,
    motherOccupation,
    motherEducation,
    motherMobileNumber,
    motherProfession,
    motherIncome,
  };
};

const addMonthsToDate = (date, months) => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next.toISOString().slice(0, 10);
};

const parseAttendanceGeoRadius = (value) => {
  if (value === "" || value == null) return null;
  const radius = Number(value);
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new Error("Attendance GPS radius must be greater than zero.");
  }
  return radius;
};

const extractCoordinatesFromMapUrl = (value) => {
  const trimmed = String(value ?? "").trim();
  const coordinatePatterns = [
    /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]ll=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /[?&]center=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/,
    /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/,
  ];

  for (const pattern of coordinatePatterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      return { mapLink: trimmed, latitude, longitude };
    }
  }

  return null;
};

const parseCoordinatesFromMapLink = async (mapLink) => {
  const trimmed = String(mapLink ?? "").trim();
  if (!trimmed) {
    return { mapLink: null, latitude: null, longitude: null };
  }

  const directCoordinates = extractCoordinatesFromMapUrl(trimmed);
  if (directCoordinates) {
    return directCoordinates;
  }

  try {
    const response = await fetch(trimmed, {
      method: "GET",
      redirect: "follow",
    });
    const resolvedUrl = String(response.url ?? "").trim();
    const resolvedCoordinates = extractCoordinatesFromMapUrl(resolvedUrl);
    if (resolvedCoordinates) {
      return { mapLink: trimmed, latitude: resolvedCoordinates.latitude, longitude: resolvedCoordinates.longitude };
    }
  } catch {
    // Ignore network/redirect failures here and fall through to the final validation message.
  }

  throw new Error("Attendance map link must include valid latitude and longitude coordinates.");
};

const resolveAttendanceGeoConfig = async (mapLinkValue, radiusValue) => {
  const radiusMeters = parseAttendanceGeoRadius(radiusValue);
  const { mapLink, latitude, longitude } = await parseCoordinatesFromMapLink(mapLinkValue);

  if (mapLink && radiusMeters === null) {
    throw new Error("Attendance GPS radius is required when a school map link is added.");
  }

  if (!mapLink && radiusMeters !== null) {
    throw new Error("Attendance map link is required when a GPS radius is added.");
  }

  return {
    attendanceMapLink: mapLink,
    attendanceGeoLatitude: latitude,
    attendanceGeoLongitude: longitude,
    attendanceGeoRadiusMeters: radiusMeters,
  };
};

const calculateDistanceMeters = (latitudeA, longitudeA, latitudeB, longitudeB) => {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) * Math.cos(toRadians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const SCHOOL_SELECT =
  "id, name, email, phone, address, attendance_map_link, attendance_geo_latitude, attendance_geo_longitude, attendance_geo_radius_meters, billing_contact_name, billing_contact_email, billing_contact_phone, billing_address, finance_email, tax_id, authorized_signatory, logo_url, theme_color, subscription_status, subscription_plan, storage_limit, student_limit, staff_limit, renewal_notice_days, expiry_date, created_at";

const resolveSchoolAccessStatus = (school, subscription) => {
  const directStatus = String(school?.subscription_status ?? "").trim();
  if (directStatus) {
    return directStatus;
  }

  if (subscription?.status === "Expired") {
    return "Expired";
  }

  if (subscription?.status === "Active") {
    const endDate = String(subscription.end_date ?? "").trim();
    if (endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(endDate);
      expiry.setHours(0, 0, 0, 0);
      if (!Number.isNaN(expiry.getTime()) && expiry < today) {
        return "Expired";
      }
    }
    return "Active";
  }

  return "Trial";
};

const mapSchoolDirectoryRow = (schoolId, school, admin, subscription, payment) => ({
  id: schoolId,
  name:
    String(school?.name ?? "").trim() ||
    String(admin?.name ?? "").trim() ||
    `School ${schoolId.slice(0, 8)}`,
  email: school?.email ?? null,
  phone: school?.phone ?? null,
  address: school?.address ?? null,
  attendanceMapLink: school?.attendance_map_link ?? null,
  attendanceGeoLatitude: school?.attendance_geo_latitude ?? null,
  attendanceGeoLongitude: school?.attendance_geo_longitude ?? null,
  attendanceGeoRadiusMeters: school?.attendance_geo_radius_meters ?? null,
  billingContactName: school?.billing_contact_name ?? null,
  billingContactEmail: school?.billing_contact_email ?? null,
  billingContactPhone: school?.billing_contact_phone ?? null,
  billingAddress: school?.billing_address ?? null,
  financeEmail: school?.finance_email ?? null,
  taxId: school?.tax_id ?? null,
  authorizedSignatory: school?.authorized_signatory ?? null,
  logoUrl: school?.logo_url ?? null,
  themeColor: school?.theme_color ?? null,
  subscriptionStatus: resolveSchoolAccessStatus(school, subscription),
  subscriptionPlan: school?.subscription_plan ?? subscription?.plan_name ?? null,
  storageLimit: school?.storage_limit ?? null,
  studentLimit: school?.student_limit ?? null,
  staffLimit: school?.staff_limit ?? null,
  renewalNoticeDays: school?.renewal_notice_days ?? null,
  expiryDate: school?.expiry_date ?? subscription?.end_date ?? null,
  createdAt: school?.created_at ?? admin?.created_at ?? subscription?.created_at ?? payment?.created_at ?? null,
  adminName: admin?.name ?? null,
  adminEmail: admin?.email ?? null,
});

const loadSchoolDirectory = async () => {
  if (firebaseAdminDb) {
    const [schoolDocs, userDocs, subscriptionDocs, paymentDocs] = await Promise.all([
      getAllFirestoreDocs("schools"),
      getAllFirestoreDocs("users"),
      getAllFirestoreDocs("subscriptions"),
      getAllFirestoreDocs("payments"),
    ]);

    const schoolById = new Map(
      schoolDocs.map((doc) => [
        doc.id,
        {
          id: doc.id,
          name: getFirestoreString(doc.data(), ["name"]),
          email: getFirestoreString(doc.data(), ["email"]),
          phone: getFirestoreString(doc.data(), ["phone"]),
          address: getFirestoreString(doc.data(), ["address"]),
          attendance_map_link: getFirestoreString(doc.data(), ["attendanceMapLink", "attendance_map_link"]),
          attendance_geo_latitude: getFirestoreNumber(doc.data(), ["attendanceGeoLatitude", "attendance_geo_latitude"]),
          attendance_geo_longitude: getFirestoreNumber(doc.data(), ["attendanceGeoLongitude", "attendance_geo_longitude"]),
          attendance_geo_radius_meters: getFirestoreNumber(doc.data(), ["attendanceGeoRadiusMeters", "attendance_geo_radius_meters"]),
          billing_contact_name: getFirestoreString(doc.data(), ["billingContactName", "billing_contact_name"]),
          billing_contact_email: getFirestoreString(doc.data(), ["billingContactEmail", "billing_contact_email"]),
          billing_contact_phone: getFirestoreString(doc.data(), ["billingContactPhone", "billing_contact_phone"]),
          billing_address: getFirestoreString(doc.data(), ["billingAddress", "billing_address"]),
          finance_email: getFirestoreString(doc.data(), ["financeEmail", "finance_email"]),
          tax_id: getFirestoreString(doc.data(), ["taxId", "tax_id"]),
          authorized_signatory: getFirestoreString(doc.data(), ["authorizedSignatory", "authorized_signatory"]),
          logo_url: getFirestoreString(doc.data(), ["logoUrl", "logo_url"]),
          theme_color: getFirestoreString(doc.data(), ["themeColor", "theme_color"]),
          subscription_status: getFirestoreString(doc.data(), ["subscriptionStatus", "subscription_status"]),
          subscription_plan: getFirestoreString(doc.data(), ["subscriptionPlan", "subscription_plan"]),
          storage_limit: getFirestoreNumber(doc.data(), ["storageLimit", "storage_limit"]),
          student_limit: getFirestoreNumber(doc.data(), ["studentLimit", "student_limit"]),
          staff_limit: getFirestoreNumber(doc.data(), ["staffLimit", "staff_limit"]),
          renewal_notice_days: getFirestoreNumber(doc.data(), ["renewalNoticeDays", "renewal_notice_days"]),
          expiry_date: getFirestoreString(doc.data(), ["expiryDate", "expiry_date"]),
          created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
        },
      ]),
    );

    const adminBySchoolId = new Map();
    const latestSubscriptionBySchool = new Map();
    const latestPaymentBySchool = new Map();
    const schoolIds = new Set(schoolById.keys());

    userDocs.forEach((doc) => {
      const data = doc.data();
      const role = normalizeRoleValue(getFirestoreString(data, ["role"]));
      const schoolId = getFirestoreString(data, ["schoolId", "school_id"]);
      if (role !== "admin" || !schoolId || adminBySchoolId.has(schoolId)) return;
      adminBySchoolId.set(schoolId, {
        school_id: schoolId,
        name: getFirestoreString(data, ["name"]),
        email: getFirestoreString(data, ["email"]),
        created_at: getFirestoreString(data, ["createdAt", "created_at"]),
      });
      schoolIds.add(schoolId);
    });

    subscriptionDocs
      .map((doc) => ({
        id: doc.id,
        school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
        plan_name: getFirestoreString(doc.data(), ["planName", "plan_name"]),
        amount: getFirestoreNumber(doc.data(), ["amount"]),
        duration_months: getFirestoreNumber(doc.data(), ["durationMonths", "duration_months"]),
        start_date: getFirestoreString(doc.data(), ["startDate", "start_date"]),
        end_date: getFirestoreString(doc.data(), ["endDate", "end_date"]),
        status: getFirestoreString(doc.data(), ["status"]),
        created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
      }))
      .sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")))
      .forEach((row) => {
        if (!row.school_id || latestSubscriptionBySchool.has(row.school_id)) return;
        latestSubscriptionBySchool.set(row.school_id, row);
        schoolIds.add(row.school_id);
      });

    paymentDocs
      .map((doc) => ({
        id: doc.id,
        school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
        amount: getFirestoreNumber(doc.data(), ["amount"]),
        payment_method: getFirestoreString(doc.data(), ["paymentMethod", "payment_method"]),
        payment_date: getFirestoreString(doc.data(), ["paymentDate", "payment_date"]),
        status: getFirestoreString(doc.data(), ["status"]),
        created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
      }))
      .sort((left, right) => String(right.payment_date ?? right.created_at ?? "").localeCompare(String(left.payment_date ?? left.created_at ?? "")))
      .forEach((row) => {
        if (!row.school_id || latestPaymentBySchool.has(row.school_id)) return;
        latestPaymentBySchool.set(row.school_id, row);
        schoolIds.add(row.school_id);
      });

    const schools = Array.from(schoolIds)
      .map((schoolId) =>
        mapSchoolDirectoryRow(
          schoolId,
          schoolById.get(schoolId),
          adminBySchoolId.get(schoolId),
          latestSubscriptionBySchool.get(schoolId),
          latestPaymentBySchool.get(schoolId),
        ),
      )
      .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));

    return {
      schools,
      schoolById,
      adminBySchoolId,
      latestSubscriptionBySchool,
      latestPaymentBySchool,
    };
  }

  await syncAuthDirectoryToPublic();
  const [{ data: schoolRows, error: schoolsError }, { data: adminRows, error: adminError }, { data: subscriptionRows, error: subscriptionError }, { data: paymentRows, error: paymentError }] =
    await Promise.all([
      service.from("schools").select(SCHOOL_SELECT),
      service
        .from("users")
        .select("school_id, name, email, created_at")
        .eq("role", "admin")
        .not("school_id", "is", null),
      service
        .from("subscriptions")
        .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
        .order("created_at", { ascending: false }),
      service
        .from("payments")
        .select("id, school_id, amount, payment_method, payment_date, status, created_at")
        .order("payment_date", { ascending: false }),
    ]);

  if (schoolsError) throw new Error(schoolsError.message);
  if (adminError) throw new Error(adminError.message);
  if (subscriptionError) throw new Error(subscriptionError.message);
  if (paymentError) throw new Error(paymentError.message);

  const schoolById = new Map((schoolRows ?? []).map((row) => [row.id, row]));
  const adminBySchoolId = new Map();
  const latestSubscriptionBySchool = new Map();
  const latestPaymentBySchool = new Map();
  const schoolIds = new Set(schoolById.keys());

  (adminRows ?? []).forEach((row) => {
    if (!row.school_id || adminBySchoolId.has(row.school_id)) return;
    adminBySchoolId.set(row.school_id, row);
    schoolIds.add(row.school_id);
  });

  (subscriptionRows ?? []).forEach((row) => {
    if (!row.school_id || latestSubscriptionBySchool.has(row.school_id)) return;
    latestSubscriptionBySchool.set(row.school_id, row);
    schoolIds.add(row.school_id);
  });

  (paymentRows ?? []).forEach((row) => {
    if (!row.school_id || latestPaymentBySchool.has(row.school_id)) return;
    latestPaymentBySchool.set(row.school_id, row);
    schoolIds.add(row.school_id);
  });

  const schools = Array.from(schoolIds)
    .map((schoolId) =>
      mapSchoolDirectoryRow(
        schoolId,
        schoolById.get(schoolId),
        adminBySchoolId.get(schoolId),
        latestSubscriptionBySchool.get(schoolId),
        latestPaymentBySchool.get(schoolId),
      ),
    )
    .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));

  return {
    schools,
    schoolById,
    adminBySchoolId,
    latestSubscriptionBySchool,
    latestPaymentBySchool,
  };
};

const requireSchoolAdminContext = async (authHeader) => {
  const context = await getUserProfile(authHeader);
  if (String(context.profile.role ?? "").toLowerCase() !== "admin") {
    throw new Error("School admin access is required.");
  }

  const schoolId = String(context.profile.school_id ?? "").trim();
  if (!schoolId) {
    throw new Error("School context is missing for this admin account.");
  }

  return { ...context, schoolId };
};

const mapSubscriptionRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  planName: row.plan_name,
  amount: Number(row.amount ?? 0),
  durationMonths: row.duration_months,
  startDate: row.start_date,
  endDate: row.end_date,
  status: row.status,
  createdAt: row.created_at,
});

const mapPaymentRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  amount: Number(row.amount ?? 0),
  paymentMethod: row.payment_method,
  paymentDate: row.payment_date,
  status: row.status,
  createdAt: row.created_at,
});

const mapPaymentRequestRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  requestedPlan: row.requested_plan,
  requestedAmount: Number(row.requested_amount ?? 0),
  durationMonths: row.duration_months,
  paymentMethod: row.payment_method,
  paymentDate: row.payment_date,
  transactionReference: row.transaction_reference,
  proofUrl: row.proof_url,
  note: row.note,
  status: row.status,
  createdBy: row.created_by,
  verifiedBy: row.verified_by,
  verifiedAt: row.verified_at,
  verifiedNote: row.verified_note,
  paymentId: row.payment_id,
  subscriptionId: row.subscription_id,
  createdAt: row.created_at,
});

const mapBillingDocumentRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  paymentRequestId: row.payment_request_id,
  paymentId: row.payment_id,
  subscriptionId: row.subscription_id,
  documentNumber: row.document_number,
  documentType: row.document_type,
  title: row.title,
  amount: Number(row.amount ?? 0),
  status: row.status,
  issueDate: row.issue_date,
  dueDate: row.due_date,
  note: row.note,
  createdAt: row.created_at,
});

const mapRenewalReminderRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  reminderType: row.reminder_type,
  title: row.title,
  message: row.message,
  remindAt: row.remind_at,
  status: row.status,
  createdAt: row.created_at,
});

const mapPlanChangeRequestRecord = (row) => ({
  id: row.id,
  schoolId: row.school_id,
  currentPlan: row.current_plan,
  requestedPlan: row.requested_plan,
  requestedBillingCycle: row.requested_billing_cycle,
  requestedDurationMonths: row.requested_duration_months,
  expectedAmount: Number(row.expected_amount ?? 0),
  note: row.note,
  status: row.status,
  requestedBy: row.requested_by,
  reviewedBy: row.reviewed_by,
  reviewedAt: row.reviewed_at,
  reviewNote: row.review_note,
  createdAt: row.created_at,
});

const buildDocumentNumber = (prefix) => {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${suffix}`;
};

const createBillingDocument = async ({
  schoolId,
  paymentRequestId = null,
  paymentId = null,
  subscriptionId = null,
  documentType,
  amount,
  dueDate = null,
  title = null,
  note = null,
}) => {
  const documentNumber = buildDocumentNumber(documentType === "Invoice" ? "INV" : "RCP");
  const { data, error } = await service
    .from("billing_documents")
    .insert({
      school_id: schoolId,
      payment_request_id: paymentRequestId,
      payment_id: paymentId,
      subscription_id: subscriptionId,
      document_number: documentNumber,
      document_type: documentType,
      title,
      amount,
      due_date: dueDate,
      note,
    })
    .select("id, school_id, payment_request_id, payment_id, subscription_id, document_number, document_type, title, amount, status, issue_date, due_date, note, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create billing document.");
  }

  return mapBillingDocumentRecord(data);
};

const syncRenewalRemindersForSchool = async (school) => {
  if (!school?.id) return [];

  const expiryDate = String(school.expiryDate ?? "").trim();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rowsToUpsert = [];

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    if (!Number.isNaN(expiry.getTime())) {
      const msPerDay = 1000 * 60 * 60 * 24;
      const daysUntilExpiry = Math.round((expiry.getTime() - today.getTime()) / msPerDay);

      if (daysUntilExpiry < 0) {
        rowsToUpsert.push({
          school_id: school.id,
          reminder_type: "Expired",
          title: "Subscription expired",
          message: `${school.name} subscription expired on ${expiryDate}. Renew billing to restore uninterrupted access.`,
          remind_at: expiryDate,
        });
      } else {
        if (daysUntilExpiry <= 30) {
          rowsToUpsert.push({
            school_id: school.id,
            reminder_type: "Upcoming",
            title: "Renewal window open",
            message: `${school.name} plan ends on ${expiryDate}. Review renewal and invoice readiness now.`,
            remind_at: expiryDate,
          });
        }
        if (daysUntilExpiry <= 7) {
          rowsToUpsert.push({
            school_id: school.id,
            reminder_type: "Urgent",
            title: "Renewal needs attention",
            message: `${school.name} has ${daysUntilExpiry} day${daysUntilExpiry === 1 ? "" : "s"} left before expiry.`,
            remind_at: expiryDate,
          });
        }
      }
    }
  }

  if (String(school.subscriptionStatus ?? "") === "Trial") {
    rowsToUpsert.push({
      school_id: school.id,
      reminder_type: "UpgradeOpportunity",
      title: "Trial plan can be upgraded",
      message: `${school.name} is still on trial. Submit a platform payment or upgrade request to move to a paid plan.`,
      remind_at: expiryDate || today.toISOString().slice(0, 10),
    });
  }

  if (rowsToUpsert.length > 0) {
    const { error } = await service
      .from("renewal_reminders")
      .upsert(rowsToUpsert, { onConflict: "school_id,reminder_type,remind_at" });
    if (error) throw new Error(error.message);
  }

  const { data, error } = await service
    .from("renewal_reminders")
    .select("id, school_id, reminder_type, title, message, remind_at, status, created_at")
    .eq("school_id", school.id)
    .order("remind_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRenewalReminderRecord);
};

const listSchoolPaymentRequestsBySchoolId = async (schoolId) => {
  const { data, error } = await service
    .from("platform_payment_requests")
    .select("id, school_id, requested_plan, requested_amount, duration_months, payment_method, payment_date, transaction_reference, proof_url, note, status, created_by, verified_by, verified_at, verified_note, payment_id, subscription_id, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPaymentRequestRecord);
};

const listSchoolBillingDocumentsBySchoolId = async (schoolId) => {
  const { data, error } = await service
    .from("billing_documents")
    .select("id, school_id, payment_request_id, payment_id, subscription_id, document_number, document_type, title, amount, status, issue_date, due_date, note, created_at")
    .eq("school_id", schoolId)
    .order("issue_date", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapBillingDocumentRecord);
};

const listSchoolPlanChangeRequestsBySchoolId = async (schoolId) => {
  const { data, error } = await service
    .from("plan_change_requests")
    .select("id, school_id, current_plan, requested_plan, requested_billing_cycle, requested_duration_months, expected_amount, note, status, requested_by, reviewed_by, reviewed_at, review_note, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPlanChangeRequestRecord);
};

const createSchoolBundle = async (payload, context) => {
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase() || null;
  const phone = String(payload.phone ?? "").trim() || null;
  const address = String(payload.address ?? "").trim() || null;
  const geoConfig = await resolveAttendanceGeoConfig(payload.attendanceMapLink, payload.attendanceGeoRadiusMeters);
  const plan = String(payload.plan ?? "").trim() || "Starter";
  const durationMonths = Number(payload.durationMonths ?? 1);
  const adminName = String(payload.adminName ?? "").trim();
  const adminEmail = String(payload.adminEmail ?? "").trim().toLowerCase();
  const adminPassword = String(payload.adminPassword ?? "");

  if (!name || !adminName || !adminEmail || !adminPassword) {
    throw new Error("School and admin details are required.");
  }

  const trialExpiry = addMonthsToDate(new Date(), durationMonths);

  if (firebaseAdminDb) {
    const schoolRef = firebaseAdminDb.collection("schools").doc();
    let adminUserId = null;

    try {
      await schoolRef.set({
        name,
        email,
        phone,
        address,
        attendanceMapLink: geoConfig.attendanceMapLink,
        attendanceGeoLatitude: geoConfig.attendanceGeoLatitude,
        attendanceGeoLongitude: geoConfig.attendanceGeoLongitude,
        attendanceGeoRadiusMeters: geoConfig.attendanceGeoRadiusMeters,
        subscriptionStatus: "Trial",
        subscriptionPlan: plan,
        expiryDate: trialExpiry,
        themeColor: null,
        storageLimit: null,
        studentLimit: null,
        staffLimit: null,
        renewalNoticeDays: null,
        createdAt: new Date().toISOString(),
      });

      await bootstrapSchoolCollections(schoolRef.id);

      const adminAuth = await createManagedAuthUser({
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        role: "admin",
        schoolId: schoolRef.id,
      });
      adminUserId = adminAuth.user.id;

      await insertPublicUserProfile({
        id: adminUserId,
        name: adminName,
        email: adminEmail,
        role: "admin",
        school_id: schoolRef.id,
      });

      await logSuperAdminAuditEvent(context, schoolRef.id, "CREATE", "SUPERADMIN_SCHOOL", schoolRef.id);

      const schoolSnapshot = await schoolRef.get();
      const school = schoolSnapshot.data() ?? {};

      return {
        id: schoolRef.id,
        name: getFirestoreString(school, ["name"]),
        email: getFirestoreString(school, ["email"]),
        phone: getFirestoreString(school, ["phone"]),
        address: getFirestoreString(school, ["address"]),
        attendanceMapLink: getFirestoreString(school, ["attendanceMapLink", "attendance_map_link"]),
        attendanceGeoLatitude: getFirestoreNumber(school, ["attendanceGeoLatitude", "attendance_geo_latitude"]),
        attendanceGeoLongitude: getFirestoreNumber(school, ["attendanceGeoLongitude", "attendance_geo_longitude"]),
        attendanceGeoRadiusMeters: getFirestoreNumber(school, ["attendanceGeoRadiusMeters", "attendance_geo_radius_meters"]),
        billingContactName: getFirestoreString(school, ["billingContactName", "billing_contact_name"]),
        billingContactEmail: getFirestoreString(school, ["billingContactEmail", "billing_contact_email"]),
        billingContactPhone: getFirestoreString(school, ["billingContactPhone", "billing_contact_phone"]),
        billingAddress: getFirestoreString(school, ["billingAddress", "billing_address"]),
        financeEmail: getFirestoreString(school, ["financeEmail", "finance_email"]),
        taxId: getFirestoreString(school, ["taxId", "tax_id"]),
        authorizedSignatory: getFirestoreString(school, ["authorizedSignatory", "authorized_signatory"]),
        logoUrl: getFirestoreString(school, ["logoUrl", "logo_url"]),
        themeColor: getFirestoreString(school, ["themeColor", "theme_color"]),
        subscriptionStatus: getFirestoreString(school, ["subscriptionStatus", "subscription_status"]) ?? "Trial",
        subscriptionPlan: getFirestoreString(school, ["subscriptionPlan", "subscription_plan"]) ?? plan,
        storageLimit: getFirestoreNumber(school, ["storageLimit", "storage_limit"]),
        studentLimit: getFirestoreNumber(school, ["studentLimit", "student_limit"]),
        staffLimit: getFirestoreNumber(school, ["staffLimit", "staff_limit"]),
        renewalNoticeDays: getFirestoreNumber(school, ["renewalNoticeDays", "renewal_notice_days"]),
        expiryDate: getFirestoreString(school, ["expiryDate", "expiry_date"]) ?? trialExpiry,
        createdAt: getFirestoreString(school, ["createdAt", "created_at"]),
        adminName,
        adminEmail,
      };
    } catch (error) {
      await schoolRef.delete().catch(() => undefined);
      await cleanupTable("users", "id", adminUserId);
      await cleanupUser(adminUserId);
      throw error;
    }
  }

  const { data: school, error: schoolError } = await service
    .from("schools")
    .insert({
      name,
      email,
      phone,
      address,
      attendance_map_link: geoConfig.attendanceMapLink,
      attendance_geo_latitude: geoConfig.attendanceGeoLatitude,
      attendance_geo_longitude: geoConfig.attendanceGeoLongitude,
      attendance_geo_radius_meters: geoConfig.attendanceGeoRadiusMeters,
      subscription_status: "Trial",
      subscription_plan: plan,
      expiry_date: trialExpiry,
    })
    .select(SCHOOL_SELECT)
    .single();

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Unable to create school.");
  }

  let warning = "";
  let adminUserId = null;

  try {
    const { data: authUser, error: authError } = await service.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      ...buildAuthMetadata({ name: adminName, role: "admin", schoolId: school.id }),
    });

    if (authError || !authUser.user) {
      warning = `School was created, but the admin auth user could not be provisioned: ${authError?.message ?? "Unknown error"}`;
    } else {
      adminUserId = authUser.user.id;

      await insertPublicUserProfile({
        id: adminUserId,
        name: adminName,
        email: adminEmail,
        role: "admin",
        school_id: school.id,
      });
    }
  } catch (error) {
    warning = `School was created, but admin provisioning failed: ${error instanceof Error ? error.message : "Unknown error"}`;
    if (adminUserId) {
      await cleanupTable("users", "id", adminUserId);
      await cleanupUser(adminUserId);
    }
  }

  try {
    await logSuperAdminAuditEvent(context, school.id, "CREATE", "SUPERADMIN_SCHOOL", school.id);
  } catch (error) {
    warning = warning
      ? `${warning} Audit log warning: ${error instanceof Error ? error.message : "Unknown error"}.`
      : `School was created, but the audit log could not be recorded: ${error instanceof Error ? error.message : "Unknown error"}`;
  }

  return {
    id: school.id,
    name: school.name,
    email: school.email,
    phone: school.phone,
    address: school.address,
    attendanceMapLink: school.attendance_map_link,
    attendanceGeoLatitude: school.attendance_geo_latitude,
    attendanceGeoLongitude: school.attendance_geo_longitude,
    attendanceGeoRadiusMeters: school.attendance_geo_radius_meters,
    billingContactName: school.billing_contact_name,
    billingContactEmail: school.billing_contact_email,
    billingContactPhone: school.billing_contact_phone,
    billingAddress: school.billing_address,
    financeEmail: school.finance_email,
    taxId: school.tax_id,
    authorizedSignatory: school.authorized_signatory,
    logoUrl: school.logo_url,
    themeColor: school.theme_color,
    subscriptionStatus: school.subscription_status,
    subscriptionPlan: school.subscription_plan,
    storageLimit: school.storage_limit,
    studentLimit: school.student_limit,
    staffLimit: school.staff_limit,
    renewalNoticeDays: school.renewal_notice_days,
    expiryDate: school.expiry_date,
    createdAt: school.created_at,
    adminName,
    adminEmail,
    ...(warning ? { warning } : {}),
  };
};

const recordSchoolPayment = async (payload, context) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  const planName = String(payload.planName ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const durationMonths = Number(payload.durationMonths ?? 1);
  const paymentMethod = String(payload.paymentMethod ?? "").trim() || "Manual";

  if (!schoolId || !planName || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("School, plan, and amount are required.");
  }

  const today = new Date();
  const startDate = today.toISOString().slice(0, 10);
  const endDate = addMonthsToDate(today, durationMonths);

  const { data: payment, error: paymentError } = await service
    .from("payments")
    .insert({
      school_id: schoolId,
      amount,
      payment_method: paymentMethod,
      status: "Success",
    })
    .select("id, school_id, amount, payment_method, payment_date, status, created_at")
    .single();

  if (paymentError || !payment) {
    throw new Error(paymentError?.message ?? "Unable to create payment.");
  }

  const { data: subscription, error: subscriptionError } = await service
    .from("subscriptions")
    .insert({
      school_id: schoolId,
      plan_name: planName,
      amount,
      duration_months: durationMonths,
      start_date: startDate,
      end_date: endDate,
      status: "Active",
    })
    .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
    .single();

  if (subscriptionError || !subscription) {
    throw new Error(subscriptionError?.message ?? "Unable to create subscription.");
  }

  await createBillingDocument({
    schoolId,
    paymentId: payment.id,
    subscriptionId: subscription.id,
    documentType: "Receipt",
    amount,
    dueDate: endDate,
    title: `${planName} payment receipt`,
    note: "Generated from super admin payment recording.",
  });

  const { data: school, error: schoolError } = await service
    .from("schools")
    .update({
      subscription_status: "Active",
      subscription_plan: planName,
      expiry_date: endDate,
    })
    .eq("id", schoolId)
    .select(SCHOOL_SELECT)
    .single();

  if (schoolError || !school) {
    throw new Error(schoolError?.message ?? "Unable to update school billing.");
  }

  const result = {
    payment: {
      id: payment.id,
      schoolId: payment.school_id,
      amount: Number(payment.amount ?? 0),
      paymentMethod: payment.payment_method,
      paymentDate: payment.payment_date,
      status: payment.status,
      createdAt: payment.created_at,
    },
    subscription: {
      id: subscription.id,
      schoolId: subscription.school_id,
      planName: subscription.plan_name,
      amount: Number(subscription.amount ?? 0),
      durationMonths: subscription.duration_months,
      startDate: subscription.start_date,
      endDate: subscription.end_date,
      status: subscription.status,
      createdAt: subscription.created_at,
    },
    school: {
      id: school.id,
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      attendanceMapLink: school.attendance_map_link,
      attendanceGeoLatitude: school.attendance_geo_latitude,
      attendanceGeoLongitude: school.attendance_geo_longitude,
      attendanceGeoRadiusMeters: school.attendance_geo_radius_meters,
      billingContactName: school.billing_contact_name,
      billingContactEmail: school.billing_contact_email,
      billingContactPhone: school.billing_contact_phone,
      billingAddress: school.billing_address,
      financeEmail: school.finance_email,
      taxId: school.tax_id,
      authorizedSignatory: school.authorized_signatory,
      logoUrl: school.logo_url,
      themeColor: school.theme_color,
      subscriptionStatus: school.subscription_status,
      subscriptionPlan: school.subscription_plan,
      storageLimit: school.storage_limit,
      studentLimit: school.student_limit,
      staffLimit: school.staff_limit,
      renewalNoticeDays: school.renewal_notice_days,
      expiryDate: school.expiry_date,
      createdAt: school.created_at,
    },
  };

  await logSuperAdminAuditEvent(context, schoolId, "CREATE", "SUPERADMIN_PAYMENT", payment.id);
  await logSuperAdminAuditEvent(context, schoolId, "UPDATE", "SUPERADMIN_BILLING", subscription.id);
  return result;
};

const listSchoolsForSuperAdmin = async () => {
  return (await loadSchoolDirectory()).schools;
};

const listSchoolStorageForSuperAdmin = async () => {
  if (firebaseAdminDb) {
    const [{ schools }, userDocs, subscriptionDocs, paymentDocs] = await Promise.all([
      loadSchoolDirectory(),
      getAllFirestoreDocs("users"),
      getAllFirestoreDocs("subscriptions"),
      getAllFirestoreDocs("payments"),
    ]);

    const latestSubscriptionBySchool = new Map();
    subscriptionDocs
      .map((doc) => ({
        school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
        plan_name: getFirestoreString(doc.data(), ["planName", "plan_name"]),
        amount: getFirestoreNumber(doc.data(), ["amount"]),
        created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
      }))
      .sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")))
      .forEach((row) => {
        if (!row.school_id || latestSubscriptionBySchool.has(row.school_id)) return;
        latestSubscriptionBySchool.set(row.school_id, row);
      });

    const latestPaymentBySchool = new Map();
    paymentDocs
      .map((doc) => ({
        school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
        amount: getFirestoreNumber(doc.data(), ["amount"]),
        payment_date: getFirestoreString(doc.data(), ["paymentDate", "payment_date"]),
        created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
        status: getFirestoreString(doc.data(), ["status"]),
      }))
      .sort((left, right) => String(right.payment_date ?? right.created_at ?? "").localeCompare(String(left.payment_date ?? left.created_at ?? "")))
      .forEach((row) => {
        if (row.status !== "Success" || !row.school_id || latestPaymentBySchool.has(row.school_id)) return;
        latestPaymentBySchool.set(row.school_id, row);
      });

    const databaseUsageBySchool = new Map(
      await Promise.all(
        schools.map(async (school) => {
          let totalBytes = 0;
          let totalRows = 0;
          for (const collectionName of SCHOOL_STORAGE_TABLES) {
            const docs = await getFirestoreSchoolScopedDocs(collectionName, school.id);
            totalRows += docs.length;
            totalBytes += docs.reduce((sum, doc) => sum + Buffer.byteLength(JSON.stringify(doc.data() ?? {}), "utf8"), 0);
          }
          return [school.id, { totalBytes, totalRows }];
        }),
      ),
    );

    const userPhotoCountBySchool = new Map();
    userDocs.forEach((doc) => {
      const schoolId = getFirestoreString(doc.data(), ["schoolId", "school_id"]);
      const photoUrl = getFirestoreString(doc.data(), ["photoUrl", "photo_url"]);
      if (!schoolId || !photoUrl) return;
      userPhotoCountBySchool.set(schoolId, Number(userPhotoCountBySchool.get(schoolId) ?? 0) + 1);
    });

    return schools.map((school) => {
      const databaseUsage = databaseUsageBySchool.get(school.id) ?? { totalBytes: 0, totalRows: 0 };
      const configuredLimitMb = Number.isFinite(Number(school.storageLimit)) ? Number(school.storageLimit) : null;
      const usedBytes = databaseUsage.totalBytes;
      const usagePercent =
        configuredLimitMb && configuredLimitMb > 0
          ? Math.min(100, Math.round((usedBytes / (configuredLimitMb * 1024 * 1024)) * 100))
          : null;
      const latestSubscription = latestSubscriptionBySchool.get(school.id);
      const latestPayment = latestPaymentBySchool.get(school.id);

      return {
        schoolId: school.id,
        schoolName: school.name,
        subscriptionPlan: latestSubscription?.plan_name ?? school.subscriptionPlan ?? null,
        subscriptionStatus: school.subscriptionStatus,
        storageLimitMb: configuredLimitMb,
        usedBytes,
        fileCount: Number(userPhotoCountBySchool.get(school.id) ?? 0),
        databaseBytes: databaseUsage.totalBytes,
        databaseRowCount: databaseUsage.totalRows,
        objectBytes: 0,
        usagePercent,
        latestPaymentAmount: Number(latestPayment?.amount ?? latestSubscription?.amount ?? 0),
        latestPaymentDate: latestPayment?.payment_date ?? latestPayment?.created_at ?? null,
      };
    });
  }

  const [{ schools }, { data: users, error: usersError }, { data: subscriptions, error: subscriptionsError }, { data: payments, error: paymentsError }] =
    await Promise.all([
      loadSchoolDirectory(),
      service
        .from("users")
        .select("school_id, photo_url")
        .not("school_id", "is", null),
      service
        .from("subscriptions")
        .select("school_id, plan_name, amount, created_at")
        .order("created_at", { ascending: false }),
      service
        .from("payments")
        .select("school_id, amount, payment_date, created_at, status")
        .order("payment_date", { ascending: false }),
    ]);

  if (usersError) throw new Error(usersError.message);
  if (subscriptionsError) throw new Error(subscriptionsError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const schoolAssetReferences = new Map();
  const appendSchoolReference = (schoolId, reference) => {
    if (!reference) return;
    const current = schoolAssetReferences.get(schoolId) ?? [];
    current.push(reference);
    schoolAssetReferences.set(schoolId, current);
  };

  (schools ?? []).forEach((school) => {
    appendSchoolReference(school.id, parseStorageObjectReference(school.logoUrl));
  });

  (users ?? []).forEach((user) => {
    appendSchoolReference(user.school_id, parseStorageObjectReference(user.photo_url));
  });

  const allReferences = Array.from(schoolAssetReferences.values()).flat();
  const storageObjects = allReferences.length ? await listStorageObjectsByReference(allReferences) : [];
  const storageObjectMap = new Map(
    storageObjects.map((row) => [`${row.bucket_id}:${row.name}`, row]),
  );

  const latestSubscriptionBySchool = new Map();
  (subscriptions ?? []).forEach((row) => {
    if (!latestSubscriptionBySchool.has(row.school_id)) {
      latestSubscriptionBySchool.set(row.school_id, row);
    }
  });

  const latestPaymentBySchool = new Map();
  (payments ?? []).forEach((row) => {
    if (row.status !== "Success") return;
    if (!latestPaymentBySchool.has(row.school_id)) {
      latestPaymentBySchool.set(row.school_id, row);
    }
  });

  const databaseUsageBySchool = new Map(
    await Promise.all(
      (schools ?? []).map(async (school) => [school.id, await getSchoolDatabaseUsage(school.id)]),
    ),
  );

  return (schools ?? []).map((school) => {
    const uniqueAssetKeys = new Set(
      (schoolAssetReferences.get(school.id) ?? []).map((reference) => `${reference.bucketId}:${reference.objectPath}`),
    );

    let objectBytes = 0;
    uniqueAssetKeys.forEach((key) => {
      const objectRow = storageObjectMap.get(key);
      objectBytes += Number(objectRow?.metadata?.size ?? 0);
    });

    const databaseUsage = databaseUsageBySchool.get(school.id) ?? { totalBytes: 0, totalRows: 0 };
    const usedBytes = objectBytes + databaseUsage.totalBytes;
    const latestSubscription = latestSubscriptionBySchool.get(school.id);
    const latestPayment = latestPaymentBySchool.get(school.id);
    const configuredLimitMb = Number.isFinite(Number(school.storageLimit)) ? Number(school.storageLimit) : null;
    const usagePercent =
      configuredLimitMb && configuredLimitMb > 0
        ? Math.min(100, Math.round((usedBytes / (configuredLimitMb * 1024 * 1024)) * 100))
        : null;

    return {
      schoolId: school.id,
      schoolName: school.name,
      subscriptionPlan: latestSubscription?.plan_name ?? school.subscriptionPlan ?? null,
      subscriptionStatus: school.subscriptionStatus,
      storageLimitMb: configuredLimitMb,
      usedBytes,
      fileCount: uniqueAssetKeys.size,
      databaseBytes: databaseUsage.totalBytes,
      databaseRowCount: databaseUsage.totalRows,
      objectBytes,
      usagePercent,
      latestPaymentAmount: Number(latestPayment?.amount ?? latestSubscription?.amount ?? 0),
      latestPaymentDate: latestPayment?.payment_date ?? latestPayment?.created_at ?? null,
    };
  });
};

const updateSchool = async (payload, context) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  const name = String(payload.name ?? "").trim();
  const email = String(payload.email ?? "").trim().toLowerCase() || null;
  const phone = String(payload.phone ?? "").trim() || null;
  const address = String(payload.address ?? "").trim() || null;
  const geoConfig = await resolveAttendanceGeoConfig(payload.attendanceMapLink, payload.attendanceGeoRadiusMeters);
  const billingContactName = String(payload.billingContactName ?? "").trim() || null;
  const billingContactEmail = String(payload.billingContactEmail ?? "").trim().toLowerCase() || null;
  const billingContactPhone = String(payload.billingContactPhone ?? "").trim() || null;
  const billingAddress = String(payload.billingAddress ?? "").trim() || null;
  const financeEmail = String(payload.financeEmail ?? "").trim().toLowerCase() || null;
  const taxId = String(payload.taxId ?? "").trim() || null;
  const authorizedSignatory = String(payload.authorizedSignatory ?? "").trim() || null;
  const subscriptionPlan = String(payload.subscriptionPlan ?? "").trim() || null;
  const subscriptionStatus = String(payload.subscriptionStatus ?? "").trim() || "Trial";
  const expiryDate = String(payload.expiryDate ?? "").trim() || null;
  const storageLimit = payload.storageLimit === "" || payload.storageLimit == null ? null : Number(payload.storageLimit);
  const studentLimit = payload.studentLimit === "" || payload.studentLimit == null ? null : Number(payload.studentLimit);
  const staffLimit = payload.staffLimit === "" || payload.staffLimit == null ? null : Number(payload.staffLimit);
  const renewalNoticeDays = payload.renewalNoticeDays === "" || payload.renewalNoticeDays == null ? null : Number(payload.renewalNoticeDays);

  if (!schoolId || !name) {
    throw new Error("School id and name are required.");
  }

  if (storageLimit !== null && (!Number.isFinite(storageLimit) || storageLimit < 0)) {
    throw new Error("Storage limit must be zero or more.");
  }
  if (studentLimit !== null && (!Number.isFinite(studentLimit) || studentLimit < 0)) {
    throw new Error("Student limit must be zero or more.");
  }
  if (staffLimit !== null && (!Number.isFinite(staffLimit) || staffLimit < 0)) {
    throw new Error("Staff limit must be zero or more.");
  }
  if (renewalNoticeDays !== null && (!Number.isFinite(renewalNoticeDays) || renewalNoticeDays < 0)) {
    throw new Error("Renewal notice days must be zero or more.");
  }

  const { data, error } = await service
    .from("schools")
    .update({
      name,
      email,
      phone,
      address,
      attendance_map_link: geoConfig.attendanceMapLink,
      attendance_geo_latitude: geoConfig.attendanceGeoLatitude,
      attendance_geo_longitude: geoConfig.attendanceGeoLongitude,
      attendance_geo_radius_meters: geoConfig.attendanceGeoRadiusMeters,
      billing_contact_name: billingContactName,
      billing_contact_email: billingContactEmail,
      billing_contact_phone: billingContactPhone,
      billing_address: billingAddress,
      finance_email: financeEmail,
      tax_id: taxId,
      authorized_signatory: authorizedSignatory,
      subscription_plan: subscriptionPlan,
      subscription_status: subscriptionStatus,
      expiry_date: expiryDate,
      storage_limit: storageLimit,
      student_limit: studentLimit,
      staff_limit: staffLimit,
      renewal_notice_days: renewalNoticeDays,
    })
    .eq("id", schoolId)
    .select(SCHOOL_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update school.");
  }

  const result = {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    attendanceMapLink: data.attendance_map_link,
    attendanceGeoLatitude: data.attendance_geo_latitude,
    attendanceGeoLongitude: data.attendance_geo_longitude,
    attendanceGeoRadiusMeters: data.attendance_geo_radius_meters,
    billingContactName: data.billing_contact_name,
    billingContactEmail: data.billing_contact_email,
    billingContactPhone: data.billing_contact_phone,
    billingAddress: data.billing_address,
    financeEmail: data.finance_email,
    taxId: data.tax_id,
    authorizedSignatory: data.authorized_signatory,
    logoUrl: data.logo_url,
    themeColor: data.theme_color,
    subscriptionStatus: data.subscription_status,
    subscriptionPlan: data.subscription_plan,
    storageLimit: data.storage_limit,
    studentLimit: data.student_limit,
    staffLimit: data.staff_limit,
    renewalNoticeDays: data.renewal_notice_days,
    expiryDate: data.expiry_date,
    createdAt: data.created_at,
  };

  await logSuperAdminAuditEvent(context, schoolId, "UPDATE", "SUPERADMIN_SCHOOL", schoolId);
  return result;
};

const deleteSchool = async (payload, context) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  if (!schoolId) {
    throw new Error("School id is required.");
  }

  const { data: existingSchool, error: existingSchoolError } = await service
    .from("schools")
    .select("id")
    .eq("id", schoolId)
    .maybeSingle();

  if (existingSchoolError) {
    throw new Error(existingSchoolError.message);
  }

  if (!existingSchool) {
    throw new Error("School not found.");
  }

  await logSuperAdminAuditEvent(context, schoolId, "DELETE", "SUPERADMIN_SCHOOL", schoolId);

  const { data: schoolUsers, error: schoolUsersError } = await service
    .from("users")
    .select("id")
    .eq("school_id", schoolId);

  if (schoolUsersError) {
    throw new Error(schoolUsersError.message);
  }

  await cleanupTable("audit_logs", "school_id", schoolId);

  const { error: schoolDeleteError } = await service
    .from("schools")
    .delete()
    .eq("id", schoolId);

  if (schoolDeleteError) {
    throw new Error(schoolDeleteError?.message ?? "Unable to delete school.");
  }

  const cleanupResults = await Promise.allSettled(
    (schoolUsers ?? []).map((user) => cleanupUser(user.id)),
  );

  const failedCleanup = cleanupResults.filter((result) => result.status === "rejected");
  if (failedCleanup.length > 0) {
    const reasons = failedCleanup
      .map((result) => (result.status === "rejected" ? result.reason : null))
      .filter(Boolean)
      .map((reason) => (reason instanceof Error ? reason.message : String(reason)));
    throw new Error(
      `School data was deleted, but ${failedCleanup.length} linked auth account(s) could not be removed: ${reasons.join("; ")}`,
    );
  }

  return { ok: true };
};

const updateSchoolBilling = async (payload, context) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  const planName = String(payload.planName ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const status = String(payload.status ?? "").trim() || "Trial";
  const expiryDate = String(payload.expiryDate ?? "").trim() || null;

  if (!schoolId || !planName || !Number.isFinite(amount) || amount < 0) {
    throw new Error("School, plan, and amount are required.");
  }

  const { data: existingSubscription, error: existingSubscriptionError } = await service
    .from("subscriptions")
    .select("id, duration_months, start_date")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingSubscriptionError) {
    throw new Error(existingSubscriptionError.message);
  }

  if (existingSubscription?.id) {
    const { error } = await service
      .from("subscriptions")
      .update({
        plan_name: planName,
        amount,
        end_date: expiryDate,
        status: status === "Expired" ? "Expired" : "Active",
      })
      .eq("id", existingSubscription.id);
    if (error) throw new Error(error.message);
  } else {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await service.from("subscriptions").insert({
      school_id: schoolId,
      plan_name: planName,
      amount,
      duration_months: 1,
      start_date: today,
      end_date: expiryDate,
      status: status === "Expired" ? "Expired" : "Active",
    });
    if (error) throw new Error(error.message);
  }

  const { error: schoolError } = await service
    .from("schools")
    .update({
      subscription_plan: planName,
      subscription_status: status,
      expiry_date: expiryDate,
    })
    .eq("id", schoolId);

  if (schoolError) {
    throw new Error(schoolError.message);
  }

  await logSuperAdminAuditEvent(context, schoolId, "UPDATE", "SUPERADMIN_BILLING", existingSubscription?.id ?? schoolId);
  return { ok: true };
};

const deleteSchoolBilling = async (payload, context) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  if (!schoolId) {
    throw new Error("School id is required.");
  }

  await logSuperAdminAuditEvent(context, schoolId, "DELETE", "SUPERADMIN_BILLING", schoolId);

  const { error: subscriptionError } = await service.from("subscriptions").delete().eq("school_id", schoolId);
  if (subscriptionError) {
    throw new Error(subscriptionError.message);
  }

  const { error: schoolError } = await service
    .from("schools")
    .update({
      subscription_plan: null,
      subscription_status: "Trial",
      expiry_date: null,
    })
    .eq("id", schoolId);

  if (schoolError) {
    throw new Error(schoolError.message);
  }

  return { ok: true };
};

const updatePayment = async (payload, context) => {
  const paymentId = String(payload.paymentId ?? "").trim();
  const amount = Number(payload.amount ?? 0);
  const paymentMethod = String(payload.paymentMethod ?? "").trim() || "Manual";
  const paymentDate = String(payload.paymentDate ?? "").trim() || null;
  const status = String(payload.status ?? "").trim() || "Success";

  if (!paymentId || !Number.isFinite(amount) || amount < 0) {
    throw new Error("Payment id and amount are required.");
  }

  const { data, error } = await service
    .from("payments")
    .update({
      amount,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      status,
    })
    .eq("id", paymentId)
    .select("id, school_id, amount, payment_method, payment_date, status, created_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update payment.");
  }

  const result = {
    id: data.id,
    schoolId: data.school_id,
    amount: Number(data.amount ?? 0),
    paymentMethod: data.payment_method,
    paymentDate: data.payment_date,
    status: data.status,
    createdAt: data.created_at,
  };

  await logSuperAdminAuditEvent(context, data.school_id, "UPDATE", "SUPERADMIN_PAYMENT", data.id);
  return result;
};

const deletePayment = async (payload, context) => {
  const paymentId = String(payload.paymentId ?? "").trim();
  if (!paymentId) {
    throw new Error("Payment id is required.");
  }

  const { data: payment, error: paymentLookupError } = await service
    .from("payments")
    .select("id, school_id")
    .eq("id", paymentId)
    .maybeSingle();

  if (paymentLookupError) {
    throw new Error(paymentLookupError.message);
  }

  if (payment?.school_id) {
    await logSuperAdminAuditEvent(context, payment.school_id, "DELETE", "SUPERADMIN_PAYMENT", payment.id);
  }

  const { error } = await service.from("payments").delete().eq("id", paymentId);
  if (error) {
    throw new Error(error.message);
  }

  return { ok: true };
};

const listSubscriptionsForSuperAdmin = async () => {
  if (firebaseAdminDb) {
    const docs = await getAllFirestoreDocs("subscriptions");
    return docs
      .map((doc) =>
        mapSubscriptionRecord({
          id: doc.id,
          school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
          plan_name: getFirestoreString(doc.data(), ["planName", "plan_name"]),
          amount: getFirestoreNumber(doc.data(), ["amount"]),
          duration_months: getFirestoreNumber(doc.data(), ["durationMonths", "duration_months"]),
          start_date: getFirestoreString(doc.data(), ["startDate", "start_date"]),
          end_date: getFirestoreString(doc.data(), ["endDate", "end_date"]),
          status: getFirestoreString(doc.data(), ["status"]),
          created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
        }),
      )
      .sort((left, right) => String(right.createdAt ?? "").localeCompare(String(left.createdAt ?? "")));
  }

  const { data, error } = await service
    .from("subscriptions")
    .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    planName: row.plan_name,
    amount: Number(row.amount ?? 0),
    durationMonths: row.duration_months,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  }));
};

const listPaymentsForSuperAdmin = async () => {
  if (firebaseAdminDb) {
    const docs = await getAllFirestoreDocs("payments");
    return docs
      .map((doc) =>
        mapPaymentRecord({
          id: doc.id,
          school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
          amount: getFirestoreNumber(doc.data(), ["amount"]),
          payment_method: getFirestoreString(doc.data(), ["paymentMethod", "payment_method"]),
          payment_date: getFirestoreString(doc.data(), ["paymentDate", "payment_date"]),
          status: getFirestoreString(doc.data(), ["status"]),
          created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
        }),
      )
      .sort((left, right) => String(right.paymentDate ?? right.createdAt ?? "").localeCompare(String(left.paymentDate ?? left.createdAt ?? "")));
  }

  const { data, error } = await service
    .from("payments")
    .select("id, school_id, amount, payment_method, payment_date, status, created_at")
    .order("payment_date", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    schoolId: row.school_id,
    amount: Number(row.amount ?? 0),
    paymentMethod: row.payment_method,
    paymentDate: row.payment_date,
    status: row.status,
    createdAt: row.created_at,
  }));
};

const listSuperAdminAuditLogs = async () => {
  if (firebaseAdminDb) {
    const [auditDocs, { schools }] = await Promise.all([
      getAllFirestoreDocs("auditLogs"),
      loadSchoolDirectory(),
    ]);

    const rows = auditDocs
      .map((doc) => ({
        id: doc.id,
        school_id: getFirestoreString(doc.data(), ["schoolId", "school_id"]),
        user_id: getFirestoreString(doc.data(), ["userId", "user_id"]),
        action: getFirestoreString(doc.data(), ["action"]),
        module: getFirestoreString(doc.data(), ["module"]),
        record_id: getFirestoreString(doc.data(), ["recordId", "record_id"]),
        created_at: getFirestoreString(doc.data(), ["createdAt", "created_at"]),
      }))
      .filter((row) => String(row.module ?? "").startsWith("SUPERADMIN_"))
      .sort((left, right) => String(right.created_at ?? "").localeCompare(String(left.created_at ?? "")));

    const schoolMap = new Map((schools ?? []).map((item) => [item.id, item.name]));
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
    const users = await Promise.all(userIds.map((id) => findFirestoreUserById(id)));
    const userMap = new Map(users.filter(Boolean).map((user) => [user.id, user.name]));

    return rows.map((row) => ({
      id: row.id,
      schoolId: row.school_id ?? null,
      schoolName: row.school_id ? schoolMap.get(row.school_id) ?? "Unknown school" : "Platform",
      userId: row.user_id ?? null,
      userName: row.user_id ? userMap.get(row.user_id) ?? "Unknown user" : "System",
      action: row.action,
      module: row.module,
      recordId: row.record_id ?? null,
      createdAt: row.created_at,
    }));
  }

  const { data, error } = await service
    .from("audit_logs")
    .select("id, school_id, user_id, action, module, record_id, created_at")
    .like("module", "SUPERADMIN_%")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const schoolIds = Array.from(new Set(rows.map((row) => row.school_id).filter(Boolean)));
  const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));

  const [{ schools }, { data: users, error: usersError }] = await Promise.all([
    loadSchoolDirectory(),
    userIds.length
      ? service.from("users").select("id, name").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (usersError) throw new Error(usersError.message);

  const schoolMap = new Map((schools ?? []).map((item) => [item.id, item.name]));
  const userMap = new Map((users ?? []).map((item) => [item.id, item.name]));

  return rows.map((row) => ({
    id: row.id,
    schoolId: row.school_id ?? null,
    schoolName: row.school_id ? schoolMap.get(row.school_id) ?? "Unknown school" : "Platform",
    userId: row.user_id ?? null,
    userName: row.user_id ? userMap.get(row.user_id) ?? "Unknown user" : "System",
    action: row.action,
    module: row.module,
    recordId: row.record_id ?? null,
    createdAt: row.created_at,
  }));
};

const getSuperAdminSchoolProfile = async (payload) => {
  const schoolId = String(payload.schoolId ?? "").trim();
  if (!schoolId) {
    throw new Error("School id is required.");
  }

  if (firebaseAdminDb) {
    const [{ schools, schoolById, adminBySchoolId }, subscriptions, payments, auditLogs, storageRows] =
      await Promise.all([
        loadSchoolDirectory(),
        listSubscriptionsForSuperAdmin(),
        listPaymentsForSuperAdmin(),
        listSuperAdminAuditLogs(),
        listSchoolStorageForSuperAdmin(),
      ]);

    const school = schools.find((row) => row.id === schoolId);
    const schoolRow = schoolById.get(schoolId) ?? null;
    const adminUser = adminBySchoolId.get(schoolId) ?? null;
    if (!school) throw new Error("School not found.");

    return {
      school: {
        id: school.id,
        name: school.name,
        email: school.email,
        phone: school.phone,
        address: school.address,
        billingContactName: school.billingContactName ?? schoolRow?.billing_contact_name ?? null,
        billingContactEmail: school.billingContactEmail ?? schoolRow?.billing_contact_email ?? null,
        billingContactPhone: school.billingContactPhone ?? schoolRow?.billing_contact_phone ?? null,
        billingAddress: school.billingAddress ?? schoolRow?.billing_address ?? null,
        financeEmail: school.financeEmail ?? schoolRow?.finance_email ?? null,
        taxId: school.taxId ?? schoolRow?.tax_id ?? null,
        authorizedSignatory: school.authorizedSignatory ?? schoolRow?.authorized_signatory ?? null,
        logoUrl: school.logoUrl ?? schoolRow?.logo_url ?? null,
        themeColor: school.themeColor ?? schoolRow?.theme_color ?? null,
        subscriptionStatus: school.subscriptionStatus,
        subscriptionPlan: school.subscriptionPlan,
        storageLimit: school.storageLimit,
        studentLimit: school.studentLimit ?? schoolRow?.student_limit ?? null,
        staffLimit: school.staffLimit ?? schoolRow?.staff_limit ?? null,
        renewalNoticeDays: school.renewalNoticeDays ?? schoolRow?.renewal_notice_days ?? null,
        expiryDate: school.expiryDate,
        createdAt: school.createdAt,
        adminName: adminUser?.name ?? null,
        adminEmail: adminUser?.email ?? null,
      },
      adminName: adminUser?.name ?? null,
      adminEmail: adminUser?.email ?? null,
      storage: storageRows.find((row) => row.schoolId === schoolId) ?? null,
      subscriptions: subscriptions.filter((row) => row.schoolId === schoolId),
      payments: payments.filter((row) => row.schoolId === schoolId),
      auditLogs: auditLogs.filter((row) => row.schoolId === schoolId),
    };
  }

  const [{ schools, schoolById, adminBySchoolId }, { data: subscriptions, error: subscriptionsError }, { data: payments, error: paymentsError }, auditLogs, storageRows] =
    await Promise.all([
      loadSchoolDirectory(),
      service
        .from("subscriptions")
        .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false }),
      service
        .from("payments")
        .select("id, school_id, amount, payment_method, payment_date, status, created_at")
        .eq("school_id", schoolId)
        .order("payment_date", { ascending: false }),
      listSuperAdminAuditLogs(),
      listSchoolStorageForSuperAdmin(),
    ]);

  if (subscriptionsError) throw new Error(subscriptionsError.message);
  if (paymentsError) throw new Error(paymentsError.message);

  const school = schools.find((row) => row.id === schoolId);
  const schoolRow = schoolById.get(schoolId) ?? null;
  const adminUser = adminBySchoolId.get(schoolId) ?? null;

  if (!school) throw new Error("School not found.");

  return {
    school: {
      id: school.id,
      name: school.name,
      email: school.email,
      phone: school.phone,
      address: school.address,
      billingContactName: school.billingContactName ?? schoolRow?.billing_contact_name ?? null,
      billingContactEmail: school.billingContactEmail ?? schoolRow?.billing_contact_email ?? null,
      billingContactPhone: school.billingContactPhone ?? schoolRow?.billing_contact_phone ?? null,
      billingAddress: school.billingAddress ?? schoolRow?.billing_address ?? null,
      financeEmail: school.financeEmail ?? schoolRow?.finance_email ?? null,
      taxId: school.taxId ?? schoolRow?.tax_id ?? null,
      authorizedSignatory: school.authorizedSignatory ?? schoolRow?.authorized_signatory ?? null,
      logoUrl: school.logoUrl ?? schoolRow?.logo_url ?? null,
      themeColor: school.themeColor ?? schoolRow?.theme_color ?? null,
      subscriptionStatus: school.subscriptionStatus,
      subscriptionPlan: school.subscriptionPlan,
      storageLimit: school.storageLimit,
      studentLimit: school.studentLimit ?? schoolRow?.student_limit ?? null,
      staffLimit: school.staffLimit ?? schoolRow?.staff_limit ?? null,
      renewalNoticeDays: school.renewalNoticeDays ?? schoolRow?.renewal_notice_days ?? null,
      expiryDate: school.expiryDate,
      createdAt: school.createdAt,
      adminName: adminUser?.name ?? null,
      adminEmail: adminUser?.email ?? null,
    },
    adminName: adminUser?.name ?? null,
    adminEmail: adminUser?.email ?? null,
    storage: storageRows.find((row) => row.schoolId === schoolId) ?? null,
    subscriptions: (subscriptions ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      planName: row.plan_name,
      amount: Number(row.amount ?? 0),
      durationMonths: row.duration_months,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      createdAt: row.created_at,
    })),
    payments: (payments ?? []).map((row) => ({
      id: row.id,
      schoolId: row.school_id,
      amount: Number(row.amount ?? 0),
      paymentMethod: row.payment_method,
      paymentDate: row.payment_date,
      status: row.status,
      createdAt: row.created_at,
    })),
    auditLogs: auditLogs.filter((row) => row.schoolId === schoolId),
  };
};

const getSchoolBillingProfile = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  const [{ schools, latestSubscriptionBySchool, latestPaymentBySchool }, documents] = await Promise.all([
    loadSchoolDirectory(),
    listSchoolBillingDocumentsBySchoolId(schoolId),
  ]);
  const school = schools.find((row) => row.id === schoolId);
  if (!school) throw new Error("School profile not found.");

  const latestSubscription = latestSubscriptionBySchool.get(schoolId) ?? null;
  const latestPayment = latestPaymentBySchool.get(schoolId) ?? null;

  return {
    school,
    latestSubscription: latestSubscription ? mapSubscriptionRecord(latestSubscription) : null,
    latestPayment: latestPayment ? mapPaymentRecord(latestPayment) : null,
    documents,
  };
};

const updateSchoolBillingProfile = async (payload, authHeader) => {
  const { schoolId, profile } = await requireSchoolAdminContext(authHeader);
  const { data, error } = await service
    .from("schools")
    .update({
      email: String(payload.email ?? "").trim().toLowerCase() || null,
      phone: String(payload.phone ?? "").trim() || null,
      address: String(payload.address ?? "").trim() || null,
      billing_contact_name: String(payload.billingContactName ?? "").trim() || null,
      billing_contact_email: String(payload.billingContactEmail ?? "").trim().toLowerCase() || null,
      billing_contact_phone: String(payload.billingContactPhone ?? "").trim() || null,
      billing_address: String(payload.billingAddress ?? "").trim() || null,
      finance_email: String(payload.financeEmail ?? "").trim().toLowerCase() || null,
      tax_id: String(payload.taxId ?? "").trim() || null,
      authorized_signatory: String(payload.authorizedSignatory ?? "").trim() || null,
      renewal_notice_days: payload.renewalNoticeDays ? Number(payload.renewalNoticeDays) : 7,
    })
    .eq("id", schoolId)
    .select(SCHOOL_SELECT)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to update school billing profile.");

  const { data: latestSubscription } = await service
    .from("subscriptions")
    .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: latestPayment } = await service
    .from("payments")
    .select("id, school_id, amount, payment_method, payment_date, status, created_at")
    .eq("school_id", schoolId)
    .order("payment_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  await insertAuditLog({
    schoolId,
    userId: profile.id,
    action: "UPDATE",
    module: "SCHOOL_BILLING_PROFILE",
    recordId: schoolId,
  });

  return {
    school: mapSchoolDirectoryRow(schoolId, data, { name: profile.name, email: profile.email }, latestSubscription, latestPayment),
    latestSubscription: latestSubscription ? mapSubscriptionRecord(latestSubscription) : null,
    latestPayment: latestPayment ? mapPaymentRecord(latestPayment) : null,
  };
};

const getSchoolSubscriptionOverview = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  const [{ schools, latestSubscriptionBySchool, latestPaymentBySchool }, paymentRequests, planRequests] = await Promise.all([
    loadSchoolDirectory(),
    listSchoolPaymentRequestsBySchoolId(schoolId),
    listSchoolPlanChangeRequestsBySchoolId(schoolId),
  ]);
  const school = schools.find((row) => row.id === schoolId);
  if (!school) throw new Error("School subscription overview not found.");
  const reminders = await syncRenewalRemindersForSchool(school);

  return {
    school,
    latestSubscription: latestSubscriptionBySchool.get(schoolId) ? mapSubscriptionRecord(latestSubscriptionBySchool.get(schoolId)) : null,
    latestPayment: latestPaymentBySchool.get(schoolId) ? mapPaymentRecord(latestPaymentBySchool.get(schoolId)) : null,
    pendingPaymentRequests: paymentRequests.filter((row) => row.status === "Pending").length,
    pendingPlanRequests: planRequests.filter((row) => row.status === "Pending").length,
    upcomingReminderCount: reminders.filter((row) => row.status === "Pending").length,
  };
};

const createSchoolPaymentRequest = async (payload, authHeader) => {
  const { schoolId, profile } = await requireSchoolAdminContext(authHeader);
  const requestedPlan = String(payload.requestedPlan ?? "").trim();
  const requestedAmount = Number(payload.requestedAmount ?? 0);
  const durationMonths = Number(payload.durationMonths ?? 1);
  const paymentMethod = String(payload.paymentMethod ?? "").trim() || "Bank Transfer";
  const paymentDate = String(payload.paymentDate ?? "").trim() || new Date().toISOString();
  const transactionReference = String(payload.transactionReference ?? "").trim() || null;
  const proofUrl = String(payload.proofUrl ?? "").trim() || null;
  const note = String(payload.note ?? "").trim() || null;

  if (!requestedPlan || !Number.isFinite(requestedAmount) || requestedAmount <= 0) {
    throw new Error("Plan and amount are required.");
  }
  if (!Number.isFinite(durationMonths) || durationMonths <= 0) {
    throw new Error("Duration must be a positive number.");
  }

  const { data, error } = await service
    .from("platform_payment_requests")
    .insert({
      school_id: schoolId,
      requested_plan: requestedPlan,
      requested_amount: requestedAmount,
      duration_months: durationMonths,
      payment_method: paymentMethod,
      payment_date: paymentDate,
      transaction_reference: transactionReference,
      proof_url: proofUrl,
      note,
      created_by: profile.id,
    })
    .select("id, school_id, requested_plan, requested_amount, duration_months, payment_method, payment_date, transaction_reference, proof_url, note, status, created_by, verified_by, verified_at, verified_note, payment_id, subscription_id, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to create payment request.");

  await createBillingDocument({
    schoolId,
    paymentRequestId: data.id,
    documentType: "Invoice",
    amount: requestedAmount,
    dueDate: new Date(paymentDate).toISOString().slice(0, 10),
    title: `${requestedPlan} platform invoice`,
    note: "Invoice raised from school admin payment submission.",
  });

  await insertAuditLog({
    schoolId,
    userId: profile.id,
    action: "CREATE",
    module: "PLATFORM_PAYMENT_REQUEST",
    recordId: data.id,
  });

  return mapPaymentRequestRecord(data);
};

const listSchoolPaymentRequests = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  return listSchoolPaymentRequestsBySchoolId(schoolId);
};

const listSchoolBillingDocuments = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  return listSchoolBillingDocumentsBySchoolId(schoolId);
};

const listSchoolRenewalReminders = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  const { schools } = await loadSchoolDirectory();
  const school = schools.find((row) => row.id === schoolId);
  if (!school) throw new Error("School not found.");
  return syncRenewalRemindersForSchool(school);
};

const createPlanChangeRequest = async (payload, authHeader) => {
  const { schoolId, profile } = await requireSchoolAdminContext(authHeader);
  const { schools } = await loadSchoolDirectory();
  const school = schools.find((row) => row.id === schoolId);
  if (!school) throw new Error("School not found.");

  const requestedPlan = String(payload.requestedPlan ?? "").trim();
  const requestedBillingCycle = String(payload.requestedBillingCycle ?? "").trim() || "Monthly";
  const requestedDurationMonths = Number(payload.requestedDurationMonths ?? 1);
  const expectedAmount = Number(payload.expectedAmount ?? 0);
  const note = String(payload.note ?? "").trim() || null;

  if (!requestedPlan) throw new Error("Requested plan is required.");
  if (!Number.isFinite(requestedDurationMonths) || requestedDurationMonths <= 0) {
    throw new Error("Requested duration must be a positive number.");
  }
  if (!Number.isFinite(expectedAmount) || expectedAmount < 0) {
    throw new Error("Expected amount must be zero or more.");
  }

  const { data, error } = await service
    .from("plan_change_requests")
    .insert({
      school_id: schoolId,
      current_plan: school.subscriptionPlan,
      requested_plan: requestedPlan,
      requested_billing_cycle: requestedBillingCycle,
      requested_duration_months: requestedDurationMonths,
      expected_amount: expectedAmount,
      note,
      requested_by: profile.id,
    })
    .select("id, school_id, current_plan, requested_plan, requested_billing_cycle, requested_duration_months, expected_amount, note, status, requested_by, reviewed_by, reviewed_at, review_note, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to create plan change request.");

  await insertAuditLog({
    schoolId,
    userId: profile.id,
    action: "CREATE",
    module: "PLAN_CHANGE_REQUEST",
    recordId: data.id,
  });

  return mapPlanChangeRequestRecord(data);
};

const listSchoolPlanChangeRequests = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  return listSchoolPlanChangeRequestsBySchoolId(schoolId);
};

const getSchoolUsage = async (authHeader) => {
  const { schoolId } = await requireSchoolAdminContext(authHeader);
  const [{ schools }, storageRows, studentsResult, staffResult, classesResult, adminResult] = await Promise.all([
    loadSchoolDirectory(),
    listSchoolStorageForSuperAdmin(),
    service.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    service.from("staff").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    service.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    service.from("users").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("role", "admin"),
  ]);

  const school = schools.find((row) => row.id === schoolId);
  const storage = storageRows.find((row) => row.schoolId === schoolId);
  if (!school || !storage) throw new Error("School usage details not found.");

  return {
    schoolId,
    schoolName: school.name,
    subscriptionPlan: school.subscriptionPlan,
    storageLimitMb: storage.storageLimitMb,
    usedBytes: storage.usedBytes,
    fileCount: storage.fileCount,
    databaseBytes: storage.databaseBytes,
    databaseRowCount: storage.databaseRowCount,
    objectBytes: storage.objectBytes,
    usagePercent: storage.usagePercent,
    studentCount: studentsResult.count ?? 0,
    staffCount: staffResult.count ?? 0,
    classCount: classesResult.count ?? 0,
    adminCount: adminResult.count ?? 0,
    studentLimit: school.studentLimit ?? null,
    staffLimit: school.staffLimit ?? null,
  };
};

const listSuperAdminPaymentRequests = async () => {
  const { data, error } = await service
    .from("platform_payment_requests")
    .select("id, school_id, requested_plan, requested_amount, duration_months, payment_method, payment_date, transaction_reference, proof_url, note, status, created_by, verified_by, verified_at, verified_note, payment_id, subscription_id, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPaymentRequestRecord);
};

const reviewSchoolPaymentRequest = async (payload, context) => {
  const paymentRequestId = String(payload.paymentRequestId ?? "").trim();
  const status = String(payload.status ?? "").trim();
  const verifiedNote = String(payload.verifiedNote ?? "").trim() || null;
  if (!paymentRequestId) throw new Error("Payment request id is required.");
  if (!["Approved", "Rejected"].includes(status)) throw new Error("Valid review status is required.");

  const { data: requestRow, error: requestError } = await service
    .from("platform_payment_requests")
    .select("id, school_id, requested_plan, requested_amount, duration_months, payment_method, payment_date, transaction_reference, proof_url, note, status, created_by, verified_by, verified_at, verified_note, payment_id, subscription_id, created_at")
    .eq("id", paymentRequestId)
    .single();

  if (requestError || !requestRow) throw new Error(requestError?.message ?? "Payment request not found.");
  if (requestRow.status !== "Pending") throw new Error("Only pending requests can be reviewed.");

  let paymentId = null;
  let subscriptionId = null;
  let endDate = null;

  if (status === "Approved") {
    const paymentInsert = await service
      .from("payments")
      .insert({
        school_id: requestRow.school_id,
        amount: requestRow.requested_amount,
        payment_method: requestRow.payment_method,
        payment_date: requestRow.payment_date,
        status: "Success",
      })
      .select("id, school_id, amount, payment_method, payment_date, status, created_at")
      .single();
    if (paymentInsert.error || !paymentInsert.data) {
      throw new Error(paymentInsert.error?.message ?? "Unable to record approved payment.");
    }
    paymentId = paymentInsert.data.id;

    endDate = addMonthsToDate(new Date(requestRow.payment_date ?? new Date().toISOString()), requestRow.duration_months);
    const subscriptionInsert = await service
      .from("subscriptions")
      .insert({
        school_id: requestRow.school_id,
        plan_name: requestRow.requested_plan,
        amount: requestRow.requested_amount,
        duration_months: requestRow.duration_months,
        start_date: String(requestRow.payment_date ?? new Date().toISOString()).slice(0, 10),
        end_date: endDate,
        status: "Active",
      })
      .select("id, school_id, plan_name, amount, duration_months, start_date, end_date, status, created_at")
      .single();
    if (subscriptionInsert.error || !subscriptionInsert.data) {
      throw new Error(subscriptionInsert.error?.message ?? "Unable to create approved subscription.");
    }
    subscriptionId = subscriptionInsert.data.id;

    const { error: schoolError } = await service
      .from("schools")
      .update({
        subscription_status: "Active",
        subscription_plan: requestRow.requested_plan,
        expiry_date: endDate,
      })
      .eq("id", requestRow.school_id);
    if (schoolError) throw new Error(schoolError.message);

    await createBillingDocument({
      schoolId: requestRow.school_id,
      paymentRequestId,
      paymentId,
      subscriptionId,
      documentType: "Receipt",
      amount: requestRow.requested_amount,
      dueDate: endDate,
      title: `${requestRow.requested_plan} verified receipt`,
      note: verifiedNote,
    });
  }

  const { data: updatedRow, error: updateError } = await service
    .from("platform_payment_requests")
    .update({
      status,
      verified_by: context.profile.id,
      verified_at: new Date().toISOString(),
      verified_note: verifiedNote,
      payment_id: paymentId,
      subscription_id: subscriptionId,
    })
    .eq("id", paymentRequestId)
    .select("id, school_id, requested_plan, requested_amount, duration_months, payment_method, payment_date, transaction_reference, proof_url, note, status, created_by, verified_by, verified_at, verified_note, payment_id, subscription_id, created_at")
    .single();

  if (updateError || !updatedRow) throw new Error(updateError?.message ?? "Unable to review payment request.");

  await logSuperAdminAuditEvent(context, updatedRow.school_id, status === "Approved" ? "APPROVE" : "REJECT", "SUPERADMIN_PAYMENT_VERIFICATION", updatedRow.id);
  return mapPaymentRequestRecord(updatedRow);
};

const listSuperAdminPlanChangeRequests = async () => {
  const { data, error } = await service
    .from("plan_change_requests")
    .select("id, school_id, current_plan, requested_plan, requested_billing_cycle, requested_duration_months, expected_amount, note, status, requested_by, reviewed_by, reviewed_at, review_note, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPlanChangeRequestRecord);
};

const reviewPlanChangeRequest = async (payload, context) => {
  const planRequestId = String(payload.planRequestId ?? "").trim();
  const status = String(payload.status ?? "").trim();
  const reviewNote = String(payload.reviewNote ?? "").trim() || null;
  if (!planRequestId) throw new Error("Plan request id is required.");
  if (!["Approved", "Rejected"].includes(status)) throw new Error("Valid review status is required.");

  const { data: requestRow, error: requestError } = await service
    .from("plan_change_requests")
    .select("id, school_id, current_plan, requested_plan, requested_billing_cycle, requested_duration_months, expected_amount, note, status, requested_by, reviewed_by, reviewed_at, review_note, created_at")
    .eq("id", planRequestId)
    .single();

  if (requestError || !requestRow) throw new Error(requestError?.message ?? "Plan request not found.");
  if (requestRow.status !== "Pending") throw new Error("Only pending requests can be reviewed.");

  if (status === "Approved") {
    const { error: schoolError } = await service
      .from("schools")
      .update({ subscription_plan: requestRow.requested_plan })
      .eq("id", requestRow.school_id);
    if (schoolError) throw new Error(schoolError.message);
  }

  const { data, error } = await service
    .from("plan_change_requests")
    .update({
      status,
      reviewed_by: context.profile.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", planRequestId)
    .select("id, school_id, current_plan, requested_plan, requested_billing_cycle, requested_duration_months, expected_amount, note, status, requested_by, reviewed_by, reviewed_at, review_note, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to review plan request.");

  await logSuperAdminAuditEvent(context, data.school_id, status === "Approved" ? "APPROVE" : "REJECT", "SUPERADMIN_PLAN_REQUEST", data.id);
  return mapPlanChangeRequestRecord(data);
};

const deleteStudentBundle = async (payload) => {
  const id = String(payload.id ?? "");
  if (!id) throw new Error("Student id is required.");

  if (firebaseAdminDb) {
    const studentRef = firebaseAdminDb.collection("students").doc(id);
    const studentSnapshot = await studentRef.get();
    if (!studentSnapshot.exists) throw new Error("Student not found.");

    const studentData = studentSnapshot.data() ?? {};
    const studentUserId = getFirestoreString(studentData, ["userId", "user_id"]);
    const parentId = getFirestoreString(studentData, ["parentId", "parent_id"]);

    let parentUserId = null;
    let shouldDeleteParentAuth = false;

    if (parentId) {
      const parentRef = firebaseAdminDb.collection("parents").doc(parentId);
      const parentSnapshot = await parentRef.get();
      parentUserId = parentSnapshot.exists ? getFirestoreString(parentSnapshot.data() ?? {}, ["userId", "user_id"]) : null;

      const siblingDocs = await firebaseAdminDb.collection("students").where("parentId", "==", parentId).get();
      const siblingCount = siblingDocs.docs.filter((doc) => doc.id !== id).length;
      shouldDeleteParentAuth = siblingCount === 0;
    }

    await studentRef.delete();
    await cleanupTable("users", "id", studentUserId);
    await cleanupUser(studentUserId);

    if (parentId && parentUserId && shouldDeleteParentAuth) {
      await firebaseAdminDb.collection("parents").doc(parentId).delete();
      await cleanupTable("users", "id", parentUserId);
      await cleanupUser(parentUserId);
    }

    return null;
  }

  const { data, error } = await service
    .from("students")
    .select("user_id, parent_id")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Student not found.");

  let parentUserId = null;
  let parentId = null;
  let shouldDeleteParentAuth = false;
  if (data.parent_id) {
    parentId = data.parent_id;
    const { data: parentData } = await service
      .from("parents")
      .select("user_id")
      .eq("id", data.parent_id)
      .single();
    parentUserId = parentData?.user_id ?? null;

    const { count, error: siblingError } = await service
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", data.parent_id)
      .neq("id", id);

    if (siblingError) throw new Error(siblingError.message);
    shouldDeleteParentAuth = (count ?? 0) === 0;
  }

  const { error: studentDeleteError } = await service.from("students").delete().eq("id", id);
  if (studentDeleteError) throw new Error(studentDeleteError.message);

  const { error: studentUserDeleteError } = await service.from("users").delete().eq("id", data.user_id);
  if (studentUserDeleteError) throw new Error(studentUserDeleteError.message);

  await cleanupUser(data.user_id);

  if (parentId && parentUserId && shouldDeleteParentAuth) {
    const { error: parentDeleteError } = await service.from("parents").delete().eq("id", parentId);
    if (parentDeleteError) throw new Error(parentDeleteError.message);

    const { error: parentUserDeleteError } = await service.from("users").delete().eq("id", parentUserId);
    if (parentUserDeleteError) throw new Error(parentUserDeleteError.message);

    await cleanupUser(parentUserId);
  }

  return null;
};

const deleteAllStudents = async (_payload, authHeader) => {
  const context = await getUserProfile(authHeader);
  const schoolId = await ensureTenantSchoolExists(context);

  const { data: studentRows, error: studentError } = await service
    .from("students")
    .select("id, user_id, parent_id")
    .eq("school_id", schoolId);
  if (studentError) throw new Error(studentError.message);

  const students = studentRows ?? [];
  const studentUserIds = students.map((row) => String(row.user_id ?? "").trim()).filter(Boolean);
  const parentIds = Array.from(new Set(students.map((row) => String(row.parent_id ?? "").trim()).filter(Boolean)));

  const { error: studentDeleteError } = await service.from("students").delete().eq("school_id", schoolId);
  if (studentDeleteError) throw new Error(studentDeleteError.message);

  let parentUserIds = [];
  if (parentIds.length > 0) {
    const { data: parentRows, error: parentError } = await service
      .from("parents")
      .select("id, user_id")
      .in("id", parentIds);
    if (parentError) throw new Error(parentError.message);

    parentUserIds = (parentRows ?? []).map((row) => String(row.user_id ?? "").trim()).filter(Boolean);

    const { error: parentDeleteError } = await service.from("parents").delete().in("id", parentIds);
    if (parentDeleteError) throw new Error(parentDeleteError.message);
  }

  const allUserIds = Array.from(new Set([...studentUserIds, ...parentUserIds])).filter(Boolean);
  if (allUserIds.length > 0) {
    const { error: userDeleteError } = await service.from("users").delete().in("id", allUserIds);
    if (userDeleteError) throw new Error(userDeleteError.message);

    for (const userId of allUserIds) {
      await cleanupUser(userId);
    }
  }

  await insertAuditLog({
    schoolId,
    userId: context.profile.id ?? context.user.id,
    action: "DELETE",
    module: "STUDENT_BULK_DELETE",
    recordId: null,
  });

  return { deleted: students.length };
};

export const handleAdminApi = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return true;
  }

  if (req.method !== "POST" || req.url !== "/api/admin") {
    return false;
  }

  try {
    const { action, payload } = await readJson(req);
    const authHeader = req.headers.authorization || "";

    switch (action) {
      case "save_teacher_attendance":
        send(res, 200, { data: await saveTeacherAttendance(payload, authHeader) });
        return true;
      case "sync_google_calendar_full":
        send(res, 200, { data: await syncGoogleCalendarFull(authHeader) });
        return true;
      case "create_staff":
      case "update_staff":
      case "delete_staff":
      case "bulk_import_staff":
      case "preview_bulk_import_staff":
      case "list_staff_attendance":
      case "save_staff_attendance":
        await requireAdminOrWorkspace(authHeader, ["hr"]);
        break;
      case "create_class":
      case "update_class":
      case "delete_class":
      case "delete_all_staff":
      case "delete_all_students":
        await requireAdmin(authHeader);
        break;
      case "create_student_bundle":
      case "bulk_import_students":
        await requireAdminOrWorkspace(authHeader, ["admission"]);
        break;
      case "approve_applicant":
        await requireAdminOrWorkspace(authHeader, ["admission"]);
        break;
      case "get_auth_context":
        await requireAuthenticatedUser(authHeader);
        break;
      case "list_firestore_collection":
      case "get_firestore_document":
      case "set_firestore_document":
      case "delete_firestore_document":
        await requireAuthenticatedUser(authHeader);
        break;
      case "create_school_bundle":
      case "record_school_payment":
      case "list_schools":
      case "list_subscriptions":
      case "list_payments":
      case "update_school":
      case "delete_school":
      case "update_school_billing":
      case "delete_school_billing":
      case "update_payment":
      case "delete_payment":
      case "list_school_storage":
      case "list_superadmin_audit_logs":
      case "get_superadmin_school_profile":
      case "list_superadmin_payment_requests":
      case "review_school_payment_request":
      case "list_superadmin_plan_change_requests":
      case "review_plan_change_request":
        await requireSuperAdmin(authHeader);
        break;
      case "get_school_subscription_overview":
      case "get_school_billing_profile":
      case "update_school_billing_profile":
      case "create_school_payment_request":
      case "list_school_payment_requests":
      case "list_school_billing_documents":
      case "list_school_renewal_reminders":
      case "get_school_usage":
      case "create_plan_change_request":
      case "list_school_plan_change_requests":
        await requireSchoolAdminContext(authHeader);
        break;
      default:
        await requireAdmin(authHeader);
        break;
    }

    switch (action) {
      case "create_staff":
        send(res, 200, { data: await createStaff(payload, authHeader) });
        return true;
      case "bulk_import_staff":
        send(res, 200, { data: await bulkImportStaff(payload, authHeader) });
        return true;
      case "preview_bulk_import_staff":
        send(res, 200, { data: await previewBulkImportStaff(payload, authHeader) });
        return true;
      case "create_class":
        send(res, 200, { data: await createClass(payload, authHeader) });
        return true;
      case "update_class":
        send(res, 200, { data: await updateClass(payload, authHeader) });
        return true;
      case "delete_class":
        send(res, 200, { data: await deleteClass(payload, authHeader) });
        return true;
      case "update_staff":
        send(res, 200, { data: await updateStaff(payload, authHeader) });
        return true;
      case "delete_staff":
        send(res, 200, { data: await deleteStaff(payload) });
        return true;
      case "delete_all_staff":
        send(res, 200, { data: await deleteAllStaff(payload, authHeader) });
        return true;
      case "save_staff_attendance":
        send(res, 200, { data: await saveStaffAttendance(payload, authHeader) });
        return true;
      case "list_staff_attendance":
        send(res, 200, { data: await listStaffAttendance(payload, authHeader) });
        return true;
      case "create_student_bundle":
        send(res, 200, { data: await createStudentBundle(payload, authHeader) });
        return true;
      case "bulk_import_students":
        send(res, 200, { data: await bulkImportStudents(payload, authHeader) });
        return true;
      case "approve_applicant":
        send(res, 200, { data: await approveApplicant(payload, authHeader) });
        return true;
      case "get_auth_context":
        send(res, 200, { data: await getAuthContext(authHeader) });
        return true;
      case "list_firestore_collection":
        send(res, 200, { data: await listFirestoreCollectionForClient(payload, authHeader) });
        return true;
      case "get_firestore_document":
        send(res, 200, { data: await getFirestoreDocumentForClient(payload, authHeader) });
        return true;
      case "set_firestore_document":
        send(res, 200, { data: await setFirestoreDocumentForClient(payload, authHeader) });
        return true;
      case "delete_firestore_document":
        send(res, 200, { data: await deleteFirestoreDocumentForClient(payload, authHeader) });
        return true;
      case "update_student_bundle":
        send(res, 200, { data: await updateStudentBundle(payload, authHeader) });
        return true;
      case "delete_student_bundle":
        send(res, 200, { data: await deleteStudentBundle(payload) });
        return true;
      case "delete_all_students":
        send(res, 200, { data: await deleteAllStudents(payload, authHeader) });
        return true;
      case "create_school_bundle":
        send(res, 200, { data: await createSchoolBundle(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "record_school_payment":
        send(res, 200, { data: await recordSchoolPayment(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "list_schools":
        send(res, 200, { data: await listSchoolsForSuperAdmin() });
        return true;
      case "list_subscriptions":
        send(res, 200, { data: await listSubscriptionsForSuperAdmin() });
        return true;
      case "list_payments":
        send(res, 200, { data: await listPaymentsForSuperAdmin() });
        return true;
      case "update_school":
        send(res, 200, { data: await updateSchool(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "delete_school":
        send(res, 200, { data: await deleteSchool(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "update_school_billing":
        send(res, 200, { data: await updateSchoolBilling(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "delete_school_billing":
        send(res, 200, { data: await deleteSchoolBilling(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "update_payment":
        send(res, 200, { data: await updatePayment(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "delete_payment":
        send(res, 200, { data: await deletePayment(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "list_school_storage":
        send(res, 200, { data: await listSchoolStorageForSuperAdmin() });
        return true;
      case "list_superadmin_audit_logs":
        send(res, 200, { data: await listSuperAdminAuditLogs() });
        return true;
      case "get_superadmin_school_profile":
        send(res, 200, { data: await getSuperAdminSchoolProfile(payload) });
        return true;
      case "get_school_subscription_overview":
        send(res, 200, { data: await getSchoolSubscriptionOverview(authHeader) });
        return true;
      case "get_school_billing_profile":
        send(res, 200, { data: await getSchoolBillingProfile(authHeader) });
        return true;
      case "update_school_billing_profile":
        send(res, 200, { data: await updateSchoolBillingProfile(payload, authHeader) });
        return true;
      case "create_school_payment_request":
        send(res, 200, { data: await createSchoolPaymentRequest(payload, authHeader) });
        return true;
      case "list_school_payment_requests":
        send(res, 200, { data: await listSchoolPaymentRequests(authHeader) });
        return true;
      case "list_school_billing_documents":
        send(res, 200, { data: await listSchoolBillingDocuments(authHeader) });
        return true;
      case "list_school_renewal_reminders":
        send(res, 200, { data: await listSchoolRenewalReminders(authHeader) });
        return true;
      case "get_school_usage":
        send(res, 200, { data: await getSchoolUsage(authHeader) });
        return true;
      case "create_plan_change_request":
        send(res, 200, { data: await createPlanChangeRequest(payload, authHeader) });
        return true;
      case "list_school_plan_change_requests":
        send(res, 200, { data: await listSchoolPlanChangeRequests(authHeader) });
        return true;
      case "list_superadmin_payment_requests":
        send(res, 200, { data: await listSuperAdminPaymentRequests() });
        return true;
      case "review_school_payment_request":
        send(res, 200, { data: await reviewSchoolPaymentRequest(payload, await requireSuperAdmin(authHeader)) });
        return true;
      case "list_superadmin_plan_change_requests":
        send(res, 200, { data: await listSuperAdminPlanChangeRequests() });
        return true;
      case "review_plan_change_request":
        send(res, 200, { data: await reviewPlanChangeRequest(payload, await requireSuperAdmin(authHeader)) });
        return true;
      default:
        send(res, 400, { error: "Unsupported action." });
        return true;
    }
  } catch (error) {
    send(res, 400, { error: error instanceof Error ? error.message : "Unexpected error." });
    return true;
  }
};

export const getAdminApiPort = () => Number(process.env.ADMIN_API_PORT || 8787);
