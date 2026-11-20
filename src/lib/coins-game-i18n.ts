export type CoinsGameLocale = 'zh-CN' | 'en';

type Player = 'human' | 'computer';

const messages = {
  'zh-CN': {
    regionLabel: '十二枚硬币小游戏',
    heading: '动手试试：十二枚硬币',
    remainingPrefix: '剩余 ',
    remainingSuffix: ' 枚',
    setupLabel: '开始新一局',
    startHuman: '我先手',
    startComputer: '电脑先手',
    boardLabel: '硬币棋盘，按原始位置排列，可左右滚动',
    confirm: '取走所选硬币',
    clear: '取消选择',
    movesLabel: '对局记录',
    helpSummary: '玩法说明',
    helpRules: '每次取 1 枚或原位置相邻的 2 枚，取走最后一枚者输；空位不合拢。',
    helpControls: '点选后确认取走，再次点选可取消。窄屏可横向滑动；点击先手按钮可重新开局。',
    noscript: '请启用 JavaScript 来玩这个小游戏；下方的文章和解题说明仍可正常阅读。',
    selectionLimit: '每回合最多选择 2 枚硬币。请先取消一枚的选择。',
    adjacencyRequired: '两枚硬币必须在原来的位置上相邻，不能跨过空位。',
    turn: {
      idle: '选择谁先手，开始新一局。',
      human: '轮到你了。',
      thinking: '电脑思考中…',
      win: '你赢了！电脑取走了最后一枚硬币。',
      loss: '电脑获胜。你取走了最后一枚硬币。',
    },
    coinLabel: (number: number, removed = false) =>
      `第 ${number} 枚硬币${removed ? '，已取走' : ''}`,
    selection: (numbers: readonly number[]) =>
      numbers.length ? `已选第 ${numbers.join('、')} 枚。` : '',
    move: (player: Player, numbers: readonly number[]) =>
      `${player === 'human' ? '你' : '电脑'}取走了第 ${numbers.join('、')} 枚。`,
  },
  en: {
    regionLabel: 'Twelve Coins game',
    heading: 'Try it: Twelve Coins',
    remainingPrefix: 'Remaining ',
    remainingSuffix: '',
    setupLabel: 'Start a new game',
    startHuman: 'I go first',
    startComputer: 'Computer goes first',
    boardLabel: 'Coin board in original position order; scroll left or right',
    confirm: 'Remove selected coins',
    clear: 'Clear selection',
    movesLabel: 'Move log',
    helpSummary: 'How to play',
    helpRules: 'Take 1 coin or 2 coins adjacent in their original positions each turn. Whoever takes the last coin loses; gaps do not close.',
    helpControls: 'Select coins, then confirm to remove them. Select a coin again to deselect it. Swipe horizontally on narrow screens; use either first-player button to restart.',
    noscript: 'Please enable JavaScript to play this game; the article and solution below remain readable.',
    selectionLimit: 'Select at most 2 coins per turn. Deselect one coin first.',
    adjacencyRequired: 'The two coins must be adjacent in their original positions; you cannot cross a gap.',
    turn: {
      idle: 'Choose who goes first to start a new game.',
      human: 'Your turn.',
      thinking: 'Computer is thinking…',
      win: 'You win! The computer took the last coin.',
      loss: 'The computer wins. You took the last coin.',
    },
    coinLabel: (number: number, removed = false) =>
      `Coin ${number}${removed ? ', removed' : ''}`,
    selection: (numbers: readonly number[]) =>
      numbers.length ? `Selected ${numbers.length === 1 ? 'coin' : 'coins'} ${numbers.join(' and ')}.` : '',
    move: (player: Player, numbers: readonly number[]) =>
      `${player === 'human' ? 'You' : 'The computer'} removed ${numbers.length === 1 ? 'coin' : 'coins'} ${numbers.join(' and ')}.`,
  },
};

export function resolveCoinsGameLocale(lang?: string): CoinsGameLocale {
  return lang === 'en' ? 'en' : 'zh-CN';
}

export function getCoinsGameMessages(lang?: string) {
  return messages[resolveCoinsGameLocale(lang)];
}
