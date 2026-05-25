import type { Piece, PieceColor } from "../Models/Piece";

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => {
      if ((row + col) % 2 === 1) {
        if (row < 4) {
          return {
            id: `${row}-${col}`,
            color: "black" as PieceColor,
            isKing: false,
            isCaptured: false,
            position: { row, col },
          };
        } else if (row > 5) {
          return {
            id: `${row}-${col}`,
            color: "white" as PieceColor,
            isKing: false,
            isCaptured: false,
            position: { row, col },
          };
        }
      }
      return null;
    })
  );
  return board;
}
