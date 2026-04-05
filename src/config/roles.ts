export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  PRINCIPAL: "principal",
  PARENT: "parent",
  STAFF: "staff",
  STUDENT: "student",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const isSuperAdminRole = (role: string | null | undefined): role is typeof ROLES.SUPER_ADMIN =>
  String(role ?? "").trim().toLowerCase() === ROLES.SUPER_ADMIN;

export const isSchoolScopedRole = (role: string | null | undefined) =>
  !isSuperAdminRole(role) && Boolean(String(role ?? "").trim());
