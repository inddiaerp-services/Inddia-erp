import type { Session } from "@supabase/supabase-js";
import { ROLES, isSuperAdminRole, type AppRole } from "../config/roles";
import { authStore, getBootstrapAdmin, type AuthUser, type CurrentSchool } from "../store/authStore";
import { hasSupabaseConfig, supabase } from "./supabaseClient";

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

const getSupabaseProjectRef = () => {
  const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  if (!rawUrl) return "";

  try {
    return new URL(rawUrl).hostname.split(".")[0] ?? "";
  } catch {
    return "";
  }
};

const hasPersistedSupabaseSession = () => {
  const projectRef = getSupabaseProjectRef();
  if (!projectRef) return false;

  return Boolean(localStorage.getItem(`sb-${projectRef}-auth-token`));
};

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
  if (value === ROLES.PARENT) return ROLES.PARENT;
  if (value === ROLES.STUDENT) return ROLES.STUDENT;
  if (
    value === ROLES.STAFF ||
    value === "teacher" ||
    value === "hr" ||
    value === "accounts" ||
    value === "transport" ||
    value === "admission"
  ) {
    return ROLES.STAFF;
  }
  return ROLES.STAFF;
};

const extractSessionHints = (session: Session) => {
  const userMetadata = (session.user.user_metadata ?? {}) as Record<string, unknown>;
  const appMetadata = (session.user.app_metadata ?? {}) as Record<string, unknown>;
  const hintedRole = normalizeRole(
    String(appMetadata.role ?? userMetadata.role ?? session.user.role ?? ROLES.STAFF),
  );
  const hintedSchoolId = String(appMetadata.school_id ?? userMetadata.school_id ?? "").trim() || null;
  const hintedName =
    String(userMetadata.name ?? appMetadata.name ?? session.user.email?.split("@")[0] ?? "INDDIA ERP User").trim() ||
    "INDDIA ERP User";

  return { hintedRole, hintedSchoolId, hintedName };
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

const isAuditLogUserForeignKeyError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("audit_logs_user_id_fkey") ||
    (normalized.includes("audit_logs") &&
      normalized.includes("foreign key") &&
      normalized.includes("user_id"))
  );
};

const isAuditLogSchoolForeignKeyError = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("audit_logs_school_id_fkey") ||
    (normalized.includes("audit_logs") &&
      normalized.includes("foreign key") &&
      normalized.includes("school_id"))
  );
};

const withTimeout = async <T>(promise: Promise<T>, message: string, ms = 20000): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);

let authOperationQueue = Promise.resolve();

const runExclusiveAuth = async <T>(operation: () => Promise<T>): Promise<T> => {
  const scheduled = authOperationQueue.then(operation, operation);
  authOperationQueue = scheduled.then(
    () => undefined,
    () => undefined,
  );
  return scheduled;
};

const mapSessionUserFallback = (session: Session): AuthUser => {
  const { hintedRole, hintedSchoolId, hintedName } = extractSessionHints(session);
  return {
    id: session.user.id,
    name: hintedName,
    email: session.user.email ?? null,
    role: hintedRole,
    schoolId: hintedSchoolId,
  };
};

const mapDefaultAdminSessionUser = (session: Session): AuthUser => ({
  id: session.user.id,
  name: DEFAULT_ADMIN.user.name,
  email: session.user.email ?? DEFAULT_ADMIN.email,
  role: ROLES.SUPER_ADMIN,
  schoolId: null,
});

const ensureSingleRow = <T>(rows: T[] | null, emptyMessage: string, duplicateMessage: string) => {
  const safeRows = rows ?? [];
  if (safeRows.length === 0) {
    throw new Error(emptyMessage);
  }
  if (safeRows.length > 1) {
    throw new Error(duplicateMessage);
  }
  return safeRows[0];
};

const fetchSchoolProfile = async (schoolId: string | null | undefined): Promise<CurrentSchool | null> => {
  if (!schoolId) {
    return null;
  }

  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from("schools")
    .select("id, name, subscription_status, subscription_plan, expiry_date, theme_color")
    .eq("id", schoolId)
    .limit(2);

  if (error) {
    const normalized = error.message.toLowerCase();
    if (
      normalized.includes("row-level security") ||
      normalized.includes("permission denied") ||
      normalized.includes("cannot coerce the result to a single json object")
    ) {
      return createSchoolFallback(schoolId);
    }
    throw new Error(error.message);
  }

  if (!data?.length) {
    console.warn(`[auth] School ${schoolId} was not found. Falling back to a synthetic school profile.`);
    return createSchoolFallback(schoolId);
  }

  return mapSchool(
    ensureSingleRow(
      data as SchoolRow[],
      "Unable to load the school profile.",
      "Multiple school records were found for this account. Check the schools table.",
    ),
  );
};

