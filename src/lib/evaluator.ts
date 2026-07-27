export function evaluateFormula(expression: string, variables: Record<string, any>): number | null {
  try {
    const normalizedVars: Record<string, number> = {};
    for (const [k, v] of Object.entries(variables)) {
      const num = Number(v);
      normalizedVars[k.toLowerCase().replace(/\s+/g, '')] = !isNaN(num) ? num : 0;
    }

    const cleanExpr = expression.replace(/\s+/g, '');
    const tokens = tokenize(cleanExpr);
    let pos = 0;

    function parseExpression(): number {
      let val = parseTerm();
      while (pos < tokens.length && (tokens[pos] === '+' || tokens[pos] === '-')) {
        const op = tokens[pos++];
        const right = parseTerm();
        if (op === '+') val += right;
        else val -= right;
      }
      return val;
    }

    function parseTerm(): number {
      let val = parseFactor();
      while (pos < tokens.length && (tokens[pos] === '*' || tokens[pos] === '/')) {
        const op = tokens[pos++];
        const right = parseFactor();
        if (op === '*') val *= right;
        else val /= right;
      }
      return val;
    }

    function parseFactor(): number {
      if (pos >= tokens.length) throw new Error("Unexpected end of expression");
      
      const token = tokens[pos++];
      if (token === '(') {
        const val = parseExpression();
        if (tokens[pos++] !== ')') throw new Error("Missing closing parenthesis");
        return val;
      }
      
      if (!isNaN(Number(token))) {
        return Number(token);
      }
      
      const lowerToken = token.toLowerCase();
      if (normalizedVars[lowerToken] !== undefined) {
        return normalizedVars[lowerToken];
      }

      return 0; 
    }

    if (tokens.length === 0) return null;
    const result = parseExpression();
    if (pos < tokens.length) throw new Error("Unexpected tokens at end of expression");
    return result;
  } catch (e) {
    console.error("Formula evaluation failed", e);
    return null;
  }
}

function tokenize(expr: string): string[] {
  // Matches operators, variables (starts with letter), and numbers (including decimals)
  const regex = /([+\-*/()])|([a-zA-Z_][a-zA-Z0-9_]*)|(\d+(?:\.\d+)?)/g;
  const tokens: string[] = [];
  let match;
  while ((match = regex.exec(expr)) !== null) {
    if (match[0].trim()) {
      tokens.push(match[0]);
    }
  }
  return tokens;
}
