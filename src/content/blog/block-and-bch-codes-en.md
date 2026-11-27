---
title: 'Block Codes and BCH Codes'
description: 'Putting block codes into the finite-field framework: Hamming distance and error-correction bounds, linear codes, polynomial codes and cyclic codes, then the construction, encoding, and algebraic decoding of BCH codes.'
pubDate: '2026-11-26'
lang: 'en'
translationKey: 'block-and-bch-codes'
---

In [FEC Basics](/blog/fec-introduction-en/) we built the Hamming (7, 4) code from XOR equations, and in [Finite Fields](/blog/field-and-finite-field-en/) we prepared the algebraic toolbox of fields and polynomials. Now we can finally connect the two: first we put block codes into the finite-field framework and see how linear codes, polynomial codes, and cyclic codes arise by adding constraints layer by layer, then we use that framework to construct and decode BCH codes end to end.

This post does not repeat the definition of finite fields, the construction and arithmetic of $GF(2^m)$, primitive elements, or irreducible/primitive polynomials—refer back to the [finite field post](/blog/field-and-finite-field-en/) when needed.

## Block Codes, Formally

The information to be encoded is called the original message, and the encoded result is called the codeword; both consist of a number of symbols. A **block code** maps a fixed number of message symbols to a fixed number of codeword symbols. It processes each block independently, so the encoder is a memoryless system. We fix the notation: the symbols of both the message and the codeword are drawn from an **alphabet** $\Sigma_q$ of $q$ symbols. The message has length $k$, the codeword has length $n$, and $k < n$:

$$
\begin{aligned}
\bm{d} &= (d_{k-1}, d_{k-2}, ..., d_1, d_0) \\
\bm{c} &= (c_{n-1}, c_{n-2}, ..., c_1, c_0)
\end{aligned}
$$

where $d_i, c_j \in \Sigma_q$. The parameters:

- Alphabet: $\Sigma_q$
- Message length: $k$
- Block length: $n$
- Number of parity symbols: $r = n - k$
- Code rate: $R = k / n$

An original message can be viewed as an element of the message set, or as a vector in a $k$-dimensional vector space; the encoded codeword is a vector in an $n$-dimensional vector space. The encoding algorithm is the mapping from the message set to the codeword set: it maps vectors in $k$-dimensional space to vectors in $n$-dimensional space. The $q^k$ possible messages are mapped onto $q^k$ of the $q^n$ possible words. The mapping must satisfy:

- One-to-one: distinct messages map to distinct codewords, so decoding can be unique
- Every message has a codeword, but not every word is a codeword

The words that are mapped to are the **valid codewords**, whose set is denoted $C$; the remaining words have no message mapped to them and are sometimes called invalid codewords. Designing a code amounts to answering three questions:

1. How do we select the codewords out of all possible words?
2. How do we design the mapping between messages and codewords?
3. When a received word contains errors, how do we recover the original message?

In principle, picking $q^k$ words at random and pairing them randomly with messages is also a "code". But such a decoder has nothing to work with, and we cannot answer questions like "how many errors can it correct?" To give these three questions computable answers, we need to add algebraic structure to the codeword set—which is exactly what coding theory does.

### Hamming Distance and Error-Correction Capability

The **Hamming distance** between two equal-length vectors is the number of positions where the corresponding symbols differ. For binary data, it is the number of differing bits. The **weight** of a word is the number of its nonzero elements.

The **minimum Hamming distance** (minimum distance) $d_{min}$ of a code is the smallest distance between any two distinct codewords:

$$
d_{min} = \min_{x,y \in C,\ x \neq y} d(x, y)
$$

The larger $d_{min}$ is, the more "unlike" each other the codewords are, and the less likely a few errors turn one valid codeword into another. Given $d_{min}$, the guaranteed number of correctable errors is:

$$
t = \left\lfloor \frac{d_{min}-1}{2} \right\rfloor
$$

