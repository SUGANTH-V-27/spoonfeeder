# Mathematical Content Formatting Guidelines

## ⚠️ **IMPORTANT: No Auto-Processing**

**MathJax content is rendered EXACTLY as authored.** There is no preprocessing, auto-wrapping, or string manipulation of LaTeX. Content must be correctly formatted from the start.

**Rule: If your LaTeX doesn't render correctly, fix the source content - don't rely on "fixes".**

## Overview

All mathematical expressions must be properly wrapped in MathJax delimiters when authored. This document shows the correct way to format mathematical content, including support for ChatGPT-style standalone math blocks.

## Basic Rules

### ✅ **Always use proper delimiters**

- **Inline math**: `$...$` (for expressions within text)
- **Display math**: `$$...$$` (for centered, standalone equations)

### ❌ **Never use these formats**

- `[x^2 + y^2 = r^2]` → Use `$x^2 + y^2 = r^2$` instead
- Raw LaTeX: `\frac{a}{b}` → Use `$\frac{a}{b}$` instead
- Mixed formatting: `**The answer is** \frac{a}{b}` → Use `**The answer is** $\frac{a}{b}$` instead

## Mathematical Expression Examples

### 1. **Limits**
```markdown
$$\lim_{x \to 0} \frac{\sin(x)}{x} = 1$$

$$\lim_{(x,y) \to (0,0)} \frac{x^2 + y^2}{x^2 + y^2} = 1$$

For $\epsilon > 0$, there exists $\delta > 0$ such that...
$$\lim_{x \to a} f(x) = L$$
```

### 2. **Partial Derivatives**
```markdown
$$\frac{\partial f}{\partial x} = 2x + y$$

$$\frac{\partial^2 f}{\partial x \partial y} = 1$$

$$\frac{\partial z}{\partial x} = \frac{\partial f}{\partial u} \cdot \frac{\partial u}{\partial x}$$
```

### 3. **Integrals**
```markdown
$$\int_{0}^{\pi} \sin(x) \, dx = 2$$

$$\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}$$

$$\iint_D f(x,y) \, dA = \frac{\pi}{4}$$
```

### 4. **Fractions**
```markdown
$$\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}$$

The derivative is $\frac{d}{dx}[x^n] = n x^{n-1}$.
```

### 5. **Summations and Products**
```markdown
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

$$\sum_{k=1}^{\infty} \frac{1}{k^2} = \frac{\pi^2}{6}$$

$$\prod_{i=1}^{n} (x - i) = 0$$
```

### 6. **Roots and Powers**
```markdown
$$\sqrt{x^2 + y^2} = r$$

$$\sqrt[n]{x} = x^{1/n}$$

$$x^{\frac{1}{2}} = \sqrt{x}$$
```

### 7. **Matrices and Systems**
```markdown
$$\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
\begin{pmatrix}
x \\
y
\end{pmatrix} =
\begin{pmatrix}
ax + by \\
cx + dy
\end{pmatrix}$$

$$\begin{bmatrix}
1 & 2 & 3 \\
4 & 5 & 6 \\
7 & 8 & 9
\end{bmatrix}$$
```

### 8. **Greek Letters and Special Symbols**
```markdown
$$\alpha + \beta = \gamma$$

$$\epsilon, \delta, \lambda, \mu, \pi, \sigma, \tau$$

$$\infty, \nabla, \Delta, \partial$$

$$\in, \notin, \subset, \supset, \cup, \cap$$

$$\to, \leftarrow, \rightarrow, \leftrightarrow$$

$$\forall, \exists, \therefore, \because$$
```

### 9. **Complex Expressions**
```markdown
$$\lim_{h \to 0} \frac{f(x+h) - f(x)}{h} = f'(x)$$

$$\frac{d}{dx} \left[ \int_{a}^{x} f(t) \, dt \right] = f(x)$$

$$\sum_{n=1}^{\infty} \frac{(-1)^{n+1}}{n} = \ln(2)$$
```

### 9.5 **ChatGPT-Style Math Conversion (Auto-Converted)**

The system automatically converts two common ChatGPT math formatting patterns:

#### **A. Multi-line Display Math Blocks**
If ChatGPT outputs display math using multi-line square bracket blocks, they are converted to proper MathJax display math.

**How it works:**
- `[ ` is on its own line
- Math content spans one or more lines
- `] ` is on its own line
- Blank lines may exist before/after

**Example Input (from ChatGPT):**
```
[
z = f(x, y)
]
```

**Rendered Output:**
$$
z = f(x, y)
$$

#### **B. Inline Math in Parentheses and Square Brackets**
ChatGPT often writes inline mathematical expressions using parentheses or square brackets instead of MathJax delimiters. These are automatically converted to proper inline math when they contain LaTeX backslash commands.

**Example Input (from ChatGPT):**
```
(z = \sin x + \cos y) → wavy surface
(\partial z/\partial x) → change along x-direction
(\partial z/\partial y) → change along y-direction

[z = \sin x + \cos y] → wavy surface
[\partial z/\partial x] → change along x-direction
[\partial z/\partial y] → change along y-direction
```

**Rendered Output:**
$(z = \sin x + \cos y)$ → wavy surface  
$(\partial z/\partial x)$ → change along x-direction  
$(\partial z/\partial y)$ → change along y-direction

$(z = \sin x + \cos y)$ → wavy surface  
$(\partial z/\partial x)$ → change along x-direction  
$(\partial z/\partial y)$ → change along y-direction

