const API_BASE = "/api";

async function request<T>(path: string, options: RequestInit, token: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Onbekende fout");
  return data as T;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: "player" | "admin";
  isTwoFactorEnabled: boolean;
  createdAt: string;
}

export interface AdminGame {
  id: string;
  status: "waiting" | "in_progress" | "finished" | "abandoned";
  currentTurnColor: "white" | "black";
  winnerId: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  players: { username: string; color: string; userId: string }[];
}

export const adminService = {
  getUsers: (token: string) =>
    request<AdminUser[]>("/admin/users", { method: "GET" }, token),

  updateUserRole: (id: string, role: "player" | "admin", token: string) =>
    request<{ message: string; user: Pick<AdminUser, "id" | "username" | "role"> }>(
      `/admin/users/${id}/role`,
      { method: "PATCH", body: JSON.stringify({ role }) },
      token
    ),

  deleteUser: (id: string, token: string) =>
    request<{ message: string }>(`/admin/users/${id}`, { method: "DELETE" }, token),

  getGames: (token: string) =>
    request<AdminGame[]>("/admin/games", { method: "GET" }, token),
};
