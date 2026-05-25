import { randomUUID } from "crypto";
import { createInitialBoard } from "../gameLogic/BoardFactory.js";
import type { Game } from "../Models/Game.js";
import type { Player } from "../Models/Player.js";

interface GameEntry {
  game: Game;
  // socket.id van de twee spelers
  socketIds: [string, string];
}

const store = new Map<string, GameEntry>();

export function createGame(
  player1: { userId: string; username: string; socketId: string },
  player2: { userId: string; username: string; socketId: string }
): Game {
  const p1: Player = {
    id: player1.userId,
    username: player1.username,
    color: "white",
    isCurrentTurn: true,
    isConnected: true,
  };
  const p2: Player = {
    id: player2.userId,
    username: player2.username,
    color: "black",
    isCurrentTurn: false,
    isConnected: true,
  };

  const game: Game = {
    id: randomUUID(),
    players: [p1, p2],
    moves: [],
    board: createInitialBoard(),
    currentTurnColor: "white",
    status: "in_progress",
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: new Date(),
  };

  store.set(game.id, {
    game,
    socketIds: [player1.socketId, player2.socketId],
  });

  return game;
}

export function getGame(gameId: string): Game | undefined {
  return store.get(gameId)?.game;
}

export function removeGame(gameId: string): void {
  store.delete(gameId);
}

export function getActiveGameCount(): number {
  return store.size;
}
