---
title: 'Galois Field: Finite Field'
description: 'Notes on fields and finite fields: prime fields, extension fields, primitive elements and polynomials, and binary arithmetic for forward error correction.'
pubDate: '2026-11-25'
lang: 'en'
translationKey: 'field-and-finite-field'
---

In the [previous article on FEC](/blog/fec-introduction-en/), we built Hamming codes using XOR equations: calculate some parity bits, form a syndrome, and locate a single-bit error. But if you keep reading books on coding and error correction, fields, polynomials, and roots start appearing everywhere. Why does correcting errors suddenly involve all this algebra?

In fact, we have already applied concepts related to fields. XOR and AND are addition and multiplication in $GF(2)$—arithmetic for one-bit symbols. In more complex codes, we want to extend one-bit arithmetic to multiple bits, such as bytes. That raises a surprisingly useful question: **what should multiplication, or division, between two bytes mean?**

We want the result to still fit in one byte (8 bits, 256 possible values). The simplest idea is to use ordinary integer arithmetic and keep only the low eight bits. That looks convenient, but:

$$
2 \times 128 \equiv 0 \pmod{256}
$$

Two nonzero values have multiplied to zero. Multiplication by 2 cannot be uniquely undone: multiplying 0 and 128 by 2 both give the same result. **Keeping the result within one byte is not enough; we also want division by every nonzero element to work.**

A finite field gives us exactly this kind of arithmetic, while preserving familiar rules such as the distributive law. The byte-sized field $GF(2^8)$ has 256 elements, but its arithmetic is not ordinary integer arithmetic modulo 256. The same byte patterns follow different calculation rules.

This is the mathematical groundwork for what comes next. RS codes use finite-field polynomial arithmetic on their symbols; binary BCH codes still use bit-sized symbols, but their construction and decoding also use larger fields. Before studying those codes, let's build the arithmetic they rely on—from the rules that define a field to practical operations in $GF(2^m)$.

## Field

A **field** is a set $F$ along with two operations defined on that set: an addition operation $a+b$ and a multiplication operation $a\cdot b$. This includes the existence of an additive inverse $-a$ for each element $a$ and of a multiplicative inverse $b^{-1}$ for each nonzero element $b$. This allows the definition of the so-called inverse operations, subtraction $a-b$ and division $a/b$. These operations are required to satisfy the following properties (field axioms):

+ **Associativity of addition and multiplication**: $a + (b + c) = (a + b) + c$, and $a \cdot (b \cdot c) = (a \cdot b) \cdot c$
+ **Commutativity of addition and multiplication**: $a + b = b + a$, and $a \cdot b = b \cdot a$
+ **Additive and multiplicative identity**: there exist two distinct elements $\bold{0}$ and $\bold{1}$ in $F$ such that $a + \bold{0} = a$ and $a \cdot \bold{1} = a$
+ **Additive inverse**: for every $a$ in $F$, there exists an element in $F$, denoted $-a$, called the additive inverse of $a$, such that $a + (-a) = \bold{0}$.
+ **Multiplicative inverse**: for every $a\neq \bold{0}$ in $F$, there exists an element in $F$, denoted by $a^{-1}$ or $1/a$, called the multiplicative inverse of $a$, such that $a \cdot a^{-1} = \bold{1}$
+ **Distributivity of multiplication over addition**: $a \cdot (b + c) = (a \cdot b) + (a \cdot c)$

The core of this is:

+ A set is defined
+ The four arithmetic operations (addition, subtraction, multiplication, and division) are defined
+ The operations are closed, so that the result is still in the field

A field is thus a fundamental algebraic structure which is widely used in algebra, number theory, and many other areas of mathematics. Well-known fields include:

+ Rational numbers $\mathbb{Q}$
+ Real numbers $\mathbb{R}$
+ Complex numbers $\mathbb{C}$

Note in particular that the integer set $\mathbb{Z}$ is not a field, since it has no multiplicative inverse.

