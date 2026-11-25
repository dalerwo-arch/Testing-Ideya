import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { get, post, setUnauthorizedHandler, tokenStore } from "./api/client";
import type { User } from "./api/types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, as: "student" | "admin") => Promise<User>;
  loginGoogle: (credential: string) => Promise<User>;
  setUser: (user: User) => void;
  logout: () => void;
}

const Ctx = createContext<AuthValue>(null as unknown as AuthValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    get<User>("/auth/me")
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string, as: "student" | "admin") => {
    const r = await post<{ token: string; user: User }>("/auth/login", { email, password, as });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const loginGoogle = useCallback(async (credential: string) => {
    const r = await post<{ token: string; user: User }>("/auth/google", { credential });
    tokenStore.set(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  return <Ctx.Provider value={{ user, loading, login, loginGoogle, setUser, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
