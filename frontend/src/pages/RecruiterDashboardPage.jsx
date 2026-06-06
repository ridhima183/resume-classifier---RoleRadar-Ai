import React, { useEffect, useState } from "react";
import CandidateCard from "../components/CandidateCard";
import CandidatePreviewPanel from "../components/CandidatePreviewPanel";
import { useToast } from "../components/Toast";
import {
  getCandidatePreview,
  getCandidates,
  getRecruiterDashboard,
  matchCandidates,
  rejectCandidate,
  shortlistCandidate,
} from "../services/api";

export default function RecruiterDashboardPage() {
  const toast = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [page, setPage] = useState(1);
  const [pageInfo, setPageInfo] = useState({ total: 0, total_pages: 0, page_size: 12 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [matchResults, setMatchResults] = useState([]);
  const [jobKeywords, setJobKeywords] = useState([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);

  async function loadDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [dashboardResponse, candidatesResponse] = await Promise.all([
        getRecruiterDashboard(),
        getCandidates({ page, page_size: 12 }),
      ]);
      setDashboard(dashboardResponse.data);
      setCandidates(candidatesResponse.data?.items || []);
      setPageInfo({
        total: candidatesResponse.data?.total || 0,
        total_pages: candidatesResponse.data?.total_pages || 0,
        page_size: candidatesResponse.data?.page_size || 12,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load recruiter dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [page]);

  async function handleOpenCandidate(candidate) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError("");
    setSelectedCandidate(null);
    try {
      const response = await getCandidatePreview(candidate.resume_id);
      setSelectedCandidate(response.data);
    } catch (err) {
      setPreviewError(err.response?.data?.detail || "Failed to load resume preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    setSelectedCandidate(null);
    setPreviewError("");
  }

  function applyCandidateStatus(candidateId, nextStatus) {
    setCandidates((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: nextStatus } : candidate
      )
    );
    setMatchResults((current) =>
      current.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: nextStatus } : candidate
      )
    );
    setSelectedCandidate((current) =>
      current && current.id === candidateId ? { ...current, status: nextStatus } : current
    );
  }

  async function handleStatusUpdate(candidate, nextStatus) {
    setStatusUpdatingId(candidate.id);
    try {
      if (nextStatus === "shortlisted") {
        await shortlistCandidate(candidate.id);
      } else {
        await rejectCandidate(candidate.id);
      }
      applyCandidateStatus(candidate.id, nextStatus);
      toast.success(
        nextStatus === "shortlisted"
          ? `${candidate.name} shortlisted.`
          : `${candidate.name} rejected.`
      );
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update candidate status.");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleMatchCandidates(event) {
    event.preventDefault();
    setMatchError("");
    setMatching(true);
    setMatchResults([]);
    setJobKeywords([]);
    try {
      const response = await matchCandidates(jobDescription);
      setMatchResults(response.data?.candidates || []);
      setJobKeywords(response.data?.job_keywords || []);
    } catch (err) {
      setMatchError(err.response?.data?.detail || "Failed to match candidates.");
    } finally {
      setMatching(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-300">{error}</div>;
  }

  const averageScore = candidates.length
    ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length)
    : 0;
  const topRoles = Array.from(new Set(candidates.map((candidate) => candidate.predicted_role))).slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-6 py-7 text-white shadow-lg dark:border-slate-700">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-200">
              Resume Quick Evaluation System
            </p>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
              Review candidates without opening every resume
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">
              {dashboard?.recruiter_name}, this workspace surfaces candidate role fit, top skills, and a short resume snapshot so you can scan the shortlist quickly.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-100">Candidates</p>
              <p className="mt-2 text-2xl font-semibold">{pageInfo.total}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-100">Avg score</p>
              <p className="mt-2 text-2xl font-semibold">{averageScore}/100</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.18em] text-indigo-100">Company</p>
              <p className="mt-2 text-base font-semibold">{dashboard?.company_name || "Recruiter"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <form
            onSubmit={handleMatchCandidates}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              JD-Based Candidate Matching
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Paste a job description to rank candidates by fit score.
            </p>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={6}
              className="mt-4 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Example: Looking for a React + FastAPI developer with strong API design, SQL, and cloud deployment experience..."
            />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={matching || jobDescription.trim().length < 20}
                className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {matching ? "Matching..." : "Match Candidates"}
              </button>
              {jobKeywords.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Keywords extracted: {jobKeywords.slice(0, 8).join(", ")}
                </p>
              )}
            </div>
            {matchError && (
              <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                {matchError}
              </div>
            )}
          </form>

          {matchResults.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
                  Ranked Matches ({matchResults.length})
                </h3>
                <span className="text-sm text-indigo-700 dark:text-indigo-300">
                  Sorted by match score
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {matchResults.map((candidate) => (
                  <CandidateCard
                    key={`match-${candidate.resume_id}`}
                    candidate={candidate}
                    onOpen={handleOpenCandidate}
                    onShortlist={handleStatusUpdate}
                    onReject={handleStatusUpdate}
                    statusUpdating={statusUpdatingId === candidate.id}
                    variant="match"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Candidate snapshots</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tap any card to open a full resume preview in the side panel.
              </p>
            </div>
            <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
              Page {page} of {Math.max(pageInfo.total_pages, 1)}
            </div>
          </div>

          {candidates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  onOpen={handleOpenCandidate}
                  onShortlist={(selectedCandidate) =>
                    handleStatusUpdate(selectedCandidate, "shortlisted")
                  }
                  onReject={(selectedCandidate) =>
                    handleStatusUpdate(selectedCandidate, "rejected")
                  }
                  statusUpdating={statusUpdatingId === candidate.id}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              No candidate resumes are available yet.
            </div>
          )}

          {pageInfo.total_pages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * pageInfo.page_size + 1} to{" "}
                {Math.min(page * pageInfo.page_size, pageInfo.total)} of {pageInfo.total} candidates
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageInfo.total_pages, current + 1))}
                  disabled={page >= pageInfo.total_pages}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Recruiter
            </p>
            <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {dashboard?.recruiter_name}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {dashboard?.company_email || "No company email on file"}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Top roles in current page
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {topRoles.length > 0 ? (
                topRoles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  >
                    {role}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">No role data yet</span>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Access status
            </p>
            <p className="mt-3 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
              {dashboard?.is_verified ? "Verified recruiter access active" : "Pending"}
            </p>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              Candidate previews and evaluation cards are protected by verified recruiter-only APIs.
            </p>
          </div>
        </div>
      </div>

      <CandidatePreviewPanel
        open={previewOpen}
        loading={previewLoading}
        candidate={selectedCandidate}
        error={previewError}
        onClose={closePreview}
      />
    </div>
  );
}
