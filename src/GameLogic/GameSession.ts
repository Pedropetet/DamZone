import { isMoveValid, applyMove } from "./MoveExecutor";
import { getMovablePieces } from "./MoveCalculator";
import type { Game, GameStatus } from "../Models/Game";
import type { Piece } from "../Models/Piece";
import type { Move } from "../Models/Move";

interface MoveResult {
  success: boolean;
  reason?: string;
  gameEnded?: boolean;
}

export function startGame(game: Game): void {
  // Spelerkleur toewijzing (eenvoudige variant: speler 1 is wit)
  const [player1, player2] = game.players;
  player1.color = "white";
  player2.color = "black";

  // Zet de begintoon
  game.status = "in_progress" as GameStatus;
  game.startedAt = new Date();
}

export function performMove(
  game: Game,
  playerId: string,
  piece: Piece,
  move: Move
): MoveResult {
  const permission = canPlayerMove(game, playerId, piece, move);
  if (!permission.allowed) {
    return { success: false, reason: permission.reason };
  }

  applyMove(game, piece, move);

  const gameEnded = hasGameEnded(game);

  if (gameEnded) {
    game.status = "finished" as GameStatus;
    game.endedAt = new Date();
    game.winnerId = determineWinner(game);
  }

  return { success: true, gameEnded };
}

export function hasGameEnded(game: Game): boolean {
  const whitePiecesAlive = game.board
    .flat()
    .some((p) => p && p.color === "white" && !p.isCaptured);
  const blackPiecesAlive = game.board
    .flat()
    .some((p) => p && p.color === "black" && !p.isCaptured);

  if (!whitePiecesAlive || !blackPiecesAlive) return true;

  // Speler aan de beurt heeft geen geldige zetten meer
  return getMovablePieces(game, game.currentTurnColor).length === 0;
}

function determineWinner(game: Game): string | undefined {
  const whitePiecesAlive = game.board
    .flat()
    .some((p) => p && p.color === "white" && !p.isCaptured);
  const blackPiecesAlive = game.board
    .flat()
    .some((p) => p && p.color === "black" && !p.isCaptured);

  if (!whitePiecesAlive) return game.players.find((p) => p.color === "black")?.id;
  if (!blackPiecesAlive) return game.players.find((p) => p.color === "white")?.id;

  // Geen zetten meer: speler aan de beurt verliest
  const winningColor = game.currentTurnColor === "white" ? "black" : "white";
  return game.players.find((p) => p.color === winningColor)?.id;
}

export function canPlayerMove(
  game: Game,
  playerId: string,
  piece: Piece,
  move: Move
): { allowed: boolean; reason?: string } {
  const player = game.players.find((p) => p.id === playerId);
  if (!player) {
    return { allowed: false, reason: "Speler niet gevonden" };
  }

  if (player.color !== game.currentTurnColor) {
    return { allowed: false, reason: "Niet jouw beurt" };
  }

  if (piece.color !== player.color) {
    return { allowed: false, reason: "Dit is niet jouw stuk" };
  }

  if (!isMoveValid(game, piece, move)) {
    return { allowed: false, reason: "Ongeldige zet" };
  }

  return { allowed: true };
}
