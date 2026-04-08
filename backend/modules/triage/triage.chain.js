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
You are a support ticket triage agent. Analyze the following user input and classify it.

Return a valid JSON object with exactly these fields:
- category: One of ["payment", "shipping", "order", "product", "bug", "other"]
  • payment  — payment failures, charges, refunds, billing disputes, gateway errors
  • shipping  — delivery problems, tracking issues, fulfillment delays, lost packages
  • order     — order creation, cancellation, status, or checkout issues
  • product   — product availability, stock, pricing, or catalog issues
  • bug       — technical errors, crashes, or unexpected behavior unrelated to e-commerce
  • other     — anything that does not fit the above categories
- priority: One of ["high", "medium", "low"]
- summary: A brief one-line summary (max 100 characters)

User Input: {input}

Return ONLY the JSON object, no other text.
`);

// Create the output parser
const parser = new JsonOutputParser();

// Create the triage chain
export const triageChain = triagePrompt
  .pipe(model)
  .pipe(parser);

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
