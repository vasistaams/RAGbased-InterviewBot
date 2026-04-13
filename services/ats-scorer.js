/**
 * ============================================
 *  Ollama ATS Scorer Service
 * ============================================
 * 
 * Evaluates resumes using local Ollama model.
 */

const crypto = require('crypto');
const http = require('http');

const evaluationCache = new Map();

function getHash(text) {
  return crypto.createHash('md5').update(text).digest('hex');
}

function getGrade(score) {
  if (score >= 90) return { letter: 'A+', label: 'Excellent', color: '#34d399' };
  if (score >= 80) return { letter: 'A', label: 'Very Good', color: '#34d399' };
  if (score >= 70) return { letter: 'B', label: 'Good', color: '#fbbf24' };
  if (score >= 60) return { letter: 'C', label: 'Average', color: '#fb923c' };
  if (score >= 45) return { letter: 'D', label: 'Below Average', color: '#f87171' };
  return { letter: 'F', label: 'Needs Improvement', color: '#ef4444' };
}

function callOllama(prompt) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3',
      prompt: prompt,
      stream: false,
      format: 'json',
      options: {
        num_predict: 200,
        temperature: 0.2,
        top_p: 0.8
      }
    });

    const req = http.request({
      hostname: '127.0.0.1',
      port: 11434,
      path: '/api/generate',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
         try {
           if (res.statusCode >= 400) {
             return reject(new Error(`Ollama error: ${res.statusCode} ${body}`));
           }
           const parsed = JSON.parse(body);
           resolve(parsed.response);
         } catch(e) {
           reject(e);
         }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(postData);
    req.end();
  });
}

function getFallbackStub() {
  return {
    overallScore: 50,
    grade: getGrade(50),
    sections: {
        keywordsMatch: { score: 10, maxScore: 25 },
        experienceQuality: { score: 10, maxScore: 20 },
        formattingStructure: { score: 10, maxScore: 15 },
        skillsRelevance: { score: 10, maxScore: 15 }
    },
    feedback: [{ type: 'warning', text: 'Scoring failed to connect to Ollama. Ensure Ollama is running.' }],
    tips: [{ priority: 'high', tip: 'Start Ollama manually' }],
    topIssues: [{ category: 'System', count: 1, label: 'Ollama not reachable' }],
    details: {
      matchedKeywords: [], missingKeywords: [], techSkills: [], softSkills: [],
      actionVerbs: 0, metrics: 0, sections: [], contactFound: [], contactMissing: [], wordCount: 0
    },
    scoringTime: 0,
    analyzedAt: new Date().toISOString()
  };
}

async function scoreResume(resumeText, jobDescription, filename) {
  const combinedText = `RESUME:\n${resumeText}\n\nJOBDESC:\n${jobDescription}`;
  const hash = getHash(combinedText);

  if (evaluationCache.has(hash)) {
    console.log(`[ATS Scorer] Cache hit for hash: ${hash}`);
    return { ...evaluationCache.get(hash), filename, cached: true };
  }

  console.log(`[ATS Scorer] Running fast Ollama scoring for: ${filename}`);
  const startTime = Date.now();

  const prompt = `You are a fast ATS resume analyzer.

Return ONLY valid JSON.

Format:

{
"score": number,
"sections": {
"keywords": number,
"experience": number,
"formatting": number,
"skills": number
},
"matched_keywords": [string],
"missing_keywords": [string]
}

Keep response under 80 words.

Resume:
${resumeText.substring(0, 5000)}

Job Role:
${jobDescription.substring(0, 3000)}`;

  try {
    const rawResponse = await callOllama(prompt);
    let resultJson = JSON.parse(rawResponse);

    const overallScore = resultJson.score || 0;
    const matchedKeywords = resultJson.matched_keywords || [];
    const missingKeywords = resultJson.missing_keywords || [];
    
    // Safety fallback for sections
    const srcSections = resultJson.sections || {};

    const finalResult = {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      grade: getGrade(overallScore),
      
      // Mapped specifically to UI expectations
      keywordsMatch: { score: srcSections.keywords || 10, maxScore: 25 },
      experienceQuality: { score: srcSections.experience || 10, maxScore: 20 },
      formattingStructure: { score: srcSections.formatting || 10, maxScore: 15 },
      skillsRelevance: { score: srcSections.skills || 10, maxScore: 15 },
      
      details: {
        matchedKeywords: matchedKeywords,
        missingKeywords: missingKeywords
      },

      // Fill empty feedback lists so UI doesn't crash if it expects them
      feedback: [],
      tips: [],
      topIssues: [],
      sections: {},
      
      scoringTime: Date.now() - startTime,
      analyzedAt: new Date().toISOString()
    };

    evaluationCache.set(hash, finalResult);
    console.log(`[ATS Scorer] Ollama scoring complete in ${finalResult.scoringTime}ms — Score: ${finalResult.overallScore}`);

    return { ...finalResult, filename, cached: false };
  } catch (error) {
    console.error('[ATS Scorer] Error with Ollama:', error);
    const finalResult = getFallbackStub();
    return { ...finalResult, filename, cached: false };
  }
}

module.exports = { scoreResume };