The intuition: draw a "sphere" of radius $t$ around each codeword. As long as $2t < d_{min}$, the spheres do not overlap, and a received word is decoded to whichever codeword's sphere it falls into. The Hamming (7, 4) code has $d_{min} = 3$, hence $t = 1$—matching the "only single-bit correction is guaranteed" conclusion from the introductory post.

Another commonly used bound is the **Singleton bound**, named after the American mathematician _Richard Collom Singleton_. For any block code over $GF(q)$ with $q^k$ codewords (in particular, for linear codes):

$$
d_{min} \leq n - k + 1
$$

Codes achieving equality are called **maximum distance separable (MDS)** codes; Reed–Solomon codes are the most famous example—but that is a story for later.

A code with parameters $n$, $k$, $d$ is called an $[n, k, d]$ code, or more precisely an $[n, k, d]_q$ code.

## Putting Block Codes into a Finite Field

Now replace the alphabet $\Sigma_q$ with the finite field $GF(q)$: every symbol of the message and codeword is a field element, and the whole vector inherits the field's arithmetic. Going one step further, view the vectors as polynomials whose coefficients are the symbols:

$$
d(x) = \sum_{i=0}^{k-1} d_i x^i, \qquad c(x) = \sum_{i=0}^{n-1} c_i x^i
$$

Once messages and codewords are polynomials, we can add, multiply, divide, evaluate, and find roots. Within this framework, adding algebraic constraints layer by layer produces a family of increasingly useful codes:

- **Linear codes**: the codeword set is closed under addition (a subspace of the vector space)
  - **Polynomial codes**: codewords are exactly the polynomials divisible by a generator polynomial $g(x)$
    - **Cyclic codes**: $g(x)$ divides $x^n - 1$; cyclic shifts of codewords are still codewords
      - **BCH codes**: $g(x)$ is built from minimal polynomials of consecutive roots in an extension field
        - **Hamming codes**: binary primitive BCH codes with $d_{min}=3$
        - **RS codes**: an important non-binary special case of BCH codes

Except for RS codes, these codes are usually used as **binary codes**, i.e., with alphabet $GF(2)$. In this post, "BCH codes" always means **binary BCH codes**.

### Linear Codes

A **linear code** (linear block code) has linear structure: any linear combination of codewords is still a codeword. This structure lets both encoding and decoding be done with matrix operations, far more efficiently than with unstructured codes.

Encoding is described by the **generator matrix** $\bm{G}$ ($k \times n$, entries in $GF(q)$):

$$
\bm{c} = \bm{d} \cdot \bm{G}
$$

Each row $\bm{g}_i$ of $\bm{G}$ is itself a codeword and can be seen as a basis codeword; the rows must be **linearly independent**.

When $\bm{G} = [I_k \mid P]$ ($I_k$ is the $k \times k$ identity matrix, $P$ is some $k \times (n-k)$ matrix), it is in **systematic form** and the code is a **systematic code**: the original message appears verbatim in the codeword with parity symbols appended, so no inversion is needed to read the message back out. Being systematic or not does not affect error-correction capability. All codes discussed here are systematic.

Decoding uses the **parity check matrix** $\bm{H}$ ($(n-k) \times n$, linearly independent rows). A valid codeword satisfies:

$$
\bm{c} \cdot \bm{H}^T = \bm{0}
$$

That is, the codeword space is the null space of $\bm{H}$, and $\bm{G} \cdot \bm{H}^T = \bm{0}$. In systematic form, $\bm{H} = [-P^T \mid I_{n-k}]$ (in binary, $-P^T = P^T$).

We already met the syndrome in the introductory post: for a received word $\bm{z} = \bm{c} + \bm{e}$,

$$
\bm{S} = \bm{z} \cdot \bm{H}^T = \bm{e} \cdot \bm{H}^T
$$

**The syndrome depends only on the error pattern, not on the transmitted codeword**—the starting point of all syndrome decoding.

