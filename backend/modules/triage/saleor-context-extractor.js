/**
 * Saleor Context Extractor
 *
 * Automatically extracts relevant code, files, and logic from the Saleor repository
 * to provide grounded, technical context for incident analysis.
 *
 * When a user reports an issue (e.g., "payment button not working"), this module:
 * 1. Identifies relevant components/modules in Saleor
 * 2. Extracts code snippets and documentation
 * 3. Provides "source of truth" context to the AI for analysis
 */

import fs from 'fs';
import path from 'path';

// Saleor repository structure:
// - Local dev (node from /backend): ../saleor
// - Docker: mount host ./saleor at /saleor and set SALEOR_REPO_ROOT=/saleor
const SALEOR_ROOT = process.env.SALEOR_REPO_ROOT
  ? path.resolve(process.env.SALEOR_REPO_ROOT)
  : path.resolve(process.cwd(), '../saleor');

// Keyword mappings to Saleor components (English + Spanish)
// Paths are relative to SALEOR_ROOT, which points to /Proyecto/saleor
const KEYWORD_MAPPING = {
  // Payment-related (English/Spanish)
  payment: [
    'saleor/payment',
    'saleor/graphql/mutations/payment.py',
    'saleor/plugins/manager.py',
  ],
  pago: ['saleor/payment', 'saleor/graphql/mutations/payment.py'],
  
  checkout: [
    'saleor/checkout',
    'saleor/graphql/schema/checkout',
    'saleor/core/checkout.py',
  ],
  carrito: ['saleor/checkout', 'saleor/graphql/schema/checkout'],
  
  button: [
    'saleor/graphql',
    'saleor/checkout',
  ],
  botón: ['saleor/graphql', 'saleor/checkout'],
  
  cart: [
    'saleor/checkout',
    'saleor/graphql/schema/checkout',
  ],
  
  order: [
    'saleor/order',
    'saleor/graphql/schema/orders',
  ],
  orden: ['saleor/order', 'saleor/graphql/schema/orders'],
  
  gateway: [
    'saleor/payment',
    'saleor/plugins',
    'saleor/payment/gateways',
  ],
  
  api: [
    'saleor/graphql',
    'saleor/core/middleware.py',
  ],
  
  product: [
    'saleor/product',
    'saleor/warehouse',
    'saleor/graphql/schema/products',
  ],
  producto: [
    'saleor/product',
    'saleor/warehouse',
    'saleor/graphql/schema/products',
  ],
  
  stock: [
    'saleor/warehouse',
    'saleor/product',
  ],
  inventario: [
    'saleor/warehouse',
    'saleor/product',
  ],
  
  shipping: [
    'saleor/shipping',
    'saleor/graphql/schema/shipping',
    'saleor/warehouse',
  ],
  envío: ['saleor/shipping', 'saleor/warehouse'],
  
  refund: [
    'saleor/payment',
    'saleor/order',
  ],
  reembolso: ['saleor/payment', 'saleor/order'],
};

// Severity keywords that indicate critical issues
const SEVERITY_KEYWORDS = {
  critical: [
    'broken', 'crash', 'down', 'not working', 'completely blocked',
    'all users', 'system-wide', 'payment failing', 'checkout broken',
    'roto', 'crash', 'caído', 'no funciona', 'bloqueado',
    'todos los usuarios', 'en todo el sistema', 'pagos fallando',
  ],
  high: [
    'error', 'fail', 'timeout', 'cannot', 'unable to',
    'declined', 'rejected', 'blocked', 'no puede', 'no se puede',
    'rechazado', 'fallo', 'error', 'tiempo de espera',
  ],
};

// ─── File Search Utilities ───────────────────────────────────────────────────

/**
 * Search for files in Saleor by pattern
 * @param {string} pattern - File name or glob pattern
 * @param {string} baseDir - Directory to search in
 * @returns {string[]} - Array of file paths
 */
function findFiles(pattern, baseDir = SALEOR_ROOT) {
  const results = [];
  if (!fs.existsSync(baseDir)) return results;

  const search = (dir) => {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);

        if (stat.isDirectory()) {
          if (!file.startsWith('.') && file !== 'node_modules') {
            search(filepath);
          }
        } else if (file.includes(pattern) || pattern.includes('*')) {
          results.push(filepath);
        }
      }
    } catch (err) {
      // Skip permission errors
    }
  };

  search(baseDir);
  return results.slice(0, 5); // Limit results
}

/**
 * Read file safely with line limit
 * @param {string} filepath - File path
 * @param {number} maxLines - Max lines to read
 * @returns {Object} - { content, lines, truncated }
 */
function readFileSnippet(filepath, maxLines = 50) {
  try {
    if (!fs.existsSync(filepath)) return null;

    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');

    return {
      file: filepath.replace(SALEOR_ROOT, '').replace(/^\//, ''),
      lines: lines.length,
      content: lines.slice(0, maxLines).join('\n'),
      truncated: lines.length > maxLines,
      totalLines: lines.length,
    };
  } catch (err) {
    console.warn(`⚠️ Failed to read ${filepath}:`, err.message);
    return null;
  }
}

/**
 * Search for keywords in file content
 * @param {string} filepath - File to search
 * @param {string} keyword - Keyword to find
 * @returns {Object} - Match details with context
 */
function searchInFile(filepath, keyword) {
  try {
    if (!fs.existsSync(filepath)) return null;

    const content = fs.readFileSync(filepath, 'utf-8');
    const lines = content.split('\n');
    const matches = [];

    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(keyword.toLowerCase())) {
        matches.push({
          lineNumber: idx + 1,
          content: line.trim(),
          context: lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 3)),
        });
      }
    });

    return matches.length > 0 ? matches : null;
  } catch (err) {
    return null;
  }
}

