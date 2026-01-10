/**
 * Math Content Validator and Formatter
 *
 * This utility helps identify and fix improperly formatted mathematical content
 * in your application. It ensures all mathematical expressions are properly wrapped
 * in MathJax delimiters ($...$ or $$...$$).
 */

export interface MathValidationResult {
  content: string;
  issues: MathIssue[];
  suggestions: string[];
}

export interface MathIssue {
  type: 'unwrapped_math' | 'square_brackets' | 'mixed_math_markdown' | 'syntax_error';
  line: number;
  text: string;
  suggestion: string;
}

/**
 * Comprehensive validation and formatting of mathematical content
 */
export const validateAndFormatMathContent = (content: string): MathValidationResult => {
  const issues: MathIssue[] = [];
  const suggestions: string[] = [];
  let formattedContent = content;

  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Check for square brackets containing math
    const squareBracketMatches = line.match(/\[([^\]]+)\]/g);
    if (squareBracketMatches) {
      squareBracketMatches.forEach(match => {
        const content = match.slice(1, -1).trim();
        // Check if content contains mathematical symbols
        if (/\\[a-zA-Z]+|[\^_\{\}\(\)=\+\-\*\/\s]|\\frac|\\lim|\\partial|\\infty|\\int|\\sum|\\prod|\\sqrt/i.test(content)) {
          issues.push({
            type: 'square_brackets',
            line: index + 1,
            text: match,
            suggestion: content.length > 30 || /\n|\\frac|\\lim|\\int|\\sum|\\prod|\\sqrt/.test(content)
              ? `$$${content}$$`
              : `$${content}$`
          });
        }
      });
    }

    // Check for unwrapped LaTeX commands
    const unwrappedLatex = line.match(/(?<!\$)(?<!\$\$)(\\frac|\\lim|\\partial|\\infty|\\int|\\sum|\\prod|\\sqrt|\\nabla)(?![a-zA-Z])/g);
    if (unwrappedLatex && !line.includes('```')) {
      unwrappedLatex.forEach(match => {
        if (!line.includes('$' + match) && !line.includes('$$' + match)) {
          issues.push({
            type: 'unwrapped_math',
            line: index + 1,
            text: match,
            suggestion: `$${match}$`
          });
        }
      });
    }

    // Check for math symbols mixed with markdown
    if (/\*\*.*(\\[a-zA-Z]+|[\^_\{\}\(\)=\+\-\*\/\s]).*\*\*/.test(line)) {
      issues.push({
        type: 'mixed_math_markdown',
        line: index + 1,
        text: line,
        suggestion: 'Separate mathematical expressions from markdown formatting'
      });
    }
  });

  // Generate suggestions
  if (issues.length > 0) {
    suggestions.push(`${issues.length} mathematical formatting issues found`);

    const squareBracketCount = issues.filter(i => i.type === 'square_brackets').length;
    if (squareBracketCount > 0) {
      suggestions.push(`Replace ${squareBracketCount} square bracket expressions with proper math delimiters`);
    }

    const unwrappedCount = issues.filter(i => i.type === 'unwrapped_math').length;
    if (unwrappedCount > 0) {
      suggestions.push(`Wrap ${unwrappedCount} LaTeX commands in math delimiters`);
    }

    suggestions.push('Use $...$ for inline math and $$...$$ for display equations');
    suggestions.push('Example: [x^2 + y^2 = r^2] → $x^2 + y^2 = r^2$');
  } else {
    suggestions.push('All mathematical content appears to be properly formatted! ✅');
  }

  return {
    content: formattedContent,
    issues,
    suggestions
  };
};

/**
 * Auto-fix common mathematical formatting issues
 */
export const autoFixMathContent = (content: string): string => {
  let result = content;

  // Fix square brackets containing math
  result = result.replace(/\[([^\]]+)\]/g, (match, innerContent) => {
    const trimmed = innerContent.trim();

    // Skip if this is a Markdown link
    if (result.includes(match + '(') || result.includes(match + ')')) {
      return match;
    }

    // Check if it contains mathematical symbols
    const hasMathSymbols = /\\[a-zA-Z]+|[\^_\{\}\(\)=\+\-\*\/\s]|\\frac|\\lim|\\partial|\\infty|\\int|\\sum|\\prod|\\sqrt|\\nabla|\\Delta|\\nabla|\\in|\\notin|\\subset|\\supset|\\cup|\\cap|\\to|\\leftarrow|\\rightarrow|\\leftrightarrow|\\forall|\\exists|\\epsilon|\\delta|\\alpha|\\beta|\\gamma|\\lambda|\\mu|\\pi|\\sigma|\\tau|\\omega|\\theta|\\phi|\\psi|\\xi|\\zeta|\\eta|\\rho/i.test(trimmed);

    if (hasMathSymbols) {
      // Determine if it should be display or inline math
      const isComplex = /\n|\\frac|\\lim|\\int|\\sum|\\prod|\\sqrt|\\begin|\\end|[\+\-\*\/\=]{2,}|[a-zA-Z]{20,}/.test(trimmed) || trimmed.length > 30;

      return isComplex ? `$$${trimmed}$$` : `$${trimmed}$`;
    }

    return match;
  });

  // Fix unwrapped LaTeX commands (simple cases)
  result = result.replace(/(?<!\$)(?<!\$\$)(?<!\\)((\\frac\{[^}]+\}\{[^}]+\})|(\\lim[^\s{])|(\\partial[^\s{])|(\\infty)|(\\int[^\s{])|(\\sum[^\s{])|(\\prod[^\s{])|(\\sqrt[^\s{]))(?![a-zA-Z])/g, (match) => {
    if (!result.includes('$' + match) && !result.includes('$$' + match)) {
      return `$${match}$`;
    }
    return match;
  });

  return result;
};

/**
 * Generate a comprehensive report of math formatting status
 */
export const generateMathReport = (content: string): string => {
  const validation = validateAndFormatMathContent(content);

  let report = '# Mathematical Content Validation Report\n\n';

  report += `## Summary\n`;
  report += `- **Issues Found**: ${validation.issues.length}\n`;
  report += `- **Content Length**: ${content.length} characters\n\n`;

  if (validation.issues.length > 0) {
    report += `## Issues Found\n\n`;

    validation.issues.forEach((issue, index) => {
      report += `### Issue ${index + 1}\n`;
      report += `- **Type**: ${issue.type}\n`;
      report += `- **Line**: ${issue.line}\n`;
      report += `- **Text**: \`${issue.text}\`\n`;
      report += `- **Suggestion**: ${issue.suggestion}\n\n`;
    });

    report += `## Suggested Fixes\n\n`;
    validation.suggestions.forEach(suggestion => {
      report += `- ${suggestion}\n`;
    });

    report += `\n## Auto-Fixed Content\n\n\`\`\`\n${autoFixMathContent(content)}\n\`\`\`\n`;
  } else {
    report += `## ✅ All Clear!\n\n`;
    report += `All mathematical content appears to be properly formatted.\n\n`;
  }

  return report;
};
