import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  BIT_LABELS,
  GENERATOR_MATRIX,
  PARITY_CHECK_MATRIX,
  decode,
  encode,
  type Bit,
  type DecodeResult,
} from '../src/lib/hamming84.ts';

function bits(value: number, width: number): Bit[] {
  return Array.from({ length: width }, (_, index) => (
    (value >> (width - index - 1)) & 1
  ) as Bit);
}

function parity(values: readonly number[]): Bit {
  return (values.reduce((sum, value) => sum + value, 0) % 2) as Bit;
}

function oracleEncode(data: readonly Bit[]): Bit[] {
  const [d0, d1, d2, d3] = data;
  const p0 = parity([d0, d1, d2]);
  const p1 = parity([d1, d2, d3]);
  const p2 = parity([d0, d1, d3]);
  const q = parity([d0, d1, d2, d3, p0, p1, p2]);
  return [d0, d1, d2, d3, p0, p1, p2, q];
}

function oracleSyndrome(received: readonly Bit[]): Bit[] {
  const [d0, d1, d2, d3, p0, p1, p2, q] = received;
  return [
    parity([d0, d1, d2, p0]),
    parity([d1, d2, d3, p1]),
    parity([d0, d1, d3, p2]),
    parity([d0, d2, d3, q]),
  ];
}

const codebook = Array.from({ length: 16 }, (_, value) => {
  const data = bits(value, 4);
  return { data, codeword: oracleEncode(data) };
});

function distance(left: readonly Bit[], right: readonly Bit[]): number {
  return left.filter((bit, index) => bit !== right[index]).length;
}

function oracleDecode(received: readonly Bit[]): DecodeResult {
  const candidates = codebook.filter(({ codeword }) => distance(codeword, received) <= 1);
  assert.ok(candidates.length <= 1);
  const syndrome = oracleSyndrome(received);
  const overall = parity(received);
  const candidate = candidates[0];
  if (!candidate) {
    return {
      syndrome,
      overall,
      status: 'uncorrectable',
      correctedIndex: null,
      codeword: null,
      data: null,
    };
  }
  const index = candidate.codeword.findIndex((bit, position) => bit !== received[position]);
  return {
    syndrome,
    overall,
    status: index === -1 ? 'clean' : 'corrected',
    correctedIndex: index === -1 ? null : index,
    codeword: [...candidate.codeword],
    data: [...candidate.data],
  };
}

function flip(codeword: readonly Bit[], positions: readonly number[]): Bit[] {
  return codeword.map((bit, index) => positions.includes(index) ? (1 - bit) as Bit : bit);
}

const EXPECTED_MATRICES = {
  7: {
    G: ['1000101', '0100111', '0010110', '0001011'],
    H: ['1110100', '0111010', '1101001'],
  },
  8: {
    G: ['10001011', '01001110', '00101101', '00010111'],
    H: ['11101000', '01110100', '11010010', '10110001'],
  },
} as const;

function extractMatrices(article: string) {
  return [...article.matchAll(/\\bm\{([GH])\}\s*=\s*\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g)]
    .map(([, name, body]) => ({
      name,
      rows: body.trim().split(/\\\\/).filter((row) => row.trim()).map((row) => (
        row.trim().split('&').map((entry) => Number(entry.trim()))
      )),
    }));
}

test('ascending bit order and fixed G/H matrices agree over GF(2)', () => {
  assert.deepEqual(BIT_LABELS, ['d0', 'd1', 'd2', 'd3', 'p0', 'p1', 'p2', 'q']);
  assert.deepEqual(GENERATOR_MATRIX.map((row) => row.join('')), EXPECTED_MATRICES[8].G);
  assert.deepEqual(PARITY_CHECK_MATRIX.map((row) => row.join('')), EXPECTED_MATRICES[8].H);
  for (const generatorRow of GENERATOR_MATRIX) {
    for (const checkRow of PARITY_CHECK_MATRIX) {
      assert.equal(parity(generatorRow.map((bit, index) => bit * checkRow[index])), 0);
    }
  }
  const columns = BIT_LABELS.map((_, index) => PARITY_CHECK_MATRIX.map((row) => row[index]));
  assert.equal(new Set(columns.map((column) => column.join(''))).size, 8);
  for (const column of columns) {
    assert.equal(parity(column), 1);
  }
});