// ─── Context Extraction ──────────────────────────────────────────────────────

/**
 * Determine severity level based on keywords
 * @param {string} incidentText
 * @returns {string} - 'high' | 'medium' | 'low'
 */
function detectSeverityKeywords(incidentText) {
  const text = incidentText.toLowerCase();

  for (const keyword of SEVERITY_KEYWORDS.critical) {
    if (text.includes(keyword)) return 'critical';
  }

  for (const keyword of SEVERITY_KEYWORDS.high) {
    if (text.includes(keyword)) return 'high';
  }

  return 'medium';
}

/**
 * Extract relevant Saleor files based on incident keywords
 * @param {string} incidentText
 * @returns {string[]} - Paths to potentially relevant files
 */
function extractRelevantPaths(incidentText) {
  const text = incidentText.toLowerCase();
  const relevant = new Set();

  for (const [keyword, paths] of Object.entries(KEYWORD_MAPPING)) {
    if (text.includes(keyword)) {
      paths.forEach((p) => relevant.add(p));
    }
  }

  return Array.from(relevant);
}

/**
 * Get actual files from Saleor that match extracted paths
 * @param {string[]} pathPatterns - Patterns from extractRelevantPaths
 * @returns {string[]} - Actual file paths
 */
function findMatchingFiles(pathPatterns) {
  const found = new Set();

  for (const pattern of pathPatterns) {
    const baseDir = path.join(SALEOR_ROOT, pattern);
    if (fs.existsSync(baseDir)) {
      const stat = fs.statSync(baseDir);
      if (stat.isDirectory()) {
        // Find Python/JS files in this directory
        const files = fs.readdirSync(baseDir);
        files
          .filter(
            (f) => f.endsWith('.py') || f.endsWith('.ts') || f.endsWith('.js')
          )
          .slice(0, 3)
          .forEach((f) => found.add(path.join(baseDir, f)));
      } else {
        found.add(baseDir);
      }
    }
  }

  return Array.from(found);
}

/**
 * Main function: Extract Saleor context for incident analysis
 * @param {string} incidentText - User incident description
 * @returns {Promise<Object>} - Rich context with code snippets and documentation
 */
export async function extractSaleorContext(incidentText) {
  const context = {
    extractedAt: new Date().toISOString(),
    incidentSummary: incidentText.substring(0, 200),
    severityIndicators: detectSeverityKeywords(incidentText),
    relevantComponents: [],
    codeSnippets: [],
    documentation: [],
    warnings: [],
  };

  try {
    // Step 1: Check if Saleor repo exists
    if (!fs.existsSync(SALEOR_ROOT)) {
      context.warnings.push(
        'Saleor repository not found. Install with: git clone https://github.com/saleor/saleor.git'
      );
      return context;
    }

    console.log('🔍 Extracting relevant Saleor components...');

    // Step 2: Extract relevant paths
    const pathPatterns = extractRelevantPaths(incidentText);
    context.relevantComponents = pathPatterns;

    if (pathPatterns.length === 0) {
      context.warnings.push(
        'No specific component match. Consider adding more keywords to incident description.'
      );
      return context;
    }

    // Step 3: Find actual files
    console.log(`📁 Searching for ${pathPatterns.length} component(s)...`);
    const matchingFiles = findMatchingFiles(pathPatterns);

    // Step 4: Extract code snippets
    for (const filepath of matchingFiles.slice(0, 3)) {
      const snippet = readFileSnippet(filepath, 40);
      if (snippet) {
        context.codeSnippets.push(snippet);
        console.log(`✅ Extracted: ${snippet.file}`);
      }
    }

    // Step 5: Look for README or documentation
    const docsPath = path.join(SALEOR_ROOT, 'README.md');
    if (fs.existsSync(docsPath)) {
      const docSnippet = readFileSnippet(docsPath, 30);
      if (docSnippet) context.documentation.push(docSnippet);
    }

    console.log(`✅ Saleor context extracted (${context.codeSnippets.length} snippets)`);
    return context;
  } catch (err) {
    console.error('❌ Error extracting Saleor context:', err.message);
    context.warnings.push(`Error: ${err.message}`);
    return context;
  }
}

/**
 * Format extracted context for AI consumption
 * @param {Object} saleorContext - Output from extractSaleorContext
 * @returns {string} - Formatted context string for prompt
 */
export function formatContextForAI(saleorContext) {
  let formatted = '';

  if (saleorContext.relevantComponents.length > 0) {
    formatted += `## Relevant Saleor Components\n`;
    formatted += saleorContext.relevantComponents.map((c) => `- ${c}`).join('\n');
    formatted += '\n\n';
  }

  if (saleorContext.codeSnippets.length > 0) {
    formatted += `## Code References from Saleor\n`;
    for (const snippet of saleorContext.codeSnippets) {
      formatted += `### File: ${snippet.file} (${snippet.lines} lines)\n`;
      formatted += '```\n';
      formatted += snippet.content;
      formatted += '\n```\n';
      if (snippet.truncated) {
        formatted += `_... (${snippet.totalLines - 50} more lines)_\n`;
      }
      formatted += '\n';
    }
  }

  if (saleorContext.warnings.length > 0) {
    formatted += `## Warnings\n`;
    formatted += saleorContext.warnings.map((w) => `⚠️ ${w}`).join('\n');
  }

  return formatted;
}

export default {
  extractSaleorContext,
  formatContextForAI,
  detectSeverityKeywords,
  extractRelevantPaths,
};
