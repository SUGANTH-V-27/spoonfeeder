# How Raw Database Data is Rendered

## Complete Data Flow Pipeline

### 1. **Database → API Layer**

**Location:** `frontend/src/api/subtopics.ts`

```typescript
// API call to fetch content from backend
export const getSubtopicContent = (subtopicId: number) =>
  api.get(`/subtopics/${subtopicId}/content`);
```

**What happens:**
- Backend returns an array of content items
- Each item has: `id`, `content_type`, `title`, `content`, `metadata`

**Example DB Response:**
```json
[
  {
    "id": 1,
    "content_type": "notes",
    "title": null,
    "content": "Here is **one simple problem** from **Limits and Continuity**...\n\n**Question:**\nEvaluate the limit\n[\n\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}\n]",
    "metadata": { "format": "normal" }
  }
]
```

---

### 2. **API → ContentView Component**

**Location:** `frontend/src/pages/ContentView/ContentView.tsx`

**Step 2a: Fetch Data**
```typescript
const loadContentData = async () => {
  const content = await loadContent(subtopicId);  // Calls getSubtopicContent
  const transformedContent = transformContentData(content);
  setContentData(transformedContent);
};
```

**Step 2b: Transform Data**
```typescript
const transformContentData = (backendContent: any[]) => {
  // Groups content by type: videos, driveResources, notes, questions
  backendContent.forEach(item => {
    switch (item.content_type) {
      case 'notes':
        contentMap.notes.push({
          id: item.id,
          content: item.content  // ← Raw string from DB
        });
        break;
      // ... other types
    }
  });
  
  return {
    notes: contentMap.notes.map(n => n.content).join('\n\n'),  // ← Combined notes string
    notesItems: contentMap.notes,  // ← Individual note items
    // ... other fields
  };
};
```

**Result:** Raw markdown string stored in `contentData.notes`

---

### 3. **ContentView → MarkdownRenderer**

**Location:** `frontend/src/pages/ContentView/ContentView.tsx` (line 1334-1372)

```typescript
const renderMarkdown = (text: string, format: string = 'normal') => {
  if (format === 'code') {
    // Render as raw code block
    return <pre>{text}</pre>;
  } else {
    // Pass raw string to MarkdownRenderer
    return (
      <div className="notes-structured">
        <MarkdownRenderer content={text} />  // ← Raw DB string passed here
      </div>
    );
  }
};

// Usage:
renderMarkdown(contentData.notes || '', contentData.notesMetadata?.format || 'normal')
```

**What's passed:** Raw markdown string exactly as stored in database

---

### 4. **MarkdownRenderer: Preprocessing**

**Location:** `frontend/src/components/MarkdownRenderer/MarkdownRenderer.tsx`

**Step 4a: Preprocess Math Expressions**
```typescript
const preprocessMathExpressions = (text: string): string => {
  let processed = text;  // ← Raw DB string starts here
  
  // 1. Fix literal $$ that should be inline math
  processed = fixLiteralDollarSigns(processed);
  
  // 2. Convert [math] blocks to $$...$$ format
  // Input:  [\lim_{x \to 2} \frac{x^2 - 4}{x - 2}]
  // Output: $$
  //          \lim_{x \to 2} \frac{x^2 - 4}{x - 2}
  //          $$
  processed = convertChatGPTMathBlocks(processed);
  
  // 3. Convert raw LaTeX expressions
  processed = convertRawLatexToInlineMath(processed);
  
  // 4. Convert inline [math] brackets
  processed = convertChatGPTBracketsMath(processed);
  
  // 5. Handle \boxed{} commands
  processed = handleBoxedCommands(processed);
  
  // 6. Convert inline math with operators to display math
  processed = convertInlineMathWithOperators(processed);
  
  return processed;  // ← Preprocessed string ready for markdown parser
};
```

**Key Conversion: `convertChatGPTMathBlocks`**
```typescript
// Input from DB:
[
\lim_{x \to 2} \frac{x^2 - 4}{x - 2}
]

// Processing:
1. Detect [ on its own line
2. Collect all lines until ]
3. Join with spaces: "\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}"
4. Remove any $ characters (prevent nested delimiters)
5. Output:
$$
\lim_{x \to 2} \frac{x^2 - 4}{x - 2}
$$
```

---

### 5. **Markdown Parser (react-markdown)**

