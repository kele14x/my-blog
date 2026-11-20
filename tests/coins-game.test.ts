import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COIN_COUNT,
  INITIAL_BOARD,
  chooseMove,
  isWinning,
  legalMoves,
} from '../src/lib/coins-game.ts';
import { getCoinsGameMessages, resolveCoinsGameLocale } from '../src/lib/coins-game-i18n.ts';

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

test('game locale defaults to Chinese and resolves explicit English consistently', () => {
  assert.equal(resolveCoinsGameLocale(), 'zh-CN');
  assert.equal(resolveCoinsGameLocale('zh-CN'), 'zh-CN');
  assert.equal(resolveCoinsGameLocale('en'), 'en');
  assert.equal(resolveCoinsGameLocale('fr'), 'zh-CN');
  assert.equal(resolveCoinsGameLocale(''), 'zh-CN');
  assert.strictEqual(getCoinsGameMessages(), getCoinsGameMessages('zh-CN'));
  assert.strictEqual(getCoinsGameMessages('fr'), getCoinsGameMessages('zh-CN'));
  assert.strictEqual(getCoinsGameMessages(resolveCoinsGameLocale('en')), getCoinsGameMessages('en'));
  assert.notStrictEqual(getCoinsGameMessages('en'), getCoinsGameMessages('zh-CN'));
});

test('Chinese UI, feedback and win/loss messages retain their original wording', () => {
  const messages = getCoinsGameMessages('zh-CN');
  assert.equal(messages.regionLabel, '十二枚硬币小游戏');
  assert.equal(messages.heading, '动手试试：十二枚硬币');
  assert.equal(`${messages.remainingPrefix}${COIN_COUNT}${messages.remainingSuffix}`, '剩余 12 枚');
  assert.equal(messages.setupLabel, '开始新一局');
  assert.equal(messages.startHuman, '我先手');
  assert.equal(messages.startComputer, '电脑先手');
  assert.equal(messages.boardLabel, '硬币棋盘，按原始位置排列，可左右滚动');
  assert.equal(messages.confirm, '取走所选硬币');
  assert.equal(messages.clear, '取消选择');
  assert.equal(messages.movesLabel, '对局记录');
  assert.equal(messages.helpSummary, '玩法说明');
  assert.equal(messages.helpRules, '每次取 1 枚或原位置相邻的 2 枚，取走最后一枚者输；空位不合拢。');
  assert.equal(messages.helpControls, '点选后确认取走，再次点选可取消。窄屏可横向滑动；点击先手按钮可重新开局。');
  assert.equal(messages.noscript, '请启用 JavaScript 来玩这个小游戏；下方的文章和解题说明仍可正常阅读。');
  assert.equal(messages.selectionLimit, '每回合最多选择 2 枚硬币。请先取消一枚的选择。');
  assert.equal(messages.adjacencyRequired, '两枚硬币必须在原来的位置上相邻，不能跨过空位。');
  assert.deepEqual(messages.turn, {
    idle: '选择谁先手，开始新一局。',
    human: '轮到你了。',
    thinking: '电脑思考中…',
    win: '你赢了！电脑取走了最后一枚硬币。',
    loss: '电脑获胜。你取走了最后一枚硬币。',
  });
});

test('English UI, feedback and win/loss messages are fully localized', () => {
  const messages = getCoinsGameMessages('en');
  assert.equal(messages.regionLabel, 'Twelve Coins game');
  assert.equal(messages.heading, 'Try it: Twelve Coins');
  assert.equal(`${messages.remainingPrefix}${COIN_COUNT}${messages.remainingSuffix}`, 'Remaining 12');
  assert.equal(messages.setupLabel, 'Start a new game');
  assert.equal(messages.startHuman, 'I go first');
  assert.equal(messages.startComputer, 'Computer goes first');
  assert.equal(messages.boardLabel, 'Coin board in original position order; scroll left or right');
  assert.equal(messages.confirm, 'Remove selected coins');
  assert.equal(messages.clear, 'Clear selection');
  assert.equal(messages.movesLabel, 'Move log');
  assert.equal(messages.helpSummary, 'How to play');
  assert.equal(messages.helpRules, 'Take 1 coin or 2 coins adjacent in their original positions each turn. Whoever takes the last coin loses; gaps do not close.');
  assert.equal(messages.helpControls, 'Select coins, then confirm to remove them. Select a coin again to deselect it. Swipe horizontally on narrow screens; use either first-player button to restart.');
  assert.equal(messages.noscript, 'Please enable JavaScript to play this game; the article and solution below remain readable.');
  assert.equal(messages.selectionLimit, 'Select at most 2 coins per turn. Deselect one coin first.');
  assert.equal(messages.adjacencyRequired, 'The two coins must be adjacent in their original positions; you cannot cross a gap.');
  assert.deepEqual(messages.turn, {
    idle: 'Choose who goes first to start a new game.',
    human: 'Your turn.',
    thinking: 'Computer is thinking…',
    win: 'You win! The computer took the last coin.',
    loss: 'The computer wins. You took the last coin.',
  });
});

test('selection summaries handle empty, one and two coins in both locales', () => {
  const chinese = getCoinsGameMessages('zh-CN');
  const english = getCoinsGameMessages('en');
  assert.equal(chinese.selection([]), '');
  assert.equal(english.selection([]), '');
  assert.equal(chinese.selection([1]), '已选第 1 枚。');
  assert.equal(chinese.selection([11, 12]), '已选第 11、12 枚。');
  assert.equal(english.selection([1]), 'Selected coin 1.');
  assert.equal(english.selection([11, 12]), 'Selected coins 11 and 12.');
});

test('move logs preserve Chinese punctuation and use English singular/plural for both players', () => {
  const chinese = getCoinsGameMessages('zh-CN');
  const english = getCoinsGameMessages('en');
  assert.equal(chinese.move('human', [1]), '你取走了第 1 枚。');
  assert.equal(chinese.move('human', [11, 12]), '你取走了第 11、12 枚。');
  assert.equal(chinese.move('computer', [1]), '电脑取走了第 1 枚。');
  assert.equal(chinese.move('computer', [11, 12]), '电脑取走了第 11、12 枚。');
  assert.equal(english.move('human', [1]), 'You removed coin 1.');
  assert.equal(english.move('human', [11, 12]), 'You removed coins 11 and 12.');
  assert.equal(english.move('computer', [1]), 'The computer removed coin 1.');
  assert.equal(english.move('computer', [11, 12]), 'The computer removed coins 11 and 12.');
});

test('coin accessibility labels identify original positions and removed coins in both locales', () => {
  const chinese = getCoinsGameMessages('zh-CN');
  const english = getCoinsGameMessages('en');
  for (const number of [1, 12]) {
    assert.equal(chinese.coinLabel(number), `第 ${number} 枚硬币`);
    assert.equal(chinese.coinLabel(number, false), `第 ${number} 枚硬币`);
    assert.equal(chinese.coinLabel(number, true), `第 ${number} 枚硬币，已取走`);
    assert.equal(english.coinLabel(number), `Coin ${number}`);
    assert.equal(english.coinLabel(number, false), `Coin ${number}`);
    assert.equal(english.coinLabel(number, true), `Coin ${number}, removed`);
  }
});