Linear codes have another practical property: since the difference of two codewords is still a codeword, $d_{min}$ equals the **minimum weight of any nonzero codeword**. Finding the minimum distance does not require comparing all pairs of the $q^k$ codewords—just count the nonzero symbols of each nonzero codeword.

### Polynomial Codes

A **polynomial code** is a linear code defined as follows: fix a **generator polynomial** of degree $r = n-k$ over $GF(q)$,

$$
g(x) = g_r x^r + g_{r-1} x^{r-1} + ... + g_1 x + g_0
$$

A word is a valid codeword if and only if its polynomial is divisible by $g(x)$. Every codeword is a multiple of $g(x)$, and a sum of multiples is still a multiple—so the code is automatically linear.

For example, with $q=2$, $n=7$, and $g(x) = x^3 + x^2 + 1$, multiplying each of the $16$ message polynomials of degree less than $4$ by $g(x)$ yields $16$ codewords—this is another construction of the Hamming (7, 4) code. Checking the weights of the nonzero codewords, the minimum is $3$, i.e., $d_{min} = 3$.

**Encoding** achieves systematic form via polynomial long division: first shift the message polynomial left by $r$ positions (multiply by $x^{n-k}$, making room for parity in the low positions), then compute the remainder:

$$
x^{n-k} \cdot d(x) = g(x) \cdot a(x) + r(x)
$$

where $a(x)$ is the quotient polynomial. The remainder $r(x)$ has degree less than $n-k$; add it back:

$$
c(x) = x^{n-k} \cdot d(x) + r(x)
$$

Now $c(x)$ is divisible by $g(x)$ (in binary, addition and subtraction are the same), and the top $k$ bits are the original message.

**Error detection** uses division too: the remainder of the received polynomial $z(x)$ divided by $g(x)$ is the **syndrome polynomial**:

$$
S(x) = z(x) \bmod g(x) = e(x) \bmod g(x)
$$

Again: the syndrome depends only on the error. A zero remainder is taken to mean no error.

Both the generator matrix and the parity check matrix can be written down directly from $g(x)$. One more important fact: **a polynomial code is cyclic if and only if $g(x)$ divides $x^n - 1$**.

### Cyclic Codes

A **cyclic code** is a special case of a polynomial code: any cyclic shift of a codeword is still a codeword. In polynomial language, if $c(x)$ is a codeword then so is $x \cdot c(x) \bmod (x^n - 1)$. Its generator polynomial satisfies:

- $g(x)$ is a degree-$(n-k)$ polynomial over $GF(q)$
- $g(x)$ divides $x^n - 1$
- $g(x) h(x) = x^n - 1$, where $h(x)$ is called the parity check polynomial

The cyclic structure means encoder/decoder circuits can be built from simple shift registers with feedback—which is why cyclic codes are so popular in hardware.

Linear, polynomial, and cyclic codes are rarely used on their own—they are more like scaffolding. What engineering actually uses is BCH codes and their special cases, obtained by adding one more carefully designed layer of constraints.

## BCH Codes

**BCH codes** (Bose–Chaudhuri–Hocquenghem codes) are a class of linear cyclic error-correcting codes constructed with polynomials over finite fields. They were first published by _Alexis Hocquenghem_ in 1959 and independently discovered by _R. C. Bose_ and _D. K. Ray-Chaudhuri_ in 1960.

The key selling point of BCH codes is **precise control of error-correction capability via a "designed distance"**: to correct $t$ bits, construct the code with designed distance $2t+1$, and the minimum distance is guaranteed. Moreover, decoding is purely algebraic (syndromes → error locator polynomial → root finding), consisting entirely of finite-field operations, so hardware complexity and power consumption stay manageable. Formally BCH codes can be defined over any $GF(q)$; this post discusses only binary BCH codes.

### Construction

To construct a **primitive narrow-sense BCH code** of length $n = 2^m - 1$ with designed distance $d$ ($d \leq 2^m - 1$), whose minimum distance satisfies $d_{min} \geq d$:

