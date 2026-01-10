import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import './MarkdownRenderer.css';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Universal Markdown + LaTeX Renderer
 * 
 * This component renders ChatGPT responses that contain:
 * - Markdown (headings, bold, lists, code blocks, etc.)
 * - LaTeX math (inline: $...$, block: $$...$$)
 * 
 * Features:
 * - Automatically handles ALL LaTeX expressions (limits, fractions, integrals, derivatives, etc.)
 * - Future-proof: any valid LaTeX will render without code changes
 * - Secure: react-markdown sanitizes HTML by default
 * - ChatGPT-like appearance: clean, readable, professional
 */
/**
 * Markdown + MathJax Renderer
 *
 * Renders content exactly as authored with minimal preprocessing:
 * - Converts ChatGPT-style standalone [math] blocks to $$...$$ display math
 * - Handles \boxed{} commands for final answers
 *
 * Content should be correctly formatted with proper MathJax delimiters:
 * - Inline math: $...$
 * - Display math: $$...$$ or [expression] (standalone blocks only)
 */
/**
 * Rule 0: Handle \boxed{} commands - highest priority
 * Converts [ \boxed{...} ] and strips trailing non-math tokens
 * Ensures ONLY pure math goes inside $$...$$ delimiters
 * Also handles operator commands that need \displaystyle
 */
const handleBoxedCommands = (text: string): string => {
  // Process line by line to handle trailing tokens properly
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    // Match [ ... \boxed{...} ... ] optionally followed by trailing tokens
    const boxedPattern = /^\s*\[([^\]]*\s*\\boxed\s*\{[^}]*\}[^\]]*)\]\s*(.*)$/;
    const match = line.match(boxedPattern);

    if (match) {
      const [, boxedContent, trailingTokens] = match;

      // Extract and clean the \boxed{...} content
      let trimmed = boxedContent.trim();
      
      // Remove any existing \displaystyle since display blocks are already in display mode
      trimmed = trimmed.replace(/^\\displaystyle\s+/, '').trim();
      
      // Remove any literal dollar signs from the math content (they shouldn't be in LaTeX)
      // This prevents KaTeX parse errors from malformed delimiters
      trimmed = trimmed.replace(/\$/g, '');
      
      // Check if content contains operator commands
      const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
      const hasOperator = operatorCommands.some(cmd => trimmed.includes(cmd));

      // Use appropriate delimiter based on content
      if (hasOperator) {
        // Use \[ ... \] for operator commands - MathJax always recognizes this
        if (trailingTokens && trailingTokens.trim()) {
          return `\\[${trimmed}\\]\n${trailingTokens.trim()}`;
        } else {
          return `\\[${trimmed}\\]`;
        }
      } else {
        // Use $$...$$ for simple boxed expressions - keeps them working
        if (trailingTokens && trailingTokens.trim()) {
          return `$$${trimmed}$$\n${trailingTokens.trim()}`;
        } else {
          return `$$${trimmed}$$`;
        }
      }
    }

    // No boxed command on this line
    return line;
  });

  return processedLines.join('\n');
};

/**
 * Convert raw LaTeX expressions to inline math or display math
 *
 * Finds bare LaTeX commands (like \lim, \partial) that aren't wrapped in delimiters
 * and wraps them appropriately:
 * - Operator commands (\lim, \partial, \frac, etc.) -> $$...$$ display math
 * - Simple expressions -> $...$ inline math
 * 
 * IMPORTANT: Skips expressions inside square brackets [ ] - those are handled by convertChatGPTBracketsMath
 */
