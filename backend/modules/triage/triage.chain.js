import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Initialize the OpenAI model
const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.3,
  apiKey: process.env.OPENAI_API_KEY,
});

// Define the prompt template for triage
const triagePrompt = PromptTemplate.fromTemplate(`
You are an expert SRE (Site Reliability Engineer) and support triage agent specialized in e-commerce systems.

Your task is to analyze a user incident and classify it accurately USING THE PROVIDED SALEOR CODE CONTEXT.

IMPORTANT RULES:
- Be precise and technical
- Do NOT guess if the information is unclear
- MANDATORY: If Saleor code context is provided, you MUST reference it in your analysis
- Use the code files to identify which components are affected
- If the issue relates to e-commerce flows (payments, checkout, orders), prioritize those categories
- If technical failure is detected (errors, crashes), classify as "bug"
- DETECT THE SOURCE: frontend, backend, saleor, infrastructure, or unknown
- Keep the summary concise and informative (max 100 characters)

SYSTEM ARCHITECTURE:
- FRONTEND: React app (agentx) - buttons, forms, UI, animations, navigation
- BACKEND: Node.js/Express server - API, triage chain, workflows
- SALEOR: E-commerce platform - orders, payments, products, customers (external service)
- INFRASTRUCTURE: Database, network, hosting, monitoring

REFERENCE CODE FROM SALEOR REPOSITORY:
{repo_context_section}

INSTRUCTIONS FOR CODE ANALYSIS:
- Review the provided Saleor code carefully
- Identify which module/handler/class the issue affects
- Use file paths and code logic to inform your classification
- This is your SOURCE OF TRUTH - never contradict what you see in the code

CATEGORIES:
- payment  → payment failures, declined cards, refunds, billing issues, payment gateway errors
- shipping → delivery issues, tracking problems, delays, lost packages
- order    → checkout issues, order creation, cancellations, status problems
- product  → stock issues, pricing, catalog problems, product visibility
- bug      → system errors, crashes, unexpected behavior not clearly tied to business flow
- other    → anything else

PRIORITY RULES:
- high   → system broken, payments failing, checkout not working
- medium → partial failure, degraded experience
- low    → minor issue, informational request

USER INPUT:
{input}

OUTPUT FORMAT (JSON ONLY):
Return a JSON object with category, priority, and summary.

Example structure (DO NOT include this in response, ONLY the actual JSON):
category: one of payment, shipping, order, product, bug, other
priority: one of high, medium, low
summary: string max 100 characters

Return ONLY valid JSON.
DO NOT include explanations or markdown.
`);

// Create the output parser
const parser = new JsonOutputParser();

// Create the triage chain
export const triageChain = triagePrompt
  .pipe(model)
  .pipe(parser);

/**
 * Run the triage chain on user input WITH Saleor context
 * @param {string} userInput - The user's support request text
 * @param {Object} saleorContext - Saleor code/documentation context (optional)
 * @returns {Promise<Object>} - Structured triage classification
 */
export async function runTriageChainWithContext(userInput, saleorContext = null) {
  try {
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    // Format Saleor context for AI if provided
    let repo_context_section = '';
    if (saleorContext && saleorContext.codeSnippets?.length > 0) {
      repo_context_section = `SALEOR REPOSITORY CONTEXT (source of truth):
${saleorContext.codeSnippets
  .map(
    (s) => `
File: ${s.file}
\`\`\`
${s.content}
\`\`\`
`
  )
  .join('\n')}`;
    } else {
      repo_context_section = 'No Saleor code context available. Make a logical assessment.';
    }

    const result = await triageChain.invoke({
      input: userInput.trim(),
      repo_context_section,
    });

    // Validate the result structure
    if (!result.category || !result.priority || !result.summary) {
      throw new Error('Invalid triage response: missing required fields');
    }

    // Validate enum values
    const validCategories = ['payment', 'shipping', 'order', 'product', 'bug', 'other'];
    const validPriorities = ['high', 'medium', 'low'];

    if (!validCategories.includes(result.category)) {
      throw new Error(`Invalid category: ${result.category}`);
    }

    if (!validPriorities.includes(result.priority)) {
      throw new Error(`Invalid priority: ${result.priority}`);
    }

    return {
      category: result.category,
      priority: result.priority,
      summary: result.summary.substring(0, 100),
      saleorContext: saleorContext ? saleorContext.relevantComponents : null,
    };
  } catch (error) {
    console.error('Error in triage chain:', error.message);
    throw error;
  }
}

/**
 * Run the triage chain on user input
 * @param {string} userInput - The user's support request text
 * @returns {Promise<Object>} - Structured triage classification
 */
export async function runTriageChain(userInput) {
  try {
    if (!userInput || typeof userInput !== 'string') {
      throw new Error('Input must be a non-empty string');
    }

    const result = await triageChain.invoke({
      input: userInput.trim(),
      repo_context_section: 'No Saleor context provided. Make a logical assessment.',
    });

    // Validate the result structure
    if (!result.category || !result.priority || !result.summary) {
      throw new Error('Invalid triage response: missing required fields');
    }

    // Validate enum values
    const validCategories = ['payment', 'shipping', 'order', 'product', 'bug', 'other'];
    const validPriorities = ['high', 'medium', 'low'];

    if (!validCategories.includes(result.category)) {
      throw new Error(`Invalid category: ${result.category}`);
    }

    if (!validPriorities.includes(result.priority)) {
      throw new Error(`Invalid priority: ${result.priority}`);
    }

    return {
      category: result.category,
      priority: result.priority,
      summary: result.summary.substring(0, 100), // Ensure max length
    };
  } catch (error) {
    console.error('Error in triage chain:', error.message);
    throw new Error(`Triage failed: ${error.message}`);
  }
}
