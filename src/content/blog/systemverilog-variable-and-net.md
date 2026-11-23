---
title: 'SystemVerilog 中的 variable 与 net'
description: 'SystemVerilog 如何把「数据对象」与「数据类型」分开，以及掌握隐含规则后如何读懂 wire a 和 reg b。'
pubDate: '2026-11-23'
lang: 'zh-Hans'
translationKey: 'systemverilog-variable-and-net'
---

## Verilog

上大学的时候，数字电路设计课老师教我在 Verilog 代码里怎么用 `wire` 和 `reg`。但是不知道是老师没说清楚还是我太菜，很长一段时间里我都以为 `wire` 表示组合逻辑，而 `reg` 表示时序逻辑，也就是硬件里的寄存器。**几年之后我才知道，这实际是新手常见的一个错误。**

后来我仔细读了 [Verilog HDL LRM](https://ieeexplore.ieee.org/document/1620780)，手册里其实还是说得比较清楚：它定义了很多数据类型，并把它们分成两大类：**net** 和 **variable**。在实际设计中，`wire` 是最常用的 *net* 类型，`reg` 是最常用的 *variable* 类型。LRM 区分二者的标准是**能否保存一个值**：*variable* 可以，*net* 不可以。所以 net 的值必须依赖于驱动它的东西。

这也正好解释了为什么 net 可以有多驱动。net 自己不保存值——它的值是由所有连在它上面的东西共同决议出来的，就像一根真实的导线那样。两个驱动同时往一根导线上推不同的电平，是物理上真实存在、也需要能被表达出来的情况：

```system-verilog
wire w;
assign w = a;
assign w = b;
```

这在语言层面是合法的。**具体怎么决议，取决于 net 的类型**——对默认的 `wire` 来说，仿真器会按下表算出 `w` 的值（每行是 `a` 取不同的值，每列是 `b` 取不同的值）：

| `a` \ `b` | `0` | `1` | `x` | `z` |
| --------- | --- | --- | --- | --- |
| **`0`**   | `0` | `x` | `x` | `0` |
| **`1`**   | `x` | `1` | `x` | `1` |
| **`x`**   | `x` | `x` | `x` | `x` |
| **`z`**   | `0` | `1` | `x` | `z` |

要注意的是：**「语言允许」不等于「应该这么写」。** 绝大多数设计里多驱动是意外而非本意，一根被同时驱动的导线通常意味着两处逻辑打架。因为它是 net 的正常语义，仿真器和 lint 工具很可能不会拦你；综合工具在处理这类冲突时，可能直接报错，也可能只是给出一个容易被忽略的 warning。而且默认 `wire` 冲突时只会决议成 `x`，对真实逻辑没有意义；真正需要多驱动的场景（线与、线或）应当显式使用 `wand`、`wor` 这类有明确决议规则的 net 类型，它们给出的是确定的 `0`/`1` 而不是 `x`。

而 variable 本身就是那个被保存的值，所以只能有一个写入者。在 Verilog 里，`reg`（variable）根本不能用 `assign` 来赋值。那么如果两个 `always` 块都去写同一个 `reg` 呢？这在语法上是合法的，但它并不像 net 那样「决议」出一个值——两个过程块谁后执行谁生效，结果是**竞争（race）**，仿真值取决于执行顺序而非一个确定的规则：

```system-verilog
reg r;
always @(*) if (e) r = a;
always @(*) if (e) r = b;
```

两个过程块写同一个 reg，仿真上通常最后写入者生效。但是这一听都不靠谱，所以上面的代码很多 lint /综合工具可能会报 error。总之 variable 不能很轻易写出多驱动。这个特性很有用，我们在最后的建议里还会再回到它。

这样看来，把 `wire` 对应到组合逻辑、把 `reg` 对应到硬件里真实的寄存器，似乎很自然。`wire` 确实建模的是一个连接，在设计的电路里就是组合逻辑。但这对于 `reg` 并不成立，**取决于你怎么写代码，一个 `reg` 可以是组合逻辑、可以是寄存器，甚至可以是锁存器（latch）。**

```system-verilog
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

三个都声明成 `reg`，但只有第二个才是真正的寄存器。第三个要特别小心：它在语言上是合法的，通常也能综合、能在硬件里实现出来。但**大部分 lint 和综合工具都会给出 warning**——缺少 `else` 意味着 `en` 为低时值必须被保持住，而「保持住一个值」正是锁存器干的事。绝大多数时候写出 latch 并不是设计者的本意，而是漏写了 `else` 的笔误，所以工具可能会提醒你 `LATCH: Latch inferred for signal 'q_latch' (not all control paths of combinational always assign a value)`。

这么看来 Verilog LRM 犯的最大的错误就是 `reg` 这个名字起得太糟糕，因为它很容易让人联想到硬件里的寄存器。

## SystemVerilog

到了 SystemVerilog，标准似乎想解决这个问题。于是 [SV-LRM](https://ieeexplore.ieee.org/document/8299595) 决定把 **数据对象（data object）** 和 **数据类型（data type）** 区分开来：

> **数据对象（data object）**：一个有名字、并且关联着一个数据值的实体。数据对象的例子包括 net、variable 和 parameter。

> **数据类型（data type）**：字面意义上决定这个数的如何取值，以及这个数可以执行什么运算。数据类型的例子包括 `logic`、`real` 和 `string`。

### Nets

声明一个 net，使用的（简化）语法是：

```system-verilog
<net_type> <data_type> <net_identifier>;
```

`wire` 就是内建的 net 类型之一。例如：

```system-verilog
wire logic w;
```

SystemVerilog 有很多内建数据类型，其中最常用的是 `logic`。上面这行代码声明了一个名为 `w` 的数据对象，它是一个 *net*，net 类型为 `wire`，数据类型为 `logic`。

### Variables

声明一个 variable，使用的（简化）语法是：

```system-verilog
var <data_type> <variable_identifier>;
```

这里多了一个新关键字 `var`，用来显式声明 variable。例如：

```system-verilog
var logic v; // same as var reg v;
```

它声明了一个名为 `v` 的数据对象，是一个数据类型为 `logic` 的 *variable*。注意并不存在「variable 类型」这种东西——variable 只由它的数据类型来刻画。

和 Verilog 一样，*variable* 可以是组合逻辑、寄存器，甚至锁存器。

那 `reg` 呢？事实上 **`reg` 和 `logic` 是同一个数据类型**，`reg` 只是为了向后兼容 Verilog 而保留下来的。新设计里不推荐使用它，因为这个名字实在太容易误导人。

### 隐含规则

到目前为止一切都很直接：看到 `wire` 就知道是 net，看到 `var` 就知道是 variable，它们都带有 `logic`、`reg` 这样的数据类型。*net* 与 *variable* 的本质区别是——**net 不保存值，variable 保存值**。

但当你在一个 SystemVerilog 文件里仍然看到 `wire a` 和 `reg b` 时，事情就开始让人困惑了。这种情况很常见，因为很多设计者是从 Verilog 过来的，而在 SystemVerilog 里 `var` 和 `logic` 都可以省略。

那么在 SystemVerilog 里，`wire a` 和 `reg b` 到底是什么？按 LRM，`wire a` 是一个数据类型隐含为 `logic` 的 net 声明，所以 `wire a` 等价于 `wire logic a`。

而 `reg b` 就没这么简单了，因为它的默认含义取决于**它被声明在哪里**：

- **在 module 内部**，`reg b` 是一个 variable，等价于 `var logic b`。
- **在端口声明中**，默认的 port kind 取决于方向。对于 `input` 和 `inout` 端口，省略 port kind 时默认为 **net**，因此 `input reg b` 等价于 `input wire logic b`；而对于 `output` 端口，省略 port kind 时默认为 **variable**，因此 `output reg b` 等价于 `output var logic b`。

这个「与方向相关」的规则是个常见的坑：同样写 `reg b`，在输入端口上是 net，在输出端口上却是 variable。

### 例子

下面这个例子把上面几种情况汇总在一起：

```system-verilog
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

被注释掉的 `wire reg` 之所以非法，纯粹是词法层面的原因：LRM 规定 net 类型关键字后面不能直接跟 `reg`。这样规定一方面是为了避免和 `trireg` 这类 net 类型混淆，另一方面也是在推动大家使用 `logic`。这和编码风格偏好无关。

### 建议

我的建议是：

1. **声明端口时，如果你想要 variable，就显式写出 `var`。** 这样端口就是一个 variable，而 variable 不允许多驱动，工具会直接帮你把多驱动的问题暴露出来。
2. **默认使用 `logic`。** 在 module 内部它会给你一个 variable，于是意外的第二个驱动会直接报错，而不是被悄悄消解掉。
3. **不要使用 `reg`。** 名字很糟糕，而且已经被 `logic` 取代了。
4. **如果确实需要 net，就使用 `wire`。**
5. **在所有源文件里把 `default_nettype` 设为 `none`。** 这会强制你在需要 net 时显式写出 `wire`，同时也能防止一个拼写错误悄悄创建出新的隐式 net。（不加这条指令的话，综合工具通常只会给一条很容易忽略的 warning。）
