import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

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

const emitNetworkStatus = (connected: boolean) => {
  window.dispatchEvent(
    new CustomEvent("inddia:network-status", {
      detail: { connected },
    }),
  );
};

export const isNativeApp = Capacitor.isNativePlatform();

export const getRouterMode = () => (isNativeApp ? "hash" : "browser");

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
  const isLocal = isLocalHostname(hostname);

  if (!isNativeApp) {
    endpoints.push(ADMIN_API_PATH);
  }

  if (isLocal) {
    endpoints.push(`http://localhost:${port}${ADMIN_API_PATH}`);
  }

  return Array.from(new Set(endpoints));
};

export const getAdminApiUnavailableMessage = () => {
  if (isNativeApp) {
    return "Mobile admin API is not configured. Set `VITE_ADMIN_API_URL` to your deployed HTTPS `/api/admin` endpoint, rebuild, and sync the native app.";
  }

  if (typeof window !== "undefined" && isLocalHostname(window.location.hostname)) {
    return "Unable to reach the local admin API. Start `npm run dev`, or run `npm run dev:server` so `http://localhost:8787/api/admin` is available, then refresh the page.";
  }

  return "Unable to reach the admin API. In production, make sure the `/api/admin` endpoint is deployed over HTTPS and that native builds set `VITE_ADMIN_API_URL`.";
};

export const setupNativeApp = async () => {
  document.documentElement.classList.toggle("native-app", isNativeApp);
  document.body.classList.toggle("native-app", isNativeApp);

  if (!isNativeApp) {
    return;
  }

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: "#020617" });
  } catch {
    // Native polish should never block app startup.
  }

  let networkListener: PluginListenerHandle | null = null;

  try {
    const status = await Network.getStatus();
    document.documentElement.dataset.network = status.connected ? "online" : "offline";
    emitNetworkStatus(status.connected);

    networkListener = await Network.addListener("networkStatusChange", (nextStatus) => {
      document.documentElement.dataset.network = nextStatus.connected ? "online" : "offline";
      emitNetworkStatus(nextStatus.connected);
    });
  } catch {
    // Connectivity listeners are optional, so we fail soft here as well.
  }

  window.setTimeout(() => {
    void SplashScreen.hide().catch(() => undefined);
  }, 450);

  window.addEventListener(
    "beforeunload",
    () => {
      void networkListener?.remove();
    },
    { once: true },
  );
};
