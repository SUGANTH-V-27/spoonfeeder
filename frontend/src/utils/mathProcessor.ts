// Utility functions for processing LaTeX math expressions
import { convertLatexToUnicode } from './latexToUnicode';

/**
 * Process math expressions: remove incorrect square brackets and format LaTeX
 * @param text - The text to process
 * @param enableMath - Whether to process math expressions (default: true)
 * @param convertToUnicode - Whether to convert LaTeX to Unicode (for normal format)
 */
export const processMathExpressions = (text: string, enableMath: boolean = true, convertToUnicode: boolean = false): string => {
  if (!text) return text;
  
  // If converting to Unicode (normal format), convert LaTeX commands first
  if (convertToUnicode) {
    text = convertLatexToUnicode(text);
  }
  
  if (!enableMath) return text;
  
  let processed = text;
  
  // First, handle standalone lines that are just [ math content ] - these should be block math
  // Pattern: line starts with [ and ends with ], contains math symbols
  if (/^\s*\[([^\]]+)\]\s*$/.test(processed.trim())) {
    const match = processed.trim().match(/^\s*\[([^\]]+)\]\s*$/);
    if (match) {
      let content = match[1].trim();
      // Remove any "youtube" text
      content = content.replace(/youtube/gi, '').trim();
      // Check if it contains math symbols (including =, ≤, ≥, etc.)
      if (/[\\\^_\{\}\(\)=<>≤≥∈∉∑∏∫√\d\s]/.test(content) && content.length > 2) {
        // Check if content contains operator commands that need \displaystyle
        const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
        const needsDisplayStyle = operatorCommands.some(cmd => content.includes(cmd));
        
        // Add \displaystyle if needed and if not already present
        if (needsDisplayStyle && !content.trim().startsWith('\\displaystyle')) {
          content = `\\displaystyle ${content}`;
        }
        
        // Convert to block math format
        return `$$${content}$$`;
      }
    }
  }
  
  // Remove standalone square brackets on their own line (just [ or ])
  processed = processed.replace(/^\s*\[\s*$/gm, ''); // Remove standalone [
  processed = processed.replace(/^\s*\]\s*$/gm, ''); // Remove standalone ]
  
  // Remove ALL square brackets that contain math symbols (more aggressive)
  // Pattern: [math content] where math content contains LaTeX symbols
  // But preserve actual math notation like [a, b] for intervals ONLY if it's very short and simple
  processed = processed.replace(/\[([^\]]+)\]/g, (match, content) => {
    const trimmedContent = content.trim();
    
    // Check if it's a link pattern [text](url) - don't process those
    const matchIndex = processed.indexOf(match);
    const afterMatch = processed.substring(matchIndex + match.length);
    const isLinkPattern = /^\s*\(/.test(afterMatch);
    
    if (isLinkPattern) {
      return match; // Keep as link
    }
    
    // Check if it's actual math (contains LaTeX or math symbols)
    // Include more math symbols: =, ≤, ≥, ∈, etc.
    const hasMathSymbols = /[\\\^_\{\}\(\)=<>≤≥∈∉∑∏∫√\d\s]/.test(trimmedContent);
    
    // Simple interval notation like [a, b] - keep if very short and no math symbols
    const isSimpleInterval = /^[a-zA-Z0-9,\s]+$/.test(trimmedContent) && trimmedContent.length < 10;
    
    if (hasMathSymbols && !isSimpleInterval) {
      // Remove the brackets and return the math content
      // Always wrap in $$ for block math if it's a standalone expression
      if (trimmedContent.length > 3 && !trimmedContent.includes('http') && !trimmedContent.includes('youtube')) {
        // Check if content contains operator commands that need \displaystyle
        const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
        const needsDisplayStyle = operatorCommands.some(cmd => trimmedContent.includes(cmd));
        
        // Add \displaystyle if needed and if not already present
        let processedContent = trimmedContent;
        if (needsDisplayStyle && !trimmedContent.trim().startsWith('\\displaystyle')) {
          processedContent = `\\displaystyle ${trimmedContent}`;
        }
        
        return `$$${processedContent}$$`;
      }
      return trimmedContent;
    }
    return match; // Keep original if not math
  });
  
  // Convert LaTeX math expressions to MathJax format
  // Handle block math: \[...\] or $$...$$
  processed = processed.replace(/\\\[([^\]]+)\\\]/g, (_match, content) => {
    // Check if content contains operator commands that need \displaystyle
    const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
    const needsDisplayStyle = operatorCommands.some(cmd => content.includes(cmd));
    
    // Add \displaystyle if needed and if not already present
    // Note: \[...\] is already display math, but we add \displaystyle for consistency
    let processedContent = content.trim();
    if (needsDisplayStyle && !processedContent.trim().startsWith('\\displaystyle')) {
      processedContent = `\\displaystyle ${processedContent}`;
    }
    
    return `$$${processedContent}$$`;
  });
  processed = processed.replace(/\$\$([^$]+)\$\$/g, (_match, content) => {
    // Also ensure existing $$...$$ blocks have \displaystyle if needed
    const operatorCommands = ['\\lim', '\\partial', '\\frac', '\\sum', '\\prod', '\\int', '\\oint'];
    const needsDisplayStyle = operatorCommands.some(cmd => content.includes(cmd));
    
    let processedContent = content.trim();
    if (needsDisplayStyle && !processedContent.trim().startsWith('\\displaystyle')) {
      processedContent = `\\displaystyle ${processedContent}`;
    }
    
    return `$$${processedContent}$$`;
  });
  
  // Handle inline math: \(...\) or $...$ (single dollar)
  // Be careful not to match $$ which is block math
  processed = processed.replace(/\\\(([^\)]+)\\\)/g, '\\($1\\)');
  // Only match single $ if it's not part of $$
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, '\\($1\\)');
  
  return processed;
};

/**
 * Check if a line is a standalone math expression (possibly in square brackets)
 */
export const isStandaloneMathLine = (line: string): boolean => {
  const trimmed = line.trim();
  
  // Check if it's just [ math content ]
  if (/^\s*\[([^\]]+)\]\s*$/.test(trimmed)) {
    const match = trimmed.match(/^\s*\[([^\]]+)\]\s*$/);
    if (match) {
      const content = match[1].trim();
      // Check if it contains math symbols
      return /[\\\^_\{\}\(\)=<>≤≥∈∉∑∏∫√\d]/.test(content);
    }
  }
  
  // Check if it's already in math format
  if (/^\s*\$\$/.test(trimmed) || /^\s*\\\[/.test(trimmed)) {
    return true;
  }
  
  // Check if it's a math expression without brackets
  const hasMathSymbols = /[\\\^_\{\}\(\)=<>≤≥∈∉∑∏∫√]/.test(trimmed);
  const isShort = trimmed.length < 200;
  const notOtherFormat = !trimmed.match(/^[#*>\-]/) && !trimmed.includes('http');
  
  return hasMathSymbols && isShort && notOtherFormat;
};

