import { getDbConnection } from '../../db/database.js';

// Maps incident category to relevant skill names in DB
const CATEGORY_SKILLS = {
  payment:  ['Node.js'],
  shipping: ['Node.js', 'AWS / Infraestructura'],
  bug:      ['Node.js', 'React'],
  other:    ['Node.js', 'React', 'AWS / Infraestructura'],
};

/**
 * Returns up to 5 engineer candidates ranked by skill level for the given category.
 *
 * Query strategy:
 *  - JOIN users → user_skills → skills
 *  - Filter by relevant skill names for the category
 *  - Use MAX(level) so each user appears once (best matching skill)
 *  - ORDER BY level DESC, experience_years DESC
 *  - LIMIT 5
 *
 * @param {string} category - 'payment' | 'shipping' | 'bug' | 'other'
 * @returns {Promise<Array>} candidates: [{ id, name, email, role, experience_years, skill_name, level }]
 */
export async function getCandidates(category) {
  const skills = CATEGORY_SKILLS[category] ?? CATEGORY_SKILLS.other;

  // Build placeholders: (?, ?, ...)
  const placeholders = skills.map(() => '?').join(', ');

  const sql = `
    SELECT
      u.id,
      u.name,
      u.email,
      u.role,
      u.experience_years,
      s.name  AS skill_name,
      us.level
    FROM users u
    JOIN user_skills us ON us.user_id  = u.id
    JOIN skills    s  ON s.id         = us.skill_id
    WHERE s.name IN (${placeholders})
    GROUP BY u.id
    HAVING MAX(us.level) = us.level   -- keep the row with the highest skill level
    ORDER BY us.level DESC, u.experience_years DESC
    LIMIT 5
  `;

  const db = await getDbConnection();
  const rows = await db.all(sql, skills);
  await db.close();
  return rows;
}
