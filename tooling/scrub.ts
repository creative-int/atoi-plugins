const REDACTED = "<redacted>";
const sensitiveField = /^(?:authorization|cookie|set-cookie|code|code[_-]verifier|refresh[_-]token|access[_-]token)$/i;
const sensitiveHeader = /^(?:authorization|cookie|set-cookie)$/i;
const token = /atoi_(service|host|oauth|refresh|code)_[a-z0-9._~+-]+/gi;

function protectedValue(value: unknown) {
  return value === null || value === "" || (typeof value === "string" && /^(?:Bearer\s+)?(?:atoi_(?:service|host|oauth|refresh|code)_)?<redacted>$/i.test(value.trim()));
}

function scrubValue(value: unknown, scrubText: (text: string) => string): unknown {
  if (typeof value === "string") return scrubText(value);
  if (Array.isArray(value)) {
    if (value.length === 2 && typeof value[0] === "string" && sensitiveHeader.test(value[0])) {
      return [value[0], protectedValue(value[1]) ? value[1] : REDACTED];
    }
    return value.map((item, index) => {
      const previous = value[index - 1];
      return typeof previous === "string" && previous.startsWith("--") && sensitiveField.test(previous.slice(2)) && !protectedValue(item)
        ? REDACTED
        : scrubValue(item, scrubText);
    });
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      scrubText(key),
      sensitiveField.test(key) && !protectedValue(item) ? REDACTED : scrubValue(item, scrubText),
    ]));
  }
  return value;
}

function redactLiteral(literal: string) {
  let value: unknown = literal;
  try { value = JSON.parse(literal); } catch {}
  if (protectedValue(value)) return literal;
  return literal.startsWith('"') ? JSON.stringify(REDACTED) : literal.startsWith("'") ? `'${REDACTED}'` : REDACTED;
}

function valueEnd(text: string, start: number): number {
  const first = text[start];
  if (first !== '"' && first !== "'" && first !== "{" && first !== "[") {
    const end = text.slice(start).search(/[,}\]\r\n]/);
    return end < 0 ? text.length : start + end;
  }
  const stack: string[] = [];
  let quote = "";
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (char === "\\") index += 1;
      else if (char === quote) {
        quote = "";
        if (stack.length === 0) return index + 1;
      }
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "{" || char === "[") stack.push(char === "{" ? "}" : "]");
    else if (char === "}" || char === "]") {
      if (stack.pop() !== char) return text.length;
      if (stack.length === 0) return index + 1;
    }
  }
  return text.length;
}

function scrubJsonStrings(text: string, depth: number): string {
  let output = "";
  let cursor = 0;
  for (const match of text.matchAll(/"(?:\\[\s\S]|[^"\\])*"/g)) {
    if (match.index < cursor) continue;
    let value: string;
    try { value = JSON.parse(match[0]); } catch { continue; }
    const after = match.index + match[0].length;
    const separator = text.slice(after).match(/^\s*:\s*/)?.[0];
    if (sensitiveField.test(value) && separator) {
      const start = after + separator.length;
      const end = valueEnd(text, start);
      const literal = text.slice(start, end);
      let field: unknown = literal;
      try { field = JSON.parse(literal); } catch {}
      output += text.slice(cursor, start) + (protectedValue(field) ? literal : JSON.stringify(REDACTED));
      cursor = end;
    } else {
      if (separator) {
        const start = after + separator.length;
        if (text[start] === "{" || text[start] === "[") {
          const end = valueEnd(text, start);
          const literal = text.slice(start, end);
          try {
            const field: unknown = JSON.parse(literal);
            const safe = scrubValue(field, (item) => scrubText(item, depth + 1));
            output += text.slice(cursor, start) + (JSON.stringify(field) === JSON.stringify(safe) ? literal : JSON.stringify(safe));
            cursor = end;
            continue;
          } catch {}
        }
      }
      const safe = scrubText(value, depth + 1);
      output += text.slice(cursor, match.index) + (safe === value ? match[0] : JSON.stringify(safe));
      cursor = after;
    }
  }
  return output + text.slice(cursor);
}

function scrubText(text: string, depth: number): string {
  if (depth > 32) return REDACTED;
  try {
    const value: unknown = JSON.parse(text);
    const safe = scrubValue(value, (item) => scrubText(item, depth + 1));
    return JSON.stringify(value) === JSON.stringify(safe) ? text : JSON.stringify(safe);
  } catch {}

  return scrubJsonStrings(text, depth)
    .replace(/\b(authorization|cookie|set-cookie)([ \t]*:[ \t]*)([^\r\n]*)/gi, (match, key: string, separator: string, value: string) =>
      protectedValue(value) ? match : `${key}${separator}${REDACTED}`,
    )
    .replace(/(^|[?&#;\s"'`])([\w%+-]+)=([^&\s"'`<>#]*)/g, (match, boundary: string, key: string, value: string) => {
      let field: string;
      try { field = decodeURIComponent(key.replaceAll("+", " ")); } catch { return match; }
      if (sensitiveField.test(field)) {
        try {
          if (protectedValue(decodeURIComponent(value.replaceAll("+", " ")))) return match;
        } catch {}
        return `${boundary}${key}=${encodeURIComponent(REDACTED)}`;
      }
      try {
        const decoded = decodeURIComponent(value.replaceAll("+", " "));
        if (decoded === value) return match;
        const safe = scrubText(decoded, depth + 1);
        if (safe !== decoded) return `${boundary}${key}=${encodeURIComponent(safe)}`;
      } catch {}
      return match;
    })
    .replace(/((?:\b(?:authorization|cookie|set-cookie|code|code[_-]verifier|refresh[_-]token|access[_-]token)\s*=|'(?:authorization|cookie|set-cookie|code|code[_-]verifier|refresh[_-]token|access[_-]token)'\s*:)\s*)("(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|[^\s&,;}\]<>"']+)/gi, (match, key: string, value: string) => {
      try {
        if (protectedValue(decodeURIComponent(value))) return match;
      } catch {}
      return `${key}${redactLiteral(value)}`;
    })
    .replace(token, "atoi_$1_<redacted>");
}

export function scrubCredentials(text: string): string {
  return scrubText(text, 0);
}

export function containsCredentials(text: string): boolean {
  return scrubCredentials(text) !== text;
}

export function serializeProof(value: unknown, scrub = scrubCredentials): string {
  return `${JSON.stringify(scrubValue(value, scrub), null, 2)}\n`;
}
