export interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: Date;
  gameId: string;
}
