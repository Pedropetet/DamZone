import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Game } from "../../../Models/Game";

interface EndGameDialogProps {
  open: boolean;
  game: Game;
  playerColor: "white" | "black";
  onBackHome: () => void;
}

export function EndGameDialog({
  open,
  game,
  playerColor,
  onBackHome,
}: EndGameDialogProps) {
  let result: "win" | "lose" | "draw" = "draw";

  if (game.winnerId) {
    const winnerPlayer = game.players.find((p) => p.id === game.winnerId);
    result = winnerPlayer?.color === playerColor ? "win" : "lose";
  } else {
    // Fallback voor het geval winnerId niet gezet is
    const whiteAlive = game.board.flat().some((p) => p && p.color === "white" && !p.isCaptured);
    const blackAlive = game.board.flat().some((p) => p && p.color === "black" && !p.isCaptured);
    if (!whiteAlive && playerColor === "white") result = "lose";
    if (!blackAlive && playerColor === "black") result = "lose";
    if (!whiteAlive && playerColor === "black") result = "win";
    if (!blackAlive && playerColor === "white") result = "win";
  }

  const message =
    result === "win"
      ? "🎉 Je hebt gewonnen!"
      : result === "lose"
      ? "😢 Je hebt verloren..."
      : "🤝 Gelijkspel";

  return (
    <Dialog open={open}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-2xl">{message}</DialogTitle>
        </DialogHeader>
        <p className="mt-2 text-sm text-muted-foreground">
          Bedankt voor het spelen.
        </p>
        <Button onClick={onBackHome} className="mt-4">
          Terug naar Home
        </Button>
      </DialogContent>
    </Dialog>
  );
}
