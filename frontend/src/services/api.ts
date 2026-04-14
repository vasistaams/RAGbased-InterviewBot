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
  try {
    let token = null;

    if (_getToken) {
      token = await _getToken();
    }
    
    // Fallback: Directly use window.Clerk if available
    if (!token && typeof window !== "undefined" && (window as any).Clerk?.session) {
      token = await ((window as any).Clerk.session.getToken)();
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("[API] No Clerk JWT token found to attach.");
    }
  } catch (error) {
    console.error("[API] Failed to get Clerk token:", error);
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
      console.error("[API Error]", error.response?.status, config?.url, error.message);

      if (error.response && error.response.status === 401) {
        // Unauthorized or Invalid token triggers a session clear / redirect
        console.error("[API Error] 401 Unauthorized - Token may be missing or invalid");
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
