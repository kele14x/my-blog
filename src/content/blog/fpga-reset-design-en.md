---
title: 'FPGA and ASIC Reset Design: Asynchronous vs Synchronous'
description: 'Compare reset design in FPGAs and ASICs, from synchronization and recovery/removal timing to FPGA resources, standard-cell area, and implementation trade-offs.'
pubDate: '2026-11-23'
lang: 'en'
translationKey: 'fpga-reset-design'
---

Should an FPGA or ASIC design use synchronous or asynchronous reset? For FPGAs, it is tempting to answer with a vendor name: Xilinx recommends synchronous reset, while Altera recommends asynchronous reset. For ASICs, another common argument is that an asynchronous-reset register needs fewer transistors than a synchronous-reset implementation.

These shortcuts can reflect particular implementations, but neither is a universal rule. An FPGA maps logic onto a fixed fabric; a standard-cell ASIC maps it into a chosen cell library. The important questions are: **which hardware resources or cells are available, what does the complete implementation cost, and which part of the reset path are we talking about?**

Before choosing a reset strategy, separate three questions:

1. Does the destination register have a synchronous or asynchronous reset input?
2. Does the reset signal arrive synchronously or asynchronously relative to that register's clock?
3. How should the design enter reset and resume operation?

These questions are related, but they are not interchangeable.

In this article, “assertion” means driving the reset signal to its active level, and “release” means returning it to its inactive level. Assertion does not necessarily mean driving the signal high: an active-high reset asserts high, while an active-low reset asserts low. The `PRE` pins in the diagrams are still called “preset” inputs, meaning they set the register output to `1`.

## Synchronous-reset and asynchronous-reset registers

Let's start with the first question: “Does the destination register have a synchronous or asynchronous reset input?” Consider a register with an active-high asynchronous reset:

```verilog
always @(posedge clk or posedge arst) begin
    if (arst) begin
        data <= 1'b0;
    end else if (cen) begin
        data <= din;
    end
end
```

Asserting `arst` clears `data` without waiting for a clock edge. This normally maps to a register with an asynchronous clear input, subject to the FPGA's available primitives or the ASIC's standard-cell library. Releasing `arst` does not itself load `din`; normal data capture resumes on subsequent clock edges.

A synchronous reset looks slightly different:

```verilog
always @(posedge clk) begin
    if (rst) begin
        data <= 1'b0;
    end else if (cen) begin
        data <= din;
    end
end
```

Here, `rst` is sampled only on the rising edge of `clk`. It has priority over the clock enable, but **it cannot reset the register while the clock is stopped**. It must also satisfy setup and hold requirements at the receiving register. Depending on the target architecture and cell library, synthesis may implement it using a dedicated synchronous control input or logic on the data path. This reveals the first advantage of synchronous reset: because its behavior is synchronous, synthesis may implement the reset function through the data path to achieve certain optimization goals.

Notice that simply changing the first coding style to the second does not automatically synchronize the reset signal. If you feed an unsynchronized external reset directly into the second example, you are introducing an asynchronous input into a synchronous circuit.

## Asynchronous reset still has timing requirements

“Asynchronous reset does not need timing analysis” is a common misconception. For the register itself, asserting an asynchronous reset does not require a clock edge: the register enters its reset state as long as the minimum pulse width and other reset requirements are met. However, releasing reset too close to an active clock edge can violate recovery or removal requirements. The register may become metastable, or different registers may leave reset on different cycles.

<img src="/images/fpga-reset-design/fpga-async-timing.drawio.png" alt="An asynchronous-clear register and a timing diagram showing removal after one rising clock edge and recovery before the next." width="643" height="193" loading="lazy" decoding="async" style="background-color: white;" />

*Recovery and removal checks constrain asynchronous reset release.*

- **Recovery**: the minimum interval between reset release and the next active clock edge. Think of it as similar to setup time.
- **Removal**: the minimum interval for which reset must remain asserted after an active clock edge before it can be released. Think of it as similar to hold time.

