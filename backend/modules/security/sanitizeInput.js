/**
 * Sanitize user input to prevent prompt injection and malicious patterns
 */

// Common prompt injection patterns to remove
const INJECTION_PATTERNS = [
  /ignore\s+previous\s+instructions?/gi,
  /system\s*:/gi,
  /assistant\s*:/gi,
  /ignore\s+the\s+above/gi,
  /tell\s+me\s+how\s+to/gi,
  /forget\s+everything/gi,
  /disregard\s+all\s+previous/gi,
  /new\s+instructions?/gi,
  /sql\s+injection/gi,
  /<script|javascript:/gi,
];

/**
 * Sanitize input by removing injection patterns and trimming whitespace
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();

  // Remove injection patterns
  INJECTION_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Remove excessive whitespace (collapse multiple spaces into one)
  sanitized = sanitized.replace(/\s+/g, ' ').trim();

  return sanitized;
}

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHtml(text) {
  if (typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, (char) => htmlEscapeMap[char]);
}

/**
 * Remove null bytes and control characters
 * @param {string} text - Text to clean
 * @returns {string} Cleaned text
 */
export function removeControlCharacters(text) {
  if (typeof text !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (ASCII 0-31, except tab, newline, carriage return)
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Full sanitization pipeline
 * @param {string} input - User input
 * @returns {string} Fully sanitized input
 */
export function fullSanitize(input) {
  let result = sanitizeInput(input);
  result = removeControlCharacters(result);
  result = escapeHtml(result);
  return result;
}
