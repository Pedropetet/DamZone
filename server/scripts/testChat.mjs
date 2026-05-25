import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

const SECRET = "damzone-dev-secret-vervang-dit-in-productie";
const URL = "http://localhost:3001";

function makeToken(userId, username) {
  return jwt.sign({ userId, username, role: "player" }, SECRET, { expiresIn: "1h" });
}

const socketA = io(URL, { auth: { token: makeToken("user-a", "SpelerA") } });
const socketB = io(URL, { auth: { token: makeToken("user-b", "SpelerB") } });

let gameId = null;
let messagesReceived = 0;

socketA.on("connect", () => socketA.emit("game:queue"));
socketB.on("connect", () => socketB.emit("game:queue"));

socketA.on("game:start", (d) => {
  gameId = d.gameId;
  console.log(`🎮 SpelerA: ${d.playerColor}`);
  // Stuur een chatbericht na de start
  setTimeout(() => {
    socketA.emit("chat:send", { gameId, message: "Hallo SpelerB! Veel succes 😊" });
    console.log("📤 SpelerA stuurt chatbericht");
  }, 300);
});

socketB.on("game:start", (d) => {
  console.log(`🎮 SpelerB: ${d.playerColor}`);
  // SpelerB stuurt ook een bericht
  setTimeout(() => {
    socketB.emit("chat:send", { gameId: d.gameId, message: "Dankjewel! Jij ook 🎲" });
    console.log("📤 SpelerB stuurt chatbericht");
  }, 600);
});

function onChatMessage(name, msg) {
  messagesReceived++;
  console.log(`💬 ${name} ontvangt: [${msg.username}] ${msg.message}`);
  if (messagesReceived >= 4) {  // Beide spelers ontvangen beide berichten (2×2)
    console.log("\n✅ GESLAAGD — realtime chat werkt!");
    socketA.disconnect();
    socketB.disconnect();
    process.exit(0);
  }
}

socketA.on("chat:message", (msg) => onChatMessage("SpelerA", msg));
socketB.on("chat:message", (msg) => onChatMessage("SpelerB", msg));
socketA.on("chat:error", (d) => console.error("Chat-fout SpelerA:", d.message));
socketB.on("chat:error", (d) => console.error("Chat-fout SpelerB:", d.message));

setTimeout(() => { console.error("⏱ Timeout"); process.exit(1); }, 8000);