const convertRawLatexToInlineMath = (text: string): string => {
  // Operator commands that require DISPLAY math ($$...$$), not inline ($...$)
  const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
  
  // Process line by line to handle the specific case where \lim appears at start
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    // Skip lines that are just '[' or ']' - these are handled by convertChatGPTMathBlocks
    const trimmedLine = line.trim();
    if (trimmedLine === '[' || trimmedLine === ']') {
      return line;
    }
    
    // Skip if line contains square brackets - let convertChatGPTBracketsMath handle it
    // This ensures operator commands in square brackets get display math, not inline math
    if (/\[[^\]]*\\[a-zA-Z]+[^\]]*\]/.test(line)) {
      return line;
    }
    
    // Skip if line already has proper $$ delimiters (display math)
    if (line.includes('$$')) {
      return line;
    }
    
    // Check if line already has proper $ delimiters (but not literal $$ at start)
    // Skip if it has $ but not the problematic $$ pattern
    if (line.includes('$') && !line.trim().startsWith('$$')) {
      // Check if it's properly delimited (has matching $ pairs) - this means it's already inline math
      const dollarCount = (line.match(/\$/g) || []).length;
      if (dollarCount >= 2 && dollarCount % 2 === 0) {
        // Check if this inline math contains operator commands that should be display math
        const inlineMathRegex = /\$([^$]+)\$/g;
        let hasOperatorInInline = false;
        let modifiedLine = line;
        
        line.replace(inlineMathRegex, (match, mathContent) => {
          const hasOperator = operatorCommands.some(cmd => mathContent.includes(cmd));
          if (hasOperator) {
            hasOperatorInInline = true;
            // Convert inline math with operators to display math
            modifiedLine = modifiedLine.replace(match, `$$${mathContent.trim()}$$`);
          }
          return match;
        });
        
        if (hasOperatorInInline) {
          return modifiedLine;
        }
        
        return line;
      }
    }

    // Check if line contains LaTeX commands
    if (line.includes('\\lim') || line.includes('\\partial') || line.includes('\\int') || 
        line.includes('\\sum') || line.includes('\\frac')) {
      
      // Remove any literal $$ at the start
      line = line.replace(/^\s*\$\$\s*/, '');
      
      // Find the start of the LaTeX expression
      const latexStart = line.search(/\\[a-zA-Z]+/);
      if (latexStart === -1) {
        return line;
      }

      const beforeLatex = line.substring(0, latexStart);
      const latexPart = line.substring(latexStart);
      
      // Check if this is an operator command that needs display math
      const hasOperator = operatorCommands.some(cmd => latexPart.includes(cmd));

      // Find where the math expression ends
      // Look for common words that indicate end of math: exists, is, are, equals, etc.
      const endPattern = /\s+(exists|is|are|important|here|represents?|shows?|gives?|yields?|converges?|diverges?|finite|infinite|defined|undefined)\s/i;
      const endMatch = latexPart.match(endPattern);
      
      if (endMatch && endMatch.index !== undefined) {
        // Math ends before the word
        const mathExpr = latexPart.substring(0, endMatch.index);
        const restOfLine = latexPart.substring(endMatch.index);
        // Use display math for operator commands, inline for others
        const delimiter = hasOperator ? '$$' : '$';
        return beforeLatex + delimiter + mathExpr.trim() + delimiter + restOfLine;
      }
      
      // Try to find where LaTeX ends naturally - look for closing patterns
      // Pattern for expressions ending with "f(x,y))" or "f(a,b))" or "= f(a,b))"
      const closingPattern = /(f\([^)]+\)\)|\)\)|\s+=\s+f\([^)]+\)\))/;
      const closingMatch = latexPart.match(closingPattern);
      
      if (closingMatch && closingMatch.index !== undefined) {
        const endIndex = closingMatch.index + closingMatch[1].length;
        const mathExpr = latexPart.substring(0, endIndex);
        const restOfLine = latexPart.substring(endIndex);
        // Use display math for operator commands, inline for others
        const delimiter = hasOperator ? '$$' : '$';
        // Only wrap if there's actually something after the math
        if (restOfLine.trim().length > 0) {
          return beforeLatex + delimiter + mathExpr.trim() + delimiter + restOfLine;
        } else {
          // No text after, wrap the whole thing
          return beforeLatex + delimiter + latexPart.trim() + delimiter;
        }
      }
      
      // If no clear boundary found, wrap from LaTeX start to end of line
      // This handles cases where the entire expression is mathematical
      // Use display math for operator commands, inline for others
      const delimiter = hasOperator ? '$$' : '$';
      return beforeLatex + delimiter + latexPart.trim() + delimiter;
    }
    
    return line;
  });

  return processedLines.join('\n');
};