const resolveAuthFromSession = async (session: Session) => {
  const hints = extractSessionHints(session);
  try {
    const user = await withTimeout(fetchUserProfile(session.user.id), "Loading session profile timed out.");
    const resolvedUser =
      user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
        ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
        : user;
    const school = await fetchSchoolProfile(resolvedUser.schoolId);
    return { user: resolvedUser, role: resolvedUser.role, school, session };
  } catch (profileError) {
    const sessionEmail = session.user.email?.trim().toLowerCase();
    if (sessionEmail === DEFAULT_ADMIN.email) {
      return { user: mapDefaultAdminSessionUser(session), role: ROLES.SUPER_ADMIN, school: null, session };
    }

    if (session.user.email) {
      try {
        const user = await withTimeout(fetchUserProfileByEmail(session.user.email), "Loading session profile timed out.");
        const resolvedUser =
          user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
            ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
            : user;
        const school = await fetchSchoolProfile(resolvedUser.schoolId);
        return { user: resolvedUser, role: resolvedUser.role, school, session };
      } catch {
        const fallbackUser = mapSessionUserFallback(session);
        const school = await fetchSchoolProfile(fallbackUser.schoolId);
        return { user: fallbackUser, role: fallbackUser.role, school, session };
      }
    }

    throw profileError;
  }
};

let restoreSessionPromise: Promise<{
  user: AuthUser | null;
  role: AppRole | null;
  school: CurrentSchool | null;
  session: Session | null;
}> | null = null;

const fetchUserProfileByEmail = async (email: string): Promise<AuthUser> => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, school_id")
    .eq("email", email.trim().toLowerCase())
    .limit(2);

  if (error) {
    throw new Error(error?.message ?? "Unable to load the user profile.");
  }

  return mapUser(
    ensureSingleRow(
      data as UsersRow[] | null,
      "Unable to load the user profile.",
      "Multiple user profiles were found for this email. Check the users table.",
    ),
  );
};

const fetchUserProfile = async (userId: string): Promise<AuthUser> => {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, school_id")
    .eq("id", userId)
    .limit(2);

  if (error) {
    throw new Error(error?.message ?? "Unable to load the user profile.");
  }

  return mapUser(
    ensureSingleRow(
      data as UsersRow[] | null,
      "Unable to load the user profile.",
      "Multiple user profiles were found for this account. Check the users table.",
    ),
  );
};

