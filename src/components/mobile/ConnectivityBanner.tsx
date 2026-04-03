import { useEffect, useState } from "react";

type NetworkStatusEvent = CustomEvent<{ connected?: boolean }>;

const getInitialOfflineState = () => {
  if (typeof navigator === "undefined") {
    return false;
  }

  return !navigator.onLine;
};

export const ConnectivityBanner = () => {
  const [offline, setOffline] = useState(getInitialOfflineState);

  useEffect(() => {
    const setConnected = (connected: boolean) => {
      setOffline(!connected);
    };

    const handleOnline = () => setConnected(true);
    const handleOffline = () => setConnected(false);
    const handleNativeStatus = (event: Event) => {
      const { detail } = event as NetworkStatusEvent;
      setConnected(Boolean(detail?.connected));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("inddia:network-status", handleNativeStatus as EventListener);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("inddia:network-status", handleNativeStatus as EventListener);
    };
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <div className="native-offline-banner" role="status" aria-live="polite">
      You&apos;re offline. Reconnect to keep ERP data in sync.
    </div>
  );
};

export default ConnectivityBanner;