**Location:** `frontend/src/components/MarkdownRenderer/MarkdownRenderer.tsx` (line 694)

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkMath]}  // ← remarkMath detects $$...$$ blocks
  rehypePlugins={[rehypeKatex]}            // ← KaTeX renders the math
>
  {processedContent}  // ← Preprocessed string
</ReactMarkdown>
```

**What happens:**
1. **remarkGfm**: Parses markdown (headings, lists, bold, etc.)
2. **remarkMath**: Detects math blocks:
   - `$$...$$` → Display math (block-level)
   - `$...$` → Inline math
3. **rehypeKatex**: Converts LaTeX to HTML/CSS using KaTeX

**Internal Flow:**
```
Preprocessed String
  ↓
remarkMath detects: $$
  \lim_{x \to 2} \frac{x^2 - 4}{x - 2}
$$
  ↓
Creates AST node: { type: 'math', value: '\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}' }
  ↓
rehypeKatex processes math node
  ↓
KaTeX renders to HTML: <span class="katex-display">...</span>
```

---

### 6. **Final Rendering (React Components)**

**Location:** `frontend/src/components/MarkdownRenderer/MarkdownRenderer.tsx` (line 697-782)

```typescript
components={{
  // Custom paragraph component detects display math
  p: ({ children }) => {
    const hasDisplayMath = /* check for katex-display */;
    const className = hasDisplayMath 
      ? 'markdown-p markdown-p-display-math'  // ← Centers math
      : 'markdown-p';
    return <p className={className}>{children}</p>;
  },
  // ... other custom components
}}
```

**CSS Styling:**
```css
/* Centers display math blocks */
.markdown-p-display-math {
  text-align: center !important;
}

.katex-display {
  margin: 1.5rem auto !important;
  text-align: center !important;
  white-space: nowrap;  /* ← Keeps math on one line */
}
```

---

## Complete Flow Diagram

```
Database (PostgreSQL/MySQL)
  ↓
Backend API (/subtopics/{id}/content)
  ↓
Frontend API Call (getSubtopicContent)
  ↓
ContentView.transformContentData()
  ↓
contentData.notes = "Raw markdown string from DB"
  ↓
renderMarkdown(contentData.notes)
  ↓
<MarkdownRenderer content={rawString} />
  ↓
preprocessMathExpressions(rawString)
  ├─ convertChatGPTMathBlocks()  // [math] → $$...$$
  ├─ convertChatGPTBracketsMath()  // inline [math]
  └─ handleBoxedCommands()  // \boxed{}
  ↓
ReactMarkdown with remarkMath + rehypeKatex
  ├─ Parses markdown structure
  ├─ Detects $$...$$ blocks
  └─ Converts LaTeX to KaTeX HTML
  ↓
React Components (custom paragraph, headings, etc.)
  ↓
CSS Styling (centering, colors, spacing)
  ↓
Final Rendered HTML in Browser
```

---

## Key Points

1. **No Mutation of DB Data**: The raw string from database is never modified in storage
2. **Preprocessing is Temporary**: Only happens during render, original data stays intact
3. **Math Detection**: `remarkMath` plugin automatically detects `$$...$$` blocks
4. **KaTeX Rendering**: `rehypeKatex` converts LaTeX syntax to rendered math
5. **CSS Controls Layout**: Centering and spacing handled by CSS, not preprocessing

---

## Example: Full Transformation

**Database Content:**
```
Here is **one simple problem** from **Limits and Continuity**.

**Question:**
Evaluate the limit
[
\lim_{x \to 2} \frac{x^2 - 4}{x - 2}
]

**Solution:**
Factor the numerator:
[
x^2 - 4 = (x - 2)(x + 2)
]
```

**After Preprocessing:**
```
Here is **one simple problem** from **Limits and Continuity**.

**Question:**
Evaluate the limit

$$
\lim_{x \to 2} \frac{x^2 - 4}{x - 2}
$$

**Solution:**
Factor the numerator:

$$
x^2 - 4 = (x - 2)(x + 2)
$$
```

**After Markdown Parsing:**
- `**text**` → `<strong>text</strong>`
- `$$...$$` → `<span class="katex-display">...</span>` (rendered math)

**Final HTML Output:**
- Bold text rendered
- Math expressions centered and rendered by KaTeX
- Proper spacing and layout