export const loginStaff = async (email: string, password: string) => {
  const trimmedEmail = email.trim().toLowerCase();

  if (isDefaultAdminLogin(trimmedEmail, password) && !hasSupabaseConfig) {
    return { user: DEFAULT_ADMIN.user, role: ROLES.SUPER_ADMIN, school: null, session: null as Session | null };
  }

  if (!supabase) {
    throw new Error("Supabase is not configured. Only the bootstrap admin can sign in right now.");
  }
  const client = supabase;

  const { data, error } = await runExclusiveAuth(() =>
    withTimeout(
      client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      }),
      "Staff sign in timed out. Please try again.",
    ),
  );

  if (error || !data.session?.user) {
    if (isDefaultAdminLogin(trimmedEmail, password)) {
      throw new Error(
        "Default super admin must exist in Supabase Auth for database access. Create superadmin@gmail.com in Supabase Authentication with password admin123, then sign in again.",
      );
    }

    throw new Error(error?.message ?? "Invalid email or password.");
  }

  const hints = extractSessionHints(data.session);

  try {
    const user = await withTimeout(fetchUserProfile(data.session.user.id), "Loading staff profile timed out.");
    const resolvedUser =
      user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
        ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
        : user;
    if (resolvedUser.role !== ROLES.ADMIN && resolvedUser.role !== ROLES.STAFF && resolvedUser.role !== ROLES.SUPER_ADMIN) {
      throw new Error("This account is not configured as a staff login.");
    }
    const school = await fetchSchoolProfile(resolvedUser.schoolId);
    return { user: resolvedUser, role: resolvedUser.role, school, session: data.session };
  } catch (profileError) {
    if (isDefaultAdminLogin(trimmedEmail, password)) {
      return { user: mapDefaultAdminSessionUser(data.session), role: ROLES.SUPER_ADMIN, school: null, session: data.session };
    }

    if (data.session.user.email) {
      try {
        const user = await withTimeout(fetchUserProfileByEmail(data.session.user.email), "Loading staff profile timed out.");
        const resolvedUser =
          user.role === ROLES.STAFF && (hints.hintedRole === ROLES.ADMIN || hints.hintedRole === ROLES.SUPER_ADMIN)
            ? { ...user, role: hints.hintedRole, schoolId: hints.hintedSchoolId ?? user.schoolId }
            : user;
        if (resolvedUser.role !== ROLES.ADMIN && resolvedUser.role !== ROLES.STAFF && resolvedUser.role !== ROLES.SUPER_ADMIN) {
          throw new Error("This account is not configured as a staff login.");
        }
        const school = await fetchSchoolProfile(resolvedUser.schoolId);
        return { user: resolvedUser, role: resolvedUser.role, school, session: data.session };
      } catch {
        const fallbackUser = mapSessionUserFallback(data.session);
        if (fallbackUser.role === ROLES.ADMIN || fallbackUser.role === ROLES.STAFF || fallbackUser.role === ROLES.SUPER_ADMIN) {
          const school = await fetchSchoolProfile(fallbackUser.schoolId);
          return { user: fallbackUser, role: fallbackUser.role, school, session: data.session };
        }
      }
    }

    throw profileError;
  }
};

export const loginParent = async (email: string, password: string) => {
  const trimmedEmail = email.trim().toLowerCase();

  if (!supabase) {
    throw new Error("Supabase is required for parent login.");
  }
  const client = supabase;

  const { data, error } = await runExclusiveAuth(() =>
    withTimeout(
      client.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      }),
      "Parent sign in timed out. Please try again.",
    ),
  );

  if (error || !data.session?.user) {
    throw new Error(error?.message ?? "Invalid parent email or password.");
  }

  let user: AuthUser;
  try {
    user = await withTimeout(fetchUserProfile(data.session.user.id), "Loading parent profile timed out.");
  } catch {
    if (data.session.user.email) {
      try {
        user = await withTimeout(fetchUserProfileByEmail(data.session.user.email), "Loading parent profile timed out.");
      } catch {
        user = mapSessionUserFallback(data.session);
      }
    } else {
      throw new Error("Unable to load the parent profile.");
    }
  }

  if (user.role !== ROLES.PARENT) {
    throw new Error("This account is not configured as a parent login.");
  }

  const school = await fetchSchoolProfile(user.schoolId);
  return { user, role: user.role, school, session: data.session };
};

export const loginStudent = async (studentId: string, password: string) => {
  if (!supabase) {
    throw new Error("Supabase is required for student login.");
  }
  const client = supabase;

  const normalizedStudentId = studentId.trim().toUpperCase();
  const fallbackEmail = `${normalizedStudentId.toLowerCase()}@students.inddiaerp.local`;

  const { data: authData, error: authError } = await runExclusiveAuth(() =>
    withTimeout(
      client.auth.signInWithPassword({
        email: fallbackEmail,
        password,
      }),
      "Student sign in timed out. Please try again.",
    ),
  );

  if (authError || !authData.session?.user) {
    throw new Error(authError?.message ?? "Invalid Student ID or password.");
  }

  let user: AuthUser;
  try {
    user = await withTimeout(fetchUserProfile(authData.session.user.id), "Loading student profile timed out.");
  } catch {
    if (authData.session.user.email) {
      try {
        user = await withTimeout(fetchUserProfileByEmail(authData.session.user.email), "Loading student profile timed out.");
      } catch {
        user = mapSessionUserFallback(authData.session);
      }
    } else {
      throw new Error("Unable to load the student profile.");
    }
  }

  if (user.role !== ROLES.STUDENT) {
    throw new Error("This account is not configured as a student login.");
  }

  const school = await fetchSchoolProfile(user.schoolId);
  return { user, role: user.role, school, session: authData.session };
};

