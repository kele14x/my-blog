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

The cyclic structure means encoding and decoding can be expressed as regular shift-and-feedback operations—very simple computations.

Linear, polynomial, and cyclic codes are rarely used on their own—they are more like scaffolding. What engineering actually uses is BCH codes and their special cases, obtained by adding one more carefully designed layer of constraints.

## BCH Codes

**BCH codes** (Bose–Chaudhuri–Hocquenghem codes) are a class of linear cyclic error-correcting codes constructed with polynomials over finite fields. They were first published by _Alexis Hocquenghem_ in 1959 and independently discovered by _R. C. Bose_ and _D. K. Ray-Chaudhuri_ in 1960.

The key selling point of BCH codes is **precise control of error-correction capability via a "designed distance"**: to correct $t$ bits, construct the code with designed distance $2t+1$, and the minimum distance is guaranteed. Moreover, decoding is purely algebraic (syndromes → error locator polynomial → root finding), consisting entirely of finite-field operations with manageable computational complexity. Formally BCH codes can be defined over any $GF(q)$; this post discusses only binary BCH codes.

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

They are also linear codes, so $\bm{c} = \bm{d} \cdot \bm{G}$ works as well. The division can be implemented with a linear feedback shift register (LFSR), processing one bit at a time.

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
- **Berlekamp-Massey (BM)**: iteratively find the shortest LFSR, $O(t^2)$ complexity, most common in practice
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

Once we have $\Lambda(x)$, we need its roots. There are only $n$ possible error positions, so no general root-finding algorithm is needed: substitute $\alpha^{-i}$ for $i = 0, 1, ..., n-1$ into $\Lambda(x)$ one by one; a zero value means position $i$ is in error. This is the **Chien search**, with complexity $O(n \nu)$, and each term $\lambda_j \alpha^{-ij}$ can be updated recursively as $i$ advances—a very regular computation.

#### Step 3: Correction

