
const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Feature 1: Generate survey questions
router.post("/generate-questions", async (req, res) => {
  try {
    const { topic, count = 5 } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        error: "Please enter a survey topic.",
      });
    }

    const numberOfQuestions = Math.min(
      Math.max(Number(count) || 5, 1),
      10
    );

    const result = await ai.models.generateContent({
model: "gemini-3.5-flash-lite",
      contents: `Generate ${numberOfQuestions} useful survey questions about "${topic.trim()}". Return only a numbered list of questions.`,
    });

    res.json({
      questions: result.text,
    });
  } catch (error) {
    console.error("Question generation error:", error);
    res.status(500).json({
      error: "Could not generate questions. Check your API key and model access.",
    });
  }
});

// Feature 2: Summarize survey responses
router.post("/summarize", async (req, res) => {
  try {
    const { title, questions, responses } = req.body;

    if (!Array.isArray(responses) || responses.length === 0) {
      return res.status(400).json({
        error: "At least one survey response is required.",
      });
    }

    const result = await ai.models.generateContent({
model: "gemini-3.5-flash-lite",     contents: `Analyze and summarize these survey results.

Survey title: ${title || "Untitled survey"}
Questions: ${JSON.stringify(questions || [])}
Responses: ${JSON.stringify(responses)}

Write the summary in simple English.

1. Overall Summary: Explain the results in 2 short sentences.
2. Positive Feedback: What did people like?
3. Problems: Mention unclear answers or concerns.
4. Suggestions: Give 2 useful improvements.
5. Total Responses: State the number of responses.

Use short bullet points and simple words.
Do not make up information.
If there is only one response, clearly mention that the results represent only one person.
If an answer is unclear, say it is unclear. Do not guess.

Format the summary using these rules:
- Use headings for numbered sections, like ### 1. Overall Summary
- Never put numbered section headings inside bullet points.
- Use bullet points only for details under each heading.
- Keep paragraphs and bullet points short.
- Do not use nested lists.
- Use consistent formatting throughout.
- Avoid blank lines between every bullet or section.
`,
    });

    res.json({
      summary: result.text,
    });
  } catch (error) {
    console.error("Summary error:", error.message);
    res.status(500).json({
      error: "Could not summarize responses. Check your API key and model access.",
    });
  }
});

module.exports = router;
