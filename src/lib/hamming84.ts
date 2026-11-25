export type Bit = 0 | 1;

export const BIT_LABELS = ['d0', 'd1', 'd2', 'd3', 'p0', 'p1', 'p2', 'q'] as const;

export const GENERATOR_MATRIX = [
  [1, 0, 0, 0, 1, 0, 1, 1],
  [0, 1, 0, 0, 1, 1, 1, 0],
  [0, 0, 1, 0, 1, 1, 0, 1],
  [0, 0, 0, 1, 0, 1, 1, 1],
] as const;

export const PARITY_CHECK_MATRIX = [
  [1, 1, 1, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 1, 0, 0],
  [1, 1, 0, 1, 0, 0, 1, 0],
  [1, 0, 1, 1, 0, 0, 0, 1],
] as const;

export function encode(data: readonly Bit[]): Bit[] {
  return BIT_LABELS.map((_, column) => GENERATOR_MATRIX.reduce<Bit>(
    (value, row, index) => (value ^ (data[index] & row[column])) as Bit,
    0,
  ));
}

export interface DecodeResult {
  syndrome: Bit[];
  overall: Bit;
  status: 'clean' | 'corrected' | 'uncorrectable';
  correctedIndex: number | null;
  codeword: Bit[] | null;
  data: Bit[] | null;
}

export function decode(received: readonly Bit[]): DecodeResult {
  const syndrome = PARITY_CHECK_MATRIX.map((row) => row.reduce<Bit>(
    (value, bit, index) => (value ^ (received[index] & bit)) as Bit,
    0,
  ));
  const overall = received.reduce<Bit>((value, bit) => (value ^ bit) as Bit, 0);

  if (syndrome.every((bit) => bit === 0)) {
    const codeword = [...received];
    return {
      syndrome,
      overall,
      status: 'clean',
      correctedIndex: null,
      codeword,
      data: codeword.slice(0, 4),
    };
  }

  if (overall === 1) {
    const correctedIndex = BIT_LABELS.findIndex((_, column) => (
      PARITY_CHECK_MATRIX.every((row, index) => row[column] === syndrome[index])
    ));
    if (correctedIndex !== -1) {
      const codeword = [...received];
      codeword[correctedIndex] = (codeword[correctedIndex] ^ 1) as Bit;
      return {
        syndrome,
        overall,
        status: 'corrected',
        correctedIndex,
        codeword,
        data: codeword.slice(0, 4),
      };
    }
  }

  return {
    syndrome,
    overall,
    status: 'uncorrectable',
    correctedIndex: null,
    codeword: null,
    data: null,
  };
}
