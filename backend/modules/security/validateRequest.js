/**
 * Validate incoming request data
 */

// Maximum sizes
const MAX_TEXT_LENGTH = 2000; // Max characters in text input
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'text/plain'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file

// Blocked keywords that indicate malicious intent
const BLOCKED_KEYWORDS = [
  'delete all',
  'drop table',
  'make admin',
  'become admin',
  'give admin',
  'hack',
  'malware',
  'virus',
  'dos attack',
  'ddos',
  'kill process',
  'wipe data',
  'rm -rf',
  'format disk',
  'destroy database',
  'corrupt',
  'ransomware',
  'exploit',
  'backdoor',
  'shell access',
];

/**
 * Validate against blocked keywords (malicious intent detection)
 * @param {string} text - Text to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateBlockedKeywords(text) {
  if (typeof text !== 'string') {
    return { valid: true };
  }

  const lowerText = text.toLowerCase();

  for (const keyword of BLOCKED_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return {
        valid: false,
        error: `Your message contains prohibited keywords: "${keyword}". Please rephrase your request without malicious intent.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate text input
 * @param {string} text - Text to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateText(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text field is required and must be a string' };
  }

  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Text cannot be empty' };
  }

  if (trimmed.length > MAX_TEXT_LENGTH) {
    return {
      valid: false,
      error: `Text exceeds maximum length of ${MAX_TEXT_LENGTH} characters`,
    };
  }

  // Check for blocked keywords (malicious intent)
  const keywordValidation = validateBlockedKeywords(trimmed);
  if (!keywordValidation.valid) {
    return keywordValidation;
  }

  return { valid: true };
}

/**
 * Validate a single file
 * @param {object} file - Multer file object
 * @param {string} fieldName - Field name (for error messages)
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateFile(file, fieldName = 'file') {
  if (!file) {
    return { valid: true }; // Optional file
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: `${fieldName} MIME type not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `${fieldName} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check filename for suspicious patterns
  if (file.originalname && /[<>:"|?*]/.test(file.originalname)) {
    return {
      valid: false,
      error: `${fieldName} contains invalid characters in filename`,
    };
  }

  return { valid: true };
}

/**
 * Validate all files in a request
 * @param {object} files - Multer files object
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateFiles(files = {}) {
  const fileList = ['photo', 'logs'];

  for (const fieldName of fileList) {
    if (files[fieldName]) {
      const file = files[fieldName][0];
      const validation = validateFile(file, fieldName);

      if (!validation.valid) {
        return validation;
      }
    }
  }

  return { valid: true };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: true }; // Optional email
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (email.length > 255) {
    return { valid: false, error: 'Email is too long' };
  }

  return { valid: true };
}

/**
 * Comprehensive request validation for /ingest endpoint
 * @param {object} req - Express request object
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateIngestRequest(req) {
  const errors = [];

  // Validate text
  const textValidation = validateText(req.body?.text);
  if (!textValidation.valid) {
    errors.push(textValidation.error);
  }

  // Validate email (optional)
  const emailValidation = validateEmail(req.body?.reporterEmail);
  if (!emailValidation.valid) {
    errors.push(emailValidation.error);
  }

  // Validate files
  const filesValidation = validateFiles(req.files);
  if (!filesValidation.valid) {
    errors.push(filesValidation.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
