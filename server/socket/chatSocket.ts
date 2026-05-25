import type { Server as SocketServer, Socket } from "socket.io";
import { PrismaClient } from "../../generated/prisma/index.js";

const prisma = new PrismaClient();
const MAX_LENGTH = 200;

export function initChatSocket(io: SocketServer) {
  io.on("connection", (socket: Socket) => {
    const userId: string = socket.data.userId;
    const username: string = socket.data.username;

    socket.on(
      "chat:send",
      async (data: { gameId: string; message: string }) => {
        const { gameId } = data;
        const message = data.message?.trim().slice(0, MAX_LENGTH);

        if (!message) return;

        // Verifieer dat de socket daadwerkelijk in dit spel zit
        if (!socket.rooms.has(gameId)) {
          socket.emit("chat:error", { message: "Je bent niet in dit spel" });
          return;
        }

        const timestamp = new Date().toISOString();

        // Sla op in DB
        await prisma.chatMessage.create({
          data: { gameId, userId, username, message },
        });

        // Broadcast naar beide spelers in de spelkamer
        io.to(gameId).emit("chat:message", { username, message, timestamp });
      }
    );
  });
}
