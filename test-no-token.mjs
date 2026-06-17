import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  auth: {}  // bewust geen token
});

socket.on("connect_error", (err) => {
  console.log("Verbindingsfout:", err.message);
  process.exit(0);
});

setTimeout(() => process.exit(1), 3000);
