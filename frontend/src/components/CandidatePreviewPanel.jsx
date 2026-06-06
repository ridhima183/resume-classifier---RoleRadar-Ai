import React from "react";

export default function CandidatePreviewPanel({ open, loading, candidate, error, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/45 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="flex-1 cursor-default"
      />
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Resume Preview
            </p>
            <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-gray-100">
              {candidate?.name || "Loading candidate"}
            </h2>
            {candidate?.resume_name && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{candidate.resume_name}</p>
            )}
            {candidate?.status && (
              <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {candidate.status}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          ) : candidate ? (
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Predicted role</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.predicted_role}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Quick score</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.score}/100</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Skills found</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.skills.length}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</p>
                  <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{candidate.status}</p>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Summary
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {candidate.short_summary}
                </p>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Skills
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {candidate.skills.length > 0 ? (
                    candidate.skills.map((skill) => (
                      <span
                        key={`${candidate.resume_id}-${skill}`}
                        className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No extracted skills.</span>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  Resume text
                </h3>
                <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {candidate.resume_text}
                  </pre>
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