Strictly speaking, a field is always defined together with its addition and multiplication, so its elements alone do not fully identify it. Even so, we usually refer to a field by its elements alone and leave the operations implicit. The reason is that the particular operations are not what we depend on: any operations that satisfy the field axioms on that set give a field we can work with, and we normally use the most common or best-known ones. For finite fields this is made precise later: two finite fields with the same number of elements are always isomorphic.

## Finite Field (Galois Field)

A finite field is a field that contains a finite number of elements. The number of elements is also referred to as **the order of the field**, or simply its **size**, and is usually denoted as $q$.

Galois proved that finite fields exist only when their order is a prime power, thus $q = p^m$, where $p$ is a prime number and $m$ is a positive integer ($m \geq 1$). Accordingly, finite fields can be broken into two categories: **prime fields** $GF(p)$ and **extension fields** $GF(p^m)$ when $m \ge 2$.

+ $p$ is the **characteristic** of the field
+ $m$ is the **degree** of the field
+ $q = p^m$ is the **order** of the field

![Diagram of number stalks growing from prime soil](/images/field-and-finite-field/number-stalks-prime-soil-diagram.png)

Before going further, a quick note on the word **symbol**. In coding, data is handled as a sequence of symbols, and a symbol is one value taken from a fixed set of values. A bit is a symbol with only two possible values, 0 and 1; a byte is a symbol with 256. A code computes its parity over symbols and corrects errors symbol by symbol. A finite field provides exactly such a set of values: each element of the field is one symbol. $GF(2)$ gives one-bit symbols, and $GF(2^8)$ gives byte-sized symbols.

### Prime Fields

$GF(p)$ is called a **prime field** and is defined as the "ring of integers modulo $p$". That is, use the usual operations on integers followed by reduction modulo $p$. The elements of the finite field are naturally represented as the integers ${0, 1, 2, ..., p-1}$. This is the most common operation mentioned earlier; mathematically speaking, it is the integer ring $\mathbb{Z}/p\mathbb{Z}$.

#### $GF(2)$

$GF(2)$ is the smallest finite field, because by definition a field has at least two distinct elements, $\bold{0}$ and $\bold{1}$. Addition can be simplified to **XOR**, and multiplication to **AND**.

Addition and multiplication tables for $GF(2)$:

| $\oplus$ | $0$ | $1$ |
| --- | --- | --- |
| $0$ | $0$ | $1$ |
| $1$ | $1$ | $0$ |

| $\otimes$ | $0$ | $1$ |
| --- | --- | --- |
| $0$ | $0$ | $0$ |
| $1$ | $0$ | $1$ |

In this document, the GF addition operator is denoted by $+$ when there is no ambiguity with the standard addition operation, or by $\oplus$ to explicitly indicate that the addition is performed over GF elements. The same applies to $\times$ and $\otimes$.

#### Primitive Elements of Prime Fields

The most important property of a finite field is that it has a primitive element. A finite field has primitive elements $\alpha$ such that all nonzero elements in the field can be represented by $\alpha^i$, where $i$ is an integer. Since the number of elements is limited, $\{0, 1, \alpha, \alpha^2, ..., \alpha^{q-2}\}$ is the entire field. This means $\alpha$ is a **generator** of the field.

The theorem above guarantees that there is at least one primitive element, and there may be more than one. For example, $3$ and $5$ are primitive elements of $GF(7)$, but $2$ is not.

### Extension Fields

The elements of $GF(p)$ are simply numbers. The situation is different for the field with $p^m$ elements, which is denoted $GF(p^m)$ and called the Galois field of order $p^m$: by definition, its elements are polynomials of degree strictly less than $m$ over $GF(p)$. Formally, they are all polynomials:

$$
\bm{a} = a_{m-1} x^{m-1} + a_{m-2} x^{m-2} + ... + a_1 x + a_0
$$

where $\bm{a} \in GF(p^m)$, and $a_k \in GF(p)$.

There are exactly $p^m$ elements in $GF(p^m)$.

Every extension field must be defined together with an irreducible polynomial $f(x)$. This polynomial defines the arithmetic of the field, where $f(x)$ is an **irreducible polynomial** of degree $m$ over $GF(p)$.

$$
GF(p^m) = \frac{GF(p)[x]}{<f(x)>}
$$