1. Build the extension field $GF(2^m)$ using a primitive polynomial $p(x)$ of degree $m$ over $GF(2)$, and pick a primitive element $\alpha$ (usually $\alpha = 2$, i.e., the element $x$)
2. For each $i = 1, 2, ..., d-1$, find the minimal polynomial $m_i(x)$ of $\alpha^i$ over $GF(2)$
3. Define the generator polynomial as the least common multiple of these minimal polynomials:

$$
g(x) = \operatorname{LCM}\bigl(m_1(x), m_2(x), ..., m_{d-1}(x)\bigr)
$$

From the construction:

- The coefficients of $g(x)$ are all in $GF(2)$—encoding remains binary arithmetic
- The conjugates of each $\alpha^i$ (namely $\alpha^{2i}, \alpha^{4i}, ...$) share the same minimal polynomial, so many terms in the LCM are duplicates
- $g(x)$ divides $x^n - 1$, so the resulting code is cyclic
- $g(x)$ has **consecutive roots** $\alpha, \alpha^2, ..., \alpha^{d-1}$ in the extension field $GF(2^m)$

This last property is the source of all the magic: **the generator polynomial has coefficients in $GF(2)$, but its roots live in the extension field**. Every codeword $c(x)$ is a multiple of $g(x)$, so evaluating it at those roots must give zero. This hands the decoder a set of check equations in the extension field—and those are what make locating multiple errors possible. It can be proven that the designed distance is indeed a lower bound on the actual minimum distance.

### Example 1: BCH (7, 4)

Take $m = 3$, designed distance $d = 3$, build $GF(2^3)$ with the primitive polynomial $p(x) = x^3 + x^2 + 1$, and let $\alpha = 2$.

The minimal polynomial of $\alpha$ is $p(x)$ itself; $\alpha^2$ is a conjugate of $\alpha$ and shares the same minimal polynomial:

$$
m_1(x) = m_2(x) = x^3 + x^2 + 1
$$

Therefore

$$
g(x) = \operatorname{LCM}(m_1, m_2) = x^3 + x^2 + 1
$$

Degree $3$: three parity bits, four data bits, $t = 1$—this is exactly the Hamming (7, 4) code from the introductory post. **Primitive Hamming codes are binary primitive BCH codes with designed distance 3.** (Shortened Hamming codes and extended Hamming codes with an overall parity bit are not in this family.)

### Example 2: BCH (15, 7)

Take $m = 4$, designed distance $d = 5$, build $GF(2^4)$ with $p(x) = x^4 + x + 1$, and let $\alpha = 2$.

$\alpha, \alpha^2, \alpha^4$ are conjugates and share one minimal polynomial; the conjugacy class of $\alpha^3$ is $\{\alpha^3, \alpha^6, \alpha^{12}, \alpha^{9}\}$, corresponding to another minimal polynomial:

$$
\begin{aligned}
m_1(x) &= m_2(x) = m_4(x) = x^4 + x + 1 \\
m_3(x) &= x^4 + x^3 + x^2 + x + 1
\end{aligned}
$$

Therefore

$$
\begin{aligned}
g(x) &= \operatorname{LCM}(m_1, m_2, m_3, m_4) = m_1(x) \cdot m_3(x) \\
&= (x^4 + x + 1)(x^4 + x^3 + x^2 + x + 1) \\
&= x^8 + x^7 + x^6 + x^4 + 1
\end{aligned}
$$

Degree $8$: eight parity bits, seven data bits, $t = 2$, giving the BCH (15, 7) code. Compare with Hamming (15, 11) ($t=1$, only $4$ parity bits): correcting one more bit costs more parity—the trade-off between designed distance and code rate is plain to see.

### Encoding

BCH codes are polynomial codes, so encoding is the long division described earlier:

$$
\begin{aligned}
d(x) \cdot x^{n-k} &= a(x) \cdot g(x) + r(x) \\
c(x) &= d(x) \cdot x^{n-k} + r(x)
\end{aligned}
$$

