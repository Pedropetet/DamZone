const API_BASE = "/api";

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  role: "player" | "admin";
}

export interface LoginResponse {
  message?: string;
  token: string;
  user: AuthUser;
  requiresTwoFactor?: boolean;
  tempToken?: string;
}

async function request<T>(path: string, options: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Onbekende fout"
    );
  }
  return data as T;
}

export interface AuthUserFull extends AuthUser {
  isTwoFactorEnabled: boolean;
}

export const authService = {
  register: (data: RegisterData) =>
    request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (data: LoginData) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: (token: string) =>
    request<AuthUserFull>("/auth/me", { method: "GET" }, token),
};