In this definition, the operations (**addition** and **multiplication**) are performed using the usual operations on polynomials followed by modulo $f(x)$. The modulo is done by **polynomial long division**.

For example, take $GF(2^3)$ with $f(x) = x^3 + x + 1$ and reduce $x^5$ by polynomial long division. Since addition is XOR, subtracting a term has the same effect as adding it:

$$
\begin{aligned}
x^5 - x^2 \cdot f(x) &= x^5 + x^5 + x^3 + x^2 = x^3 + x^2 \\
(x^3 + x^2) - f(x) &= x^3 + x^2 + x^3 + x + 1 = x^2 + x + 1
\end{aligned}
$$

The remainder $x^2 + x + 1$ has degree less than $m = 3$, so the division stops:

$$
x^5 \equiv x^2 + x + 1 \pmod{f(x)}
$$

#### Primitive Polynomial

As defined above, the polynomial used to define the extension field $GF(p^m)$ must be irreducible. In practice, we usually use a **primitive polynomial** to construct the field.

We do not talk about $p \geq 3$ in the rest of this document.

#### Extension Field $GF(2^m)$

$GF(2^m)$ is an extension field of $GF(2)$ with degree $m$. When the prime $p$ is 2, it is conventional (and usual) to express the elements of $GF(p^m)$ as binary numbers, with the coefficient of each term in a polynomial represented by one bit in the corresponding element's binary expression. Braces (`{` and `}`) are commonly added to the numbers to indicate that the values represent an element of the field.

#### Primitive Elements of Extension Fields

An extension field also has primitive elements $\alpha$ such that all nonzero elements in the field can be represented by $\alpha^i$, where $0 \le i \le q-2$ is an integer. For $GF(2^m)$, $\alpha = 2$ is usually a primitive element of the field, since the field is usually constructed from a primitive polynomial. If you see $\alpha$ in an article without being told its value, assume it is $2$.

It is not always the case, though. The best-known counterexample is the field used by AES, $GF(2^8)$ with $f(x) = x^8 + x^4 + x^3 + x + 1$. This polynomial is irreducible but not primitive: the powers of $2$ repeat after $51$ steps instead of $255$, so $2$ generates only 51 of the 255 nonzero elements. In that field, $3$ is commonly used as the primitive element.

#### Representations of Elements

For example, the elements of $GF(2^3)$ with irreducible polynomial $f(x) = x^3 + x + 1$ can be represented in different ways (note also that $\alpha^3 = \alpha + 1$, so every element can also be written as a combination of $\alpha^2$, $\alpha$ and $1$):

<div role="region" aria-label="Representations of elements in GF(2^3)" tabindex="0" style="overflow-x: auto;">

| Element in $GF(2^3)$ | Binary Representation | Decimal Representation | Exponent Representation* | Primitive Element Representation* |
| --- | --- | --- | --- | --- |
| $0$ | `{000}` | 0 | $0$ | $0$ |
| $1$ | `{001}` | 1 | $\alpha^0$ | $1$ |
| $x$ | `{010}` | 2 | $\alpha^1$ | $\alpha$ |
| $x+1$ | `{011}` | 3 | $\alpha^3$ | $\alpha + 1$ |
| $x^2$ | `{100}` | 4 | $\alpha^2$ | $\alpha^2$ |
| $x^2+1$ | `{101}` | 5 | $\alpha^6$ | $\alpha^2+1$ |
| $x^2+x$ | `{110}` | 6 | $\alpha^4$ | $\alpha^2 + \alpha$ |
| $x^2+x+1$ | `{111}` | 7 | $\alpha^5$ | $\alpha^2 + \alpha + 1$ |

</div>

*: $\alpha = 2$

#### Operations

The operations (**addition** and **multiplication**) can be carried out by the definition (polynomial division). However, there are quicker ways: **addition** in $GF(2^m)$ is simply an **XOR** of the binary representations of two elements, and **multiplication** can be done through the exponent representation:

$$
x \otimes y = \alpha^{log(x) + log(y)}
$$

where $log(\cdot)$ is the logarithm to the base of the primitive element $\alpha$. This enables a fast look-up-table-based method for GF operations:

