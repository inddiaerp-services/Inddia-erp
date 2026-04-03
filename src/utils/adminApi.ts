const ADMIN_API_PATH = "/api/admin";
const LOCAL_HOSTNAMES = ["localhost", "127.0.0.1", "::1"];

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isLocalHostname = (hostname: string) => {
  const normalized = hostname.trim().toLowerCase();
  return LOCAL_HOSTNAMES.includes(normalized) || normalized.endsWith(".local");
};

const normalizeAdminApiUrl = (value: string) => {
  const normalized = trimTrailingSlash(value.trim());
  if (!normalized) return "";

  return normalized.endsWith(ADMIN_API_PATH) ? normalized : `${normalized}${ADMIN_API_PATH}`;
};

export const getAdminApiEndpoints = () => {
  const endpoints: string[] = [];
  const configuredUrl = normalizeAdminApiUrl(import.meta.env.VITE_ADMIN_API_URL ?? "");
  const port = import.meta.env.VITE_ADMIN_API_PORT ?? "8787";

  if (configuredUrl) {
    endpoints.push(configuredUrl);
  }

  if (typeof window === "undefined") {
    endpoints.push(`http://localhost:${port}${ADMIN_API_PATH}`);
    return Array.from(new Set(endpoints));
  }

  const hostname = window.location.hostname.toLowerCase();

  endpoints.push(ADMIN_API_PATH);

  if (isLocalHostname(hostname)) {
    endpoints.push(`http://localhost:${port}${ADMIN_API_PATH}`);
  }

  return Array.from(new Set(endpoints));
};

export const getAdminApiUnavailableMessage = () => {
  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return "Unable to reach the local admin API. Start `npm run dev`, or run `npm run dev:server` so `http://localhost:8787/api/admin` is available, then refresh the page.";
  }

  return "Unable to reach the admin API. Make sure the `/api/admin` endpoint is deployed and reachable.";
};
