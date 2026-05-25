export interface Session {
  id: string;
  userId: string;
  gameId: string;
  lastSeenAt: Date;
  isActive: boolean;
}
