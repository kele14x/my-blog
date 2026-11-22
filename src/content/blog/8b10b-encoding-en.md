---
title: '8b/10b Encoding: DC Balance, Code Tables and State Machines'
description: 'Starting from how UART and SPI stay in sync, see why high-speed serial links need 8b/10b, then understand how it works through DC balance, clock recovery and a worked encoding example.'
pubDate: '2026-11-20'
lang: 'en'
translationKey: '8b10b-encoding'
---

## Starting with UART and SPI

If you have ever used a microcontroller, you have probably printed debug messages over UART or read a sensor over SPI. Splitting a byte into 8 bits and sending them one at a time does not sound complicated. But the receiver still needs to know one more thing: **when should it sample, so that it knows which bit it is currently reading?**

UART and SPI answer that question in different ways:

- **SPI sends a clock alongside the data.** The master tells the receiver when to sample through the `SCK` clock line, and both sides read and write data on the agreed clock edge. Even if a long run of zeros appears on the data line, the clock is still telling the receiver, "here comes the next bit."
- **UART re-aligns once per frame.** It has no clock line travelling with the data; instead, both sides agree in advance on a baud rate and a frame format. Take the common 8N1 format as an example: a frame consists of 1 start bit, 8 data bits and 1 stop bit. The receiver detects the edge of the start bit, then samples the remaining data using its local clock; the stop bit marks the end of the frame. The two clocks only need to stay close enough for the duration of that one frame, and the start bit of the next frame offers another chance to re-time.

Neither of them usually applies block coding like 8b/10b: **the data bits themselves are sent as-is, and timing is handled by a clock line or by the frame structure.** Although UART's 8N1 also spends 10 bits to carry one byte, it does so by adding a start bit and a stop bit around the original data bits, not by replacing the whole byte with a chosen 10-bit codeword.

## Why do high-speed links rewrite the data?

Some high-speed serial links choose not to send a separate clock with the data, and instead let the receiver recover its sampling clock from the transitions in the data levels. An extra clock line not only adds routing, it also creates the problem of clock and data arriving at different times; at high speeds a single bit is very short, and that skew becomes much harder to deal with.

Now suppose we send a long run of `0x00` bytes directly: the data line becomes a long string of zeros with no transitions at all. The receiver's local clock does not stop because of this, but it has lost the cues it uses to correct its sampling instants. **If we can guarantee a level transition every few bits, recovering the clock from the data becomes much easier.**

At the same time, the link may be capacitively or transformer coupled. This kind of connection is not suited to carrying a signal that leans towards one level for a long time: if zeros and ones are badly unbalanced, the receiver's signal baseline can drift and degrade its decisions. So we also want the number of zeros and ones in the coded stream to stay roughly balanced over the long term — that is, **DC balance**.

Note that these are two separate requirements: **enough transitions serves clock recovery, while DC balance serves coupling and signal quality.** Having equal totals of zeros and ones does not guarantee that a long run of zeros never appears; conversely, frequent transitions do not guarantee that the two counts stay balanced. A good line code has to satisfy these constraints at the same time.

## What does 8b/10b do?

