import type { AuthUser } from "./authService";

const API_BASE = "/api";

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
    throw new Error(typeof data.error === "string" ? data.error : "Onbekende fout");
  }
  return data as T;
}

export interface SetupResponse {
  secret: string;
  qrCode: string;
}

export interface VerifyResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export const twoFactorService = {
  setup: (token: string) =>
    request<SetupResponse>("/auth/2fa/setup", { method: "POST" }, token),

  enable: (code: string, token: string) =>
    request<{ message: string }>("/auth/2fa/enable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }, token),

  disable: (code: string, token: string) =>
    request<{ message: string }>("/auth/2fa/disable", {
      method: "POST",
      body: JSON.stringify({ code }),
    }, token),

  verify: (tempToken: string, code: string) =>
    request<VerifyResponse>("/auth/2fa/verify", {
      method: "POST",
      body: JSON.stringify({ tempToken, code }),
    }),
};
