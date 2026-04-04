import { create } from "zustand";
import type { AppRole } from "../config/roles";

export type AppSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  uid: string;
  email: string | null;
};

export type CurrentSchool = {
  id: string;
  name: string;
  subscriptionStatus: "Active" | "Expired" | "Trial" | "Suspended";
  subscriptionPlan: string | null;
  expiryDate: string | null;
  themeColor?: string | null;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string | null;
  role: AppRole;
  schoolId?: string | null;
  isBootstrapAdmin?: boolean;
};

type AuthState = {
  user: AuthUser | null;
  role: AppRole | null;
  school: CurrentSchool | null;
  loading: boolean;
  session: AppSession | null;
  setAuth: (payload: {
    user: AuthUser | null;
    role: AppRole | null;
    school?: CurrentSchool | null;
    session?: AppSession | null;
  }) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
};

const BOOTSTRAP_STORAGE_KEY = "inddia-bootstrap-admin";

export const authStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  school: null,
  loading: true,
  session: null,
  setAuth: ({ user, role, school = null, session = null }) => {
    if (user?.isBootstrapAdmin) {
      localStorage.setItem(BOOTSTRAP_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
    }

    set({ user, role, school, session, loading: false });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    localStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
    set({ user: null, role: null, school: null, session: null, loading: false });
  },
}));

export const getBootstrapAdmin = (): AuthUser | null => {
  const raw = localStorage.getItem(BOOTSTRAP_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(BOOTSTRAP_STORAGE_KEY);
    return null;
  }
};