/**
 * Convert ChatGPT-style inline math in square brackets to $...$ inline math or $$...$$ display math
 *
 * Similar to parentheses conversion, but for square brackets containing mathematical expressions
 * Only converts square brackets with LaTeX commands, leaving regular text brackets unchanged
 * 
 * IMPORTANT: Operator commands (lim, partial, frac, etc.) need DISPLAY math ($$...$$), not inline ($...$)
 * KaTeX automatically renders $$...$$ blocks in display mode, so operators will render correctly
 * 
 * This function handles inline [math] expressions that appear on the same line as text.
 * Multi-line blocks with [ on one line and ] on another are handled by convertChatGPTMathBlocks.
 */
const convertChatGPTBracketsMath = (text: string): string => {
  // Process line by line to check context
  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    // Skip if line already has math expressions properly delimited (avoid wrapping already-wrapped math)
    // Check if pattern like [$...$] or [$$...$$] exists - this means math is already wrapped
    if (/\[\$[^$]+\$\]/.test(line) || /\[\$\$[^$]+\$\$\]/.test(line)) {
      // Unwrap the incorrect pattern: [$...$] -> $...$ or [$$...$$] -> $$...$$ (remove outer brackets)
      line = line.replace(/\[(\$[^$]+\$)\]/g, '$1');
      line = line.replace(/\[(\$\$[^$]+\$\$)\]/g, '$1');
      return line;
    }

    // Skip lines that are just '[' or ']' - these are handled by convertChatGPTMathBlocks
    const trimmedLine = line.trim();
    if (trimmedLine === '[' || trimmedLine === ']') {
      return line;
    }
    
    // Skip if line is exactly '$$' - this is a display math delimiter
    if (trimmedLine === '$$') {
      return line;
    }
    
    // Skip if line already has $$ delimiters - math is already processed as display math
    // This prevents processing content that was already converted by convertChatGPTMathBlocks
    if (line.includes('$$')) {
      return line;
    }

    // Pattern to match square brackets containing mathematical expressions
    // Matches expressions with LaTeX commands, Unicode math symbols (∂, →, etc.), OR mathematical operators
    // But excludes simple coordinate pairs like [a,b]
    // Note: Using character class for Unicode symbols works, but we also check for them in the content
    const mathInBracketsRegex = /\[([^\]]*(?:\\[a-zA-Z]+|[\^_\{\}=\+\-\*\/]|infty|partial|lim|frac|int|sum|prod|sqrt|sin|cos|tan|log|ln|exp|∂|→|∞|α|β|γ|δ|ε|θ|λ|μ|π|σ|τ|ω)[^\]]*)\]/gu;

    line = line.replace(mathInBracketsRegex, (match, mathContent) => {
      // Skip if already inside math delimiters (contains $)
      if (mathContent.includes('$')) {
        return match;
      }

      // Check for Unicode math symbols that indicate math (even if regex didn't catch them)
      const hasUnicodeMath = /[∂→∞αβγδεθλμπστωΔ∇∑∏∫]/.test(mathContent);

      // Skip simple coordinate pairs or single-letter items
      // Don't convert if it's just letters/numbers separated by commas or single letter
      // Unless it contains Unicode math symbols or mathematical operators
      if (/^[a-zA-Z0-9,\s]+$/.test(mathContent) && !hasUnicodeMath && !/[+\-*\/^=]/.test(mathContent)) {
        // Check if it's a coordinate pair like [a,b] or [x,y]
        if (/^[a-zA-Z]\s*,\s*[a-zA-Z]$/.test(mathContent.trim())) {
          return match; // Keep as is
        }
        // Check if it's a single letter like [D]
        if (/^[a-zA-Z]$/.test(mathContent.trim())) {
          return match; // Keep as is
        }
      }

      let processedContent = mathContent.trim();
      
      // Remove any literal dollar signs from the math content (they shouldn't be in LaTeX)
      // This prevents KaTeX parse errors from malformed delimiters
      processedContent = processedContent.replace(/\$/g, '');
      
      // Convert to display math format - remark-math requires $$ on separate lines
      // This matches ChatGPT's clean formatting where math appears centered on its own line
      const singleLineContent = processedContent.replace(/\n+/g, ' ').trim();
      
      // Format as block-level display math with $$ on separate lines
      // This ensures remark-math recognizes it as display math
      return `\n\n$$\n${singleLineContent}\n$$\n\n`;
    });

    return line;
  });

  return processedLines.join('\n');
};

