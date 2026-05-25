import type { PieceColor } from "./Piece";

export interface Player {
  id: string;
  username: string;
  color: PieceColor;
  isCurrentTurn: boolean;
  isConnected: boolean;
}
