import { createClient } from "@supabase/supabase-js";

const databaseUrl = import.meta.env.VITE_DATABASE_URL ?? "";
const databaseAnonKey = import.meta.env.VITE_DATABASE_ANON_KEY ?? "";
const DATABASE_REQUEST_TIMEOUT_MS = 20000;

const safeFetch: typeof fetch = async (...args) => {
  const [input, init] = args;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), DATABASE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...(init ?? {}),
      signal: init?.signal ?? controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Database request timed out. Please refresh and try again.");
    }

    if (error instanceof TypeError) {
      throw new Error("Unable to reach the configured database backend. Check your environment values, then refresh the app.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const databaseClient = databaseUrl && databaseAnonKey
  ? createClient(databaseUrl, databaseAnonKey, {
      global: { fetch: safeFetch },
    })
  : null;

export const hasDatabaseClientConfig = Boolean(databaseClient);
