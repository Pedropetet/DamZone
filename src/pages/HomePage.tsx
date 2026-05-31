import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { socketService } from "@/services/socketService";
import { Button } from "@/components/ui/button";
import { RuleDialog } from "@/components/page-components/home-page/rule-dialog";
import type { Game } from "@/Models/Game";

type LobbyStatus = "idle" | "waiting" | "starting";

interface GameStartPayload {
  gameId: string;
  playerColor: "white" | "black";
  opponentUsername: string;
  game: Game;
}

export default function HomePage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<LobbyStatus>("idle");
  const socketRef = useRef(socketService.get());

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    if (!token) return;

    const socket = socketService.connect(token);
    socketRef.current = socket;

    socket.on("game:waiting", () => setStatus("waiting"));

    socket.on("game:start", (data: GameStartPayload) => {
      setStatus("starting");
      sessionStorage.setItem(
        "damzone_active_game",
        JSON.stringify({
          gameId: data.gameId,
          playerColor: data.playerColor,
          opponentUsername: data.opponentUsername,
        })
      );
      navigate("/game", {
        state: {
          game: data.game,
          playerColor: data.playerColor,
          playerId: user!.id,
          opponentUsername: data.opponentUsername,
        },
      });
    });

    socket.on("connect_error", (err: Error) => {
      console.error("Socket verbindingsfout:", err.message);
    });

    return () => {
      socket.off("game:waiting");
      socket.off("game:start");
      socket.off("connect_error");
    };
  }, [token, navigate, user]);

  function handleQueue() {
    socketRef.current?.emit("game:queue");
  }

  function handleDequeue() {
    socketRef.current?.emit("game:dequeue");
    setStatus("idle");
  }

  function handleLogout() {
    socketService.disconnect();
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b bg-background px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <img src="/damzone logo.png" alt="DamZone" className="w-8 h-8" />
          <span className="font-bold text-lg">DamZone</span>
          <span className="text-muted-foreground text-sm">Lobby</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Ingelogd als <strong>{user?.username}</strong>
          </span>
          {user?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="text-amber-600 hover:underline font-medium"
            >
              Admin
            </button>
          )}
          <button
            onClick={() => navigate("/settings")}
            className="text-blue-500 hover:underline"
          >
            Instellingen
          </button>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:underline"
          >
            Uitloggen
          </button>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center pb-20">
        <div className="flex flex-col items-center space-y-6">
          <img src="/damzone logo.png" alt="DamZone logo" className="w-36 h-36" />
          <h1 className="text-4xl font-bold">DamZone</h1>

          {status === "idle" && (
            <div className="flex gap-x-4">
              <Button onClick={handleQueue} variant="success" size="lg" className="px-8">
                Zoek tegenstander
              </Button>
              <RuleDialog />
            </div>
          )}

          {status === "waiting" && (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="animate-spin text-lg">⏳</span>
                <span>Wachten op tegenstander...</span>
              </div>
              <Button onClick={handleDequeue} variant="outline" size="sm">
                Annuleren
              </Button>
            </div>
          )}

          {status === "starting" && (
            <p className="text-muted-foreground">Spel wordt gestart...</p>
          )}
        </div>
      </div>
    </div>
  );
}
