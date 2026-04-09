import { runDiagramAgent } from './diagram.agent.js';

/**
 * Generate a system diagram prompt from incident data + Saleor context
 * @param {{ category: string, priority: string, summary: string, possible_cause: string }} incident
 * @param {Object} saleorContext - Saleor code context for accurate diagramming
 * @returns {Promise<{ diagram_description: string, image_prompt: string }>}
 */
export async function generateDiagram(incident, saleorContext = null) {
  try {
    console.log('📊 Generating diagram for incident:', incident.summary);
    const result = await runDiagramAgent(incident, saleorContext);
    console.log('✅ Diagram prompt generated');
    return result;
  } catch (error) {
    console.error('Error generating diagram:', error.message);
    throw new Error(`Diagram generation failed: ${error.message}`);
  }
}
