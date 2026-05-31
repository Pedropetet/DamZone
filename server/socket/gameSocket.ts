import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import {
  createGame,
  getGame,
  removeGame,
  persistGameEnd,
  persistGameAbandoned,
} from "../services/gameService.js";
import { performMove } from "../gameLogic/GameSession.js";
import { getValidMovesWithCaptureRule } from "../gameLogic/MoveCalculator.js";
import type { Position } from "../Models/Piece.js";

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

// Wachtende speler in de matchmaking queue
let waitingPlayer: { socketId: string; userId: string } | null = null;

// socket.id → gameId
const socketToGame = new Map<string, string>();

// Gebruikers die momenteel in een actief spel zitten
const activeUserIds = new Set<string>();

// Timers voor grace period na disconnect (30 seconden)
const abandonTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function initGameSocket(httpServer: HttpServer, corsOrigin: string) {
  const io = new SocketServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  // JWT-authenticatie voor elke Socket.io-verbinding
  io.use((socket: Socket, next) => {
    const token = (socket.handshake.auth as Record<string, unknown>)?.token as
      | string
      | undefined;
    if (!token) return next(new Error("Geen token"));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as TokenPayload;
      socket.data.userId = payload.userId;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Ongeldig token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId: string = socket.data.userId;
    const username: string = socket.data.username;

    // ── Matchmaking ──────────────────────────────────────────────
    socket.on("game:queue", async () => {
      // Blokkeer als deze gebruiker al in een actief spel zit
      if (activeUserIds.has(userId)) {
        socket.emit("game:error", { message: "Je hebt al een actief spel" });
        return;
      }

      // Blokkeer als deze gebruiker al in de wachtrij staat
      if (waitingPlayer?.userId === userId) {
        socket.emit("game:error", { message: "Je wacht al op een tegenstander" });
        return;
      }

      if (waitingPlayer && waitingPlayer.socketId !== socket.id) {
        const opponentSocket = io.sockets.sockets.get(waitingPlayer.socketId);

        if (!opponentSocket) {
          waitingPlayer = { socketId: socket.id, userId };
          socket.emit("game:waiting");
          return;
        }

        const opponent = waitingPlayer;
        waitingPlayer = null;

        const game = await createGame(
          { userId: opponentSocket.data.userId, username: opponentSocket.data.username, socketId: opponentSocket.id },
          { userId, username, socketId: socket.id }
        );

        socketToGame.set(opponentSocket.id, game.id);
        socketToGame.set(socket.id, game.id);
        activeUserIds.add(opponentSocket.data.userId);
        activeUserIds.add(userId);

        opponentSocket.join(game.id);
        socket.join(game.id);

        opponentSocket.emit("game:start", {
          gameId: game.id,
          playerColor: "white",
          opponentUsername: username,
          game,
        });

        socket.emit("game:start", {
          gameId: game.id,
          playerColor: "black",
          opponentUsername: opponentSocket.data.username,
          game,
        });

        void opponent;
      } else {
        waitingPlayer = { socketId: socket.id, userId };
        socket.emit("game:waiting");
      }
    });

    socket.on("game:dequeue", () => {
      if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;
    });

    // ── Zet uitvoeren ────────────────────────────────────────────
    socket.on(
      "game:move",
      async (data: { gameId: string; pieceId: string; to: Position }) => {
        const { gameId, pieceId, to } = data;
        const game = getGame(gameId);
        if (!game) {
          socket.emit("game:error", { message: "Spel niet gevonden" });
          return;
        }

        const piece = game.board
          .flat()
          .find((p) => p !== null && p.id === pieceId) ?? null;

        if (!piece) {
          socket.emit("game:error", { message: "Stuk niet gevonden" });
          return;
        }

        const serverMove = getValidMovesWithCaptureRule(game, piece).find(
          (m) => m.to.row === to.row && m.to.col === to.col
        );

        if (!serverMove) {
          socket.emit("game:error", { message: "Ongeldige zet" });
          return;
        }

        const result = performMove(game, userId, piece, serverMove);
        if (!result.success) {
          socket.emit("game:error", { message: result.reason ?? "Ongeldige zet" });
          return;
        }

        io.to(gameId).emit("game:state", { game });

        if (result.gameEnded) {
          const winnerColor =
            game.players.find((p) => p.id === game.winnerId)?.color ?? null;
          io.to(gameId).emit("game:ended", {
            winnerId: game.winnerId,
            winnerColor,
          });
          activeUserIds.delete(game.players[0].id);
          activeUserIds.delete(game.players[1].id);
          removeGame(gameId);
          await persistGameEnd(gameId, game.winnerId ?? null);
        }
      }
    );

    // ── Spel verlaten (bewuste actie) ─────────────────────────────
    socket.on("game:leave", async () => {
      const gameId = socketToGame.get(socket.id);
      if (!gameId) return;

      const game = getGame(gameId);

      const timer = abandonTimers.get(gameId);
      if (timer) {
        clearTimeout(timer);
        abandonTimers.delete(gameId);
      }

      socketToGame.delete(socket.id);

      if (game) {
        activeUserIds.delete(game.players[0].id);
        activeUserIds.delete(game.players[1].id);
        socket.to(gameId).emit("game:abandoned");
        removeGame(gameId);
        await persistGameAbandoned(gameId);
      }
    });

    // ── Herverbinden na paginaverversing ─────────────────────────
    socket.on("game:rejoin", ({ gameId }: { gameId: string }) => {
      const game = getGame(gameId);
      if (!game) {
        socket.emit("game:rejoin_failed", { message: "Spel niet meer actief" });
        return;
      }

      const player = game.players.find((p) => p.id === userId);
      if (!player) {
        socket.emit("game:rejoin_failed", { message: "Je bent geen speler in dit spel" });
        return;
      }

      // Annuleer eventuele abandon-timer
      const timer = abandonTimers.get(gameId);
      if (timer) {
        clearTimeout(timer);
        abandonTimers.delete(gameId);
      }

      socket.join(gameId);
      socketToGame.set(socket.id, gameId);
      player.isConnected = true;

      // Stuur huidige spelstatus naar de herverbonden speler
      socket.emit("game:state", { game });

      // Informeer tegenstander dat speler terug is
      socket.to(gameId).emit("game:opponent_reconnected");
    });

    // ── Disconnect ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;

      const gameId = socketToGame.get(socket.id);
      if (gameId) {
        socketToGame.delete(socket.id);

        const game = getGame(gameId);
        if (game) {
          const player = game.players.find((p) => p.id === userId);
          if (player) player.isConnected = false;
        }

        socket.to(gameId).emit("game:opponent_disconnected");

        // Geef 30 seconden grace period voor herverbinding
        const timer = setTimeout(async () => {
          const g = getGame(gameId);
          if (g) {
            io.to(gameId).emit("game:abandoned");
            activeUserIds.delete(g.players[0].id);
            activeUserIds.delete(g.players[1].id);
            removeGame(gameId);
            await persistGameAbandoned(gameId);
          }
          abandonTimers.delete(gameId);
        }, 30_000);

        abandonTimers.set(gameId, timer);
      }
    });
  });

  return io;
}
