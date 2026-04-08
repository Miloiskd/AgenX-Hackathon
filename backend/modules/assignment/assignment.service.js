import { getCandidates } from './assignment.query.js';
import { runAssignmentAgent } from './assignment.agent.js';

// Team size by priority
const TEAM_SIZE = {
  lowest: 1,
  low: 1,
  medium: 2,
  high: 3,
  highest: 3,
};

/**
 * Assigns a team to an incident using a hybrid approach:
 *   1. Query SQLite for engineer candidates with relevant skills
 *   2. Call the OpenAI agent to select the best N people
 *
 * @param {Object} incident
 * @param {string} incident.category - 'payment' | 'shipping' | 'bug' | 'other'
 * @param {string} incident.priority - 'high' | 'medium' | 'low'
 * @param {string} incident.summary  - one-line description from triage
 * @returns {Promise<{ team: string[], reason: string, teamSize: number, candidatesEvaluated: number }>}
 */
export async function assignTeam(incident) {
  const { category, priority, summary } = incident;

  if (!category || !priority || !summary) {
    throw new Error('incident must include category, priority, and summary');
  }

  const normalizedPriority = priority.toLowerCase();

  let teamSize = 1;
  if (normalizedPriority.includes('high') || normalizedPriority.includes('critical')) {
    teamSize = 3;
  } else if (normalizedPriority.includes('medium') || normalizedPriority.includes('major')) {
    teamSize = 2;
  }

  console.log(`🔍 Fetching candidates for category="${category}"...`);
  const candidates = await getCandidates(category);
  console.log(`👥 Found ${candidates.length} candidate(s)`);

  console.log(`🤖 Running AI assignment agent (team size: ${teamSize})...`);
  const result = await runAssignmentAgent(incident, candidates, teamSize);

  console.log(`✅ Team assigned:`, result.team);

  return {
    team: result.team,
    reason: result.reason,
    teamSize,
    candidatesEvaluated: candidates.length,
  };
}
