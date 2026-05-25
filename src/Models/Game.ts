import type { Player } from "./Player";
import type { Piece } from "./Piece";
import type { PieceColor } from "./Piece";
import type { Move } from "./Move";

export type GameStatus = "waiting" | "in_progress" | "finished" | "abandoned";

export interface Game {
  id: string;
  players: [Player, Player];
  moves: Move[];
  board: (Piece | null)[][]; // of liever een aparte BoardState
  currentTurnColor: PieceColor;
  multicapturePieceId?: string;
  winnerId?: string; // null bij gelijkspel of nog bezig
  status: GameStatus;
  createdAt: Date;
  updatedAt: Date;
  timerPerTurn?: number; // in seconden
  startedAt?: Date;
  endedAt?: Date;
}