The reset pulse must also meet the register's minimum pulse-width requirement. At this point, you might wonder: if asynchronous reset does not need a clock, why does timing still matter? It is assertion taking effect that does not need a clock; release still has timing requirements. Both synchronous and asynchronous resets therefore need timing analysis, just with different checks. Choosing asynchronous reset does not eliminate the work of closing reset timing.

If the system allows it, we can first stop the clock without glitches, then assert and release reset. The reset signal must still meet the minimum pulse-width requirement, and release must still satisfy recovery/removal requirements. However, the control sequence can keep reset release well away from the last active edge before the clock stops, then restart the clock only after reset release has reached every destination register and sufficient recovery time has elapsed. This provides more timing margin and makes reset timing easier to meet. What needs verification is the actual timing at each register's pins, not just the order in which the controller issues its signals.

## When the reset source is asynchronous

Now let's look at the second question: “Does the reset signal arrive synchronously or asynchronously relative to this register's clock?”

If the reset signal is already synchronous to the destination clock and meets the relevant timing requirements when it reaches the destination register, another synchronizer is generally unnecessary. Connecting a signal to a reset pin does not automatically create correct timing constraints, though. The clocks and relevant paths still need proper constraints, and we must confirm that the tools perform the appropriate checks: assertion and release at synchronous-reset inputs must meet setup and hold requirements, while release at asynchronous-reset inputs must meet recovery and removal requirements.

If reset comes from an external reset pin, another clock domain, or a PLL lock indication, we cannot simply assume it is synchronous to the destination clock. The synchronization approaches below are usually needed. For synchronous-reset inputs, both assertion and release need handling. For asynchronous-reset inputs, assertion can remain asynchronous, but release must be safe; the controlled clock-stop procedure described above is another option. **The goal is to meet the destination timing requirements, not to add another synchronizer to every reset signal regardless of its source or use.**

Two common synchronization approaches are useful here.

### 1. Asynchronous assertion, synchronous release

<img src="/images/fpga-reset-design/fpga-async-rst-async.drawio.png" alt="A chain of registers with ARST_IN connected to every asynchronous preset input, zero feeding the first data input, and the final output driving ARST_OUT." width="781" height="281" loading="lazy" decoding="async" style="background-color: white;" />

*The reset asserts through the preset pins and releases through the clocked register chain.*

In this active-high circuit, `ARST_IN` drives the asynchronous preset input of every synchronizer stage. Asserting reset sets the stages and `ARST_OUT` to `1` without waiting for `CLK`. After the input reset is released, zeros propagate through the chain on successive clock edges until `ARST_OUT` becomes `0`.

The extra stages provide time for metastability to resolve, reducing the probability that it still affects reset release when it reaches the rest of the design. At least two stages are usually required, but that does not guarantee sufficient reliability in every situation. More stages generally **increase the mean time between failures (MTBF)**, at the cost of additional release latency. They reduce the probability of a failure rather than eliminate metastability. Once that probability is sufficiently low to meet the design's reliability requirements, it can be treated as negligible for engineering purposes.