for (const slug of ['fec-introduction', 'fec-introduction-en']) {
  test(`${slug} article's (7,4) and (8,4) G/H matrices match independent definitions and retain identity blocks`, () => {
    const path = new URL(`../src/content/blog/${slug}.mdx`, import.meta.url);
    const matrices = extractMatrices(readFileSync(path, 'utf8'));
    assert.equal(matrices.length, 4, `${path.pathname}: exactly four G/H matrices`);
    for (const width of [7, 8] as const) {
      for (const name of ['G', 'H'] as const) {
        const context = `${path.pathname}: (${width},4) ${name}`;
        const matches = matrices.filter((matrix) => (
          matrix.name === name && matrix.rows.every((row) => row.length === width)
        ));
        assert.equal(matches.length, 1, `${context}: exactly one matrix`);
        const expected = EXPECTED_MATRICES[width][name].map((row) => [...row].map(Number));
        assert.deepEqual(matches[0].rows, expected, context);
        const identity = Array.from({ length: expected.length }, (_, row) => (
          Array.from({ length: expected.length }, (_, column) => row === column ? 1 : 0)
        ));
        assert.deepEqual(matches[0].rows.map((row) => (
          name === 'G' ? row.slice(0, 4) : row.slice(4)
        )), identity, `${context}: ${name === 'G' ? 'left' : 'right'} identity block`);
      }
    }
  });
}

test('ascending-index examples encode 1011, 1010, and 0011', () => {
  for (const [message, encoded] of [
    [0b1011, 0b10110001],
    [0b1010, 0b10100110],
    [0b0011, 0b00111010],
  ]) {
    const data = bits(message, 4);
    const expected = bits(encoded, 8);
    assert.deepEqual(oracleEncode(data), expected);
    assert.deepEqual(encode(data), expected);
    assert.deepEqual(decode(expected).data, data);
  }
});

test('all 16 messages encode using independent parity equations without changing the input', () => {
  const encodedWords = new Set<string>();
  for (const { data, codeword } of codebook) {
    const input = Object.freeze([...data]);
    const encoded = encode(input);
    assert.deepEqual(encoded, codeword, `data ${data.join('')}`);
    assert.deepEqual(encoded.slice(0, 4), data);
    assert.equal(parity(encoded), 0);
    const [d0, , d2, d3] = data;
    assert.equal(encoded[7], parity([d0, d2, d3]));
    assert.deepEqual(input, data);
    assert.notStrictEqual(encoded, input);
    encodedWords.add(encoded.join(''));
  }
  assert.equal(encodedWords.size, 16);
});

test('the independent codebook has minimum distance four and disjoint radius-one balls', () => {
  let minimumDistance = 8;
  for (let first = 0; first < codebook.length; first++) {
    assert.deepEqual(oracleSyndrome(codebook[first].codeword), [0, 0, 0, 0]);
    for (let second = first + 1; second < codebook.length; second++) {
      minimumDistance = Math.min(minimumDistance, distance(codebook[first].codeword, codebook[second].codeword));
    }
  }
  assert.equal(minimumDistance, 4);
  const neighborhoods = new Set<string>();
  for (const { codeword } of codebook) {
    neighborhoods.add(codeword.join(''));
    for (let index = 0; index < 8; index++) {
      neighborhoods.add(flip(codeword, [index]).join(''));
    }
  }
  assert.equal(neighborhoods.size, 16 * 9);
});

test('all 16 unchanged codewords are clean with copied codewords and data', () => {
  for (const { data, codeword } of codebook) {
    const received = Object.freeze([...codeword]);
    const result = decode(received);
    assert.deepEqual(result, {
      syndrome: [0, 0, 0, 0],
      overall: 0,
      status: 'clean',
      correctedIndex: null,
      codeword,
      data,
    });
    assert.notStrictEqual(result.codeword, received);
    assert.notStrictEqual(result.data, result.codeword);
  }
});

test('all 16 times 8 single errors are corrected, including every parity bit and q', () => {
  let checked = 0;
  for (const { data, codeword } of codebook) {
    for (let index = 0; index < 8; index++) {
      const received = Object.freeze(flip(codeword, [index]));
      assert.deepEqual(decode(received), {
        syndrome: oracleSyndrome(received),
        overall: 1,
        status: 'corrected',
        correctedIndex: index,
        codeword,
        data,
      }, `codeword ${codeword.join('')}, flipped ${BIT_LABELS[index]}`);
      checked++;
    }
  }
  assert.equal(checked, 128);
});

test('all 16 times 28 double errors are uncorrectable with no codeword or data, including q pairs', () => {
  let checked = 0;
  let qPairs = 0;
  for (const { codeword } of codebook) {
    for (let first = 0; first < 8; first++) {
      for (let second = first + 1; second < 8; second++) {
        const received = Object.freeze(flip(codeword, [first, second]));
        const syndrome = oracleSyndrome(received);
        assert.ok(syndrome.some((bit) => bit === 1));
        assert.deepEqual(decode(received), {
          syndrome,
          overall: 0,
          status: 'uncorrectable',
          correctedIndex: null,
          codeword: null,
          data: null,
        }, `codeword ${codeword.join('')}, flipped ${BIT_LABELS[first]} and ${BIT_LABELS[second]}`);
        checked++;
        if (second === 7) qPairs++;
      }
    }
  }
  assert.equal(checked, 448);
  assert.equal(qPairs, 112);
});

