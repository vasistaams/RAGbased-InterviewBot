const fetch = global.fetch || require('node-fetch'); // Fallback for older environments if needed, but Node 24 is fine

/**
 * ============================================
 *  Ollama Service Hardened Client
 * ============================================
 * 
 * Centralized service for AI model interactions.
 * Features: Request queue, retry logic, primary/fallback models.
 */

let isProcessing = false;
const requestQueue = [];

/**
 * Standardized response structure (PART 12)
 */
function standardizedResponse(success, data = null, error = null) {
  return { success, data, error };
}

/**
 * Processes the next request in the queue (PART 4)
 */
async function processQueue() {
  if (isProcessing || requestQueue.length === 0) return;

  isProcessing = true;
  const { prompt, model, options, resolve, reject, startTime } = requestQueue.shift();

  const primaryModel = process.env.MODEL_PRIMARY || "phi3";
  const fallbackModel = process.env.MODEL_FALLBACK || "mistral";

  try {
    console.log(`[Ollama] Processing request... Queue size: ${requestQueue.length}`);
    let result = await _executeWithRetry(prompt, primaryModel, options);

    if (!result && primaryModel !== fallbackModel) {
      console.log(`[Ollama] Primary model failed, attempting fallback: ${fallbackModel}`);
      result = await _executeWithRetry(prompt, fallbackModel, options);
    }

    const endTime = Date.now();
    console.log(`[Ollama] Request completed in ${endTime - startTime}ms`);
    resolve(result || "I apologize, but I am unable to process that right now. Let's move to the next topic.");
  } catch (err) {
    console.error("[Ollama] Queue execution error:", err);
    reject(err);
  } finally {
    isProcessing = false;
    setImmediate(processQueue); // Non-blocking next call
  }
}

/**
 * Internal execution with timeout and retry (PART 3)
 */
async function _executeWithRetry(prompt, model, options, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      console.log(`[Ollama] Using model: ${model} (Attempt ${i + 1}/${attempts})`); // PART 10
      const response = await fetch(process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature || 0.8,
            num_predict: options.num_predict || 256,
            ...options
          }
        }),
        signal: AbortSignal.timeout(20000) // 20s timeout (PART 3)
      });

      if (!response.ok) throw new Error(`Ollama status ${response.status}`);
      const data = await response.json();
      console.log("[Ollama] Response received successfully"); // PART 10
      return data.response;
    } catch (err) {
      console.warn(`[Ollama] Attempt ${i + 1} failed:`, err.message);
      if (i === attempts - 1) return null;
    }
  }
}

/**
 * Public API for generating text
 */
function generateWithOllama(prompt, model, options = {}) {
  return new Promise((resolve, reject) => {
    requestQueue.push({
      prompt,
      model: model || process.env.MODEL_PRIMARY || "phi3",
      options,
      resolve,
      reject,
      startTime: Date.now()
    });
    processQueue();
  });
}

module.exports = { generateWithOllama };
