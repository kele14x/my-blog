export const COIN_COUNT = 12;
export const INITIAL_BOARD = (1 << COIN_COUNT) - 1;

// An empty board is winning for the next player because the last mover loses.
const winningMemo = new Map<number, boolean>([[0, true]]);

export function legalMoves(board: number): number[] {
  const moves: number[] = [];
  for (let index = 0; index < COIN_COUNT; index++) {
    const single = 1 << index;
    if ((board & single) === 0) continue;
    moves.push(single);
    if (index + 1 < COIN_COUNT && (board & (single << 1)) !== 0) {
      moves.push(single | (single << 1));
    }
  }
  return moves;
}

export function isWinning(board: number): boolean {
  const cached = winningMemo.get(board);
  if (cached !== undefined) return cached;
  const winning = legalMoves(board).some((move) => !isWinning(board ^ move));
  winningMemo.set(board, winning);
  return winning;
}

export function chooseMove(board: number): number | null {
  const moves = legalMoves(board);
  return moves.find((move) => !isWinning(board ^ move)) ?? moves[0] ?? null;
}
