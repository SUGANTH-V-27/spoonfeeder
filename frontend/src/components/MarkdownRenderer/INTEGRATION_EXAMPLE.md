# Integration Example

## Quick Start: Replace Your Current Answer Rendering

### Current Code (ContentView.tsx)

```tsx
// Line ~2115
<div className="answer-content">
  {parseStructuredText(q.answer, q.metadata?.format || 'normal')}
</div>
```

### New Code (Using MarkdownRenderer)

```tsx
// Import at the top
import { MarkdownRenderer } from '../../components/MarkdownRenderer/MarkdownRenderer';

// Replace the answer rendering
<div className="answer-content">
  <MarkdownRenderer content={q.answer} />
</div>
```

## Complete Integration Steps

### 1. Import the Component

Add to `ContentView.tsx` imports:

```tsx
import { MarkdownRenderer } from '../../components/MarkdownRenderer/MarkdownRenderer';
```

### 2. Replace Answer Rendering

Find this code (around line 2115):

```tsx
<div className="qa-widget-answer">
  <div className="answer-content">
    {parseStructuredText(q.answer, q.metadata?.format || 'normal')}
  </div>
</div>
```

Replace with:

```tsx
<div className="qa-widget-answer">
  <div className="answer-content">
    <MarkdownRenderer content={q.answer} />
  </div>
</div>
```

### 3. Test It

## Properly Formatted Mathematical Content Examples

### ✅ Correct Format Examples:

**Limits:**
```markdown
$$\lim_{x \to 0} \frac{\sin(x)}{x} = 1$$

$$\lim_{(x,y) \to (0,0)} \frac{x^2 + y^2}{x^2 + y^2} = 1$$
```

**Partial Derivatives:**
```markdown
$$\frac{\partial f}{\partial x} = 2x + y$$

$$\frac{\partial^2 f}{\partial x \partial y} = 1$$
```

**Integrals:**
```markdown
$$\int_{0}^{\pi} \sin(x) \, dx = 2$$

$$\iint_D f(x,y) \, dA = \frac{\pi}{4}$$
```

**Fractions:**
```markdown
$$\frac{a}{b} + \frac{c}{d} = \frac{ad + bc}{bd}$$

$$\frac{\partial z}{\partial x} = \frac{\partial f}{\partial u} \cdot \frac{\partial u}{\partial x}$$
```

**Inline Math:**
```markdown
The derivative of $f(x) = x^2$ is $f'(x) = 2x$.

For $\epsilon > 0$, there exists $\delta > 0$ such that...
```

**Complex Expressions:**
```markdown
$$\lim_{h \to 0} \frac{f(x+h) - f(x)}{h} = f'(x)$$

$$\frac{d}{dx} \left[ x^n \right] = n x^{n-1}$$

$$\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}$$
```

**Summations and Products:**
```markdown
$$\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$$

$$\prod_{i=1}^{n} (x - i) = 0$$
```

**Matrices and Systems:**
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
```

### ❌ What NOT to Author:

**Don't leave LaTeX unwrapped:**
```markdown
❌ The limit \lim_{x \to 0} f(x) = 1  →  ✅ The limit $$\lim_{x \to 0} f(x) = 1$$

❌ Derivative \frac{df}{dx} = 2x  →  ✅ Derivative $\frac{df}{dx} = 2x$
```

**Don't use incorrect delimiters:**
```markdown
❌ $x^2 + y^2 = r^2$ (wrong for display)  →  ✅ $$x^2 + y^2 = r^2$$

❌ $$\lim_{x \to 0} \frac{\sin x}{x} = 1$$ (wrong for inline)  →  ✅ $\lim_{x \to 0} \frac{\sin x}{x} = 1$
```

**Always use proper delimiters:**
```markdown
❌ \infty symbol  →  ✅ $\infty$ symbol

❌ \partial_z f  →  ✅ $\frac{\partial f}{\partial z}$

❌ \int f(x) dx  →  ✅ $\int f(x) \, dx$
```

This should render beautifully with:
- ✅ Properly formatted markdown
- ✅ Rendered math expressions
- ✅ Clean, readable layout

## Optional: Keep Both Approaches

If you want to support both formats during migration:

```tsx
<div className="answer-content">
  {q.metadata?.useMarkdownRenderer ? (
    <MarkdownRenderer content={q.answer} />
  ) : (
    parseStructuredText(q.answer, q.metadata?.format || 'normal')
  )}
</div>
```

Then gradually migrate answers to use the new renderer.

## Benefits After Migration

✅ **Automatic LaTeX Rendering**: All math expressions work
✅ **No Manual Parsing**: Standard libraries handle everything
✅ **Future-Proof**: New math expressions work automatically
✅ **Better Quality**: Matches ChatGPT's rendering
✅ **Secure**: Built-in XSS protection
✅ **Maintainable**: Less custom code to maintain

## ChatGPT-Style Math Blocks

The renderer automatically converts standalone `[math]` blocks (commonly used by ChatGPT) to display math:

**Input from ChatGPT:**
```markdown
The solution is:

[ \lim_{x \to 0} \frac{\sin(x)}{x} = 1 ]

For partial derivatives:

[ \frac{\partial f}{\partial x} = 2x ]

[ \frac{\partial f}{\partial y} = 2y ]
```

**Automatically Renders As:**
The solution is:

$$\lim_{x \to 0} \frac{\sin(x)}{x} = 1$$

For partial derivatives:

$$\frac{\partial f}{\partial x} = 2x$$

$$\frac{\partial f}{\partial y} = 2y$$

**Important:** Only standalone math blocks are converted. Inline brackets like `[a,b]` in regular text are left unchanged to preserve formatting.

