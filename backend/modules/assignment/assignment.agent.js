import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';

const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.2,
  apiKey: process.env.OPENAI_API_KEY,
});

const assignmentPrompt = PromptTemplate.fromTemplate(`
You are a team assignment agent for an engineering support system.

## INCIDENT
Category : {category}
Priority : {priority}
Summary  : {summary}

## CANDIDATES (from database)
{candidates}

## RULES
- Select EXACTLY {teamSize} person(s) from the candidates list above.
- Do NOT invent or add people not in the list.
- Prioritize candidates with higher skill level and relevant expertise.
- Prefer diverse profiles when the team has more than one member.
- Do NOT exceed the required team size.

## OUTPUT
Return ONLY a valid JSON object with this exact shape — no markdown, no extra text:
{{
  "team": ["Full Name 1", "Full Name 2"],
  "reason": "Brief explanation of why these people were selected"
}}
`);

const parser = new JsonOutputParser();

const assignmentChain = assignmentPrompt.pipe(model).pipe(parser);

/**
 * Calls the OpenAI agent to select a team from the given candidates.
 *
 * @param {Object} incident  - { category, priority, summary }
 * @param {Array}  candidates - rows returned by getCandidates()
 * @param {number} teamSize   - number of people to assign
 * @returns {Promise<{ team: string[], reason: string }>}
 */
export async function runAssignmentAgent(incident, candidates, teamSize) {
  if (candidates.length === 0) {
    return {
      team: [],
      reason: 'No candidates with relevant skills were found in the database.',
    };
  }

  // Format candidates as a readable list for the prompt
  const candidatesText = candidates
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} | Role: ${c.role} | Best skill: ${c.skill_name} (level ${c.level}/5) | Experience: ${c.experience_years} years`
    )
    .join('\n');

  const result = await assignmentChain.invoke({
    category:   incident.category,
    priority:   incident.priority,
    summary:    incident.summary,
    candidates: candidatesText,
    teamSize:   teamSize,
  });

  // Safety: cap team to teamSize even if the model returns more
  if (Array.isArray(result.team) && result.team.length > teamSize) {
    result.team = result.team.slice(0, teamSize);
  }

  return result;
}
