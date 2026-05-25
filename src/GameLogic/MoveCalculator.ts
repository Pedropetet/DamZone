import type { Game } from "../Models/Game";
import type { Position, Piece, PieceColor } from "../Models/Piece";
import type { Move } from "../Models/Move";

// Check of a piece is within the board boundaries
export function isWithinBoard({ row, col }: Position): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 10;
}

// Get all pieces that can move for a given player
export function getMovablePieces(game: Game, playerColor: PieceColor): Piece[] {
  // Als een multicapture actief is, mag alleen dat stuk verder bewegen
  if (game.multicapturePieceId) {
    const piece = game.board
      .flat()
      .find(
        (p): p is Piece =>
          p !== null &&
          p.id === game.multicapturePieceId &&
          !p.isCaptured &&
          p.color === playerColor
      );
    return piece ? [piece] : [];
  }

  return game.board
    .flat()
    .filter(
      (piece): piece is Piece =>
        piece !== null &&
        piece.color === playerColor &&
        !piece.isCaptured &&
        getValidMovesWithCaptureRule(game, piece).length > 0
    );
}

// Get all valid moves for a piece, considering capture rules
export function getValidMovesWithCaptureRule(game: Game, piece: Piece): Move[] {
  const anyCapturesExist = game.board
    .flat()
    .filter(
      (p): p is Piece => p !== null && !p.isCaptured && p.color === piece.color
    )
    .some((p) => getValidMoves(game, p).some((m) => m.isCapture));

  const moves = getValidMoves(game, piece);
  return anyCapturesExist ? moves.filter((m) => m.isCapture) : moves;
}

// Get all valid moves for a piece
export function getValidMoves(game: Game, piece: Piece): Move[] {
  if (piece.isCaptured) return [];
  return piece.isKing
    ? getValidKingMoves(game, piece)
    : getValidNormalMoves(game, piece);
}

// Get all valid normal moves for a piece + considering captures
function getValidNormalMoves(game: Game, piece: Piece): Move[] {
  const { row, col } = piece.position;
  const direction = piece.color === "white" ? -1 : 1;
  const moves: Move[] = [];

  // Gewone zetten: alleen vooruit
  for (const colOffset of [-1, 1]) {
    const newRow = row + direction;
    const newCol = col + colOffset;
    if (!isWithinBoard({ row: newRow, col: newCol })) continue;
    if (game.board[newRow][newCol] === null) {
      moves.push({
        from: piece.position,
        to: { row: newRow, col: newCol },
        isCapture: false,
        isPromotion: newRow === (piece.color === "white" ? 0 : 9),
        timestamp: new Date(),
      });
    }
  }

  // Slaan: alle vier diagonale richtingen (internationaal dammen)
  for (const rowOffset of [-1, 1]) {
    for (const colOffset of [-1, 1]) {
      const midRow = row + rowOffset;
      const midCol = col + colOffset;
      const landRow = row + rowOffset * 2;
      const landCol = col + colOffset * 2;

      if (!isWithinBoard({ row: midRow, col: midCol })) continue;
      if (!isWithinBoard({ row: landRow, col: landCol })) continue;

      const midPiece = game.board[midRow][midCol];
      if (
        midPiece &&
        midPiece.color !== piece.color &&
        !midPiece.isCaptured &&
        game.board[landRow][landCol] === null
      ) {
        moves.push({
          from: piece.position,
          to: { row: landRow, col: landCol },
          isCapture: true,
          isPromotion:
            (piece.color === "white" && landRow === 0) ||
            (piece.color === "black" && landRow === 9),
          timestamp: new Date(),
        });
      }
    }
  }

  return moves;
}

// Get all valid moves for a king piece + considering captures
function getValidKingMoves(game: Game, piece: Piece): Move[] {
  const directions = [
    { rowOffset: -1, colOffset: -1 },
    { rowOffset: -1, colOffset: 1 },
    { rowOffset: 1, colOffset: -1 },
    { rowOffset: 1, colOffset: 1 },
  ];

  const moves: Move[] = [];
  const { row, col } = piece.position;

  for (const { rowOffset, colOffset } of directions) {
    let newRow = row + rowOffset;
    let newCol = col + colOffset;
    let hasCaptured = false;
    let enemyPiece: Piece | null = null;

    // Gewone zet pad
    while (isWithinBoard({ row: newRow, col: newCol })) {
      const target = game.board[newRow][newCol];

      if (target === null) {
        if (!hasCaptured) {
          // gewone zet
          moves.push({
            from: piece.position,
            to: { row: newRow, col: newCol },
            isCapture: false,
            isPromotion: false,
            timestamp: new Date(),
          });
        } else {
          // landingsveld ná capture
          moves.push({
            from: piece.position,
            to: { row: newRow, col: newCol },
            isCapture: true,
            isPromotion: false,
            timestamp: new Date(),
          });
        }
      } else {
        if (target.color === piece.color) break;

        if (!hasCaptured && !enemyPiece) {
          // vijand gevonden, kijk of we daarna op leeg veld kunnen landen
          enemyPiece = target;
          hasCaptured = true;
        } else {
          break; // tweede vijand of blokkade → ongeldig
        }
      }

      newRow += rowOffset;
      newCol += colOffset;
    }
  }

  return moves;
}
