import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COIN_COUNT,
  INITIAL_BOARD,
  chooseMove,
  isWinning,
  legalMoves,
} from '../src/lib/coins-game.ts';

const BOARD_COUNT = 4096;
const expectedMoves: number[][] = [];
const oracle: boolean[] = [true];

for (let board = 0; board < BOARD_COUNT; board++) {
  const positions = board.toString(2).padStart(12, '0').split('').reverse();
  const removals: number[] = [];
  for (let start = 0; start < 12; start++) {
    for (const length of [1, 2]) {
      const span = positions.slice(start, start + length);
      if (span.length === length && span.every((coin) => coin === '1')) {
        removals.push(span.reduce((sum, _, offset) => sum + 2 ** (start + offset), 0));
      }
    }
  }
  expectedMoves.push(removals);
  if (board !== 0) {
    oracle[board] = removals.some((removal) => !oracle[board - removal]);
  }
}

test('constants and empty, single, adjacent, and separated positions', () => {
  assert.equal(COIN_COUNT, 12);
  assert.equal(INITIAL_BOARD, 4095);
  assert.deepEqual(legalMoves(0), []);
  assert.equal(isWinning(0), true);
  assert.equal(chooseMove(0), null);

  assert.deepEqual(legalMoves(1), [1]);
  assert.equal(isWinning(1), false);
  assert.equal(chooseMove(1), 1);
  assert.deepEqual(legalMoves(3), [1, 3, 2]);
  assert.equal(isWinning(3), true);
  assert.equal(chooseMove(3), 1);
  assert.deepEqual(legalMoves(5), [1, 4]);
  assert.equal(isWinning(5), true);
  assert.equal(chooseMove(5), 1);

  assert.deepEqual(legalMoves(2048), [2048]);
  assert.equal(isWinning(2048), false);
  assert.deepEqual(legalMoves(3072), [1024, 3072, 2048]);
  assert.deepEqual(legalMoves(2049), [1, 2048]);
});

test('holes never collapse or allow bridging pairs', () => {
  assert.deepEqual(legalMoves(0b11011), [1, 3, 2, 8, 24, 16]);
  assert.deepEqual(legalMoves(0b10101), [1, 4, 16]);
  assert.deepEqual(legalMoves(0b111 ^ 0b010), [1, 4]);
});

test('legal moves match independent transitions in order for every board', () => {
  for (let board = 0; board < BOARD_COUNT; board++) {
    const moves = legalMoves(board);
    assert.deepEqual(moves, expectedMoves[board], `moves for board ${board}`);
    assert.equal(new Set(moves).size, moves.length, `unique moves for board ${board}`);
  }
});

test('winning states match the independent bottom-up oracle for every board', () => {
  for (let board = 0; board < BOARD_COUNT; board++) {
    assert.equal(isWinning(board), oracle[board], `outcome for board ${board}`);
    assert.equal(isWinning(board), oracle[board], `repeated outcome for board ${board}`);
  }
  assert.equal(isWinning(INITIAL_BOARD), false);
});

test('chosen moves are deterministic, legal, first optimal or first fallback', () => {
  for (let board = 0; board < BOARD_COUNT; board++) {
    const move = chooseMove(board);
    assert.equal(chooseMove(board), move, `deterministic choice for board ${board}`);
    if (board === 0) {
      assert.equal(move, null);
      continue;
    }
    assert.notEqual(move, null);
    assert.ok(move !== null && expectedMoves[board].includes(move), `legal choice for board ${board}`);
    const optimal = expectedMoves[board].find((removal) => !oracle[board - removal]);
    assert.equal(move, optimal ?? expectedMoves[board][0], `first choice for board ${board}`);
    if (oracle[board]) {
      assert.equal(oracle[board - move], false, `losing successor for board ${board}`);
    }
  }
});
