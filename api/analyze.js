export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { cv, job } = req.body;
  if (!cv || !job) return res.status(400).json({ error: 'Missing CV or job description' });

  const prompt = `You are a professional CV/resume analyzer. Analyze the following CV against the job description.

CV:
"""
${cv}
"""

Job Description:
"""
${job}
"""

Respond ONLY with a valid JSON object (no markdown, no backticks, no extra text) in this exact format:
{
  "score": <number 0-100>,
  "scoreLabel": "<one of: Weak Match / Fair Match / Good Match / Strong Match / Excellent Match>",
  "scoreSublabel": "<one short sentence explaining the score>",
  "foundKeywords": ["keyword1", "keyword2", ...],
  "missingKeywords": ["keyword1", "keyword2", ...],
  "tips": ["tip1", "tip2", "tip3", "tip4", "tip5"]
}

Rules:
- foundKeywords: important keywords from the job description that ARE in the CV (max 12)
- missingKeywords: important keywords from the job description NOT in the CV (max 12)
- tips: 5 specific actionable tips to improve this CV for this job
- score: honest match score based on skills, experience, keywords overlap`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');

    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
