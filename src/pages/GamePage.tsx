import { useEffect, useState } from "react";
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

interface LocationState {
  game: Game;
  playerColor: "white" | "black";
  playerId: string;
  opponentUsername: string;
}

export default function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const state = location.state as LocationState | null;
  const playerColor = state?.playerColor ?? null;
  const opponentUsername = state?.opponentUsername ?? "Tegenstander";

  const [game, setGame] = useState<Game | null>(state?.game ?? null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [validMoves, setValidMoves] = useState<Move[]>([]);
  const [movablePieces, setMovablePieces] = useState<Piece[]>([]);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  const isMyTurn = game?.currentTurnColor === playerColor;
  const socket = socketService.get();

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

  // Socket.io game-event listeners
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
    });

    socket.on("game:opponent_disconnected", () => {
      setOpponentDisconnected(true);
    });

    socket.on("game:error", ({ message }: { message: string }) => {
      console.warn("Spelfout:", message);
    });

    return () => {
      socket.off("game:state");
      socket.off("game:ended");
      socket.off("game:opponent_disconnected");
      socket.off("game:error");
    };
  }, [socket]);

  // Geen routerstate — geen actief spel
  if (!game || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">
          Geen actief spel. Ga naar de lobby om een tegenstander te zoeken.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="text-blue-500 hover:underline"
        >
          Terug naar lobby
        </button>
      </div>
    );
  }

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
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 max-w-[800px]">
        <h2 className="text-xl font-semibold">
          Jij speelt {playerColor === "white" ? "⚪ Wit" : "⚫ Zwart"}
        </h2>
        <span className="text-sm text-muted-foreground">
          vs <strong>{opponentUsername}</strong>
        </span>
      </div>

      {/* Beurt-indicator */}
      <p className="mb-4 text-sm max-w-[800px]">
        {opponentDisconnected ? (
          <span className="text-amber-600 font-medium">
            Tegenstander heeft de verbinding verbroken.
          </span>
        ) : isMyTurn ? (
          <span className="text-green-600 font-medium">Jij bent aan zet</span>
        ) : (
          <span className="text-muted-foreground">Wacht op tegenstander…</span>
        )}
      </p>

      {/* Bord + Chat naast elkaar */}
      <div className="flex gap-4 items-start">
        <Board
          board={game.board}
          selectedPiece={selectedPiece}
          movablePieces={movablePieces}
          validMoves={validMoves}
          onPieceClick={handlePieceClick}
          onSquareClick={handleSquareClick}
        />

        <div className="w-72 h-[500px]">
          <Chat
            gameId={game.id}
            socket={socket}
            currentUsername={user?.username ?? ""}
          />
        </div>
      </div>

      <EndGameDialog
        open={showEndDialog}
        playerColor={playerColor!}
        game={game}
        onBackHome={() => navigate("/home")}
      />
    </div>
  );
}