/**
 * Convert ChatGPT-style inline math in parentheses to $...$ inline math
 *
 * ChatGPT often writes inline math using parentheses (math) instead of $math$
 * This function converts mathematical expressions in parentheses to proper MathJax delimiters
 * while leaving normal text parentheses (like coordinates, domains) unchanged
 */
const convertChatGPTParenthesesMath = (text: string): string => {
  // Process line by line to check context
  const lines = text.split('\n');
  const processedLines = lines.map((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip if line already has math expressions properly delimited (avoid wrapping already-wrapped math)
    // Check if pattern like ($...$) exists - this means math is already wrapped
    if (/\(\$[^$]+\$\)/.test(line)) {
      // Unwrap the incorrect pattern: ($...$) -> $...$ (remove outer parentheses)
      line = line.replace(/\((\$[^$]+\$)\)/g, '$1');
      return line;
    }
    
    // Skip if line is exactly '$$' - this is a display math delimiter
    if (trimmedLine === '$$') {
      return line;
    }
    
    // Skip if line contains $$ delimiters - this is display math that's already processed
    if (line.includes('$$')) {
      return line;
    }
    
    // Check if this line is between two lines that contain $$ (multi-line display math)
    // Look at previous and next lines to see if we're inside a $$...$$ block
    const prevLine = index > 0 ? lines[index - 1].trim() : '';
    const nextLine = index < lines.length - 1 ? lines[index + 1].trim() : '';
    
    // If previous line ends with $$ or next line starts with $$, we're likely inside display math
    if (prevLine.endsWith('$$') || nextLine.startsWith('$$') || 
        prevLine === '$$' || nextLine === '$$') {
      return line; // Don't process - we're inside a display math block
    }
    
    // Skip if line contains LaTeX commands - these are likely part of display math blocks
    // LaTeX commands like \frac, \lim, etc. should be handled as part of math blocks, not inline
    if (/\\[a-zA-Z]+/.test(line)) {
      return line;
    }
    
    // Pattern to match parentheses containing mathematical expressions
    // Matches expressions with LaTeX commands, Unicode math symbols (∂, →, etc.), OR mathematical operators
    // But excludes simple coordinate pairs like (a,b)
    // Note: Using character class for Unicode symbols works, but we also check for them in the content
    const mathInParenthesesRegex = /\(([^)]*(?:\\[a-zA-Z]+|[\^_\{\}=\+\-\*\/]|infty|partial|lim|frac|int|sum|prod|sqrt|sin|cos|tan|log|ln|exp|∂|→|∞|α|β|γ|δ|ε|θ|λ|μ|π|σ|τ|ω)[^)]*)\)/gu;

    line = line.replace(mathInParenthesesRegex, (match, mathContent, offset) => {
      // Skip if already inside math delimiters (contains $)
      if (mathContent.includes('$')) {
        return match;
      }
      
      // Check if this parentheses is inside a LaTeX command structure
      // Look backwards from the match position to see if we're inside \command{...}
      const beforeMatch = line.substring(0, offset);
      
      // Check if there's a LaTeX command before this that might contain it
      // Pattern: \command{...} where ... might contain our parentheses
      const latexCommandPattern = /\\[a-zA-Z]+\s*\{[^}]*$/;
      if (latexCommandPattern.test(beforeMatch)) {
        // We're likely inside a LaTeX command argument - don't convert
        return match;
      }
      
      // Check for Unicode math symbols that indicate math (even if regex didn't catch them)
      const hasUnicodeMath = /[∂→∞αβγδεθλμπστωΔ∇∑∏∫]/.test(mathContent);
      
      // Skip simple coordinate pairs or single-letter items
      // Don't convert if it's just letters/numbers separated by commas or single letter
      // Unless it contains Unicode math symbols or mathematical operators
      if (/^[a-zA-Z0-9,\s]+$/.test(mathContent) && !hasUnicodeMath && !/[+\-*\/^=]/.test(mathContent)) {
        // Check if it's a coordinate pair like (a,b) or (x,y)
        if (/^[a-zA-Z]\s*,\s*[a-zA-Z]$/.test(mathContent.trim())) {
          return match; // Keep as is
        }
        // Check if it's a single letter like (D)
        if (/^[a-zA-Z]$/.test(mathContent.trim())) {
          return match; // Keep as is
        }
      }
      
      // Convert (math) to $math$
      return `$${mathContent}$`;
    });
    
    return line;
  });

  return processedLines.join('\n');
};

