import type { Game } from "../Models/Game";
import type { Position, Piece, PieceColor } from "../Models/Piece";
import type { Move } from "../Models/Move";

export function isWithinBoard({ row, col }: Position): boolean {
  return row >= 0 && row < 10 && col >= 0 && col < 10;
}

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

export function getValidMoves(game: Game, piece: Piece): Move[] {
  if (piece.isCaptured) return [];
  return piece.isKing
    ? getValidKingMoves(game, piece)
    : getValidNormalMoves(game, piece);
}

function getValidNormalMoves(game: Game, piece: Piece): Move[] {
  const { row, col } = piece.position;
  const direction = piece.color === "white" ? -1 : 1;
  const moves: Move[] = [];

  const directions = [
    { rowOffset: direction, colOffset: -1 },
    { rowOffset: direction, colOffset: 1 },
  ];

  for (const { rowOffset, colOffset } of directions) {
    const newRow = row + rowOffset;
    const newCol = col + colOffset;
    const newPos: Position = { row: newRow, col: newCol };

    if (!isWithinBoard(newPos)) continue;

    const targetPiece = game.board[newRow][newCol];

    if (targetPiece === null) {
      moves.push({
        from: piece.position,
        to: newPos,
        isCapture: false,
        isPromotion: newRow === (piece.color === "white" ? 0 : 9),
        timestamp: new Date(),
      });
    }

    // Slaan (ook achteruit voor normale schijven)
    const captureDirections = [
      { rowOffset: direction, colOffset: -1 },
      { rowOffset: direction, colOffset: 1 },
      { rowOffset: -direction, colOffset: -1 },
      { rowOffset: -direction, colOffset: 1 },
    ];

    for (const { rowOffset: rOff, colOffset: cOff } of captureDirections) {
      const midRow = row + rOff;
      const midCol = col + cOff;
      const landRow = row + rOff * 2;
      const landCol = col + cOff * 2;

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

  // Dedupliceer op basis van from+to (captureDirections kan overlap geven met direction-loop)
  return moves.filter(
    (move, index, self) =>
      index ===
      self.findIndex(
        (m) =>
          m.from.row === move.from.row &&
          m.from.col === move.from.col &&
          m.to.row === move.to.row &&
          m.to.col === move.to.col
      )
  );
}

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

    while (isWithinBoard({ row: newRow, col: newCol })) {
      const target = game.board[newRow][newCol];

      if (target === null) {
        if (!hasCaptured) {
          moves.push({
            from: piece.position,
            to: { row: newRow, col: newCol },
            isCapture: false,
            isPromotion: false,
            timestamp: new Date(),
          });
        } else {
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
          enemyPiece = target;
          hasCaptured = true;
        } else {
          break;
        }
      }

      newRow += rowOffset;
      newCol += colOffset;
    }
  }

  return moves;
}
