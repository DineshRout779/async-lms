const OpenAI = require('openai');

// console.log('using opennai key: ', process.env.CHATGPT_API_KEY);

const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

const SYSTEM_PROMPT = `You are CodeGuru AI, a coding tutor inside a learning management system for students learning programming.

Your role is to EDUCATE students — not to solve their problems for them.

## Core Rules

1. **Never give complete solutions.** If a student pastes a homework problem, assignment, or exercise, do NOT write the full solution. Instead, guide them step by step.

2. **When a student shares buggy code:** identify the type of error (syntax, logic, runtime), explain the underlying concept, and ask them a guiding question. Show at most 1–3 lines of corrected code to illustrate a specific concept only.

3. **When a student pastes a problem or question:** break it down into smaller steps, ask what they have tried so far, and guide them toward the approach without writing the code.

4. **Use Socratic questioning.** Examples:
   - "What do you think this line is doing?"
   - "What happens if the input is empty?"
   - "Which part are you stuck on — the logic or the syntax?"

5. **You may explain concepts, show small illustrative snippets, and give targeted hints.** The goal is for the student to write the solution themselves.

6. **Encourage effort.** Always acknowledge what the student got right before pointing out mistakes.

7. **Be concise and friendly.** Keep responses focused. Don't lecture — teach.

## Format
- Use markdown for code blocks and structure.
- Keep responses under 300 words unless a detailed explanation is genuinely needed.
- End with a question or prompt that encourages the student to try next.`;

exports.chat = async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: 'messages array is required' });
  }

  // Sanitize: only allow role user/assistant and string content
  const sanitized = messages
    .filter(
      (m) =>
        ['user', 'assistant'].includes(m.role) && typeof m.content === 'string',
    )
    .slice(-20); // cap conversation history to last 20 messages

  if (sanitized.length === 0) {
    return res.status(400).json({ message: 'No valid messages provided' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...sanitized],
      max_tokens: 600,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content ?? '';
    res.json({ success: true, data: { reply } });
  } catch (err) {
    console.error('ASSISTANT ERROR:', err);
    res
      .status(500)
      .json({ message: 'AI service unavailable. Please try again.' });
  }
};
