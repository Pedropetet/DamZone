import { randomUUID } from "crypto";
import { PrismaClient } from "../../generated/prisma/index.js";
import { createInitialBoard } from "../gameLogic/BoardFactory.js";
import type { Game } from "../Models/Game.js";
import type { Player } from "../Models/Player.js";

const prisma = new PrismaClient();

interface GameEntry {
  game: Game;
  socketIds: [string, string];
}

const store = new Map<string, GameEntry>();

export async function createGame(
  player1: { userId: string; username: string; socketId: string },
  player2: { userId: string; username: string; socketId: string }
): Promise<Game> {
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

  const board = createInitialBoard();
  const gameId = randomUUID();
  const now = new Date();

  const game: Game = {
    id: gameId,
    players: [p1, p2],
    moves: [],
    board,
    currentTurnColor: "white",
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
    startedAt: now,
  };

  await prisma.game.create({
    data: {
      id: gameId,
      status: "in_progress",
      currentTurnColor: "white",
      startedAt: now,
      boardStateJson: JSON.stringify(board),
      players: {
        create: [
          { username: player1.username, color: "white", userId: player1.userId, isCurrentTurn: true },
          { username: player2.username, color: "black", userId: player2.userId, isCurrentTurn: false },
        ],
      },
    },
  });

  store.set(gameId, { game, socketIds: [player1.socketId, player2.socketId] });
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

export async function persistGameEnd(gameId: string, winnerId: string | null): Promise<void> {
  await prisma.game.update({
    where: { id: gameId },
    data: { status: "finished", endedAt: new Date(), winnerId: winnerId ?? undefined },
  });
}

export async function persistGameAbandoned(gameId: string): Promise<void> {
  try {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: "abandoned", endedAt: new Date() },
    });
  } catch {
    // Game may already be removed from DB
  }
}
