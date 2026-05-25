import type { Server as HttpServer } from "http";
import { Server as SocketServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { createGame, getGame, removeGame } from "../services/gameService.js";
import { performMove } from "../gameLogic/GameSession.js";
import { getValidMovesWithCaptureRule } from "../gameLogic/MoveCalculator.js";
import type { Position } from "../Models/Piece.js";

interface TokenPayload {
  userId: string;
  username: string;
  role: string;
}

// socket.id van de speler die wacht
let waitingSocketId: string | null = null;

// socket.id → gameId
const socketToGame = new Map<string, string>();

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
    socket.on("game:queue", () => {
      if (waitingSocketId && waitingSocketId !== socket.id) {
        const opponentSocket = io.sockets.sockets.get(waitingSocketId);

        if (!opponentSocket) {
          // Tegenstander al weg — jij wordt de nieuwe wachter
          waitingSocketId = socket.id;
          socket.emit("game:waiting");
          return;
        }

        waitingSocketId = null;

        const game = createGame(
          {
            userId: opponentSocket.data.userId,
            username: opponentSocket.data.username,
            socketId: opponentSocket.id,
          },
          { userId, username, socketId: socket.id }
        );

        socketToGame.set(opponentSocket.id, game.id);
        socketToGame.set(socket.id, game.id);

        opponentSocket.join(game.id);
        socket.join(game.id);

        // Wit = eerste speler (tegenstander die al wachtte)
        opponentSocket.emit("game:start", {
          gameId: game.id,
          playerColor: "white",
          opponentUsername: username,
          game,
        });

        // Zwart = jij (de nieuwkomer)
        socket.emit("game:start", {
          gameId: game.id,
          playerColor: "black",
          opponentUsername: opponentSocket.data.username,
          game,
        });
      } else {
        waitingSocketId = socket.id;
        socket.emit("game:waiting");
      }
    });

    socket.on("game:dequeue", () => {
      if (waitingSocketId === socket.id) waitingSocketId = null;
    });

    // ── Zet uitvoeren ────────────────────────────────────────────
    socket.on(
      "game:move",
      (data: { gameId: string; pieceId: string; to: Position }) => {
        const { gameId, pieceId, to } = data;
        const game = getGame(gameId);
        if (!game) {
          socket.emit("game:error", { message: "Spel niet gevonden" });
          return;
        }

        // Zoek het stuk op het serverbord (vertrouw NIET de client-data)
        const piece = game.board
          .flat()
          .find((p) => p !== null && p.id === pieceId) ?? null;

        if (!piece) {
          socket.emit("game:error", { message: "Stuk niet gevonden" });
          return;
        }

        // Leid de geldige zet af op de server (incl. correcte isCapture/isPromotion)
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

        // Stuur bijgewerkte spelstatus naar beide spelers
        io.to(gameId).emit("game:state", { game });

        if (result.gameEnded) {
          const winnerColor =
            game.players.find((p) => p.id === game.winnerId)?.color ?? null;
          io.to(gameId).emit("game:ended", {
            winnerId: game.winnerId,
            winnerColor,
          });
          removeGame(gameId);
        }
      }
    );

    // ── Disconnect ────────────────────────────────────────────────
    socket.on("disconnect", () => {
      if (waitingSocketId === socket.id) waitingSocketId = null;

      const gameId = socketToGame.get(socket.id);
      if (gameId) {
        socketToGame.delete(socket.id);
        socket.to(gameId).emit("game:opponent_disconnected");
        removeGame(gameId);
      }
    });
  });

  return io;
}