They are also linear codes, so $\bm{c} = \bm{d} \cdot \bm{G}$ works as well. In hardware, the division is usually implemented with a linear feedback shift register (LFSR), processing one bit per clock cycle.

### Decoding

Decoding has three steps: compute syndromes → find the error locator polynomial → find its roots and correct.

#### Step 1: Compute Syndromes

As a polynomial code, we could use $z(x) \bmod g(x)$; as a linear code, $\bm{z} \cdot \bm{H}^T$. Both kinds of syndrome are binary—fine for error detection. They do contain the information needed for locating errors, but solving for multiple error positions directly from these binary equations is inconvenient.

BCH decoding uses a third kind: exploiting the consecutive roots of $g(x)$, evaluate the received polynomial directly in the extension field. Since $c(\alpha^i) = 0$:

$$
S_i = z(\alpha^i) = c(\alpha^i) + e(\alpha^i) = e(\alpha^i), \qquad i = 1, 2, ..., d-1
$$

This gives $d-1$ **extension-field elements** as syndromes; they still depend only on the error, and they exhibit exploitable algebraic structure. All zero is taken to mean no error; otherwise, proceed to the next step.

#### Step 2: The Error Locator Polynomial

Suppose there are $\nu$ errors at positions $i_1, i_2, ..., i_\nu$. Then

$$
e(x) = e_{i_1} x^{i_1} + e_{i_2} x^{i_2} + ... + e_{i_\nu} x^{i_\nu}
$$

In a binary code the error values are always $1$ (we keep the $e_{i_j}$ notation for clarity). Taking $d = 5$, $\nu = 2$ as an example, the syndromes give the system:

$$
\begin{aligned}
S_1 &= e_{i_1} \alpha^{i_1} + e_{i_2} \alpha^{i_2} \\
S_2 &= e_{i_1} \alpha^{2 i_1} + e_{i_2} \alpha^{2 i_2} \\
S_3 &= e_{i_1} \alpha^{3 i_1} + e_{i_2} \alpha^{3 i_2} \\
S_4 &= e_{i_1} \alpha^{4 i_1} + e_{i_2} \alpha^{4 i_2}
\end{aligned}
$$

There are only two unknowns, $i_1$ and $i_2$, but $4$ equations. In a binary field the even-indexed syndromes are actually redundant ($S_2 = S_1^2$ and $S_4 = S_2^2$, since squaring is linear), so only $S_1$ and $S_3$ are independent. But the unknowns sit in the exponents, so this is still a nonlinear system with no easy solution. Brute force costs about $O(n^\nu)$, generally infeasible.

The key trick is a change of unknowns: let $X_j = \alpha^{i_j}$ (the **error locators**), and the system becomes power sums in $X_j$. Define the **error locator polynomial**:

$$
\Lambda(x) = \prod_{j=1}^{\nu}(X_j x - 1) = 1 + \lambda_1 x + \lambda_2 x^2 + ... + \lambda_\nu x^\nu
$$

Its roots are $X_j^{-1} = \alpha^{-i_j}$: find the roots and you find the error positions. The problem reduces to finding the coefficients $\lambda_i$, which can be done within linear algebra / polynomial arithmetic. The common algorithms are:

- **Peterson-Gorenstein-Zierler (PGZ)**: solve a linear system directly
- **Berlekamp-Massey (BM)**: iteratively find the shortest LFSR, $O(t^2)$ complexity, most common in hardware
- **Sugiyama's algorithm**: based on the extended Euclidean algorithm

##### The PGZ Algorithm

PGZ solves for the coefficients directly. It can be shown that the $\lambda_i$ satisfy:

