/**
 * EXAMPLE: Optimized Resume History Component
 * =============================================
 *
 * This component demonstrates best practices for performance optimization:
 * - Lazy loading with Suspense
 * - API response caching
 * - Debounced search
 * - Component memoization
 * - useMemo for expensive calculations
 * - useCallback for stable references
 *
 * FILE: src/pages/ExampleOptimizedHistoryPage.jsx
 * (Reference implementation - not used in production)
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  Suspense,
  lazy,
} from "react";
import { useTheme } from "../context/ThemeContext";
import { useCache } from "../hooks/useCache";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { getResumeHistory } from "../services/api";
import { LoadingSpinner, SkeletonLoader } from "../components/PageLoader";
import ConfirmDialog from "../components/ConfirmDialog";

// Lazy load detailed resume view
const ResumeDetailModal = lazy(() => import("../components/ResumeDetailModal"));

/**
 * Memoized list item component
 * Only re-renders when the item data changes
 */
const ResumeListItem = memo(function ResumeListItem({
  resume,
  isSelected,
  onSelect,
  onDelete,
}) {
  const { isDarkMode } = useTheme();

  return (
    <div
      className={`rounded-lg border p-4 cursor-pointer transition ${
        isSelected
          ? "border-primary bg-primary/5 dark:bg-primary/10"
          : `border-gray-300 dark:border-gray-600 hover:border-primary/50`
      } ${isDarkMode ? "bg-gray-800" : "bg-white"}`}
      onClick={() => onSelect(resume.id)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className={`font-semibold ${
            isDarkMode ? "text-gray-100" : "text-gray-900"
          }`}>
            {resume.resume_filename}
          </h3>
          <p className={`mt-1 text-sm ${
            isDarkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            {resume.predicted_job_role || "Analyzing..."}
          </p>
          <p className={`mt-1 text-xs ${
            isDarkMode ? "text-gray-500" : "text-gray-500"
          }`}>
            Uploaded: {new Date(resume.upload_date).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(resume.id);
          }}
          className="ml-4 text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
});

/**
 * Filter and sort logic - memoized to avoid recalculation
 * Only runs when resumes or filter change
 */
function useFilteredResumes(resumes, searchQuery, sortBy) {
  return useMemo(() => {
    if (!resumes) return [];

    let filtered = [...resumes];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.resume_filename.toLowerCase().includes(query) ||
          (r.predicted_job_role || "").toLowerCase().includes(query)
      );
    }

    // Sort
    if (sortBy === "name") {
      filtered.sort((a, b) =>
        a.resume_filename.localeCompare(b.resume_filename)
      );
    } else if (sortBy === "date") {
      filtered.sort(
        (a, b) => new Date(b.upload_date) - new Date(a.upload_date)
      );
    }

    return filtered;
  }, [resumes, searchQuery, sortBy]);
}

/**
 * Main optimized component
 */
export default memo(function OptimizedHistoryPage() {
  const { isDarkMode } = useTheme();
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [sortBy, setSortBy] = useState("date");
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Use caching hook - automatically handles API caching
  const {
    data: allResumes,
    loading: resumesLoading,
    error: resumesError,
    invalidateCache: invalidateResumes,
  } = useCache(
    "resume-history",
    getResumeHistory,
    {
      duration: 2 * 60 * 1000, // Cache for 2 minutes
      onSuccess: (data) => console.log("Resumes loaded:", data),
      onError: (err) => console.error("Failed to load resumes:", err),
    }
  );

  // Use debounced search - reduces unnecessary filtering
  const { results: searchResults, searchQuery, setSearchQuery } =
    useDebouncedSearch(
      async (query) => {
        // If empty query, return all resumes
        if (!query) return allResumes;
        // Client-side search (or could call API here)
        return allResumes.filter(
          (r) =>
            r.resume_filename.toLowerCase().includes(query.toLowerCase()) ||
            (r.predicted_job_role || "")
              .toLowerCase()
              .includes(query.toLowerCase())
        );
      },
      300 // 300ms debounce delay
    );

  // Use filtered/sorted resumes
  const displayResumes = useFilteredResumes(
    searchQuery ? searchResults : allResumes,
    searchQuery,
    sortBy
  );

  // Memoized handlers to maintain stable references for child components
  const handleSelectResume = useCallback((resumeId) => {
    setSelectedResumeId(resumeId);
  }, []);

  const handleDeleteResume = useCallback(
    async (resumeId) => {
      setPendingDeleteId(resumeId);
    },
    []
  );

  const confirmDeleteResume = useCallback(async () => {
    if (!pendingDeleteId) return;
    invalidateResumes();
    setSelectedResumeId(null);
    setPendingDeleteId(null);
  }, [invalidateResumes, pendingDeleteId]);

  const cancelDeleteResume = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    invalidateResumes();
  }, [invalidateResumes]);

  // Get selected resume data
  const selectedResume = useMemo(() => {
    return allResumes?.find((r) => r.id === selectedResumeId);
  }, [allResumes, selectedResumeId]);

  // Render
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={`text-3xl font-bold ${
          isDarkMode ? "text-gray-100" : "text-gray-900"
        }`}>
          Resume History
        </h1>
        <button
          onClick={handleRefresh}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-600"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and filters */}
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search resumes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2 ${
                isDarkMode
                  ? "border-gray-600 bg-gray-700 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2 ${
                isDarkMode
                  ? "border-gray-600 bg-gray-700 text-gray-100"
                  : "border-gray-300 bg-white text-gray-900"
              }`}
            >
              <option value="date">Sort by Date (Newest)</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>

          {/* Loading state */}
          {resumesLoading && <SkeletonLoader count={3} />}

          {/* Error state */}
          {resumesError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-600 dark:text-red-400">
              Failed to load resumes: {resumesError.message}
            </div>
          )}

          {/* Resume list */}
          {displayResumes && displayResumes.length > 0 ? (
            <div className="space-y-2">
              {displayResumes.map((resume) => (
                <ResumeListItem
                  key={resume.id}
                  resume={resume}
                  isSelected={selectedResumeId === resume.id}
                  onSelect={handleSelectResume}
                  onDelete={handleDeleteResume}
                />
              ))}
              <p className={`text-sm ${
                isDarkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Showing {displayResumes.length} of {allResumes?.length} resumes
              </p>
            </div>
          ) : !resumesLoading && !resumesError ? (
            <div className={`rounded-lg border-2 border-dashed p-8 text-center ${
              isDarkMode
                ? "border-gray-600 text-gray-400"
                : "border-gray-300 text-gray-500"
            }`}>
              <p>No resumes found</p>
            </div>
          ) : null}
        </div>

        {/* Right: Detail view */}
        <div>
          {selectedResume ? (
            <Suspense fallback={<LoadingSpinner size="lg" text="Loading..." />}>
              <ResumeDetailModal resume={selectedResume} />
            </Suspense>
          ) : (
            <div className={`rounded-lg border-2 border-dashed p-8 text-center ${
              isDarkMode
                ? "border-gray-600 text-gray-400"
                : "border-gray-300 text-gray-500"
            }`}>
              <p>Select a resume to view details</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete resume?"
        message="This example component will refresh the list after deletion."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onCancel={cancelDeleteResume}
        onConfirm={confirmDeleteResume}
      />
    </div>
  );
});

/**
 * PERFORMANCE TECHNIQUES USED HERE:
 *
 * 1. memo() - Component doesn't re-render if props unchanged
 * 2. useMemo() - Filtered/sorted list only recalculated when dependencies change
 * 3. useCallback() - Event handlers maintain stable reference
 * 4. useCache() - API response cached for 2 minutes
 * 5. useDebouncedSearch() - Search debounced to prevent excessive filtering
 * 6. Lazy loading - ResumeDetailModal loaded only when needed
 * 7. List item memoization - Each item only re-renders if its data changes
 *
 * RESULT: Smooth, responsive UI with minimal re-renders and API calls
 */