/**
 * Convert ChatGPT-style display math blocks to display math
 *
 * Handles multi-line blocks where:
 * - [ is on its own line
 * - Math content spans one or more lines
 * - ] is on its own line
 * - Blank lines may exist before/after
 * 
 * Formats math blocks cleanly to match ChatGPT's style - centered, on one line, with minimal spacing
 */
const convertChatGPTMathBlocks = (text: string): string => {
  const lines = text.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === '[') {
      const mathLines: string[] = [];
      i++;

      while (i < lines.length && lines[i].trim() !== ']') {
        mathLines.push(lines[i]);
        i++;
      }

      // Skip closing ']'
      if (i < lines.length && lines[i].trim() === ']') {
        i++;
      }

      // Join math content and clean it up
      const mathContent = mathLines.join('\n').trim();
      
      // Remove any existing \displaystyle since display blocks are already in display mode
      let processedContent = mathContent.replace(/^\\displaystyle\s+/, '').trim();
      
      // Remove any literal dollar signs from the math content (they shouldn't be in LaTeX)
      // This prevents KaTeX parse errors from malformed delimiters
      processedContent = processedContent.replace(/\$/g, '');
      
      // Replace newlines with spaces for single-line rendering
      const singleLineContent = processedContent.replace(/\n+/g, ' ').trim();

      // Format as block-level math - use $$...$$ for consistency with KaTeX
      // remark-math requires $$ to be on separate lines for display math
      // Add minimal spacing: one blank line before if previous line has content
      if (result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('');
      }
      
      // Use $$...$$ format on separate lines - this is required by remark-math for display math
      result.push('$$');
      result.push(singleLineContent);
      result.push('$$');
      
      // Add one blank line after for clean separation
      result.push('');
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
};

/**
 * Problem Fixer - Pre-render validation & correction layer
 *
 * Enforces math formatting rules to prevent KaTeX errors:
 * 0. Handle \boxed{} commands (highest priority)
 * 1. Balance math delimiters ($ and $$)
 * 2. Enforce \left / \right pairing
 * 3. Never allow Markdown inside math (#, *, etc.)
 * 4. Auto-wrap bare LaTeX math (safe mode)
 * 5. Block math should be centered
 */
/**
 * Fix literal $$ that appear at start of lines or inline
 */
const fixLiteralDollarSigns = (text: string): string => {
  // Skip processing if we're inside a [math] block - those will be handled by convertChatGPTMathBlocks
  // Check if we're between [ and ] markers
  const lines = text.split('\n');
  let insideMathBlock = false;
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed === '[') {
      insideMathBlock = true;
      return line;
    }
    if (trimmed === ']') {
      insideMathBlock = false;
      return line;
    }
    if (insideMathBlock) {
      return line; // Don't process lines inside [math] blocks
    }
    
    // Replace literal $$ that should be inline math $...$
    // This handles cases where ChatGPT outputs $$ as literal text
    // Pattern: $$ at start (optional number prefix) followed by LaTeX, ending with word like "exists"
    // Match everything from $$ to the word "exists" etc. (but not another $$)
    return line.replace(/(\d+\.\s*)?\$\$([^\n$]*?)(\s+(?:exists|is|are|important|equals?|represents?|shows?|gives?|yields?|converges?|diverges?|finite|infinite|defined|undefined|direction))/gi, (_, prefix = '', mathContent, trailingText) => {
      return (prefix || '') + '$' + mathContent.trim() + '$' + trailingText;
    });
  });
  
  return processedLines.join('\n');
};

/**
 * Convert inline math with operator commands to display math (block-level)
 * This handles cases where expressions were already wrapped in $...$ but contain operators
 * remark-math requires display math blocks to be on separate lines to recognize them properly
 */
