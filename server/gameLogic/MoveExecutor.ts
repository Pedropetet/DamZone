import { getValidMoves, getValidMovesWithCaptureRule } from "./MoveCalculator";
import type { Game } from "../Models/Game";
import type { Move } from "../Models/Move";
import type { Piece } from "../Models/Piece";

export function isMoveValid(game: Game, piece: Piece, move: Move): boolean {
  const validMoves = getValidMovesWithCaptureRule(game, piece);
  return validMoves.some(
    (valid) =>
      valid.from.row === move.from.row &&
      valid.from.col === move.from.col &&
      valid.to.row === move.to.row &&
      valid.to.col === move.to.col
  );
}

export function applyMove(game: Game, piece: Piece, move: Move): void {
  executeMove(game, piece, move);
  handlePostMoveLogic(game, piece, move);
}

function executeMove(game: Game, piece: Piece, move: Move): void {
  const { from, to } = move;

  if (!isMoveValid(game, piece, move)) {
    throw new Error("Ongeldige zet");
  }

  game.board[from.row][from.col] = null;
  piece.position = { ...to };
  game.board[to.row][to.col] = piece;

  if (move.isCapture) {
    removeCapturedPiece(game, move, piece);
  }

  if (move.isPromotion) {
    piece.isKing = true;
  }

  game.moves.push(move);
}

function handlePostMoveLogic(game: Game, piece: Piece, move: Move): void {
  if (move.isCapture && !piece.isCaptured) {
    // Controleer direct of dit stuk nog een capture kan doen (multicapture)
    const hasMoreCaptures = getValidMoves(game, piece).some((m) => m.isCapture);
    if (hasMoreCaptures) {
      game.multicapturePieceId = piece.id;
      return;
    }
  }

  game.multicapturePieceId = undefined;
  game.currentTurnColor = game.currentTurnColor === "white" ? "black" : "white";
}

function removeCapturedPiece(game: Game, move: Move, piece: Piece): void {
  const { from, to } = move;
  const board = game.board;
  const rowDir = Math.sign(to.row - from.row);
  const colDir = Math.sign(to.col - from.col);

  let r = from.row + rowDir;
  let c = from.col + colDir;

  while (r !== to.row && c !== to.col) {
    const midPiece = board[r][c];
    if (midPiece && midPiece.color !== piece.color) {
      midPiece.isCaptured = true;
      board[r][c] = null;
      break;
    }
    r += rowDir;
    c += colDir;
  }
}
