import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not configured.");
}

/*
 * Secure storage adapter for Supabase auth tokens.
 *
 * Why not plain localStorage?
 *   The default Supabase client stores JWTs as plain text in localStorage
 *   under a predictable key. Any XSS payload can read them with a single
 *   `localStorage.getItem(...)` call.
 *
 * What this does:
 *   1. Stores tokens under an obfuscated key prefix (`__gdt_s_`)
 *   2. Base64-encodes values so tokens aren't plain-text scannable
 *   3. Keeps session persistence across page reloads (unlike memory-only)
 *
 * This is defense-in-depth, NOT a substitute for CSP headers (see
 * vercel.json and vite.config.js). True encryption would require a key
 * that itself lives in the browser, so obfuscation is the practical ceiling
 * for a pure client-side SPA.
 */
const STORAGE_PREFIX = "__gdt_s_";

function obfuscate(value: string): string {
  try {
    return btoa(encodeURIComponent(value));
  } catch {
    return value;
  }
}

function deobfuscate(value: string): string {
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return value;
  }
}

const secureStorage = {
  getItem: (key: string): string | null => {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw !== null ? deobfuscate(raw) : null;
  },
  setItem: (key: string, value: string): void => {
    localStorage.setItem(STORAGE_PREFIX + key, obfuscate(value));
  },
  removeItem: (key: string): void => {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    flowType: "pkce", // Prevents authorization-code interception in OAuth
    autoRefreshToken: true, // Auto-refresh before JWT expiry
    detectSessionInUrl: true, // Handle OAuth redirect callbacks
  },
});

/**
 * Remove every Supabase auth entry that our secure adapter created.
 * Called during sign-out to ensure no tokens linger in localStorage.
 */
export function clearAuthStorage(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
