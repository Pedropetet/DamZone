import { createContext, useContext, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  username: string;
  role: "player" | "admin";
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("token")
  );
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  });

  function login(newToken: string, newUser: AuthUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth moet binnen AuthProvider worden gebruikt");
  return ctx;
}
