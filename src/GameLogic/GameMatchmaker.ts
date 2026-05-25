import type { Game, GameStatus } from "../Models/Game";
import type { Player } from "../Models/Player";
import { startGame } from "./GameSession";
import { createInitialBoard } from "./BoardFactory";

let waitingPlayer: Player | null = null;
const activeGames: Map<string, Game> = new Map();

export function findOrCreateMatch(newPlayer: Player): Game | null {
  if (waitingPlayer === null) {
    // Geen speler wacht → zet speler in wachtrij
    waitingPlayer = newPlayer;
    return null;
  } else {
    // Er is al een wachtende speler → start game!
    const game = createNewGame(waitingPlayer, newPlayer);
    activeGames.set(game.id, game);
    waitingPlayer = null;
    return game;
  }
}

function createNewGame(player1: Player, player2: Player): Game {
  const game: Game = {
    id: generateGameId(),
    board: createInitialBoard(),
    players: [player1, player2],
    currentTurnColor: "white",
    moves: [],
    multicapturePieceId: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: "waiting" as GameStatus,
    startedAt: undefined,
  };

  startGame(game); // startGame stelt kleuren en beurt in
  return game;
}

export function generateGameId(): string {
  return Math.random().toString(36).substring(2, 10);
}