const convertInlineMathWithOperators = (text: string): string => {
  const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
  
  // Process line by line to handle block-level formatting
  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    // Skip lines that already have display math $$...$$
    if (line.includes('$$')) {
      return line;
    }
    
    // Check if the entire line is just inline math with operators
    const trimmedLine = line.trim();
    const inlineMathMatch = trimmedLine.match(/^\$([^$]+)\$$/);
    if (inlineMathMatch) {
      const mathContent = inlineMathMatch[1];
      const hasOperator = operatorCommands.some(cmd => mathContent.includes(cmd));
      if (hasOperator) {
        // Convert standalone inline math with operators to block-level display math
        return `\n\n$$${mathContent.trim()}$$\n\n`;
      }
    }
    
    // Process inline math within text (non-standalone)
    return line.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
      // Check if content contains operator commands that need display math
      const hasOperator = operatorCommands.some(cmd => mathContent.includes(cmd));
      if (hasOperator) {
        // Convert to block-level display math with proper spacing
        // This ensures remark-math recognizes it as a block-level math node
        return `\n\n$$${mathContent.trim()}$$\n\n`;
      }
      // Keep as inline math
      return match;
    });
  });
  
  return processedLines.join('\n');
};

const preprocessMathExpressions = (text: string): string => {
  if (!text) return text;

  let processed = text;

  // First, fix literal $$ that should be inline math $...$
  processed = fixLiteralDollarSigns(processed);

  // Convert ChatGPT-style standalone [math] blocks to $$...$$ display math
  processed = convertChatGPTMathBlocks(processed);

  // Convert raw LaTeX expressions to inline math or display math
  processed = convertRawLatexToInlineMath(processed);

  // Convert ChatGPT-style inline math in parentheses to $...$ inline math
  processed = convertChatGPTParenthesesMath(processed);

  // Convert ChatGPT-style inline math in square brackets to display or inline math
  processed = convertChatGPTBracketsMath(processed);

  // Handle \boxed{} commands for final answers
  processed = handleBoxedCommands(processed);
  
  // Final pass: Convert any remaining inline math with operators to display math
  processed = convertInlineMathWithOperators(processed);
  
  // Clean up excessive blank lines (more than 2 consecutive blank lines -> 2 blank lines)
  processed = processed.replace(/\n{3,}/g, '\n\n');

  return processed;
};


export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '' 
}) => {
  if (!content || content.trim() === '') {
    return <p className="markdown-empty">No content available</p>;
  }

  // Preprocess content to convert square-bracket math to LaTeX format
  const processedContent = preprocessMathExpressions(content);


  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Custom styling for code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match: RegExpExecArray | null = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <pre className="markdown-code-block">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="markdown-inline-code" {...props}>
                {children}
              </code>
            );
          },
          // Custom styling for headings
          h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
          h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
          // Custom styling for paragraphs
          // Check if paragraph contains only display math and style accordingly
          p: ({ children }) => {
            // Check if children contain display math (katex-display)
            const childrenArray = React.Children.toArray(children);
            let hasDisplayMath = false;
            
            // Check each child to see if it contains display math
            childrenArray.forEach((child: any) => {
              if (typeof child === 'object' && child !== null) {
                const props = child.props || {};
                const className = props.className || '';
                
                // Check if this is a display math element
                if (className.includes('katex-display')) {
                  hasDisplayMath = true;
                } else if (props.children) {
                  // Recursively check children
                  const nestedChildren = React.Children.toArray(props.children);
                  nestedChildren.forEach((c: any) => {
                    if (typeof c === 'object' && c !== null) {
                      const cProps = c.props || {};
                      const cClassName = cProps.className || '';
                      if (cClassName.includes('katex-display')) {
                        hasDisplayMath = true;
                      }
                    }
                  });
                }
              }
            });
            
            // If paragraph contains display math, add special class for centering
            // Center if it has display math (even if mixed with other content)
            const className = hasDisplayMath ? 'markdown-p markdown-p-display-math' : 'markdown-p';
            return <p className={className}>{children}</p>;
          },
          // Custom styling for lists
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
          // Custom styling for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="markdown-blockquote">{children}</blockquote>
          ),
          // Custom styling for links
          a: ({ href, children }) => (
            <a href={href} className="markdown-link" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Custom styling for tables
          table: ({ children }) => (
            <div className="markdown-table-wrapper">
              <table className="markdown-table">{children}</table>
            </div>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

