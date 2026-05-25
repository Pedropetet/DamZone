export type PieceColor = "white" | "black";

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  color: PieceColor;
  isKing: boolean;
  position: Position;
  isCaptured: boolean;
}
