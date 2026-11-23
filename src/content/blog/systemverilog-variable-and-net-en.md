---
title: 'SystemVerilog Variables and Nets'
description: 'How SystemVerilog separates a data object from a data type, and how to read wire a and reg b once you know the implicit rules.'
pubDate: '2026-11-23'
lang: 'en'
translationKey: 'systemverilog-variable-and-net'
---

## Verilog

Back in college, my digital circuit design teacher showed me how to use `wire` and `reg` in Verilog code. I am still not sure whether he did not explain it clearly or I was just too slow, but for a long time I believed that `wire` models combinational logic while `reg` models sequential logic — that is, a register in hardware. **It took me a few years to learn that this is actually a common beginner's mistake.**

I later read the [Verilog HDL LRM](https://ieeexplore.ieee.org/document/1620780) carefully, and it actually explains this fairly well: it defines many data types and groups them into two main categories, **net** and **variable**. In real designs, `wire` is the most commonly used *net* type, and `reg` is the most commonly used *variable* type. The LRM distinguishes the two by **whether they can store a value**: a *variable* can, a *net* cannot. The value of a net therefore always depends on whatever drives it.

This is also exactly why a net can have multiple drivers. A net does not hold a value of its own — it is resolved from everything connected to it, the way a physical wire is. Two drivers pushing different levels onto the same wire is a real, expressible situation:

```verilog
wire w;
assign w = a;
assign w = b;
```

This is legal at the language level. **How it resolves depends on the net type** — for the default `wire`, the simulator computes `w` according to the table below (each row is a different value of `a`, each column a different value of `b`):

| `a` \ `b` | `0` | `1` | `x` | `z` |
| --------- | --- | --- | --- | --- |
| **`0`**   | `0` | `x` | `x` | `0` |
| **`1`**   | `x` | `1` | `x` | `1` |
| **`x`**   | `x` | `x` | `x` | `x` |
| **`z`**   | `0` | `1` | `x` | `z` |

Note that **"the language allows it" is not the same as "you should write it."** In most designs, multiple drivers are accidental rather than intended — a wire driven from two places usually means two pieces of logic fighting each other. Because it is a net's normal semantics, simulators and lint tools most likely will not stop you; but a synthesis tool handling such a conflict may reject it outright, or may only emit an easy-to-miss warning. And a default `wire` in conflict only resolves to `x`, which is meaningless for real logic; when you genuinely want multiple drivers (wired-AND, wired-OR), declare an explicit net type with a defined resolution rule such as `wand` or `wor`, which yield a definite `0`/`1` instead of `x`.

A variable, on the other hand, *is* the stored value, so it can only have one writer. In Verilog, a `reg` (a variable) simply cannot be assigned with `assign` at all. So what if two `always` blocks both write the same `reg`? That is legal syntactically, but unlike a net it does not "resolve" to a value — whichever block runs last wins, so the result is a **race**, and the simulated value depends on execution order rather than a definite rule:

```verilog
reg r;
always @(*) if (e) r = a;   // two procedural blocks write the same reg
always @(*) if (e) r = b;   // => a race, the last writer wins
```

When two procedural blocks write the same `reg`, the last writer usually wins in simulation. But this is obviously unreliable, so many lint and synthesis tools may report an error on the code above. In short, a variable cannot easily be written with multiple drivers. This property is very useful, and we will come back to it in the recommendations at the end.

It seems natural, then, to map `wire` onto combinational logic and `reg` onto real registers in hardware. A `wire` does model a connection, which in the circuit you design is combinational logic. But this does not hold for `reg`: **depending on how you write the code, a `reg` can become combinational logic, a register, or even a latch.**

```verilog
output reg q_comb, q_ff, q_latch;

// 1. assigned on any input change => combinational logic
always @(*) q_comb = a & b;

// 2. assigned on a clock edge => a real register
always @(posedge clk) q_ff <= en ? a : b;

// 3. level-sensitive, and the 'if' has no 'else' => a latch
always @(*) begin
    if (en) q_latch = a;
end
```

All three are declared as `reg`, yet only the second one is a register. The third one deserves special care: it is legal at the language level, it usually synthesizes and can be realized in hardware. But **most lint and synthesis tools will emit a warning** — a missing `else` means the value must be held when `en` is low, and holding a value is precisely what a latch does. In the vast majority of cases a latch is not what the designer intended but a slip of the pen — a forgotten `else` — so a tool may warn you with `LATCH: Latch inferred for signal 'q_latch' (not all control paths of combinational always assign a value)`.

So it seems the biggest mistake the Verilog LRM made was the name `reg` itself, because it is far too easy to associate with a register in hardware.

## SystemVerilog

SystemVerilog tries to fix this. The [SV-LRM](https://ieeexplore.ieee.org/document/8299595) decided to separate the **data object** from the **data type**:

> **data object:** A named entity that has a data value associated with it. Examples of data objects are nets, variables, and parameters.

> **data type:** Roughly speaking, which values something can take, and which operations can be performed on it. Examples of data types are `logic`, `real`, and `string`.

### Nets

To declare a net, you use the (simplified) syntax:

```verilog
<net_type> <data_type> <net_identifier>;
```

`wire` is one of the built-in net types. For example:

```verilog
wire logic w;
```

SystemVerilog has many built-in data types, and the most used is `logic`. The code above declares a data object named `w`: a *net* with net type `wire` and data type `logic`.

### Variables

To declare a variable, you use the (simplified) syntax:

```verilog
var <data_type> <variable_identifier>;
```

The new keyword `var` explicitly declares a variable. For example:

```verilog
var logic v; // same as var reg v;
```

This declares a data object named `v`: a *variable* with data type `logic`. There is no such thing as a "variable type" — a variable is characterized only by its data type.

As in Verilog, a *variable* can become combinational logic, a register, or a latch, depending on the code around it.

What about `reg`? In fact, `reg` and `logic` are the same data type. `reg` is still there only for backward compatibility with Verilog. It is not recommended for new designs, because the name is confusing.

### Implicit rules

So far things are straightforward: if you see `wire`, it is a net; if you see `var`, it is a variable; and both carry a data type such as `logic` or `reg`. The essential difference is that a *net* does not store a value, while a *variable* does.

But it gets confusing when you still see `wire a` and `reg b` in a SystemVerilog file. This is common because many designers come from Verilog, where `var` and `logic` can be omitted for compatibility.

So what are `wire a` and `reg b` in SystemVerilog? Per the LRM, `wire a` is a net declaration with an implicit data type of `logic`, so `wire a` is equivalent to `wire logic a`.

For `reg b` it is not that simple, because the default depends on *where* it is declared:

- **Inside a module body**, `reg b` is a variable, equivalent to `var logic b`.
- **In a port declaration**, the default kind depends on the direction. For `input` and `inout` ports, an omitted port kind defaults to a **net**, so `input reg b` is equivalent to `input wire logic b`. For `output` ports, an omitted port kind defaults to a **variable**, so `output reg b` is equivalent to `output var logic b`.

This direction-dependence is a common trap: the same `reg b` is a net on an input but a variable on an output.

### Example

Here is a simple example that collects the cases above:

```verilog
module variables_and_nets(only_input);
    input only_input;        // a net input port
    wire only_wire;
    wire logic wire_logic;
    // wire reg wire_reg;    // illegal: a net type keyword cannot be followed by 'reg'
    var only_var;            // a variable
    reg only_reg;            // same as 'var logic only_reg'
    logic only_logic;        // same as 'var logic only_logic'
    var reg var_reg;
    var logic var_logic;
endmodule
```

The commented-out `wire reg` is rejected for a purely lexical reason: the LRM forbids a net type keyword from being followed directly by `reg`, both to avoid confusing it with net types such as `trireg` and to push designers toward `logic`. It is not about style preference.

### Recommendations

My recommendations:

1. **For port declarations, write `var` explicitly when you intend a variable.** This makes the port a variable, and since a variable cannot be multiply driven, tools will flag multi-drive problems for you.
2. **Use `logic` as your default data type.** Inside a module body it gives you a variable, so an accidental second driver is caught as an error rather than silently resolved.
3. **Do not use `reg`.** It is a poor name and has been superseded by `logic`.
4. **If you really want a net, use `wire`.**
5. **Set `default_nettype` to `none` in every source file.** This forces you to write `wire` explicitly when you want a net, and it prevents a typo from silently creating a new implicit net. (Without the directive, a synthesis tool usually only emits an easy-to-miss warning.)