Use the target tool's recognized synchronizer implementation, attributes, and timing guidance. For example, AMD's [XPM_CDC_ASYNC_RST](https://docs.amd.com/r/en-US/ug974-vivado-ultrascale-libraries/XPM_CDC_ASYNC_RST) provides asynchronous assertion and synchronous release. Even though it can stretch the output pulse, the asynchronous input must still meet the minimum pulse-width requirement.

This approach is useful when reset must take effect before the clock starts or while it is stopped. Release waits for clock activity. Because **only the release is synchronized, while assertion remains asynchronous**, we call this approach “asynchronous assertion, synchronous release.” Registers with asynchronous reset commonly use this method to synchronize their reset signal.

### 2. Synchronize both assertion and release

<img src="/images/fpga-reset-design/fpga-async-rst-sync.drawio.png" alt="A clocked register chain with ARST_IN feeding only the first data input, reset pins tied inactive, and the final stage driving RST_OUT." width="781" height="281" loading="lazy" decoding="async" style="background-color: white;" />

*This is just an ordinary single-bit synchronizer.*

Here, `ARST_IN` enters the first stage's data input instead of the stages' asynchronous control pins. Both assertion and release propagate through the chain under `CLK`, so after the synchronization delay, both transitions of `RST_OUT` are triggered by clock edges.

This avoids asynchronous assertion at the output of the chain, but introduces different requirements:

- The destination clock must run before either assertion or release can propagate.
- The input must remain asserted long enough to be sampled reliably. A short pulse can be missed.
- Startup must ensure a known reset state reaches the destination before normal operation is enabled; an uninitialized chain is not a power-on reset guarantee.

A synchronized output can drive registers with either synchronous or asynchronous reset, but it must meet the requirements at each destination: setup and hold checks for synchronous-reset inputs, and recovery and removal checks at release for asynchronous-reset inputs, along with the minimum pulse-width requirement. These checks must account for the source register's clock-to-Q delay and the delays and skew of the reset and clock trees. **Synchronizing the output does not automatically satisfy timing at every destination.**

Keep in mind: **adding a reset synchronizer does not turn a register's asynchronous reset pin into a synchronous one, or vice versa.**

## System-level reset design

Next, consider the third question: “How should the design enter reset and resume operation?” Let's first look at a problem that a synchronizer does not solve.

Consider an asynchronously reset register whose reset input is driven by an asynchronous-assertion, synchronous-release circuit. Its data output feeds logic that is not being reset:

<img src="/images/fpga-reset-design/fpga-async-issue.drawio.png" alt="A reset-release synchronizer drives Register A's asynchronous preset; Register A feeds Register B, whose preset is tied inactive. All registers share CLK." width="732" height="381" loading="lazy" decoding="async" style="background-color: white;" />

*Asserting reset can change Register A's output between clock edges, even though A and B share a clock.*

The assertion can propagate along this path:

`ARST` → synchronizer preset → synchronizer output → Register A preset → Register A output → Register B data input.

Register B's preset is tied inactive in this example. It can therefore sample a reset-induced transition at its data input near a clock edge. A release synchronizer alone does not protect that path.

This is not a claim that every asynchronously reset pipeline is broken. The functional risk depends on which receiving logic remains active, reset distribution and skew, and whether reset-time values can affect control state or memory writes. Reset, quiesce, or otherwise isolate affected consumers as required by the design.

## FPGA recommendations: Xilinx/AMD and Altera

Vendors differ in their reset-design recommendations, but those recommendations are not unconditional rules.

**Xilinx/AMD generally recommends synchronous resets when a reset is needed.** The [UltraFast Design Methodology Guide, UG949](https://docs.amd.com/r/en-US/ug949-vivado-design-methodology/Synchronous-Reset-vs.-Asynchronous-Reset) explains that synchronous resets allow more flexible resource mapping. For example, the register elements inside DSP48 and block RAM resources support synchronous rather than asynchronous reset. An asynchronous reset on an associated pipeline register can prevent synthesis from absorbing that register into the hard block.

**Altera's general design recommendations prefer synchronized asynchronous reset in their global-reset discussion.** In the [Quartus Prime Pro Edition User Guide: Design Recommendations](https://docs.altera.com/r/docs/683082/current), section 3.3.1.3 describes asynchronous assertion with synchronous release. This takes advantage of asynchronous reset resources while controlling release timing. It is not a recommendation to distribute an external reset with uncontrolled release throughout the design.

**Altera's Hyperflex guidance is an important exception.** [AN 917: Reset Design Techniques for Hyperflex Architecture FPGAs](https://docs.altera.com/r/docs/683539/current), section 1.1.2, explains that Hyper-Registers do not have asynchronous resets. Synchronous reset permits their use during retiming, so an asynchronous-reset register can become an obstacle to that optimization.

Also distinguish resetting a block's output register from clearing its storage. Resetting every element of an inferred RAM array can prevent block-RAM inference; simply changing that array-wide reset from asynchronous to synchronous does not solve the problem.

The useful rule is therefore: **follow the target family, primitive, and IP requirements—not just the vendor name.**

## ASICs: standard cells, area, and reset architecture

In a standard-cell ASIC, there is no fixed FPGA fabric to accommodate. Instead, the reset style determines which library cells and surrounding logic synthesis can use. The timing and synchronization principles above still apply, but the area and system-level trade-offs need a different assessment.

### Does asynchronous reset use fewer transistors?

**It can be more economical in a particular library, but “asynchronous reset always uses fewer MOS transistors” is not a safe general rule.** Compare complete implementations, not just the names of the reset styles:

- **Asynchronous reset**: a register with built-in asynchronous reset circuitry.
- **Synchronous reset**: a plain register plus logic on its data input, or a dedicated synchronous-reset register if the library provides one.

For a single bit reset to zero, without a clock enable, the synchronous input function can be written as `D_eff = D & ~rst`. It does not inherently require a full multiplexer, and synthesis may merge the reset function into existing data-input logic. Conversely, adding asynchronous reset to a plain register also requires internal circuitry; the reset pin is not free.

An integrated asynchronous-reset cell may be smaller than a plain register plus separate reset logic, but the result depends on the actual cells and mapping. Transistor count is also not the same as cell area: transistor sizing, drive strength, layout, reset polarity, and the available scan-cell variants all matter. Compare mapped area, power, and timing, including reset buffering and routing, rather than assuming a fixed transistor saving.

Cummings, Mills, and Golson discuss this distinction in [*Asynchronous & Synchronous Reset Design Techniques—Part Deux*](https://trilobyte.com/pdf/CummingsSNUG2003Boston_Resets_rev1_2.pdf#1#5#1), sections 4.2–4.3: synchronous-reset logic can use a smaller register, while the added combinational logic can offset that saving; not every ASIC library provides a dedicated synchronous-reset cell. The conclusion is library-dependent, not that either style always wins on area.

### Why choose asynchronous reset in an ASIC?

Two practical reasons are independent of transistor count:

- **Reset without a running clock.** In a powered, electrically valid domain, asynchronous reset can establish state before its clock starts or while that clock is gated off. Synchronous reset needs a startup sequence that supplies clock edges while reset is active.
- **Avoid additional reset-selection logic on the D path.** A suitable asynchronous-reset cell keeps that function off the external data-input path. This can help a timing-critical path, but the cell's own setup and clock-to-Q characteristics still need comparison; asynchronous reset is not automatically faster.

These are advantages identified in sections 4.3 and 5.3 of the same paper. They make asynchronous assertion with synchronized release a useful ASIC strategy, not a requirement for every register. Synchronous reset remains appropriate where clock availability, library mapping, and the system's reset behavior support it.

## Choosing a reset strategy

Rather than marking every combination “OK” or “not possible,” start with the actual requirement:

- **Reset must take effect without a clock**: use asynchronous-reset-capable destinations and a suitable assertion path. Release must meet recovery and removal requirements at every destination. This is usually achieved by synchronizing release to each destination clock, but the controlled clock-stop procedure described above is another option.
- **Reset can wait for a running clock**: a reset with both assertion and release synchronized, driving synchronous-reset registers, is often a good fit, subject to resource and IP requirements.
- **The clock is gated or temporarily stopped**: a synchronous reset cannot act during that interval. It can still be used if the startup controller enables the clock and holds reset across enough valid edges before allowing work to begin.
- **The design has multiple clock domains**: use a separate reset synchronizer for each destination clock domain that needs synchronization. A reset synchronized to clock A is not automatically safe for unrelated clock B. Where blocks depend on one another, sequence release or use readiness handshakes instead of assuming simultaneous startup.
- **Resource inference, cell area, or retiming matters**: check the mapped implementation rather than assuming one reset style is cheaper. For an ASIC, include the chosen library and scan cells in that comparison; for an FPGA, check hard-block inference and retiming restrictions. Reset only the state that needs it; resetting control and validity state may be sufficient to keep uninitialized datapath values from being used.

Finally, verify minimum pulse widths, clock availability, release sequencing, and the implemented reset distribution. Preserve recovery/removal checks at asynchronous-reset destinations and setup/hold checks at synchronous ones. Any timing exception for the raw asynchronous source entering a recognized synchronizer should not blindly disable checks on its downstream reset paths.

There is no contradiction in using both reset styles in one FPGA or ASIC. The goal is not to make every register follow the same slogan, but to make reset entry and exit predictable for the hardware that actually implements the design.
