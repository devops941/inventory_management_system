"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { canAccess, type ModuleKey } from "@/lib/rbac";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string | null;
  roleId: string | null;
  avatar?: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (mod: ModuleKey) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Idle session timeout: the JWT also expires server-side, but this signs the
// user out of the UI after a period of inactivity as the spec requires.
const IDLE_MINUTES = Number(
  process.env.NEXT_PUBLIC_SESSION_TIMEOUT_MINUTES ?? 30
);
const IDLE_MS = IDLE_MINUTES * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<SessionUser>("/api/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<{ user: SessionUser }>("/api/auth/login", {
        email,
        password,
      });
      setUser(res.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setUser(null);
    router.push("/login");
  }, [router]);

  // Reset the idle countdown on any user activity; fire logout when it lapses.
  useEffect(() => {
    if (!user) return;
    const reset = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        logout();
      }, IDLE_MS);
    };
    const events: (keyof WindowEventMap)[] = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [user, logout]);

  const can = useCallback(
    (mod: ModuleKey) => (user ? canAccess(user.role, mod) : false),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
