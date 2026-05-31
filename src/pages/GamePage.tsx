import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { socketService } from "@/services/socketService";
import {
  getMovablePieces,
  getValidMovesWithCaptureRule,
} from "../GameLogic/MoveCalculator";
import type { Game } from "../Models/Game";
import type { Move } from "../Models/Move";
import type { Piece } from "../Models/Piece";
import { Board } from "../components/page-components/game-page/gameboard";
import { EndGameDialog } from "../components/page-components/game-page/end-game-dialog";
import { Chat } from "../components/page-components/game-page/chat";

const SESSION_KEY = "damzone_active_game";

interface LocationState {
  game: Game;
  playerColor: "white" | "black";
  playerId: string;
  opponentUsername: string;
}

interface SavedSession {
  gameId: string;
  playerColor: "white" | "black";
  opponentUsername: string;
}

function readSavedSession(): SavedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const state = location.state as LocationState | null;
  const savedSession = useRef<SavedSession | null>(state ? null : readSavedSession());

  const playerColor = state?.playerColor ?? savedSession.current?.playerColor ?? null;
  const opponentUsername =
    state?.opponentUsername ?? savedSession.current?.opponentUsername ?? "Tegenstander";

  const [game, setGame] = useState<Game | null>(state?.game ?? null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [movablePieces, setMovablePieces] = useState<Piece[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [gameAbandoned, setGameAbandoned] = useState(false);
  const [rejoinError, setRejoinError] = useState<string | null>(null);

  const isMyTurn = game?.currentTurnColor === playerColor;

  // Rejoin flow: pagina vernieuwd, geen location.state maar wel sessionStorage
  useEffect(() => {
    if (state || !savedSession.current || !token) return;

    const { gameId } = savedSession.current;
    const sock = socketService.connect(token);

    const handleRejoinFailed = () => {
      sessionStorage.removeItem(SESSION_KEY);
      setRejoinError("Spel niet meer actief");
    };
    sock.once("game:rejoin_failed", handleRejoinFailed);

    fetch(`/api/games/${gameId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json() as Promise<Game>;
      })
      .then((fetchedGame) => {
        setGame(fetchedGame);
        sock.emit("game:rejoin", { gameId });
      })
      .catch(() => {
        sock.off("game:rejoin_failed", handleRejoinFailed);
        sessionStorage.removeItem(SESSION_KEY);
        setRejoinError("Spel niet meer actief");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Beweegbare stukken bijhouden op basis van spelstatus
  useEffect(() => {
    if (!game || !playerColor) return;
    if (game.status === "finished") {
      setShowEndDialog(true);
      setMovablePieces([]);
      return;
    }
    if (!isMyTurn) {
      setMovablePieces([]);
      return;
    }
    setMovablePieces(getMovablePieces(game, playerColor));
  }, [game, isMyTurn, playerColor]);

  // Socket event listeners — opnieuw koppelen zodra socket beschikbaar is
  const socket = socketService.get();
  useEffect(() => {
    if (!socket) return;

    socket.on("game:state", ({ game: updatedGame }: { game: Game }) => {
      setGame(updatedGame);
      setSelectedPiece(null);
      setValidMoves([]);
    });

    socket.on("game:ended", ({ winnerId }: { winnerId: string }) => {
      setGame((prev) =>
        prev ? { ...prev, status: "finished", winnerId } : prev
      );
      setShowEndDialog(true);
      sessionStorage.removeItem(SESSION_KEY);
    });

    socket.on("game:opponent_disconnected", () => {
      setOpponentDisconnected(true);
    });

    socket.on("game:opponent_reconnected", () => {
      setOpponentDisconnected(false);
    });

    socket.on("game:abandoned", () => {
      sessionStorage.removeItem(SESSION_KEY);
      setGameAbandoned(true);
    });

    socket.on("game:error", ({ message }: { message: string }) => {
      console.warn("Spelfout:", message);
    });

    return () => {
      socket.off("game:state");
      socket.off("game:ended");
      socket.off("game:opponent_disconnected");
      socket.off("game:opponent_reconnected");
      socket.off("game:abandoned");
      socket.off("game:error");
    };
  }, [socket]);

  function handleBackHome() {
    socket?.emit("game:leave");
    sessionStorage.removeItem(SESSION_KEY);
    navigate("/home");
  }

  // Fout bij herverbinden
  if (rejoinError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">
          {rejoinError}. Ga naar de lobby om een nieuw spel te starten.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="text-blue-500 hover:underline"
        >
          Naar lobby
        </button>
      </div>
    );
  }

  // Geen state en geen sessionStorage
  if (!state && !savedSession.current && !game) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">
          Geen actief spel. Ga naar de lobby om een tegenstander te zoeken.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="text-blue-500 hover:underline"
        >
          Naar lobby
        </button>
      </div>
    );
  }

  // Laden tijdens herverbinding
  if (!game && savedSession.current) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Verbinding herstellen…</p>
      </div>
    );
  }

  // Tegenstander heeft het spel verlaten (abandon na 30s)
  if (gameAbandoned) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-lg font-medium">Tegenstander heeft het spel verlaten.</p>
        <button
          onClick={() => navigate("/home")}
          className="text-blue-500 hover:underline"
        >
          Naar lobby
        </button>
      </div>
    );
  }

  if (!game || !playerColor) return null;

  function handlePieceClick(piece: Piece) {
    if (!isMyTurn || piece.color !== playerColor) return;
    setSelectedPiece(piece);
    setValidMoves(getValidMovesWithCaptureRule(game!, piece));
  }

  function handleSquareClick(row: number, col: number) {
    if (!selectedPiece || !game) return;
    const move = validMoves.find((m) => m.to.row === row && m.to.col === col);
    if (!move) {
      const clickedPiece = game.board[row][col];
      if (clickedPiece && clickedPiece.color === playerColor) {
        handlePieceClick(clickedPiece);
      } else {
        setSelectedPiece(null);
        setValidMoves([]);
      }
      return;
    }

    socket?.emit("game:move", {
      gameId: game.id,
      pieceId: selectedPiece.id,
      to: move.to,
    });
    setSelectedPiece(null);
    setValidMoves([]);
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b bg-background px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/damzone logo.png" alt="DamZone" className="w-7 h-7" />
          <span className="font-bold">DamZone</span>
          <span className="text-muted-foreground text-sm">Spel</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">
            Ingelogd als <strong>{user?.username}</strong>
          </span>
          <button
            onClick={handleBackHome}
            className="text-blue-500 hover:underline"
          >
            Naar lobby
          </button>
        </div>
      </header>

      {/* Spel content — scroll bevat binnen deze pagina zodat body-scroll niet overloopt */}
      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-start py-4 px-6">
        {/* Spelinfo + bord + chat als één gecentreerde groep */}
        <div className="flex flex-col">
          {/* Spelinfo boven bord + chat — breedte volgt automatisch */}
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xl font-semibold">
              Jij speelt {playerColor === "white" ? "⚪ Wit" : "⚫ Zwart"}
            </h2>
            <span className="text-sm text-muted-foreground ml-6">
              vs <strong>{opponentUsername}</strong>
            </span>
          </div>

          {/* Beurt-indicator */}
          <p className="mb-3 text-sm">
            {opponentDisconnected ? (
              <span className="text-amber-600 font-medium">
                Tegenstander heeft de verbinding verbroken. Wacht op herverbinding…
              </span>
            ) : isMyTurn ? (
              <span className="text-green-600 font-medium">Jij bent aan zet</span>
            ) : (
              <span className="text-muted-foreground">Wacht op tegenstander…</span>
            )}
          </p>

          {/* Bord links, chat rechts; op kleine schermen chat eronder */}
          <div className="flex flex-wrap gap-4 items-start">
            <Board
              board={game.board}
              selectedPiece={selectedPiece}
              movablePieces={movablePieces}
              validMoves={validMoves}
              onPieceClick={handlePieceClick}
              onSquareClick={handleSquareClick}
            />

            <div className="w-72 h-[500px] min-w-[250px]">
              <Chat
                gameId={game.id}
                socket={socket}
                currentUsername={user?.username ?? ""}
              />
            </div>
          </div>
        </div>
      </div>

      <EndGameDialog
        open={showEndDialog}
        playerColor={playerColor}
        game={game}
        onBackHome={handleBackHome}
      />
    </div>
  );
}