The name [8b/10b](https://en.wikipedia.org/wiki/8b/10b_encoding) is quite literal: it turns an 8-bit data byte into a 10-bit symbol, and sends that on the wire. It is not compression or encryption, but a way of "rewriting the data into a form better suited to the line," which makes it a [line code](https://en.wikipedia.org/wiki/Line_code). The receiver applies the same rules to turn those symbols back into the original bytes.

This article covers IBM's classic scheme, published by A. X. Widmer and P. A. Franaszek in their 1983 paper [*A DC-Balanced, Partitioned-Block, 8B/10B Transmission Code*](https://ieeexplore.ieee.org/document/5390392). Rather than picking an arbitrary 10-bit string, it selects a codeword that satisfies the transmission constraints, based on the current byte and the encoding state so far.

Rewriting the data this way buys three main benefits:

- **Clock recovery**: a valid coded stream contains at most 5 consecutive zeros or ones, so the receiver keeps getting cues to correct its sampling instants.
- **DC balance**: the running difference between the number of ones and zeros in the stream is kept within a very small range, suppressing DC and low-frequency components. This helps AC and transformer coupling and reduces baseline drift.
- **Some error detection**: the receiver can spot invalid codewords, as well as certain codewords that do not match the current encoding state. This does not detect all transmission errors, however, and it cannot correct them.

These benefits are not free. Every 8 data bits require 10 bits on the wire, so relative to the payload the bit count increases by `(10 - 8) / 8 = 25%`; considering data encoding alone, the payload accounts for `8 / 10 = 80%` of the bits on the wire. Control characters and other protocol overhead reduce that share further. **The value of 8b/10b is making the data easier to transmit, not achieving the same throughput at a lower line bit rate.**

With the reason for those two extra bits settled, let's look at how the encoder chooses codewords. The full code tables are collapsed by default, and there is no need to memorize them up front; if you would rather see a concrete encoding first, feel free to jump straight to the `0xDEAD` example further down.

## The encoder

An 8-bit byte is written as `HGFEDCBA`, and the resulting 10-bit symbol as `abcdeifghj`, transmitted in the order `a, b, c, d, e, i, f, g, h, j`. Of these:

- the low 5 bits `EDCBA` are encoded into the 6 bits `abcdei`;
- the high 3 bits `HGF` are encoded into the 4 bits `fghj`.

Beyond data bytes, the link also needs to send **control characters** used for synchronization, boundary marking and similar purposes; their exact meaning is defined by the higher-layer protocol. The encoder usually takes a byte plus an `isK` flag: `isK = 0` means ordinary data, `isK = 1` means a control character. This flag only tells the encoder how to interpret the input; it is not a ninth payload bit that can carry arbitrary information.

Data characters are written as `D.x.y`, where `x` ranges over `0–31` and `y` over `0–7`, giving 256 possibilities. Control characters are written as `K.x.y`, and only 12 of them are defined; the full list appears in a collapsed table below. When `isK = 1`, the input must be one of these valid control characters — an arbitrary byte cannot be treated as a control character.

The encoding result depends not only on the current input but also on what came before. The encoder maintains two states: `RD = -1` and `RD = +1`. RD stands for running disparity; it is a historical imbalance state with an initial convention, and it decides which codeword the next sub-block should use, rather than being computed naively as `number of ones - number of zeros` from an empty stream. For example, before any data has been sent the actual count difference is 0, but the initial RD adopted here is `-1`.

Below is the overall flow of the encoder. The code is only pseudocode, and loop ranges are inclusive:

```text
rd = -1
for i = 0 to length(instream) - 1
    input = instream[i]
    [sym, rd] = encode_8b10b(input.data, input.isK, rd)
    outstream[i] = sym
end
```

A single 8b/10b encoding can be split into two steps. Bit slices below are also inclusive; `data[4:0]` means `EDCBA`, `data[7:5]` means `HGF`, and `concat` joins them in transmission order:

```text
function encode_8b10b(data, isK, rd)
    [six_bits, rd] = encode_5b6b(data[4:0], isK, rd)
    [four_bits, rd] = encode_3b4b(data[4:0], data[7:5], isK, rd)
    sym = concat(six_bits, four_bits)
    return [sym, rd]
end
```

Note that **the 3b/4b encoding uses the RD updated by the 5b/6b encoding**, and that it depends not only on the high 3 bits but also on the low 5 bits.

### Which scheme do these tables apply to?

The tables below use the **classic 8b/10b scheme proposed by IBM's Widmer and Franaszek in 1983**.

Later specialized schemes or variants may adopt different codeword mappings for their own design goals, and are not necessarily compatible with the IBM scheme used here. Two things need to be kept apart:

- **Different implementations**: an encoder built from a ROM lookup table, from combinational logic, or as a pipeline can all emit the same set of codewords. Different circuitry or code does not mean a different code table.
- **Different on-wire mappings**: if a system really does use another code table, you must encode and decode according to that system's own protocol documentation, and cannot simply apply the tables here.

**Within a single standardized protocol, both the transmitter and the receiver must follow the mappings, control characters and RD rules that the protocol specifies; neither side may swap tables unilaterally.** Otherwise the receiver may decode a different byte, or may flag the received codeword as an error.

All bit strings in the tables are written in transmission order; where the two RD states share a codeword, both columns repeat it. The tables are there for reference — you do not need to memorize them to follow the example below.

### 5b/6b encoding table

In this table, RD refers to the state *before* the 6-bit sub-block is encoded, that is, the entry state of the whole 10-bit symbol.

<details>
<summary>Show the full 5b/6b encoding table</summary>

<div style="overflow-x: auto;">

| Symbol | EDCBA | abcdei at RD = -1 | abcdei at RD = +1 |
| --- | --- | --- | --- |
| D.0.y | `00000` | `100111` | `011000` |
| D.1.y | `00001` | `011101` | `100010` |
| D.2.y | `00010` | `101101` | `010010` |
| D.3.y | `00011` | `110001` | `110001` |
| D.4.y | `00100` | `110101` | `001010` |
| D.5.y | `00101` | `101001` | `101001` |
| D.6.y | `00110` | `011001` | `011001` |
| D.7.y | `00111` | `111000` | `000111` |
| D.8.y | `01000` | `111001` | `000110` |
| D.9.y | `01001` | `100101` | `100101` |
| D.10.y | `01010` | `010101` | `010101` |
| D.11.y | `01011` | `110100` | `110100` |
| D.12.y | `01100` | `001101` | `001101` |
| D.13.y | `01101` | `101100` | `101100` |
| D.14.y | `01110` | `011100` | `011100` |
| D.15.y | `01111` | `010111` | `101000` |
| D.16.y | `10000` | `011011` | `100100` |
| D.17.y | `10001` | `100011` | `100011` |
| D.18.y | `10010` | `010011` | `010011` |
| D.19.y | `10011` | `110010` | `110010` |
| D.20.y | `10100` | `001011` | `001011` |
| D.21.y | `10101` | `101010` | `101010` |
| D.22.y | `10110` | `011010` | `011010` |
| D.23.y | `10111` | `111010` | `000101` |
| D.24.y | `11000` | `110011` | `001100` |
| D.25.y | `11001` | `100110` | `100110` |
| D.26.y | `11010` | `010110` | `010110` |
| D.27.y | `11011` | `110110` | `001001` |
| D.28.y | `11100` | `001110` | `001110` |
| D.29.y | `11101` | `101110` | `010001` |
| D.30.y | `11110` | `011110` | `100001` |
| D.31.y | `11111` | `101011` | `010100` |
| K.28.y | `11100` | `001111` | `110000` |

</div>

</details>

The 6b mappings of `D.23.y`, `D.27.y`, `D.29.y` and `D.30.y` are also used by `K.23.7`, `K.27.7`, `K.29.7` and `K.30.7` respectively. This is only a sharing of the mapping for those low 5 bits; it does not make other `K.x.y` combinations valid.

If we call `number of ones - number of zeros` within a sub-block the disparity of that sub-block, the encoding results fall into three kinds: `+2`, `-2` and `0`.

### 3b/4b encoding table

In this table, RD refers to the state **after the 6b sub-block has been encoded and before the 4b sub-block is encoded**.

<details>
<summary>Show the full 3b/4b encoding table</summary>

<div style="overflow-x: auto;">

| Symbol | HGF | fghj at RD = -1 | fghj at RD = +1 |
| --- | --- | --- | --- |
| D.x.0 | `000` | `1011` | `0100` |
| D.x.1 | `001` | `1001` | `1001` |
| D.x.2 | `010` | `0101` | `0101` |
| D.x.3 | `011` | `1100` | `0011` |
| D.x.4 | `100` | `1101` | `0010` |
| D.x.5 | `101` | `1010` | `1010` |
| D.x.6 | `110` | `0110` | `0110` |
| D.x.P7 | `111` | `1110` | `0001` |
| D.x.A7 | `111` | `0111` | `1000` |
| K.x.0 | `000` | `1011` | `0100` |
| K.x.1 | `001` | `0110` | `1001` |
| K.x.2 | `010` | `1010` | `0101` |
| K.x.3 | `011` | `1100` | `0011` |
| K.x.4 | `100` | `1101` | `0010` |
| K.x.5 | `101` | `0101` | `1010` |
| K.x.6 | `110` | `1001` | `0110` |
| K.x.7 | `111` | `0111` | `1000` |

</div>

</details>

For a data character `D.x.7` there is a primary encoding `D.x.P7` and an alternate encoding `D.x.A7`. The alternate encoding exists to satisfy the run-length and synchronization constraints after the sub-blocks are concatenated, and it cannot be chosen freely. A7 is used in only the following two cases; all other data `.7` characters use P7:

- the 4b sub-block entry has `RD = -1`, and `x` is `17, 18 or 20`;
- the 4b sub-block entry has `RD = +1`, and `x` is `11, 13 or 14`.

The 6b sub-blocks for these values of `x` are all balanced encodings, so under the conditions above the entry RD of the 4b sub-block happens to equal the entry RD of the whole symbol. Control characters `.7` use the `K.x.7` row in the table. The disparity of the 3b/4b output likewise falls into `+2`, `-2` and `0`.

### Control symbols

Below is the complete encoding of all 12 control characters. **Here RD refers to the state before the whole 10-bit symbol is encoded** — do not confuse it with the entry RD of the 3b/4b table above.

<details>
<summary>Show the encoding of all 12 control characters</summary>

<div style="overflow-x: auto;">

| Symbol | Decimal | Hex | HGF EDCBA | abcdei fghj at RD = -1 | abcdei fghj at RD = +1 |
| --- | --- | --- | --- | --- | --- |
| K.28.0 | 28 | `1C` | `000 11100` | `001111 0100` | `110000 1011` |
| K.28.1 | 60 | `3C` | `001 11100` | `001111 1001` | `110000 0110` |
| K.28.2 | 92 | `5C` | `010 11100` | `001111 0101` | `110000 1010` |
| K.28.3 | 124 | `7C` | `011 11100` | `001111 0011` | `110000 1100` |
| K.28.4 | 156 | `9C` | `100 11100` | `001111 0010` | `110000 1101` |
| K.28.5 | 188 | `BC` | `101 11100` | `001111 1010` | `110000 0101` |
| K.28.6 | 220 | `DC` | `110 11100` | `001111 0110` | `110000 1001` |
| K.28.7 | 252 | `FC` | `111 11100` | `001111 1000` | `110000 0111` |
| K.23.7 | 247 | `F7` | `111 10111` | `111010 1000` | `000101 0111` |
| K.27.7 | 251 | `FB` | `111 11011` | `110110 1000` | `001001 0111` |
| K.29.7 | 253 | `FD` | `111 11101` | `101110 1000` | `010001 0111` |
| K.30.7 | 254 | `FE` | `111 11110` | `011110 1000` | `100001 0111` |

</div>

</details>

### Encoder state machine

The encoder updates RD at the boundary of each 6b or 4b sub-block. This article starts from `RD = -1`, and the update rules are:

- if the sub-block disparity is `+2`, RD becomes `+1`;
- if the sub-block disparity is `-2`, RD becomes `-1`;
- if the sub-block disparity is `0`, RD is unchanged.

When the entry is `RD = -1`, only sub-blocks with disparity `+2` or `0` are emitted; when the entry is `RD = +1`, only sub-blocks with disparity `-2` or `0` are emitted. This choice bounds the accumulated disparity, and it is why the coded stream can stay DC balanced over the long term.

More strictly, for a valid coded stream measured between two complete 10-bit symbol boundaries, the absolute value of the accumulated difference between ones and zeros does not exceed 2; this does not mean every arbitrarily chosen bit window satisfies that bound. The earlier statement that the counts stay roughly balanced over the long term is achieved under exactly these encoding constraints.

That said, **a balanced sub-block does not mean its codeword is independent of RD.** For instance, `111000` and `000111` for the data sub-block `D.7.y`, and `1100` and `0011` for `D.x.3`, must both be chosen according to the entry RD. Neither example changes RD, yet both still take part in the run-length constraints. Control sub-blocks also have RD-dependent balanced forms, such as `K.x.1`, so it is wrong to assume that every balanced encoding has only one possible output.

### A worked example

Take `0xDEAD` as an example, sent explicitly as the byte sequence `0xDE` then `0xAD`, both data characters. That is the order chosen for this example; it does not mean every protocol uses this byte order for multi-byte integers.

- `0xDE = 11011110`, which corresponds to `D.30.6`;
- `0xAD = 10101101`, which corresponds to `D.13.5`.

Starting from the initial `RD = -1` and looking up the tables step by step:

<div style="overflow-x: auto;">

| Step | Input sub-block | Output | RD change |
| --- | --- | --- | --- |
| 1 | D.30.y of DE | `011110` | `-1 → +1` |
| 2 | D.x.6 of DE | `0110` | `+1 → +1` |
| 3 | D.13.y of AD | `101100` | `+1 → +1` |
| 4 | D.x.5 of AD | `1010` | `+1 → +1` |

</div>

The final result is:

```text
011110 0110 101100 1010
```

Sent from left to right; the spaces only separate the sub-blocks, and what actually goes on the wire is two consecutive 10-bit symbols.

## The decoder

Given the boundaries of the 10-bit symbols, the decoder can recover the byte and the data/control flag by reverse lookup of the complete codeword. You cannot take any two individually valid 6b and 4b sub-blocks, concatenate them, and assume they form a valid 10b symbol.

### Locating symbols

`K.28.1`, `K.28.5` and `K.28.7` contain the "comma" patterns used for synchronization, and can help locate 10-bit symbol boundaries. Which control character to use, when to send it, and whether to send it periodically, are all decided by the higher-layer protocol — they are not interchangeable synchronization symbols.

`K.28.7` deserves particular care: concatenated with certain adjacent codewords it can form a misaligned false comma, so it needs extra synchronization handling. You cannot re-align unconditionally on a short comma pattern alone, nor send several `K.28.7` in a row. When implementing this, follow the control character and synchronization rules of the protocol you are using.

### Decoder state machine

If you only care about recovering bytes from complete, valid codewords, the decoder need not keep any RD history. But to check whether a codeword obeys the current running disparity rules, it must maintain and update RD.

Invalid-codeword checks and RD checks are therefore two complementary error-detection mechanisms. Some transmission errors can still turn a valid codeword into a different valid codeword that matches the current RD, so passing these checks does not prove the data is correct.

## A real application: CPRI

8b/10b is not just a code table in a textbook. A typical application is CPRI (Common Public Radio Interface): inside a base station it connects the baseband processing unit to the radio unit, carrying I/Q samples along with control and synchronization information.

Different CPRI rate options use different line codes. Taking CPRI Specification V7.0 as an example, here are a few options:

<div style="overflow-x: auto;">

| CPRI line rate option | Line bit rate (Gbit/s) | Line coding |
| --- | --- | --- |
| 1 | 0.6144 | 8b/10b |
| 3 | 2.4576 | 8b/10b |
| 7 | 9.8304 | 8b/10b |
| 8 | 10.1376 | 64b/66b |
| 10 | 24.33024 | 64b/66b |

</div>

Take option 7: the line carries 9.8304 Gbit per second, and once the 8b/10b overhead is removed this corresponds to a pre-encoding information stream of 7.86432 Gbit/s. Besides I/Q samples, that stream also includes CPRI's control and synchronization content.

### From 8b/10b to 64b/66b

At higher throughputs the overhead of 8b/10b starts to look expensive. For every unit of useful data, a quarter again as many bits have to go on the wire.

64b/66b encodes 64 bits into 66, so the overhead is far smaller. Compared on the same basis:

- **8b/10b**: 2 extra bits for every 8, an overhead of `2 / 8 = 25%`.
- **64b/66b**: 2 extra bits for every 64, an overhead of `2 / 64 = 3.125%`.

In other words, to carry the same 64 bits of data, 8b/10b sends 80 bits while 64b/66b sends only 66. CPRI options 8 and 10 in the table above use 64b/66b, leaving more of the line bandwidth for the pre-encoding information stream.

64b/66b organizes transmission with a short sync header plus scrambling, and no longer uses this byte-by-byte 8b/10b code table. The goal of the encoding has not changed: it is still about making the received bit stream easier for the receiver to handle. It is just that on high-speed links, bandwidth efficiency has become more important.

## Summary

IBM 8b/10b trades a 25% increase in line bits relative to the payload for DC balance, bounded run lengths and control characters, which in turn make AC coupling, clock recovery and symbol alignment easier. When reasoning about the encoder, the key is to distinguish the entry RD of the whole symbol from the entry RD of each of the two sub-blocks, and to follow the A7 selection rules; when reasoning about the decoder, the key is to distinguish codeword recovery, symbol synchronization and running disparity checks.

It can detect some encoding errors, but it is not an error-correcting code. Reliability on a real link still requires the higher-layer protocol to add checksums, error correction or retransmission.

## References

- A. X. Widmer and P. A. Franaszek: [A DC-Balanced, Partitioned-Block, 8B/10B Transmission Code](https://ieeexplore.ieee.org/document/5390392), *IBM Journal of Research and Development*, 27(5), 440–451, 1983. DOI: `10.1147/rd.275.0440`.
- Wikipedia: [8b/10b encoding](https://en.wikipedia.org/wiki/8b/10b_encoding), used to verify the codeword mappings and running disparity notes in this article.
- Wikipedia: [Line code](https://en.wikipedia.org/wiki/Line_code), background on line coding, DC components and clock recovery.
- IBM: [8B/10B presentation submitted to the IEEE 802.3 working group](https://grouper.ieee.org/groups/802/3/z/public/presentations/mar1996/JTtgep.txt), on the codewords, control characters and RD rules of the classic scheme.
- [CPRI Specification V7.0](https://www.cpri.info/downloads/CPRI_v_7_0_2015-10-09.pdf), 9 October 2015, section 4.2.1, on the line rate options and their corresponding coding schemes.
