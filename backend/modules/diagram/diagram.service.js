import { runDiagramAgent } from './diagram.agent.js';

/**
 * Generate a system diagram prompt from incident data
 * @param {{ category: string, priority: string, summary: string, possible_cause: string }} incident
 * @returns {Promise<{ diagram_description: string, image_prompt: string }>}
 */
export async function generateDiagram(incident) {
  try {
    console.log('📊 Generating diagram for incident:', incident.summary);
    const result = await runDiagramAgent(incident);
    console.log('✅ Diagram prompt generated');
    return result;
  } catch (error) {
    console.error('Error generating diagram:', error.message);
    throw new Error(`Diagram generation failed: ${error.message}`);
  }
}
