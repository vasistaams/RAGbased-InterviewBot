const fetchAPI = typeof fetch !== 'undefined' ? fetch : (...args) => import('node-fetch').then(({default: f}) => f(...args));
async function test() {
  try {
    const prompt = `
You are an expert ATS (Applicant Tracking System) simulator and senior technical recruiter. 
Evaluate this resume strictly against the provided job description.
Be HARSH but FAIR. An average resume should score 40-60. Only perfect matches score 80+.

Return ONLY valid JSON matching exactly this schema, no markdown blocks, no extra text:
{
  "overallScore": 45,
  "keywordMatchPercentage": 30,
  "matchedKeywords": ["React", "TypeScript"],
  "missingKeywords": ["Node.js", "Docker", "AWS"],
  "sections": {
    "contact": { "score": 20, "max": 20, "issues": [], "suggestions": [] }
  },
  "criticalIssues": [
    { "issue": "Missing measurable impact", "fix": "Quantify bullet points with numbers and metrics." }
  ]
}

- Extract actual keywords, do NOT use keyword1, keyword2.
- criticalIssues must highlight the 2-4 most important failures.

Resume Text: Software Engineer React Node AWS 3 years experience.
Job Description: Required: Software Engineer React Node Docker Kubernetes.
`;
    const res = await fetchAPI('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'phi3', prompt, stream: false, format: 'json', options: { num_predict: 200, temperature: 0.1 } })
    });
    const d = await res.json();
    console.log(d.response);
  } catch(e) { console.error('Error:', e); }
}
test();
