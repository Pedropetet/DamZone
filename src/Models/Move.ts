import type { Position } from "./Piece";

export interface Move {
  from: Position;
  to: Position;
  isCapture: boolean;
  isPromotion: boolean;
  timestamp: Date;
}
