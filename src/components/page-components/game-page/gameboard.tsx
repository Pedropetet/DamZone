import type { Piece } from "../../../Models/Piece";
import type { Move } from "../../../Models/Move";

interface BoardProps {
  board: (Piece | null)[][];
  selectedPiece: Piece | null;
  movablePieces: Piece[];
  validMoves: Move[];
  onPieceClick: (piece: Piece) => void;
  onSquareClick: (row: number, col: number) => void;
}

export function Board({
  board,
  selectedPiece,
  movablePieces,
  validMoves,
  onPieceClick,
  onSquareClick,
}: BoardProps) {
  return (
    <div className="grid grid-cols-10 gap-0 border border-gray-700 w-[500px] h-[500px]">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isDark = (rowIndex + colIndex) % 2 === 1;
          const isSelected =
            selectedPiece &&
            selectedPiece.position.row === rowIndex &&
            selectedPiece.position.col === colIndex;

          const isMovable = movablePieces.some(
            (p) => p.position.row === rowIndex && p.position.col === colIndex
          );

          const isValidTarget = validMoves.some(
            (m) => m.to.row === rowIndex && m.to.col === colIndex
          );

          const squareClass = `
            relative flex items-center justify-center
            w-full h-full aspect-square
            ${isDark ? "bg-gray-600" : "bg-gray-300"}
            ${isMovable ? "ring-2 ring-yellow-400" : ""}
            ${isValidTarget ? "ring-4 ring-green-500" : ""}
            ${isSelected ? "outline outline-blue-500 outline-2" : ""}
            cursor-pointer
          `;

          const handleClick = () => {
            if (piece && !piece.isCaptured) {
              onPieceClick(piece);
            } else {
              onSquareClick(rowIndex, colIndex);
            }
          };

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={squareClass}
              onClick={handleClick}
            >
              {piece && !piece.isCaptured && (
                <div
                  className={`
                    rounded-full w-4/5 h-4/5
                    ${piece.color === "white" ? "bg-white" : "bg-black"}
                    flex items-center justify-center text-xl
                  `}
                >
                  {piece.isKing ? "👑" : ""}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
