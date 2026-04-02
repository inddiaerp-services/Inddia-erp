import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";
const SUPABASE_REQUEST_TIMEOUT_MS = 20000;

const safeFetch: typeof fetch = async (...args) => {
  const [input, init] = args;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(input, {
      ...(init ?? {}),
      signal: init?.signal ?? controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Supabase request timed out. Please refresh and try again.");
    }

    if (error instanceof TypeError) {
      throw new Error(
        "Unable to reach Supabase. Check your internet connection and Supabase environment keys, then refresh the app.",
      );
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: safeFetch },
    })
  : null;

export const hasSupabaseConfig = Boolean(supabase);