$$
\begin{bmatrix}
S_1 & S_2 & \dots & S_\nu \\
S_2 & S_3 & \dots & S_{\nu+1} \\
\vdots & \vdots & \ddots & \vdots \\
S_\nu & S_{\nu+1} & \dots & S_{2\nu-1}
\end{bmatrix}
\begin{bmatrix}
\lambda_\nu \\ \lambda_{\nu-1} \\ \vdots \\ \lambda_1
\end{bmatrix}
=
\begin{bmatrix}
S_{\nu+1} \\ S_{\nu+2} \\ \vdots \\ S_{2\nu}
\end{bmatrix}
$$

(In a binary field $-1 = 1$, so the minus sign disappears.) Start by assuming $\nu = t$: if the determinant of the matrix is nonzero, invert it and solve for the $\lambda_i$; if the determinant is zero, the actual number of errors is smaller than assumed—decrement $\nu$ and retry. PGZ requires matrix inversion, which gets expensive for large $t$; that is where BM shines.

##### Chien Search

Once we have $\Lambda(x)$, we need its roots. There are only $n$ possible error positions, so no general root-finding algorithm is needed: substitute $\alpha^{-i}$ for $i = 0, 1, ..., n-1$ into $\Lambda(x)$ one by one; a zero value means position $i$ is in error. This is the **Chien search**, with complexity $O(n \nu)$, and each term $\lambda_j \alpha^{-ij}$ can be updated recursively as $i$ advances—very friendly to pipelined hardware.

#### Step 3: Correction

For binary BCH codes the error value must be $1$: once positions are located, just flip those bits and decoding is done. (Non-binary RS codes also need to compute error values, e.g., with Forney's algorithm—one of the main differences between RS and binary BCH decoding.)

#### A Complete Example: Correcting One Error with BCH (7, 4)

Let's assemble the pieces. Build $GF(2^3)$ with $p(x) = x^3 + x + 1$ (note: a different primitive polynomial from Example 1; the result is still a Hamming (7, 4) code, just with a different codeword arrangement). Then $g(x) = m_1(x) = x^3 + x + 1$ and $\alpha = 2$.

Send the message $\bm{d} = 1011$, i.e., $d(x) = x^3 + x + 1$. It happens to equal $g(x)$, so after shifting left by $3$ it is still divisible by $g(x)$; the remainder $r(x) = 0$, and the codeword is

$$
c(x) = x^6 + x^4 + x^3, \qquad \bm{c} = 1011000
$$

Suppose bit $5$ flips in transit (the $x^5$ term), so we receive $\bm{z} = 1111000$. Compute the syndromes (in $GF(2^3)$, $\alpha^7 = 1$):

$$
\begin{aligned}
S_1 &= z(\alpha) = \alpha^5 = \{111\} \\
S_2 &= z(\alpha^2) = \alpha^{10} = \alpha^3 = \{011\}
\end{aligned}
$$

With $t = 1$, PGZ just solves $S_1 \lambda_1 = S_2$, giving $\lambda_1 = S_2 / S_1 = \alpha^3 / \alpha^5 = \alpha^{-2} = \alpha^5$. Hence

$$
\Lambda(x) = 1 + \alpha^5 x
$$

Chien search: $\Lambda(\alpha^{-5}) = 1 + \alpha^5 \alpha^{-5} = 0$, so the error is at position $i = 5$. Flip bit $5$ to recover $1011000$. The whole procedure is nothing but table lookups, multiplications/divisions, and XORs—that is what "algebraic decoding" means.

## Summary

This post placed block codes into the finite-field framework: adding linear structure gives linear codes (generator matrix / parity check matrix / syndrome); selecting codewords by divisibility gives polynomial codes; requiring $g(x) \mid x^n-1$ gives cyclic codes. On top of cyclic codes, BCH codes build $g(x)$ from the minimal polynomials of consecutive roots in an extension field, gaining precise control of the designed distance and a purely algebraic decoding pipeline: extension-field syndromes → error locator polynomial (PGZ/BM/Sugiyama) → Chien search → bit flips. Primitive Hamming codes are the $t=1$ special case; the next important special case is the non-binary RS code, to be covered in a future post.