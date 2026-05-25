import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import twoFactorRoutes from "./routes/twoFactor.js";
import adminRoutes from "./routes/admin.js";
import gameRoutes from "./routes/game.js";
import { initGameSocket } from "./socket/gameSocket.js";
import { initChatSocket } from "./socket/chatSocket.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-origin" },
  })
);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/auth/2fa", twoFactorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/games", gameRoutes);

const io = initGameSocket(httpServer, process.env.CORS_ORIGIN ?? "http://localhost:5173");
initChatSocket(io);

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  console.log(`✅ Server draait op http://localhost:${PORT}`);
});
