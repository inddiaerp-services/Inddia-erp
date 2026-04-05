import { ROLES } from "../config/roles";

export const getDefaultRouteForRole = (role: string | null | undefined) => {
  if (role === ROLES.SUPER_ADMIN) {
    return "/super-admin/dashboard";
  }

  if (role === ROLES.PRINCIPAL) {
    return "/principal/dashboard";
  }

  return "/dashboard/home";
};

export const isDashboardLikePath = (pathname: string) =>
  pathname.startsWith("/dashboard") ||
  pathname.startsWith("/super-admin") ||
  pathname.startsWith("/principal");
