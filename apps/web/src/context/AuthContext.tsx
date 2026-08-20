import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { SessionUser } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { cacheSession, getCachedSession } from "../lib/db";

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Show the cached identity immediately (works offline / on a slow
      // connection), then reconcile with the server in the background.
      const cached = await getCachedSession();
      if (cached) setUser(cached);

      try {
        const { user: fresh } = await api.get<{ user: SessionUser }>("/auth/me");
        setUser(fresh);
        await cacheSession(fresh);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          await cacheSession(null);
        }
        // Any other error (e.g. offline): keep the cached user, if any.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedIn } = await api.post<{ user: SessionUser }>("/auth/login", { email, password });
    setUser(loggedIn);
    await cacheSession(loggedIn);
  }, []);

  const logout = useCallback(async () => {
    await api.post("/auth/logout");
    setUser(null);
    await cacheSession(null);
  }, []);

  /** For self-service changes that don't go through login (e.g. uploading a
   * profile photo) -- re-pulls the session so the header updates immediately
   * without asking the user to sign in again. */
  const refreshUser = useCallback(async () => {
    const { user: fresh } = await api.get<{ user: SessionUser }>("/auth/me");
    setUser(fresh);
    await cacheSession(fresh);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
