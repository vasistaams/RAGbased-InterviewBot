import axios, { type InternalAxiosRequestConfig } from "axios";

/**
 * ============================================
 *  API Service — Centralized HTTP Client
 * ============================================
 *
 * Features:
 *  • Automatic Clerk JWT attachment via interceptor
 *  • Retry logic with exponential backoff (1 retry)
 *  • Global error handler for 401/500
 *  • Two helpers: `api` for /api/* routes, `raw` for root-level routes
 *
 * Backend Route Reference:
 *   /api/user/dashboard       GET    Dashboard data
 *   /api/user/profile         PUT    Update profile
 *   /api/user/theme           PUT    Update theme
 *   /api/interview/start      POST   Start session
 *   /api/interview/chat-next  POST   Next question (AI)
 *   /api/interview/evaluate   POST   Evaluate answer
 *   /api/interview/end        POST   End session + review
 *   /api/interview/upload     POST   Upload resume
 *   /api/interview/resume     DELETE Remove resume
 *   /api/ats/score            POST   ATS scoring
 *   /api/chat                 POST   RAG chat
 *   /api/assistant            POST   Site assistant
 *   /api/mcq-questions        POST   MCQ questions
 *   /reports                  GET    All reports (root-level)
 *   /report/:id               GET    Single report (root-level)
 *   /save-report              POST   Save report (root-level)
 *   /start-session            POST   Increment session count (root-level)
 *   /upload-resume            POST   Upload + parse resume text (root-level)
 */

// ─── Token Provider ──────────────────────────────────────────
// Set once from the React tree via <AuthBridge />
let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

// ─── Axios Instance ──────────────────────────────────────────
const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

/**
 * Separate instance for non-/api routes (e.g. /reports, /save-report).
 * Same auth interceptor, different baseURL.
 */
const raw = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// ─── Auth Interceptor ────────────────────────────────────────
async function attachToken(config: InternalAxiosRequestConfig) {
  if (_getToken) {
    try {
      const token = await _getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // Token fetch failed — let request proceed (backend will 401)
    }
  }
  return config;
}

api.interceptors.request.use(attachToken);
raw.interceptors.request.use(attachToken);

// ─── Retry Interceptor ──────────────────────────────────────
function addRetry(instance: typeof api) {
  instance.interceptors.response.use(
    (res) => res,
    async (error) => {
      const config = error.config;
      if (error.response && error.response.status === 401) {
        // Unauthorized or Invalid token triggers a session clear / redirect
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Retry once on network errors or 5xx, but not on 4xx (client errors)
      if (
        config &&
        !config._retried &&
        (!error.response || error.response.status >= 500)
      ) {
        config._retried = true;
        // Exponential backoff: wait 800ms before retry
        await new Promise((r) => setTimeout(r, 800));
        return instance(config);
      }
      return Promise.reject(error);
    }
  );
}

addRetry(api);
addRetry(raw);

// ─── Exports ─────────────────────────────────────────────────
export { api, raw };
export default api;
