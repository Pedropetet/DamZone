import { describe, it, expect } from "vitest";
import {
  isWithinBoard,
  getValidMoves,
  getValidMovesWithCaptureRule,
  getMovablePieces,
} from "../../gameLogic/MoveCalculator.js";
import { createInitialBoard } from "../../gameLogic/BoardFactory.js";
import type { Game } from "../../Models/Game.js";
import type { Piece, PieceColor } from "../../Models/Piece.js";

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

// ── isWithinBoard ──────────────────────────────────────────────────────────

describe("isWithinBoard", () => {
  it("accepteert hoekposities van het bord", () => {
    expect(isWithinBoard({ row: 0, col: 0 })).toBe(true);
    expect(isWithinBoard({ row: 9, col: 9 })).toBe(true);
    expect(isWithinBoard({ row: 0, col: 9 })).toBe(true);
    expect(isWithinBoard({ row: 9, col: 0 })).toBe(true);
  });

  it("weigert posities buiten het bord", () => {
    expect(isWithinBoard({ row: -1, col: 0 })).toBe(false);
    expect(isWithinBoard({ row: 0, col: -1 })).toBe(false);
    expect(isWithinBoard({ row: 10, col: 0 })).toBe(false);
    expect(isWithinBoard({ row: 0, col: 10 })).toBe(false);
  });
});

// ── Startbord ──────────────────────────────────────────────────────────────

describe("createInitialBoard", () => {
  it("heeft 20 witte en 20 zwarte schijven", () => {
    const board = createInitialBoard();
    const pieces = board.flat().filter((p): p is Piece => p !== null);
    const white = pieces.filter((p) => p.color === "white");
    const black = pieces.filter((p) => p.color === "black");
    expect(white).toHaveLength(20);
    expect(black).toHaveLength(20);
  });

  it("plaatst zwarte schijven in rijen 0-3 en witte in rijen 6-9", () => {
    const board = createInitialBoard();
    board.flat().forEach((p) => {
      if (!p) return;
      if (p.color === "black") expect(p.position.row).toBeLessThan(4);
      if (p.color === "white") expect(p.position.row).toBeGreaterThan(5);
    });
  });

  it("plaatst schijven alleen op donkere velden", () => {
    const board = createInitialBoard();
    board.flat().forEach((p) => {
      if (!p) return;
      expect((p.position.row + p.position.col) % 2).toBe(1);
    });
  });
});

// ── getValidMoves (normale schijf) ────────────────────────────────────────

describe("getValidMoves — normale schijf", () => {
  it("wit beweegt omhoog (richting rij 0)", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    const moves = getValidMoves(game, white);
    expect(moves.every((m) => m.to.row < white.position.row)).toBe(true);
    expect(moves).toHaveLength(2);
  });

  it("zwart beweegt omlaag (richting rij 9)", () => {
    const board = emptyBoard();
    const black = makePiece("b1", "black", 4, 5);
    board[4][5] = black;
    const game = makeGame(board, "black");
    const moves = getValidMoves(game, black).filter((m) => !m.isCapture);
    expect(moves.every((m) => m.to.row > black.position.row)).toBe(true);
  });

  it("geslagen schijf heeft geen zetten", () => {
    const board = emptyBoard();
    const piece = makePiece("w1", "white", 5, 2);
    piece.isCaptured = true;
    board[5][2] = piece;
    const game = makeGame(board);
    expect(getValidMoves(game, piece)).toHaveLength(0);
  });

  it("detecteert slagzet als vijand aangrenzend is met vrij veld erachter", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    const black = makePiece("b1", "black", 4, 3);
    board[5][2] = white;
    board[4][3] = black;
    const game = makeGame(board);
    const captures = getValidMoves(game, white).filter((m) => m.isCapture);
    expect(captures.length).toBeGreaterThan(0);
    expect(captures[0].to).toEqual({ row: 3, col: 4 });
  });

  it("markeert promotie correct als wit aankomt in rij 0", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 1, 2);
    board[1][2] = white;
    const game = makeGame(board);
    const moves = getValidMoves(game, white).filter((m) => m.to.row === 0);
    expect(moves.length).toBeGreaterThan(0);
    expect(moves[0].isPromotion).toBe(true);
  });
});

// ── getValidMovesWithCaptureRule ──────────────────────────────────────────

describe("getValidMovesWithCaptureRule", () => {
  it("dwingt slag af: als slag mogelijk is zijn alleen slagzetten toegestaan", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    const black = makePiece("b1", "black", 4, 3);
    board[5][2] = white;
    board[4][3] = black;
    const game = makeGame(board);
    const moves = getValidMovesWithCaptureRule(game, white);
    expect(moves.every((m) => m.isCapture)).toBe(true);
  });

  it("geeft normale zetten als geen slag beschikbaar is", () => {
    const board = emptyBoard();
    const white = makePiece("w1", "white", 5, 2);
    board[5][2] = white;
    const game = makeGame(board);
    const moves = getValidMovesWithCaptureRule(game, white);
    expect(moves.every((m) => !m.isCapture)).toBe(true);
    expect(moves.length).toBeGreaterThan(0);
  });
});

// ── getMovablePieces ──────────────────────────────────────────────────────

describe("getMovablePieces", () => {
  it("geeft bij multicapture alleen het slaande stuk terug", () => {
    const board = emptyBoard();
    const white1 = makePiece("w1", "white", 5, 2);
    const white2 = makePiece("w2", "white", 5, 6);
    board[5][2] = white1;
    board[5][6] = white2;
    const game = makeGame(board);
    game.multicapturePieceId = "w1";
    const movable = getMovablePieces(game, "white");
    expect(movable).toHaveLength(1);
    expect(movable[0].id).toBe("w1");
  });
});

// ── dame (king) ───────────────────────────────────────────────────────────

describe("getValidMoves — dame", () => {
  it("dame beweegt in alle 4 diagonale richtingen", () => {
    const board = emptyBoard();
    const king = makePiece("k1", "white", 5, 5, true);
    board[5][5] = king;
    const game = makeGame(board);
    const moves = getValidMoves(game, king).filter((m) => !m.isCapture);
    const directions = new Set(
      moves.map((m) => `${Math.sign(m.to.row - 5)},${Math.sign(m.to.col - 5)}`)
    );
    expect(directions.size).toBe(4);
  });
});
