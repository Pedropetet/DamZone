import { io } from "socket.io-client";
import jwt from "jsonwebtoken";

const SECRET = "damzone-dev-secret-vervang-dit-in-productie";
const URL = "http://localhost:3001";

function makeToken(userId, username) {
  return jwt.sign({ userId, username, role: "player" }, SECRET, { expiresIn: "1h" });
}

const socketA = io(URL, { auth: { token: makeToken("user-a", "SpelerA") } });
const socketB = io(URL, { auth: { token: makeToken("user-b", "SpelerB") } });

let statesReceived = 0;

function onGameStart(socket, name, data) {
  console.log(`🎮 ${name}: kleur=${data.playerColor}, tegenstander=${data.opponentUsername}`);
  console.log(`   Board rijen: ${data.game.board.length}, currentTurn: ${data.game.currentTurnColor}`);

  if (data.playerColor === "white") {
    // Wit opent: schijf (6,1) → (5,2)
    setTimeout(() => {
      socket.emit("game:move", {
        gameId: data.gameId,
        pieceId: "6-1",
        to: { row: 5, col: 2 },
      });
      console.log("📤 Wit stuurt zet (6,1) → (5,2)");
    }, 200);
  }
}

socketA.on("connect", () => {
  console.log("✅ SpelerA verbonden:", socketA.id);
  socketA.emit("game:queue");
});
socketB.on("connect", () => {
  console.log("✅ SpelerB verbonden:", socketB.id);
  socketB.emit("game:queue");
});

socketA.on("game:waiting", () => console.log("⏳ SpelerA wacht..."));
socketB.on("game:waiting", () => console.log("⏳ SpelerB wacht..."));

socketA.on("game:start", (d) => onGameStart(socketA, "SpelerA", d));
socketB.on("game:start", (d) => onGameStart(socketB, "SpelerB", d));

socketA.on("game:state", (data) => {
  statesReceived++;
  console.log(`📋 SpelerA ontvangt game:state — currentTurn: ${data.game.currentTurnColor}`);
  checkDone();
});
socketB.on("game:state", (data) => {
  statesReceived++;
  console.log(`📋 SpelerB ontvangt game:state — currentTurn: ${data.game.currentTurnColor}`);
  checkDone();
});

function checkDone() {
  if (statesReceived >= 2) {
    console.log("\n✅ GESLAAGD — beide spelers ontvingen de nieuwe spelstatus na één zet!");
    socketA.disconnect();
    socketB.disconnect();
    process.exit(0);
  }
}

socketA.on("game:error", (d) => console.error("❌ SpelerA fout:", d.message));
socketB.on("game:error", (d) => console.error("❌ SpelerB fout:", d.message));
socketA.on("connect_error", (e) => console.error("SpelerA verbindingsfout:", e.message));
socketB.on("connect_error", (e) => console.error("SpelerB verbindingsfout:", e.message));

setTimeout(() => {
  console.error("\n⏱ Timeout — test niet voltooid");
  process.exit(1);
}, 8000);
