import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

// Initialize the OpenAI model
const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.3,
  apiKey: process.env.OPENAI_API_KEY,
});

// Map incident categories to meaningful service names
const SERVICE_NAMES = {
  payment: 'Payment Service',
  shipping: 'Shipping Service',
  bug: 'Application Service',
  auth: 'Auth Service',
  notification: 'Notification Service',
  other: 'Backend Service',
};

// Define the prompt template for diagram generation
const diagramPrompt = PromptTemplate.fromTemplate(`
You are an SRE system diagram expert specializing in Saleor e-commerce architecture. Generate a clear architecture diagram based on the Saleor codebase.

Incident details:
- Category: {category}
- Priority: {priority}
- Summary: {summary}
- Possible cause: {possible_cause}
- Affected service: {service_name}

SALEOR ARCHITECTURE REFERENCE:
{saleor_context}

DIAGRAM RULES:
1. Base flow: User → Frontend → API Gateway → {service_name} → Database
2. Include Saleor-specific modules from the code context
3. Mark the failure point as (FAIL) based on the incident
4. For payment incidents: show payment gateway integration
5. For warehouse/product incidents: show warehouse models and stock sync
6. For checkout incidents: show checkout flow with payment processing

The diagram_description must explain the flow, affected Saleor modules, and failure point.
The image_prompt must create a professional Saleor architecture diagram with the failure highlighted in red.

Return a valid JSON object with exactly these two fields:
- diagram_description: A plain English explanation of the Saleor system flow and failure point
- image_prompt: A detailed prompt for image generation showing the Saleor architecture diagram

Return ONLY the JSON object, no other text.
`);

// Create the output parser
const parser = new JsonOutputParser();

// Create the diagram chain
export const diagramChain = diagramPrompt.pipe(model).pipe(parser);

/**
 * Run the diagram agent on incident data
 * @param {{ category: string, priority: string, summary: string, possible_cause: string }} incident
 * @returns {Promise<{ diagram_description: string, image_prompt: string }>}
 */
export async function runDiagramAgent(incident, saleorContext = null) {
  const { category, priority, summary, possible_cause } = incident;

  if (!category || !priority || !summary || !possible_cause) {
    throw new Error('Fields category, priority, summary, and possible_cause are required');
  }

  const service_name = SERVICE_NAMES[category?.toLowerCase()] ?? SERVICE_NAMES.other;

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

  const result = await diagramChain.invoke({
    category,
    priority,
    summary,
    possible_cause,
    service_name,
    saleor_context,
  });

  if (!result.diagram_description || !result.image_prompt) {
    throw new Error('Invalid diagram response: missing required fields');
  }

  return {
    diagram_description: result.diagram_description,
    image_prompt: result.image_prompt,
  };
}