1. Build a look-up table for the $log(x)$ operation that uses the binary representation of an element to get the exponent value
2. Build a look-up table for the $\alpha^{x}$ operation that uses the exponent value to get the binary representation of the element
3. Multiplication in GF is done by two $log(x)$ look-ups and one $\alpha^x$ look-up

## Recap

We re-invented the addition and multiplication operations between bits ($GF(2)$) and multi-bit values ($GF(2^m)$). Now we have the basic algebraic structure for FEC.

## Related Concepts

Just for reference.

### Isomorphism

Isomorphic means there is a one-to-one mapping between the elements of two fields that preserves the field operations (addition and multiplication).

Two finite fields with the same number of elements are always isomorphic, meaning they have the same algebraic structure, even though they may have different elements.

In essence, when you have two finite fields with the same number of elements, you can be certain that they are essentially the same field, just potentially represented differently.

### Polynomials

A polynomial $f(x)$ over $GF(p^m)$ is:

$$
f(x) = a_k\cdot x^k + a_{k-1} \cdot x^{k-1} + ... + a_0
$$

where:

+ $k$ is the degree
+ $x$ is the indeterminate quantity in the polynomial
+ $a_i, i = 0,1,...,k$ are the coefficients, and $a_i \in GF(p^m)$

Polynomials support the following operations:

+ Addition and subtraction
+ Multiplication and division
+ Evaluation
+ Find roots that satisfy $f(x) = 0$
+ Find roots in an extension field

### Irreducible Polynomials

If $F$ is a field, a non-constant polynomial is **irreducible over** $F$ if its coefficients belong to $F$ and it cannot be factored into the product of two non-constant polynomials with coefficients in $F$.

Key points are:

+ Irreducibility depends on which coefficients are allowed for the factors. That is what "irreducible over $F$" means.

### Minimal Polynomials

The minimal polynomial of an element of $GF(p^m)$ is the smallest degree nonzero binary-coefficient polynomial having that element as a root in $GF(p^m)$.

```matlab
pol = gfminpol(k, m, p)
# or for p = 2
pr = minpol(m)
```

### Primitive Elements

An element $\alpha$ is a primitive element of $GF(q)$ if and only if $\{0, \alpha^0, \alpha^1, ..., \alpha^{q-2}\}$ is the entire $GF(q)$. In other words:

+ $\alpha$ is a generator of $GF(q)$.
+ $\alpha$ is a primitive $(q-1)$-th root of unity in $GF(q)$.
+ All nonzero elements of $GF(q)$ can be written in the form $\alpha^i$ for some natural number $i$.

Note: if a primitive polynomial is chosen to construct the extension field $GF(2^m)$, then $2$ (i.e. the element $x$) is always a primitive element; if the polynomial used is merely irreducible but not primitive, $2$ may not be a primitive element.

### Primitive Polynomials

A primitive polynomial over $GF(p^m)$ is the minimal polynomial of a primitive element of $GF(p^m)$. In other words, a polynomial is a primitive polynomial if it:

1. Is a polynomial $f(x)$ of degree $m$ with coefficients in $GF(p)$.
2. Is monic.
3. Has a root $\alpha$, and $\alpha$ is a primitive element.

Another definition:

+ An irreducible polynomial $f(x)$ of degree $m$ over $GF(p)$, where $p$ is prime, is a primitive polynomial if the smallest positive integer $n$ such that $f(x)$ divides $x^n-1$ is $n=p^m-1$.

It has the following properties:

+ All primitive polynomials are irreducible, but an irreducible polynomial may not be primitive
+ A primitive polynomial must have a nonzero constant term.
+ All primitive polynomials have an odd number of terms, except $x+1$ over $GF(2)$.
+ A primitive polynomial of degree $m$ has $m$ different roots in $GF(p^m)$, all of which are primitive elements

In practice, a primitive polynomial can be found using Python code:

```python
import galois
for i in galois.primitive_polys(p, m):
    print(i)
```

Or using the MATLAB code below:

```matlab
pol = gfprimfd(m, "all", p)
# or for p = 2:
pr = primpoly(m, "all")
```
