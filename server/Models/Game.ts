import type { Player } from "./Player";
import type { Piece, PieceColor } from "./Piece";
import type { Move } from "./Move";

export type GameStatus = "waiting" | "in_progress" | "finished" | "abandoned";

export interface Game {
  id: string;
  players: [Player, Player];
  moves: Move[];
  board: (Piece | null)[][];
  currentTurnColor: PieceColor;
  multicapturePieceId?: string;
  winnerId?: string;
  status: GameStatus;
  createdAt: Date;
  updatedAt: Date;
  timerPerTurn?: number;
  startedAt?: Date;
  endedAt?: Date;
}
