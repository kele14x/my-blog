---
title: 'Field & Finite Field'
description: 'Notes on fields and finite fields: prime fields, extension fields, primitive elements and polynomials, and binary arithmetic for forward error correction.'
pubDate: '2026-11-25'
lang: 'en'
translationKey: 'field-and-finite-field'
---

## Field

### Defination

> A **field** is a set $F$ on along with two operations defined on that set: an addition operation $a+b$ and a multiplication operation $a\cdot b$. This includes the existence of an additive inverse $-a$ for each element $a$ and of a multiplicative inverse $b^{-1}$ for each nonzero element $b$. This allows the definition of the so-called inverse operations, subtraction $a-b$ and division $a/b$. These operations are required to satisfy the following properties (field axioms):
>
> + **Associtativity of addition and multiplication**: $a + (b + c) = (a + b) + c$, and $a \cdot (b \cdot c) = (a \cdot b) \cdot c$
> + **Commutaitvity of addition and mutiplication**: $a + b = b + a$, and $a \cdot b = b \cdot a$
> + **Additive and multiplicative identity**: there exist two distinct element $\bold{0}$ and $\bold{1}$ in $F$ such that $a + \bold{0} = a$ and $a \cdot \bold{1} = a$
> + **Additive inverse**: for every $a$ in $F$, there exists an element in $F$, denoted $-a$, called the additive inverse of $a$, such that $a + (-a) = \bold{0}$.
> + **Multiplicative inverse**: for every $a\neq \bold{0}$ in $F$, there exists an element in $F$, denoted by $a^{-1}$ or $1/a$, called multiplicative inverse of $a$, such that $a \cdot a^{-1} = \bold{1}$
> + **Distributivity of multiplication over addition**: $a \cdot (b + c) = (a \cdot b) + (a \cdot c)$

Key points:

+ A set is defined
+ Operations (addition, subtraction, multiplication, and division) are defined
+ The operations are is closed, so that the result is also in Field

A field is thus a fundamental algebraic structure which is widely used in algebra, number theory, and many other areas of mathematics.

### Example

Best known fields:

+ Rational numbers $\mathbb{Q}$
+ Real numbers $\mathbb{R}$
+ Complex numbers $\mathbb{C}$

Specially the interger set $\mathbb{Z}$ is not a field, since there is no multiplicative inverse.

## Finite Field (Galois Field)

### Definiation

> A finite field is a field that contains a finite number of elements. Whose number is also referred to as **the order of the field**. The order (or called **size**) of the a finite field is usually denoted as $q$.

Galois proved that finite fields exist only when their order (or size of the set) is a prime power, thus $q = p^m$, where $p$ is a prime number and $m$ is a positive integer ($m \geq 1$). Accordingly, finite fields can be broken into two categories: **prime fields** $GF(p)$ and **extension fields** $GF(p^m)$ when $m \ge 2$.

+ $p$ is the **characteristic** of the field
+ $m$ is the **degree** of the field
+ $q = p^m$ is the **order** of the field

![Diagram of number stalks growing from prime soil](/images/field-and-finite-field/number-stalks-prime-soil-diagram.png)

### Prime Fields

$GF(p)$ is called a **prime field**, is defined as "ring of integers modulo $p$". That is, use usual operation on integers followed by reduction modulo $p$. The elements of the finite field are naturelly represented as the integers ${0, 1, 2, ..., p-1}$. Mathematically speaking, this is the integer ring $\mathbb{Z}/p\mathbb{Z}$.

#### Prime Fields $GF(2)$

$GF(2)$ is the smallest finite field, because by definition a field has at least two distinct elements, $\bold{0}$ and $\bold{1}$. The addition is could be simplied as **XOR**, and multiplication is **AND**.

![Addition and multiplication tables for GF(2)](/images/field-and-finite-field/f2-addition-multiplication-tables.png)

In this document. The GF addition operator is denoted by $+$ when there is no ambiguity with the standard addition operation, or by $\oplus$ to explicitly indicate that the addition is performed over GF elements. The same goes to $\times$ and $\otimes$.

```python
import galois
GF = galois.GF(2)
zero = GF(0)
one = GF(1)
zero + one
# GF(1, order=2)
zero * one
# GF(0, order=2)
```