**Important:** Only parentheses and square brackets containing LaTeX backslash commands (like `\partial`, `\sin`, `\cos`, `\lim`, etc.) are converted. Simple expressions without backslash commands and regular text parentheses/brackets like `(a,b)` or `[a,b]` coordinates remain unchanged.

### 10. **Inline Math Examples**
```markdown
The equation $x^2 + y^2 = r^2$ represents a circle.

For $f(x) = x^2$, we have $f'(x) = 2x$.

The limit $\lim_{x \to 0} \frac{\sin x}{x} = 1$ is fundamental.

Using $\epsilon-\delta$ definition: for every $\epsilon > 0$...

The solution is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.
```

## Content Structure Guidelines

### ✅ **Proper Structure**
```markdown
## Problem Statement

Find the derivative of $f(x) = x^3 + 2x^2 - x + 1$.

## Solution

We use the power rule:

$$\frac{d}{dx}[x^n] = n x^{n-1}$$

Applying this:

$$\frac{d}{dx}[x^3] = 3x^2$$
$$\frac{d}{dx}[x^2] = 2x$$
$$\frac{d}{dx}[x] = 1$$
$$\frac{d}{dx}[1] = 0$$

**Final Answer**: $f'(x) = 3x^2 + 4x - 1$
```

### ❌ **Improper Structure**
```markdown
## Problem

Find the derivative of x^3 + 2x^2 - x + 1.

## Solution

We use the power rule: \frac{d}{dx}[x^n] = n x^{n-1}

Applying this: \frac{d}{dx}[x^3] = 3x^2

**Answer**: f'(x) = 3x^2 + 4x - 1
```

## Common Mistakes to Avoid

### 1. **Square Brackets**
```markdown
❌ [x^2 + y^2 = r^2]
❌ [\lim_{x \to 0} f(x)]
❌ [\frac{\partial f}{\partial x}]

✅ $x^2 + y^2 = r^2$
✅ $$\lim_{x \to 0} f(x)$$
✅ $\frac{\partial f}{\partial x}$
```

### 2. **Unwrapped LaTeX**
```markdown
❌ The limit \lim_{x \to 0} f(x) = 0
❌ Derivative \frac{df}{dx} = 2x
❌ Integral \int f(x) dx

✅ The limit $\lim_{x \to 0} f(x) = 0$
✅ Derivative $\frac{df}{dx} = 2x$
✅ Integral $\int f(x) \, dx$
```

### 3. **Mixed Math and Markdown**
```markdown
❌ **The answer is** \frac{a}{b}
❌ *Formula:* \sum_{i=1}^{n} x_i
❌ ## Solution: \int f(x) dx

✅ **The answer is** $\frac{a}{b}$
✅ *Formula:* $\sum_{i=1}^{n} x_i$
✅ ## Solution: $\int f(x) \, dx$
```

### 4. **Incorrect Delimiters**
```markdown
❌ $x^2 + y^2 = r^2$ (should be $$ for display)
❌ $$\lim_{x \to 0} \frac{\sin x}{x} = 1$$ (should be $ for inline)

✅ $x^2 + y^2 = r^2$ (correct for inline)
✅ $$\lim_{x \to 0} \frac{\sin x}{x} = 1$$ (correct for display)
```

### **Inline Brackets (NEVER Modified)**
```markdown
❌ The set [a,b] contains...  →  ❌ Don't touch this - it's not math
❌ Function f(x) = [x] + 1  →  ❌ Don't touch this - it's not math
```

### **ChatGPT Math Conversions (Auto-Converted)**
```markdown
✅ [
   \lim_{x \to 0} f(x)
   ]  →  ✅ $$\lim_{x \to 0} f(x)$$

✅ [
   x^2 + y^2 = r^2
   ]  →  ✅ $$x^2 + y^2 = r^2$$

✅ (z = \sin x + \cos y)  →  ✅ $(z = \sin x + \cos y)$

✅ (\partial z/\partial x)  →  ✅ $(\partial z/\partial x)$

✅ (\partial z/\partial y)  →  ✅ $(\partial z/\partial y)$

✅ [z = \sin x + \cos y]  →  ✅ $(z = \sin x + \cos y)$

✅ [\partial z/\partial x]  →  ✅ $(\partial z/\partial x)$

✅ [\partial z/\partial y]  →  ✅ $(\partial z/\partial y)$

✅ [z = \sin x + \cos y]  →  ✅ $(z = \sin x + \cos y)$

✅ [\partial z/\partial x]  →  ✅ $(\partial z/\partial x)$

✅ [\partial z/\partial y]  →  ✅ $(\partial z/\partial y)$
```

**Note:** Only parentheses containing LaTeX backslash commands are converted to inline math. Regular text parentheses like `(a,b)` coordinates and expressions without backslash commands remain unchanged.

## Testing Your Content

1. **Preview in browser**: Use the admin interface to see how math renders
2. **Check for issues**: Look for unrendered LaTeX commands or broken equations
3. **Validate delimiters**: Ensure $ and $$ are properly balanced and positioned
4. **Test on mobile**: Math should render correctly on all devices

## Best Practices

1. **Use display math** `$$...$$` for important equations, theorems, and final answers
2. **Use inline math** `$...$` for expressions within sentences
3. **Always wrap LaTeX commands** in math delimiters - never leave them raw
4. **Test thoroughly** before publishing content
5. **Author correctly** - there are no "fixes" applied after the fact

## Need Help?

If you're unsure about formatting, refer to this guide. **All mathematical expressions must be properly delimited when authored** - the system renders exactly what you write, with no preprocessing or auto-correction.
