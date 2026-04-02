export const STAFF_WORKSPACES = {
  TEACHER: "teacher",
  HR: "hr",
  ACCOUNTS: "accounts",
  TRANSPORT: "transport",
  ADMISSION: "admission",
} as const;

export type StaffWorkspace = (typeof STAFF_WORKSPACES)[keyof typeof STAFF_WORKSPACES];

export const normalizeStaffWorkspace = (role: string | null | undefined): StaffWorkspace => {
  const value = (role ?? "").trim().toLowerCase();

  if (value.includes("human") || value === "hr") return STAFF_WORKSPACES.HR;
  if (value.includes("account") || value.includes("finance")) return STAFF_WORKSPACES.ACCOUNTS;
  if (value.includes("transport")) return STAFF_WORKSPACES.TRANSPORT;
  if (value.includes("admission")) return STAFF_WORKSPACES.ADMISSION;

  return STAFF_WORKSPACES.TEACHER;
};

export const getWorkspaceLabel = (workspace: StaffWorkspace) => {
  switch (workspace) {
    case STAFF_WORKSPACES.HR:
      return "HR";
    case STAFF_WORKSPACES.ACCOUNTS:
      return "Accounts";
    case STAFF_WORKSPACES.TRANSPORT:
      return "Transport";
    case STAFF_WORKSPACES.ADMISSION:
      return "Admission";
    default:
      return "Teacher";
  }
};