#### Primitive Elements

> $GF(p)$ has primitive elements $\alpha$ that all nonzero elements in field could be represenetation by $\alpha^i$. Since the number of elements is limited, sot that $\{0, 1, \alpha, \alpha^2, ..., \alpha^{p-2}\}$ is the entire field.

The primtive elements in prime field could be find by python:

```python
import galois
p = 7
for i in galois.primitive_roots(p):
    print(i)
# 3
# 5
```

### Extension Fields

> The field with $p^m$ elements is denoted $GF(p^m)$, and it called the Galois field of order $p^m$. The elements of $GF(p^m)$ are polynomails of degree strictly less than $m$ over $GF(p)$. Formally, thay are all polynomials:
>
> $$
> \bm{a} = a_{m-1} x^{m-1} + a_{m-2} x^{m-2} + ... + a_1 x + a_0
> $$
>
> where $\bm{a} \in GF(p^m)$, and $a_k \in GF(p)$.

There are exactly $p^m$ elements in $GF(p^m)$.

Every extension field must be defined together with an irreducible polynomial $f(x)$. This polynomial defines the arthmetic of the field, where $f(x)$ is an **irreducible polynomial** of degree $m$ over $GF(p)$.

$$
GF(p^m) = \frac{GF(p)[x]}{<f(x)>}
$$

In this defination, the operations (**addition** and **multiplication**) is performed use usual operation on polynomail followd by modulo $f(x)$. The modulo is done by **polynomail long division**.

```python
import galois
p = 2
m = 8
GF256 = galois.GF(p, m)
print(GF256.properties)
# Galois Field:
#  name: GF(2^8)
#  characteristic: 2
#  degree: 8
#  order: 256
#  irreducible_poly: x^8 + x^4 + x^3 + x^2 + 1
#  is_primitive_poly: True
#  primitive_element: x
```

#### Primitive Elements

There will be primitive elements $\alpha$ that all nonzero elements in field could be representation by $\alpha^i$, where $i$ is an integer. Which means the $\alpha$ is an **generator** of the field.

```python
import galois
p = 2
m = 8
poly = 'x^8 + x^4 + x^3 + x^2 + 1'
gf = galois.GF(p, m, irreducible_poly=poly)
gf.primitive_elements
```

Usually, $\alpha = 2$ is an primitive element of the field. So that every element in field chould also be represent by the exponent of $\alpha$. Example of $GF(2^3)$ is shown in above table.

Also note that $\alpha^2 = \alpha + 1$, so that element in field chould also be represent by combinations of $\alpha^2$, $\alpha$ and $1$.

#### Primitive Polynomial

As the above define, the polynomial used to define the extension field $GF(p^m)$ must be irreducible. In practice, we usually use a **primitive** **polynomial** to construct the field.

We does not talk about $p \geq 3$ in the left documents.

#### Extension Field $GF(2^m)$

$GF(2^m)$ is extension field of $GF(2)$ with degree $m$. When the prime $p$ is 2, it is conventional (also usually) to express the elements of $GF(p^n)$ as binary numbers, with the coefficient of each term in a polynomail represented by one bit in the corresponding element's binary expression. Braces (`{` and `}`) are commonly added to the numbers to indicate that the values representing an element of the field.

For example $GF(2^3)$ with irreducible polynomial $f(x) = x^3 + x + 1$ could be representing in different ways:

<div role="region" aria-label="Representations of elements in GF(2^3)" tabindex="0" style="overflow-x: auto;">

| Element in $GF(2^3)$ | Binary Representing | Decimal Pepresenting | Exponent Representing* | Primitive Element Representing* |
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

The **addition** in $GF(2^m)$ chould be simply **XOR** the binary representing of two elements. The **multiplication** could be done by the defination (polynomial division) or exponent representing:

$$
x \otimes y = \alpha^{log(x) + log(y)}
$$

where $log(\cdot)$ is the log operation towards primitive element $\alpha$. This enables fast Look-Up Table based method of GF operation:

