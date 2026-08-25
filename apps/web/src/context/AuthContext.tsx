import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { Role, type SessionUser } from "@life-mmp/shared";
import { api, ApiError } from "../lib/api";
import { cacheSession, getCachedSession } from "../lib/db";

const PLATFORM_ADMIN_IDLE_MS = 5 * 60 * 1000;
const OTHER_ROLES_IDLE_MS = 10 * 60 * 1000;
// "scroll" deliberately isn't paired with { passive: true } like a normal
// scroll listener would be -- it doesn't need to touch the DOM, just note
// that activity happened, so the extra listener option isn't worth it here.
// Bubble-phase events (mousedown, keydown, wheel, touchstart) cover clicks,
// typing, and scrolling on the page itself; "scroll" itself is added in the
// capture phase specifically because scroll events do NOT bubble up to
// window the way clicks and keypresses do -- without capture, scrolling
// inside any inner scrollable pane (a table, a modal body, the main content
// area under a fixed sidebar) would never reset the timer at all, which
// read to users as being logged out "despite" scrolling and clicking.
const BUBBLE_ACTIVITY_EVENTS = ["mousedown", "keydown", "wheel", "touchstart", "pointerdown", "mousemove"] as const;
const CAPTURE_ACTIVITY_EVENTS = ["scroll"] as const;

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

  // Auto-logout after a period of no interaction -- Platform Admin gets a
  // shorter window since that account can create/suspend any church's
  // tenant, a higher-stakes thing to leave signed in unattended.
  useEffect(() => {
    if (!user) return;
    const idleMs = user.role === Role.PLATFORM_ADMIN ? PLATFORM_ADMIN_IDLE_MS : OTHER_ROLES_IDLE_MS;
    let timer: ReturnType<typeof setTimeout>;
    // mousemove/scroll can fire dozens of times a second -- resetting the
    // real timer on every single one is wasted work for no behavioral
    // difference, so activity is only acknowledged at most once/second.
    let lastReset = 0;

    function resetTimer() {
      const now = Date.now();
      if (now - lastReset < 1000) return;
      lastReset = now;
      clearTimeout(timer);
      timer = setTimeout(logout, idleMs);
    }

    resetTimer();
    BUBBLE_ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    CAPTURE_ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer, true));
    return () => {
      clearTimeout(timer);
      BUBBLE_ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
      CAPTURE_ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer, true));
    };
  }, [user, logout]);

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
