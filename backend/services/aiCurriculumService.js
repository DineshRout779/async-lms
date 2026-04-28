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
  numModules,
}) {
  const skillsList = skills?.length
    ? skills.map((s) => `${s.name} (${s.category})`).join(', ')
    : 'to be determined from JD';

  const audienceStr = Array.isArray(audience) ? audience.join(', ') : audience || 'students';

  const prompt = `You are an expert curriculum designer for a job-focused Learning Management System (LMS).

The LMS has this EXACT hierarchy that you MUST follow:
  Course → Topics → Units → Subtopics

- **Topic**: A major subject domain within the course (e.g. for a Web Dev course: "JavaScript", "HTML & CSS", "React", "Express.js"). Each topic is like a mini-subject in itself.
- **Unit**: A chapter within a topic (e.g. within "JavaScript": "Variables & Data Types", "Functions & Scope", "Arrays & Objects"). Each unit gets its own Quiz + Assignment when published.
- **Subtopic**: An individual lesson within a unit (e.g. within "Variables & Data Types": "Declaring Variables", "Constants", "Type Conversion"). Each subtopic has a VIDEO + MARKDOWN content + EXERCISE.

Design a complete, job-aligned curriculum for:

**Course Title:** ${title}
**Domain:** ${domain}
**Target Role:** ${roleFocus}
**Target Audience:** ${audienceStr}
**Level:** ${level}
**Learning Goal:** ${learningGoal}
**Duration:** ${durationWeeks ? `${durationWeeks} weeks` : 'flexible'}
**Daily Time:** ${dailyHours ? `${dailyHours} hours/day` : 'flexible'}
**Content Style:** ${contentPreference || 'balanced'}
**Key Skills to Cover:** ${skillsList}
${jdText ? `\n**Job Description:**\n${jdText}` : ''}

Generate ${numModules ? `exactly ${numModules} topics` : '4–7 topics'}. Each topic must have 3–6 units. Each unit must have 2–4 subtopics.

Return ONLY a valid JSON object matching this exact schema (no markdown, no explanation).
The JSON keys use "modules/topics/lessons" as internal names but they map to Topics/Units/Subtopics in the LMS:

{
  "capstone_project": {
    "title": "Final capstone project title — the culminating real-world deliverable for the entire course",
    "description": "What the learner builds end-to-end to prove mastery of everything in the course",
    "instructions": "Detailed step-by-step instructions: what to build, acceptance criteria, submission format, evaluation rubric"
  },
  "modules": [
    {
      "title": "Topic title — a major subject domain (e.g. 'JavaScript Fundamentals', 'HTML & CSS', 'React')",
      "description": "What this topic/subject domain covers and why it matters for the role",
      "practice_tasks": ["Real-world task 1", "Real-world task 2"],
      "case_studies": ["Case study scenario 1", "Case study scenario 2"],
      "topics": [
        {
          "title": "Unit title — a chapter within this topic (e.g. 'Variables & Data Types', 'Functions & Scope')",
          "description": "Brief unit description",
          "assignment": {
            "title": "Assignment title — a graded practical task covering this entire unit",
            "instructions": "Clear step-by-step instructions: what to build/submit, format, criteria",
            "max_score": 100
          },
          "quiz_questions": [
            {
              "question": "Clear multiple-choice question covering a concept from this unit",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct_index": 0,
              "explanation": "Why this answer is correct"
            }
          ],
          "lessons": [
            {
              "title": "Subtopic title — a single lesson concept (e.g. 'Declaring Variables', 'let vs const', 'Type Conversion')",
              "duration_mins": 20,
              "video_url": "https://www.youtube.com/results?search_query=specific+subtopic+tutorial",
              "explanation": "Full markdown explanation — use ## subheadings, bullet points, \`\`\`code blocks\`\`\`. Minimum 4 paragraphs. This is the main reading content shown alongside the video.",
              "example": "Concrete, role-relevant code or concept example",
              "activity": "Short in-lesson activity the learner does immediately",
              "interview_questions": ["Interview Q1 about this subtopic", "Interview Q2 about this subtopic"],
              "exercise": {
                "title": "Exercise title — a real coding/practical task for this subtopic",
                "description": "Clear instructions for what the learner must build or do",
                "tasks": ["Step 1", "Step 2", "Step 3"],
                "starter_code": "// starter code, HTML scaffold, or pseudocode"
              }
            }
          ]
        }
      ]
    }
  ]
}

Rules:
- Topics must be real subject domains for this course (like "JavaScript", "HTML & CSS", "React") — NOT generic names like "Module 1" or "Introduction"
- Units must be specific chapters within the topic (like "Variables & Data Types", "Functions & Scope") — NOT generic like "Unit 1"
- Subtopics must be individual, atomic concepts (like "let vs const", "Arrow Functions") — granular enough to each have its own video
- capstone_project is ONE final project for the entire course — what students complete to earn a certificate
- Every topic (module) MUST have practice_tasks and case_studies (minimum 2 each)
- Every unit (topic) MUST have an assignment (graded, practical, max_score 100)
- Every subtopic (lesson) MUST have ALL of: video_url, explanation, example, activity, interview_questions, exercise — NO quiz_questions inside lessons
- quiz_questions belong ONLY at the unit (topic) level — each unit MUST have 5–10 MCQ questions covering all lessons in that unit
- video_url must be a YouTube search URL: "https://www.youtube.com/results?search_query=" + URL-encoded terms specific to that subtopic and role
- duration_mins: total estimated time for video + reading (15–45 mins)
- quiz_questions: exactly 4 options per question, correct_index (0–3), and explanation
- exercise: one hands-on exercise per subtopic with 3–5 concrete tasks and starter_code
- explanation must be rich markdown — use ## subheadings, bullet lists, and \`\`\`language code blocks\`\`\`
- Level appropriateness: ${level} — calibrate depth and complexity accordingly
- Avoid generic filler — every subtopic must teach something directly employable for ${roleFocus}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 32000,
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
