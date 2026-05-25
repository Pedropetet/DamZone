export type UserRole = "player" | "admin";

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isTwoFactorEnabled: boolean;
}
