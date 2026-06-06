/**
 * Centralized API service for Resume Classifier frontend.
 * Uses Axios with JWT auth, 401 handling, caching, and request throttling.
 *
 * Features:
 * - JWT bearer token authentication
 * - Automatic 401 logout redirect
 * - Request/response caching with TTL
 * - Request deduplication for identical pending requests
 */

import axios from "axios";
import { clearAuth } from "../utils/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000, // 60s for upload/analysis
});

// ====================================================================
// CACHING CONFIG
// ====================================================================

const CACHE_CONFIG = {
  // Cache GET requests for these durations (ms)
  GET: 5 * 60 * 1000, // 5 minutes for most GET requests
  LIST: 2 * 60 * 1000, // 2 minutes for list endpoints
  PROFILE: 10 * 60 * 1000, // 10 minutes for profile data
};

// Store for cached responses with TTL
const responseCache = new Map();

// Store for in-flight requests (deduplication)
const pendingRequests = new Map();

// Helper to create cache key
function getCacheKey(config) {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`;
}

// Helper to get cache duration based on URL
function getCacheDuration(url) {
  if (url.includes("/api/me") || url.includes("/user/")) {
    return CACHE_CONFIG.PROFILE;
  }
  if (url.includes("history") || url.includes("list")) {
    return CACHE_CONFIG.LIST;
  }
  return CACHE_CONFIG.GET;
}

// ====================================================================
// REQUEST INTERCEPTOR: Caching & Deduplication
// ====================================================================

api.interceptors.request.use(
  (config) => {
    // Only cache GET requests
    if (config.method === "get") {
      const cacheKey = getCacheKey(config);

      // Check if data is in cache and still valid
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.duration) {
        // Return cached response immediately
        return Promise.reject({
          config,
          response: { data: cached.data },
          __fromCache: true,
        });
      }

      // Check for in-flight request (deduplication)
      if (pendingRequests.has(cacheKey)) {
        return Promise.reject({
          config,
          __pending: true,
          pending: pendingRequests.get(cacheKey).promise,
        });
      }

      // Store request as pending
      let resolvePending;
      const pending = new Promise((resolve) => {
        resolvePending = resolve;
      });
      pendingRequests.set(cacheKey, {
        promise: pending,
        resolve: resolvePending,
      });
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ====================================================================
// RESPONSE INTERCEPTOR: Cache storage, deduplication, & 401 handling
// ====================================================================

api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === "get") {
      const cacheKey = getCacheKey(response.config);
      const duration = getCacheDuration(response.config.url);

      responseCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        duration,
      });

      // Resolve pending requests
      if (pendingRequests.has(cacheKey)) {
        pendingRequests.get(cacheKey).resolve();
        pendingRequests.delete(cacheKey);
      }
    }

    return response;
  },
  (error) => {
    // Handle cached responses
    if (error.__fromCache) {
      return Promise.resolve(error.response);
    }

    // Handle pending duplicates
    if (error.__pending) {
      return error.pending.then(() => {
        // Retry the request after pending completes
        return api(error.config);
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      handleUnauthorized();
    }

    // Clean up pending requests on error
    const cacheKey = getCacheKey(error.config);
    if (pendingRequests.has(cacheKey)) {
      pendingRequests.delete(cacheKey);
    }

    return Promise.reject(error);
  }
);

// ====================================================================
// AUTH MANAGEMENT
// ====================================================================

/**
 * Set or clear JWT token for protected endpoints.
 * Call after login; call with null on logout.
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

/**
 * Clear auth and redirect to login on 401 (expired/invalid token).
 */
function handleUnauthorized() {
  setAuthToken(null);
  clearAuth();
  if (!window.location.pathname.includes("/login") && !window.location.pathname.includes("/signup")) {
    window.location.href = "/login?expired=1";
  }
}

/**
 * Manually invalidate cached responses
 * Useful after mutations (POST, PUT, DELETE)
 */
export function invalidateCache(pattern = null) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  // Invalidate cache entries matching pattern
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
}

// ====================================================================
// AUTH API
// ====================================================================

/** POST /api/login - returns { access_token, token_type, role, is_verified } */
export const login = (email, password, role = null) => {
  invalidateCache(); // Clear cache on login for fresh data
  const payload = new URLSearchParams({ username: email, password });
  if (role) {
    payload.append("role", role);
  }
  return api.post(
    "/api/login",
    payload,
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
};

/** POST /api/signup - returns { id, name, email, message } */
export const signup = (data) => api.post("/api/signup", data);

/** POST /api/recruiter/signup - returns pending recruiter account */
export const recruiterSignup = (data) => api.post("/api/recruiter/signup", data);

/** POST /api/forgot-password - returns generic message and optional local reset URL */
export const forgotPassword = (email) => api.post("/api/forgot-password", { email });

/** POST /api/reset-password */
export const resetPassword = (token, newPassword) =>
  api.post("/api/auth/reset-password", {
    token,
    new_password: newPassword,
  });

/** GET /api/me - returns user profile with role and verification fields */
export const getProfile = () => api.get("/api/me");

/** PATCH /api/me/password - update password */
export const updatePassword = (currentPassword, newPassword) => {
  invalidateCache("api/me"); // Invalidate profile cache
  return api.patch("/api/me/password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
};

// ====================================================================
// User Profile Management
// ====================================================================

/** PUT /user/profile - edit name and/or email */
export const editProfile = (data) => {
  invalidateCache("user/"); // Invalidate user-related caches
  return api.put("/user/profile", data);
};

/** POST /user/avatar - upload profile avatar (FormData with file) */
export const uploadAvatar = (formData) => {
  invalidateCache("user/"); // Invalidate user-related caches
  return api.post("/user/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** GET /user/security-info - get security information (email verified, last login, etc.) */
export const getSecurityInfo = () => api.get("/user/security-info");

/** DELETE /user/account - delete account (requires password confirmation) */
export const deleteAccount = (password, confirmation = true) =>
  api.delete("/user/account", {
    data: {
      password,
      confirmation,
    },
  });

/**
 * OAuth helper: Get Google authorization URL
 * Frontend constructs this manually to redirect to Google
 */
export const googleAuth = (code) => api.get(`/api/auth/google/callback?code=${code}`);

/**
 * OAuth helper: Get GitHub authorization URL
 * Frontend constructs this manually to redirect to GitHub
 */
export const githubAuth = (code) => api.get(`/api/auth/github/callback?code=${code}`);

/**
 * OAuth helper: Get LinkedIn authorization URL
 * Frontend constructs this manually to redirect to LinkedIn
 */
export const linkedinAuth = (code) => api.get(`/api/auth/linkedin/callback?code=${code}`);

// ====================================================================
// Resume API
// ====================================================================

/** POST /api/upload_resume - FormData with file */
export const uploadResume = (formData) => {
  invalidateCache("resume"); // Invalidate resume-related caches
  return api.post("/api/upload_resume", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** GET /api/resume_history - list user's resumes */
export const getResumeHistory = () => api.get("/api/resume_history");

/** GET /api/resume/:id/analysis - full analysis for a resume */
export const getResumeAnalysis = (resumeId) =>
  api.get(`/api/resume/${resumeId}/analysis`);

/** DELETE /api/resume/:id */
export const deleteResume = (resumeId) => {
  invalidateCache("resume"); // Invalidate resume-related caches
  return api.delete(`/api/resume/${resumeId}`);
};

// ====================================================================
// LinkedIn API
// ====================================================================

/** POST /linkedin/upload - FormData with file (PDF, max 5MB) */
export const linkedinUpload = (formData) => {
  invalidateCache("linkedin"); // Invalidate LinkedIn-related caches
  return api.post("/linkedin/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** POST /linkedin/url-import - body: { url } */
export const linkedinUrlImport = (url) => {
  invalidateCache("linkedin"); // Invalidate LinkedIn-related caches
  return api.post("/linkedin/url-import", { url });
};

/** GET /linkedin/history */
export const getLinkedinHistory = () => api.get("/linkedin/history");

/** GET /linkedin/:id - full analysis for one import */
export const getLinkedinAnalysis = (profileId) =>
  api.get(`/linkedin/${profileId}`);

// ====================================================================
// Feedback API
// ====================================================================

/** POST /feedback/submit - body: { rating (1-5), comments? } */
export const submitFeedback = (rating, comments) => {
  invalidateCache("feedback"); // Invalidate feedback-related caches
  return api.post("/feedback/submit", { rating, comments: comments || null });
};

/** GET /feedback/my-feedback */
export const getMyFeedback = () => api.get("/feedback/my-feedback");

// ====================================================================
// Admin API
// ====================================================================

/** GET /admin/stats */
export const getAdminStats = () => api.get("/admin/stats");

/** POST /admin/retrain_model */
export const retrainModel = () => {
  invalidateCache("admin"); // Invalidate admin-related caches
  return api.post("/admin/retrain_model");
};

/** GET /admin/users */
export const getAdminUsers = () => api.get("/admin/users");

/** GET /admin/recruiters/unverified */
export const getUnverifiedRecruiters = () => api.get("/admin/recruiters/unverified");

/** PATCH /admin/recruiters/:id/approve */
export const approveRecruiter = (userId) => {
  invalidateCache("admin");
  return api.patch(`/admin/recruiters/${userId}/approve`);
};

/** DELETE /admin/users/:id */
export const deleteAdminUser = (userId) => {
  invalidateCache("admin"); // Invalidate admin-related caches
  return api.delete(`/admin/users/${userId}`);
};

/** GET /admin/logs */
export const getAdminLogs = (params) => api.get("/admin/logs", { params });

/** GET /admin/analytics */
export const getAdminAnalytics = (params) => api.get("/admin/analytics", { params });

/** GET /admin/feedback */
export const getAdminFeedback = (params) => api.get("/admin/feedback", { params });

// ====================================================================
// Recruiter API
// ====================================================================

/** GET /recruiter/dashboard */
export const getRecruiterDashboard = () => api.get("/recruiter/dashboard");

/** GET /candidates */
export const getCandidates = (params) => api.get("/candidates", { params });

/** GET /candidates/:resumeId/preview */
export const getCandidatePreview = (resumeId) => api.get(`/candidates/${resumeId}/preview`);

/** POST /candidates/:id/shortlist */
export const shortlistCandidate = (candidateId) => {
  invalidateCache("candidates");
  invalidateCache("analytics");
  return api.post(`/candidates/${candidateId}/shortlist`);
};

/** POST /candidates/:id/reject */
export const rejectCandidate = (candidateId) => {
  invalidateCache("candidates");
  invalidateCache("analytics");
  return api.post(`/candidates/${candidateId}/reject`);
};

/** POST /match-candidates */
export const matchCandidates = (jobDescription) =>
  api.post("/match-candidates", { job_description: jobDescription });

/** GET /analytics */
export const getRecruiterAnalytics = () => api.get("/analytics");

// ---------------------------------------------------------------------------
// Export raw axios instance for custom calls
// ---------------------------------------------------------------------------

export default api;
