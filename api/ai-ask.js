export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ message: 'Missing GEMINI_API_KEY' });
  }

  try {
    const { question, dashboardData } = req.body;

    const prompt = `
You are a smart business analyst for a flower ecommerce dashboard.

Answer the user's question ONLY using the dashboard data below.

Rules:
- Be direct.
- If the user asks numbers, calculate from data.
- If data is missing, say what is missing.
- Keep answers short unless user asks for detail.
- Give practical business insights when useful.

USER QUESTION:
${question}

DASHBOARD DATA:
${JSON.stringify(dashboardData, null, 2)}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No response received.';

    res.status(200).json({ answer });
  } catch (error) {
    res.status(500).json({
      message: 'AI request failed',
      error: error.message,
    });
  }
}