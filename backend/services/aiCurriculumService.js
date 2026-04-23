const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

/**
 * Generate a full curriculum tree from course metadata + JD.
 * Returns structured JSON that maps to ai_course_modules → topics → lessons.
 */
async function generateCurriculum({
  title,
  domain,
  roleFocus,
  jdText,
  skills,
  audience,
  level,
  learningGoal,
  durationWeeks,
  dailyHours,
  contentPreference,
}) {
  const skillsList = skills?.length
    ? skills.map((s) => `${s.name} (${s.category})`).join(', ')
    : 'to be determined from JD';

  const prompt = `You are an expert curriculum designer for a job-focused Learning Management System.

Design a complete, job-aligned course curriculum based on the following inputs:

**Course Title:** ${title}
**Domain:** ${domain}
**Target Role:** ${roleFocus}
**Audience:** ${audience}
**Level:** ${level}
**Learning Goal:** ${learningGoal}
**Duration:** ${durationWeeks ? `${durationWeeks} weeks` : 'flexible'}
**Daily Time:** ${dailyHours ? `${dailyHours} hours/day` : 'flexible'}
**Content Style:** ${contentPreference || 'balanced'}
**Key Skills to Cover:** ${skillsList}
${jdText ? `\n**Job Description:**\n${jdText}` : ''}

Generate a curriculum with 4–7 modules. Each module must have 3–6 topics. Each topic must have 2–4 lessons.

Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation):

{
  "modules": [
    {
      "title": "Module title",
      "description": "What this module covers and why it matters for the role",
      "practice_tasks": ["Real-world task 1", "Real-world task 2"],
      "case_studies": ["Case study 1", "Case study 2"],
      "topics": [
        {
          "title": "Topic title",
          "description": "Brief topic description",
          "lessons": [
            {
              "title": "Lesson title",
              "explanation": "Clear explanation of the concept (2–4 sentences)",
              "example": "Concrete, role-relevant example",
              "activity": "Hands-on activity or task the learner does",
              "interview_questions": ["Interview Q1", "Interview Q2"]
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Every module MUST have practice_tasks and case_studies (minimum 2 each)
- Every lesson MUST have explanation, example, activity, and at least 2 interview_questions
- Content must be tightly aligned to the target role and job description
- Avoid generic filler — every lesson must teach something directly employable
- Level appropriateness: ${level} — calibrate depth accordingly`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 8000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0].message.content;
  const parsed = JSON.parse(content);

  if (!parsed.modules || !Array.isArray(parsed.modules)) {
    throw new Error('AI returned invalid curriculum structure');
  }

  return parsed;
}

/**
 * Regenerate a single lesson block with a specific instruction.
 */
async function regenerateLesson({ lesson, instruction, roleFocus, level }) {
  const prompt = `You are an expert curriculum designer.

Here is an existing lesson:
Title: ${lesson.title}
Explanation: ${lesson.explanation}
Example: ${lesson.example}
Activity: ${lesson.activity}
Interview Questions: ${JSON.stringify(lesson.interview_questions)}

Target role: ${roleFocus}
Level: ${level}
Instruction: ${instruction}

Rewrite this lesson following the instruction. Return ONLY a valid JSON object:
{
  "title": "...",
  "explanation": "...",
  "example": "...",
  "activity": "...",
  "interview_questions": ["...", "..."]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Extract skills from a job description.
 */
async function extractSkillsFromJD(jdText) {
  const prompt = `Extract skills from this job description and categorize them.

Job Description:
${jdText}

Return ONLY a valid JSON object:
{
  "skills": [
    { "name": "Skill name", "category": "technical" },
    { "name": "Tool name", "category": "tools" },
    { "name": "Soft skill", "category": "soft" }
  ]
}

Categories must be exactly: "technical", "tools", or "soft".
Extract 8–20 skills. Focus on what's directly required, not implied.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  return parsed.skills || [];
}

module.exports = { generateCurriculum, regenerateLesson, extractSkillsFromJD };