export const loginWithIdentifier = async (identifier: string, password: string) => {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier) {
    throw new Error("Email or Student ID is required.");
  }

  if (normalizedIdentifier.includes("@")) {
    const trimmedEmail = normalizedIdentifier.toLowerCase();

    if (isDefaultAdminLogin(trimmedEmail, password) && !hasSupabaseConfig) {
      return { user: DEFAULT_ADMIN.user, role: ROLES.SUPER_ADMIN, school: null, session: null as Session | null };
    }

    if (!supabase) {
      throw new Error("Supabase is not configured. Only the bootstrap admin can sign in right now.");
    }
    const client = supabase;

    const { data, error } = await runExclusiveAuth(() =>
      withTimeout(
        client.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        }),
        "Sign in timed out. Please try again.",
      ),
    );

    if (error || !data.session?.user) {
      if (isDefaultAdminLogin(trimmedEmail, password)) {
        throw new Error(
          "Default super admin must exist in Supabase Auth for database access. Create superadmin@gmail.com in Supabase Authentication with password admin123, then sign in again.",
        );
      }

      throw new Error(error?.message ?? "Invalid email or password.");
    }

    return resolveAuthFromSession(data.session);
  }

  const result = await loginStudent(normalizedIdentifier, password);
  if (result.role !== ROLES.STUDENT) {
    throw new Error("Student ID login is available only for student accounts.");
  }

  return result;
};

export const changeCurrentUserPassword = async (currentPassword: string, nextPassword: string) => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin?.isBootstrapAdmin) {
    throw new Error("Password change is not available for the local bootstrap super admin. Update the Supabase account instead.");
  }

  if (!supabase) {
    throw new Error("Supabase is required to change passwords.");
  }
  const client = supabase;

  const {
    data: { session },
  } = await runExclusiveAuth(() => client.auth.getSession());

  const sessionEmail = session?.user.email;
  if (!sessionEmail) {
    throw new Error("Active session not found. Please sign in again.");
  }

  const verify = await runExclusiveAuth(() =>
    withTimeout(
      client.auth.signInWithPassword({
        email: sessionEmail,
        password: currentPassword,
      }),
      "Password verification timed out. Please try again.",
    ),
  );

  if (verify.error || !verify.data.session?.user) {
    throw new Error(verify.error?.message ?? "Current password is incorrect.");
  }

  const { error: updateError } = await withTimeout(
    client.auth.updateUser({ password: nextPassword }),
    "Password update timed out. Please try again.",
  );

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: auditError } = await supabase.from("audit_logs").insert({
    school_id: authStore.getState().school?.id ?? authStore.getState().user?.schoolId ?? null,
    user_id: session.user.id,
    action: "UPDATE",
    module: "PASSWORD",
    record_id: null,
  });

  if (auditError) {
    if (isAuditLogUserForeignKeyError(auditError.message) || isAuditLogSchoolForeignKeyError(auditError.message)) {
      return;
    }
    throw new Error(auditError.message);
  }
};

export const restoreSession = async () => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin) {
    return { user: bootstrapAdmin, role: bootstrapAdmin.role, school: null, session: null as Session | null };
  }

  if (!supabase) {
    return { user: null, role: null, school: null, session: null as Session | null };
  }

  if (!hasPersistedSupabaseSession()) {
    return { user: null, role: null, school: null, session: null as Session | null };
  }
  const client = supabase;

  if (!restoreSessionPromise) {
    restoreSessionPromise = (async () => {
      const {
        data: { session },
      } = await runExclusiveAuth(() =>
        withTimeout(client.auth.getSession(), "Session restore timed out."),
      );

      if (!session?.user) {
        return { user: null, role: null, school: null, session: null as Session | null };
      }

      return resolveAuthFromSession(session);
    })().finally(() => {
      restoreSessionPromise = null;
    });
  }

  return restoreSessionPromise;
};

export const hydrateAuthSession = async (session: Session | null) => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin) {
    return { user: bootstrapAdmin, role: bootstrapAdmin.role, school: null, session: null as Session | null };
  }

  if (!session?.user) {
    return { user: null, role: null, school: null, session: null as Session | null };
  }

  return resolveAuthFromSession(session);
};

export const logoutUser = async () => {
  const bootstrapAdmin = getBootstrapAdmin();
  if (bootstrapAdmin || !supabase) {
    return;
  }
  const client = supabase;

  await runExclusiveAuth(() => client.auth.signOut());
};