test('syndrome order is s0, s1, s2, s3; s3 is not overall T and columns are not binary positions', () => {
  const d1Error = decode(bits(0b01000000, 8));
  assert.deepEqual(d1Error.syndrome, [1, 1, 1, 0]);
  assert.equal(d1Error.overall, 1);
  assert.equal(d1Error.status, 'corrected');
  assert.equal(d1Error.correctedIndex, 1);

  const doubleError = decode(bits(0b11000000, 8));
  assert.deepEqual(doubleError.syndrome, [0, 1, 0, 1]);
  assert.equal(doubleError.overall, 0);
  assert.equal(doubleError.status, 'uncorrectable');

  const qError = decode(bits(0b00000001, 8));
  assert.deepEqual(qError.syndrome, [0, 0, 0, 1]);
  assert.equal(qError.overall, 1);
  assert.equal(qError.status, 'corrected');
  assert.equal(qError.correctedIndex, 7);

  const d0Error = decode(bits(0b10000000, 8));
  assert.deepEqual(d0Error.syndrome, [1, 0, 1, 1]);
  assert.equal(d0Error.correctedIndex, 0);
});

test('all 16 times 256 error patterns match the independent distance-at-most-one oracle', () => {
  let checked = 0;
  const counts = { clean: 0, corrected: 0, uncorrectable: 0 };
  for (const { codeword } of codebook) {
    for (let mask = 0; mask < 256; mask++) {
      const error = bits(mask, 8);
      const received = Object.freeze(codeword.map((bit, index) => parity([bit, error[index]])));
      const expected = oracleDecode(received);
      const actual = decode(received);
      const context = `codeword ${codeword.join('')}, errors ${error.join('')}`;
      assert.deepEqual(actual, expected, context);
      assert.equal(actual.overall, parity(actual.syndrome), context);
      assert.equal(actual.overall, parity(error), context);
      counts[actual.status]++;
      checked++;
    }
  }
  assert.equal(checked, 4096);
  assert.deepEqual(counts, { clean: 256, corrected: 2048, uncorrectable: 1792 });
});

test('three errors can be miscorrected to a different codeword by flipping q', () => {
  const original = bits(0b00000000, 8);
  const received = flip(original, [0, 4, 6]);
  assert.equal(distance(received, original), 3);
  assert.deepEqual(received, bits(0b10001010, 8));
  const result = decode(received);
  assert.deepEqual(result, {
    syndrome: [0, 0, 0, 1],
    overall: 1,
    status: 'corrected',
    correctedIndex: 7,
    codeword: bits(0b10001011, 8),
    data: [1, 0, 0, 0],
  });
  assert.notDeepEqual(result.data, [0, 0, 0, 0]);
});

test('four errors can be undetected: clean means no error detected, not known-correct data', () => {
  const original = bits(0b00000000, 8);
  const received = flip(original, [0, 4, 6, 7]);
  assert.equal(distance(received, original), 4);
  assert.deepEqual(received, bits(0b10001011, 8));
  const result = decode(received);
  assert.deepEqual(result, {
    syndrome: [0, 0, 0, 0],
    overall: 0,
    status: 'clean',
    correctedIndex: null,
    codeword: bits(0b10001011, 8),
    data: [1, 0, 0, 0],
  });
  assert.notDeepEqual(result.data, [0, 0, 0, 0]);
});

test('caller mutations cannot affect input, other result fields, or future calls', () => {
  const data = Object.freeze<Bit[]>([1, 0, 0, 0]);
  const encoded = encode(data);
  encoded[0] = 0;
  assert.deepEqual(encode(data), bits(0b10001011, 8));
  assert.deepEqual(data, [1, 0, 0, 0]);

  for (const value of [0b10001011, 0b10001010]) {
    const received = Object.freeze(bits(value, 8));
    const result = decode(received);
    assert.ok(result.codeword !== null && result.data !== null);
    assert.notStrictEqual(result.codeword, received);
    const dataSnapshot = [...result.data];
    result.codeword[0] = (1 - result.codeword[0]) as Bit;
    assert.deepEqual(result.data, dataSnapshot);
    const codewordSnapshot = [...result.codeword];
    result.data[0] = (1 - result.data[0]) as Bit;
    assert.deepEqual(result.codeword, codewordSnapshot);
    result.syndrome[0] = (1 - result.syndrome[0]) as Bit;
    assert.deepEqual(received, bits(value, 8));
    assert.deepEqual(decode(received), oracleDecode(received));
  }
});
