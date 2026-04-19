import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getUserByUsername, updateUserLastLogin } from "../lib/firebase";
import { hashMd5 } from "../lib/hash";
import type { AuthUser } from "../types";

const AUTH_STORAGE_KEY = "badguys-auth-session";

type AuthContextValue = {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadAuthFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed?.userId || !parsed?.username || !parsed?.role) return null;
    return {
      userId: String(parsed.userId),
      username: String(parsed.username),
      role: parsed.role === "admin" ? "admin" : "member",
    };
  } catch {
    return null;
  }
}

function saveAuthToStorage(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() =>
    loadAuthFromStorage(),
  );

  const login = useCallback(async (username: string, password: string) => {
    const normalizedUsername = String(username || "").trim();
    const plainPassword = String(password || "");

    if (!normalizedUsername || !plainPassword) {
      throw new Error("Vui lòng nhập username và password.");
    }

    const user = await getUserByUsername(normalizedUsername);
    if (!user) {
      throw new Error("Sai username hoặc password.");
    }

    if (user.isDisabled) {
      throw new Error("Tài khoản đã bị khóa.");
    }

    const hashedInput = hashMd5(plainPassword);
    if (hashedInput !== user.password) {
      throw new Error("Sai username hoặc password.");
    }

    const authUser: AuthUser = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    await updateUserLastLogin(user.id);

    setCurrentUser(authUser);
    saveAuthToStorage(authUser);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    saveAuthToStorage(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser,
      isAdmin: currentUser?.role === "admin",
      login,
      logout,
    }),
    [currentUser, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