For binary BCH codes the error value must be $1$: once positions are located, just flip those bits and decoding is done. (Non-binary RS codes also need to compute error values, e.g., with Forney's algorithm—one of the main differences between RS and binary BCH decoding.)

#### A Complete Example: Correcting Two Errors with BCH (15, 7)

Let's assemble the pieces and see the full complexity of decoding at $t = 2$. Reuse Example 2: $GF(2^4)$ built with $p(x) = x^4 + x + 1$, $\alpha = 2$, $g(x) = x^8 + x^7 + x^6 + x^4 + 1$.

**Encoding.** Send the message $\bm{d} = 1010011$, i.e., $d(x) = x^6 + x^4 + x + 1$. Long division gives the remainder $r(x) = x^6 + x^5 + x^4$, and the codeword is

$$
c(x) = x^{14} + x^{12} + x^9 + x^8 + x^6 + x^5 + x^4, \qquad \bm{c} = 101001101110000
$$

**Reception and syndromes.** Suppose bits $3$ and $9$ flip (the $x^3$ and $x^9$ terms), so we receive $\bm{z} = 101000101111000$. Evaluate in $GF(2^4)$ (where $\alpha^{15} = 1$):

$$
\begin{aligned}
S_1 &= z(\alpha) = \alpha^3 + \alpha^9 = \{0010\} = \alpha \\
S_2 &= z(\alpha^2) = \alpha^6 + \alpha^{18} = \{0100\} = \alpha^2 \\
S_3 &= z(\alpha^3) = \alpha^9 + \alpha^{27} = \{0101\} = \alpha^8 \\
S_4 &= z(\alpha^4) = \alpha^{12} + \alpha^{36} = \{0011\} = \alpha^4
\end{aligned}
$$

You can verify $S_2 = S_1^2$ and $S_4 = S_2^2$—the even-indexed syndromes are indeed redundant, though the PGZ matrix form still uses them. Note $S_1 = \alpha$: the syndrome no longer points directly at any error position ($\alpha^3 + \alpha^9$ is a sum of two locators)—this is the essential difficulty at $t \geq 2$.

**PGZ solves for the locator polynomial.** Assume $\nu = t = 2$ and solve

$$
\begin{bmatrix} S_1 & S_2 \\ S_2 & S_3 \end{bmatrix}
\begin{bmatrix} \lambda_2 \\ \lambda_1 \end{bmatrix}
=
\begin{bmatrix} S_3 \\ S_4 \end{bmatrix}
$$

The determinant (in binary, subtraction is XOR):

$$
\det = S_1 S_3 + S_2^2 = \alpha^9 + \alpha^4 = \{1001\} = \alpha^{14} \neq 0
$$

Nonzero, so there really are 2 errors—no need to decrement and retry. By Cramer's rule:

$$
\begin{aligned}
\lambda_1 &= \frac{S_1 S_4 + S_2 S_3}{\det} = \frac{\alpha^5 + \alpha^{10}}{\alpha^{14}} = \frac{1}{\alpha^{14}} = \alpha \\
\lambda_2 &= \frac{S_3^2 + S_2 S_4}{\det} = \frac{\alpha + \alpha^6}{\alpha^{14}} = \frac{\alpha^{11}}{\alpha^{14}} = \alpha^{12}
\end{aligned}
$$

The numerators are extension-field multiplications plus XORs, and the division is multiplication by $\det^{-1} = \alpha$. Hence

$$
\Lambda(x) = 1 + \alpha x + \alpha^{12} x^2
$$

Compare with the $t=1$ case: here we genuinely solved a $2 \times 2$ extension-field system, with several extension-field multiplications and one inversion—the cost of PGZ starts to show.

**Chien search.** Substitute $\alpha^{-i}$ for $i = 0, 1, ..., 14$ one by one. Most positions give nonzero values, e.g., $i = 0$: $\Lambda(1) = 1 + \alpha + \alpha^{12} = \{1100\} \neq 0$. Until:

$$
\begin{aligned}
\Lambda(\alpha^{-3}) &= 1 + \alpha \cdot \alpha^{-3} + \alpha^{12} \cdot \alpha^{-6} = 1 + \alpha^{13} + \alpha^6 = 0 \\
\Lambda(\alpha^{-9}) &= 1 + \alpha \cdot \alpha^{-9} + \alpha^{12} \cdot \alpha^{-18} = 1 + \alpha^7 + \alpha^9 = 0
\end{aligned}
$$

The two roots correspond to error positions $i = 3$ and $i = 9$—it took all 15 trials to find them both, the serial $O(n\nu)$ cost of Chien search.

**Correction.** Flip bits $3$ and $9$ to recover $\bm{c} = 101001101110000$; the top $7$ bits give the original message $1010011$.

The full pipeline: 4 extension-field evaluations → solve a $2 \times 2$ system (with inversion) → 15 polynomial evaluations → bit flips. Every step is a finite-field operation—that is what "algebraic decoding" means. We can also see that the decoding complexity grows with $t$.

## Hamming Codes and SECDED

After walking through the full BCH decoding pipeline, this section answers three interlocking questions: what exactly is the relationship between Hamming codes and BCH codes? Can BCH do SECDED? And why does SECDED decoding contain none of those "complex algorithms" like PGZ or Chien search?

### Hamming Codes Are t=1 BCH

Example 1 already gave the conclusion: **primitive Hamming codes are primitive narrow-sense binary BCH codes with designed distance $d = 3$**. Let's see the construction more transparently. With $d = 3$,

$$
g(x) = \operatorname{LCM}(m_1, m_2)
$$

and $\alpha^2$ is a conjugate of $\alpha$, so $m_1(x) = m_2(x)$, giving

$$
g(x) = m_1(x) = p(x)
$$

The generator polynomial is exactly the degree-$m$ primitive polynomial used to build the field. Parity bits $r = m$, data bits $k = 2^m - 1 - m$—precisely the Hamming code parameters.

The parity check matrix view agrees: a $d = 3$ BCH code is essentially a single extension-field check equation $c(\alpha) = 0$ ($S_2 = S_1^2$ carries no new information). Expanding that equation over $GF(2)$ into $m$ binary equations, the columns of the check matrix are exactly the binary representations of $\alpha^0, \alpha^1, ..., \alpha^{n-1}$—i.e., "every nonzero $m$-bit column appears once", which is the classic definition of the Hamming parity check matrix (up to column ordering).

The qualification again: only **primitive** Hamming codes ($n = 2^m - 1$) belong to the primitive BCH family; shortened Hamming codes are not BCH codes in standard form, and extended Hamming codes are not even cyclic.

### Can BCH Do SECDED?

SECDED (single error correction, double error detection) means correcting $e = 1$ and detecting $s = 2$ errors simultaneously, which requires

$$
d_{min} \geq e + s + 1 = 4
$$

But **a bare binary BCH code cannot have exactly $d_{min} = 4$**: even powers $\alpha^{2i}$ are conjugates of $\alpha^i$ and share minimal polynomials, so with designed distance 4,

$$
g(x) = \operatorname{LCM}(m_1, m_2, m_3) = m_1 \cdot m_3
$$

which is identical to designed distance 5—the "designed distance 4" code is actually a DEC (double error correction) code with $d_{min} \geq 5$. The minimum distance of a binary primitive narrow-sense BCH code is always odd: $d = 3$ corrects only 1 (2 errors get miscorrected), $d = 5$ already corrects 2, and there is no setting that lands exactly on 4.

**The standard approach: extended BCH.** Add one overall parity bit to the $t = 1$ BCH code (i.e., the Hamming code); $d_{min}$ goes from 3 to 4, giving SECDED. The decoding decision needs only two flags:

| Overall parity | Syndrome | Conclusion |
| --- | --- | --- |
| passes | zero | no error |
| fails | nonzero | 1-bit error, correct via the syndrome |
| passes | nonzero | 2-bit error, detected but not corrected |
| fails | zero | the overall parity bit itself is wrong |

The table assumes at most 2 errors. This generalizes the extended Hamming (8, 4) code. The price is that the code is no longer cyclic (length $2^m$ also fails the $2^m - 1$ form), but decoding only gains one overall-parity computation. SECDED in ECC (error-correcting code) memory is essentially this route.

Likewise, a $t = 2$ BCH code (e.g., (15, 7), $d_{min} = 5$) plus overall parity reaches $d_{min} = 6$ and can "correct 2, detect 3" (DECTED)—the real extension value of BCH beyond Hamming codes.

The other route is to use a higher-distance BCH code in a reduced mode: a $d_{min} = 5$ BCH code used with $e = 1, s = 3$ ($1 + 3 + 1 = 5$) covers SECDED and detects one more. But the cost is poor: it spends $2m$ parity bits where extended Hamming needs only $m + 1$. For $m = 4$: BCH (15, 7) spends 8 parity bits; extended Hamming (16, 11) spends only 5. **For SECDED, the optimum is "$t = 1$ BCH + overall parity", i.e., the extended Hamming code**; the point of the BCH framework is generalizing this idea to correcting more bits.

### t=1: The Decoding Operations Become Extremely Simple

Now the third question answers itself: SECDED decoding is simple not because of a "simplified implementation", but because **with correction capability of only 1, the entire algebraic decoding mathematically reduces to extremely simple operations**. Watch each stage degenerate:

1. **Syndrome computation → bit XORs**: $S_i = z(\alpha^i)$ normally requires multiplication in $GF(2^m)$, but at $t = 1$ only $S_1$ carries information ($S_2 = S_1^2$ is redundant), and $S_1 = \bm{z} \cdot \bm{H}^T$ over $GF(2)$ is just XORs of bits—no extension-field multiplication at all.
2. **PGZ → not needed**: PGZ solves $S_1 \lambda_1 = S_2$, one extension-field division. But there is nothing to solve: for a single error at position $i$, $S_1 = \alpha^i$—**the syndrome value itself encodes the error position**. No locator coefficients needed.
3. **Chien search → a single table lookup**: Chien search substitutes $\alpha^{-i}$ one by one, $O(n)$ serial. But at $t = 1$, "find $i$ such that $\alpha^i = S_1$" is just a discrete logarithm—one lookup in a log table. The classic Hamming layout uses the syndrome directly as a binary position index, skipping even the lookup.
4. **Correction → flip one bit**: once located, XOR that bit with $1$.
5. **SECDED decision → two Boolean flags**: the overall parity plus "is the syndrome zero" combine into the table above.

The whole decoding is nothing but XORs, table lookups, and bit flips—no iteration, no solving systems of equations, no extension-field multiply/divide.

**When are PGZ/BM/Chien actually needed?** At $t \geq 2$. With two errors, $S_1 = \alpha^{i_1} + \alpha^{i_2}$ no longer points at a position directly; only then must you solve for $\Lambda(x)$ and search its roots. BCH for NAND flash error correction ($t = 4 \sim 60+$) is the typical scenario.

In one sentence: **the complexity comes from $t$, not from the name "BCH"**.

## Summary

This post placed block codes into the finite-field framework: adding linear structure gives linear codes (generator matrix / parity check matrix / syndrome); selecting codewords by divisibility gives polynomial codes; requiring $g(x) \mid x^n-1$ gives cyclic codes. On top of cyclic codes, BCH codes build $g(x)$ from the minimal polynomials of consecutive roots in an extension field, gaining precise control of the designed distance and a purely algebraic decoding pipeline: extension-field syndromes → error locator polynomial (PGZ/BM/Sugiyama) → Chien search → bit flips. Primitive Hamming codes are the $t=1$ special case; add one overall parity bit and you get the SECDED of engineering practice, where the decoding operations become extremely simple.