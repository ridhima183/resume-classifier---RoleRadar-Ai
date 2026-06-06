import React from "react";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  shortlisted: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

export default function CandidateCard({
  candidate,
  onOpen,
  onShortlist = null,
  onReject = null,
  statusUpdating = false,
  variant = "default",
}) {
  const isMatch = variant === "match";
  const statusClassName = statusStyles[candidate.status] || statusStyles.pending;

  return (
    <div className="group flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-100">
            {candidate.name}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {candidate.predicted_role}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMatch && (
            <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              Match {candidate.match_score ?? 0}%
            </div>
          )}
          <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {candidate.score}/100
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClassName}`}>
          {candidate.status || "pending"}
        </span>
      </div>

      <p className="mt-4 min-h-[6rem] overflow-hidden text-sm leading-6 text-gray-600 dark:text-gray-300">
        {candidate.short_summary || "Candidate profile summary unavailable."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {candidate.skills.length > 0 ? (
          candidate.skills.map((skill) => (
            <span
              key={`${candidate.resume_id}-${skill}`}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isMatch && (candidate.matching_skills || []).includes(skill)
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              {skill}
            </span>
          ))
        ) : (
          <span className="text-xs text-gray-500 dark:text-gray-400">No extracted skills</span>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => onOpen(candidate)}
          className="font-medium text-primary transition group-hover:text-indigo-500"
        >
          Quick preview
        </button>
        <span className="text-gray-400 dark:text-gray-500">Resume #{candidate.resume_id}</span>
      </div>

      {!isMatch && (onShortlist || onReject) && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => onShortlist?.(candidate)}
            disabled={statusUpdating || candidate.status === "shortlisted"}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {candidate.status === "shortlisted" ? "Shortlisted" : "Shortlist"}
          </button>
          <button
            type="button"
            onClick={() => onReject?.(candidate)}
            disabled={statusUpdating || candidate.status === "rejected"}
            className="flex-1 rounded-lg border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            {candidate.status === "rejected" ? "Rejected" : "Reject"}
          </button>
        </div>
      )}
    </div>
  );
}
