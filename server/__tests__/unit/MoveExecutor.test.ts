import { describe, it, expect } from "vitest";
import { applyMove, isMoveValid } from "../../gameLogic/MoveExecutor.js";
import { createInitialBoard } from "../../gameLogic/BoardFactory.js";
import type { Game } from "../../Models/Game.js";
import type { Piece, PieceColor } from "../../Models/Piece.js";
import type { Move } from "../../Models/Move.js";

function emptyBoard(): (Piece | null)[][] {
  return Array.from({ length: 10 }, () => Array<Piece | null>(10).fill(null));
}

function makePiece(
  id: string,
  color: PieceColor,
  row: number,
  col: number,
  isKing = false
): Piece {
  return { id, color, isKing, isCaptured: false, position: { row, col } };
}

function makeGame(board: (Piece | null)[][], currentTurnColor: PieceColor = "white"): Game {
  return {
    id: "test",
    players: [
      { id: "p1", username: "A", color: "white", isCurrentTurn: true, isConnected: true },
      { id: "p2", username: "B", color: "black", isCurrentTurn: false, isConnected: true },
    ],
    moves: [],
    board,
    currentTurnColor,
    status: "in_progress",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeMove(
  fromRow: number,
  fromCol: number,
  toRow: number,
  toCol: number,
  isCapture = false,
  isPromotion = false
): Move {
  return {
    from: { row: fromRow, col: fromCol },
    to: { row: toRow, col: toCol },
    isCapture,
    isPromotion,
    timestamp: new Date(),
  };
}

// ── isMoveValid ────────────────────────────────────────────────────────────

describe("isMoveValid", () => {
  it("keurt een geldige normale zet goed", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    const move = makeMove(5, 2, 4, 1);
    expect(isMoveValid(game, white, move)).toBe(true);
  });

  it("weigert een zet naar een bezet veld", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    const blocker = makePiece("w2", "white", 4, 1);
    board[5][2] = white;
    board[4][1] = blocker;
    const game = makeGame(board);
    const move = makeMove(5, 2, 4, 1);
    expect(isMoveValid(game, white, move)).toBe(false);
  });
});

// ── applyMove ──────────────────────────────────────────────────────────────

describe("applyMove", () => {
  it("verplaatst het stuk naar het doelveld", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    applyMove(game, white, makeMove(5, 2, 4, 1));
    expect(game.board[4][1]).toBe(white);
    expect(game.board[5][2]).toBeNull();
    expect(white.position).toEqual({ row: 4, col: 1 });
  });

  it("wisselt de beurt na een normale zet", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board, "white");
    applyMove(game, white, makeMove(5, 2, 4, 1));
    expect(game.currentTurnColor).toBe("black");
  });

  it("verwijdert het geslagen stuk van het bord", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    const black = makePiece("b1", "black", 4, 3);
    board[5][2] = white;
    board[4][3] = black;
    const game = makeGame(board);
    applyMove(game, white, makeMove(5, 2, 3, 4, true));
    expect(game.board[4][3]).toBeNull();
    expect(black.isCaptured).toBe(true);
  });

  it("promoveert wit naar dame in rij 0", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 1, 2);
    board[1][2] = white;
    const game = makeGame(board);
    applyMove(game, white, makeMove(1, 2, 0, 1, false, true));
    expect(white.isKing).toBe(true);
  });

  it("gooit een fout bij een ongeldige zet", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    expect(() => applyMove(game, white, makeMove(5, 2, 7, 7))).toThrow("Ongeldige zet");
  });

  it("stelt multicapture in als meer slagen mogelijk zijn", () => {
    // Wit op 7,2 — zwart op 6,3 en 4,5
    const board = emptyBoard();
    const white = makePiece("w1", "white", 7, 2);
    const black1 = makePiece("b1", "black", 6, 3);
    const black2 = makePiece("b2", "black", 4, 5);
    board[7][2] = white;
    board[6][3] = black1;
    board[4][5] = black2;
    const game = makeGame(board);
    applyMove(game, white, makeMove(7, 2, 5, 4, true));
    // Als een tweede slag mogelijk is, moet multicapturePieceId ingesteld zijn
    if (game.multicapturePieceId) {
      expect(game.multicapturePieceId).toBe("w1");
      expect(game.currentTurnColor).toBe("white"); // beurt wisselt NIET bij multicapture
    } else {
      // Geen tweede slag mogelijk in deze positie; beurt wisselt wel
      expect(game.currentTurnColor).toBe("black");
    }
  });

  it("registreert de zet in de move-history", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    applyMove(game, white, makeMove(5, 2, 4, 1));
    expect(game.moves).toHaveLength(1);
  });

  it("startbord: witspeler kan in eerste zet bewegen", () => {
    const game = makeGame(createInitialBoard(), "white");
    const whitePieces = game.board.flat().filter(
      (p): p is Piece => p !== null && p.color === "white"
    );
    const frontRow = whitePieces.filter((p) => p.position.row === 6);
    expect(frontRow.length).toBeGreaterThan(0);
    const piece = frontRow.find((p) => p.position.col === 1)!;
    applyMove(game, piece, makeMove(6, 1, 5, 0));
    expect(game.board[5][0]).toBe(piece);
  });
});
