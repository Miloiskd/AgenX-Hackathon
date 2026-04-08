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
You are an SRE system diagram expert. Given an incident, generate a clear description and an optimized image generation prompt for a system architecture diagram.

Incident details:
- Category: {category}
- Priority: {priority}
- Summary: {summary}
- Possible cause: {possible_cause}
- Affected service: {service_name}

Rules:
1. The flow must follow this sequence: User → Frontend → API → {service_name} → External API → Database
2. Identify the failure point from the possible_cause and mark it clearly as (FAIL)
3. The diagram_description must explain the flow and where the failure occurs in plain English
4. The image_prompt must instruct the image model to create: a clean, professional, minimalist software architecture diagram on a white background, with labeled boxes and arrows, failure point highlighted in red

Return a valid JSON object with exactly these two fields:
- diagram_description: a plain English sentence describing the system flow and failure point
- image_prompt: a detailed prompt for an image generation model (Nano Banana) that produces the architecture diagram

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
export async function runDiagramAgent(incident) {
  const { category, priority, summary, possible_cause } = incident;

  if (!category || !priority || !summary || !possible_cause) {
    throw new Error('Fields category, priority, summary, and possible_cause are required');
  }

  const service_name = SERVICE_NAMES[category?.toLowerCase()] ?? SERVICE_NAMES.other;

  const result = await diagramChain.invoke({
    category,
    priority,
    summary,
    possible_cause,
    service_name,
  });

  if (!result.diagram_description || !result.image_prompt) {
    throw new Error('Invalid diagram response: missing required fields');
  }

  return {
    diagram_description: result.diagram_description,
    image_prompt: result.image_prompt,
  };
}