1. Build a $log(x)$ operation look-up table that using the element binary representing to get the exponent value
2. Build a $\alpha^{x}$ operation look-up table that use the exponent value to get the element binary representing
3. Multiplication in GF be done by two $log(x)$ look-up and one $\alpha^x$ look-up

## Recap

We re-invented the addition and multiplication operation between bit ($GF(2)$) and multi-bit ($GF(2^m)$). Now we have the basic algebra structure for FEC.

## Related Concepts

Just for reference.

### Isomorphic

Isomorphic means there is one to one mapping between elements each in two fields that preserves the field operations (addition and multiplication).

Two finite fields with the same number of elements are always isomorphic, meaning they have the same algebraic structure, even they may have different elements.

In essence, when you have two finite fields with the same number of elements, you can be certain that they are essentially the same field, just potentially represented differently.

### Polynomials

A polynomial $f(x)$ over $GF(p^m)$ is:

$$
f(x) = a_k\cdot x^k + a_{k-1} \cdot x^{k-1} + ... + a_0
$$

where:

+ $k$ is the order
+ $x$ is the indeterminate quantity in the polynomial
+ $a_i, i = 0,1,...,k$ is the coefficients and that $a_i \in GF(p^m)$

Polynomials could do the operation:

+ Addition and subtraction
+ Multiplication and division
+ Evalution
+ Find roots that $f(x) = 0$
+ Find roots in extension field

### Irreducible Polynomails

If $F$ if a field, a non-constant polynomial is **irreducible over** $F$ if its coefficients belong to $F$ and it cannot be factored into the product of two non-constant polymials with coefficients in $F$.

Key points are:

+ That the property of irredcuibility depends on the nature of the coefficients that are accepted for the factors. That's irreducible over $F$ mean.

### Minimal Polynomails

The minimal polynomial of an element of $GF(p^m)$ is the smallest degree nonzero binary-coefficient polynomial having that element as a root in $GF(p^m)$.

```matlab
pol = gfminpol(k, m, p)
# or for p = 1
pr = minpol(m)
```

### Primitive Elements

A element $\alpha$ is primitive element of $GF(q)$ if and only if $\{0, \alpha^0, \alpha^1, ..., \alpha^{q-1}\}$ is the entire $GF(q)$. In other words:

+ $\alpha$ is a generator of $GF(q)$.
+ $\alpha$ is a primitive $(q-1)$-th root of unity in $GF(q)$.
+ All non-zero element of $GF(q)$ can be written as $\alpha^i$ form for some naturel number $i$.

For example, $2$ is primitive element of the field $GF(3)$ and $GF(5)$, but not $GF(7)$.

### Primitive Polymials

A primitive polymial over $GF(p^m)$ is the minimal polynomial of a primitive element of $GF(p^m)$. Or in another word a polynomial ia a primitve polymail if it:

1. A polynomial $f(x)$ of degree $m$ with coefficients in $GF(p)$.
2. It is monic.
3. Has a root $\alpha$ and $\alpha$ is a primitive element.

Another defination:

+ A irreducible polynomial $f(x)$ of degree m over $GF(p)$, where p is prime, is a primitive polynomial if the smallest positive integer $n$ that $f(x)$ divides $x^n-1$ is $n=p^m-1$.

It has below properties:

+ All primitive polynomial are irreducible, but irreducible polynomial may not be primitive
+ A primitive polynomial must have a non-zero constant term.
+ All primitive polynomial has odd number of terms, excpet $x+1$ over $GF(2)$.
+ A primitive polynomial of degree $m$ has $m$ different roots in $GF(p^m)$, which all are primitive elements

In pritical, a primitive polymial could be found using python code:

```python
import galois
for i in galois.primitive_polys(p, m):
    print(i)
```

Or using below MATLAB code:

```matlab
pol = gfprimfd(m, "all", p)
# or for p = 2:
pr = primpoly(m, "all")
```

### PN Sequence

For polynomial over $GF(2)$, the polynomial is primitive means the the LFSR generates the maximum cycle length (which is $2^m-1$, which $m$ is the length of LFSR) is the same concept.

+ Fibonacci LFSR (many to one)
+ Galois LFSR (one to many)
+ m-sequence
+ M-sequence (xor two m-sequence)

### Vector Space
