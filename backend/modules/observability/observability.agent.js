import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.2,
  apiKey: process.env.OPENAI_API_KEY,
});

const observabilityPrompt = PromptTemplate.fromTemplate(`
You are an SRE observability agent specialized in e-commerce systems. Analyze logs using real Saleor code context.

Ticket Summary: {summary}
Category: {category}
Priority: {priority}

SALEOR ARCHITECTURE REFERENCE:
{saleor_context}

System Logs:
{logs}

ANALYSIS INSTRUCTIONS:
1. Use the provided Saleor code to understand affected components
2. Match log patterns to specific Saleor modules (payment, checkout, product, warehouse, etc.)
3. If logs mention database timeouts, check the warehouse/product models
4. If payment errors, reference saleor/payment modules
5. Cross-reference error codes and patterns with real Saleor code

Analyze the logs and return a valid JSON object with exactly these fields:
- root_cause: A concise description of the root cause detected in the logs (max 200 characters)
- affected_component: Which Saleor module is affected (e.g., "saleor/payment", "saleor/warehouse")
- solution: The recommended solution to fix the root cause (max 300 characters)
- action: One of ["restart_service", "retry_request", "clear_cache", "none"]
  • restart_service — when logs show a crashed, unresponsive, or restarting service (CrashLoopBackOff, service down, process killed)
  • retry_request   — when logs show transient network errors, timeouts, or HTTP 5xx errors from external APIs
  • clear_cache     — when logs show stale cached data, high cache miss rate, or cache invalidation failures
  • none            — ONLY when the issue is a code bug, data corruption, or requires a human decision
- auto_fix: boolean — MUST be true when action is restart_service, retry_request, or clear_cache. MUST be false ONLY when action is none.

IMPORTANT: For timeout errors use retry_request. For service crashes use restart_service. For cache issues use clear_cache. Set auto_fix to true for all three.

Return ONLY the JSON object, no other text.
`);

const parser = new JsonOutputParser();
const observabilityChain = observabilityPrompt.pipe(model).pipe(parser);

const VALID_ACTIONS = ['restart_service', 'retry_request', 'clear_cache', 'none'];

export async function runObservabilityAgent({ logs, summary, category, priority, saleorContext }) {
  try {
    // Format Saleor context for AI
    let saleor_context = '';
    if (saleorContext && saleorContext.codeSnippets?.length > 0) {
      saleor_context = `SALEOR CODE REFERENCE:\n${saleorContext.codeSnippets
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
      saleor_context = 'No specific Saleor code context available.';
    }

    const result = await observabilityChain.invoke({
      logs: logs.trim(),
      summary: summary || 'Unknown incident',
      category: category || 'other',
      priority: priority || 'medium',
      saleor_context,
    });

    if (!VALID_ACTIONS.includes(result.action)) result.action = 'none';

    // Fix: GPT sometimes returns "true"/"false" strings instead of booleans.
    // Also enforce the rule: if action is not 'none', auto_fix must be true.
    const rawAutoFix = result.auto_fix;
    const parsedAutoFix = rawAutoFix === true || rawAutoFix === 'true' || rawAutoFix === 1 || rawAutoFix === '1';
    const auto_fix = result.action !== 'none' ? true : parsedAutoFix;

    return {
      root_cause: (result.root_cause || 'Root cause could not be determined').substring(0, 200),
      solution: (result.solution || 'Manual investigation required').substring(0, 300),
      auto_fix,
      action: result.action,
    };
  } catch (error) {
    console.error('Error in observability agent:', error.message);
    throw new Error(`Observability analysis failed: ${error.message}`);
  }
}
