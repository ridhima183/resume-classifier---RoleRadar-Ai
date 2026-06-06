import React from "react";
import { Link } from "react-router-dom";

export default function PendingApprovalPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center shadow-sm dark:border-amber-900 dark:bg-amber-950/30 sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="mt-6 text-2xl font-bold text-amber-900 dark:text-amber-100 sm:text-3xl">
          Recruiter approval pending
        </h1>
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200 sm:text-base">
          Your recruiter account has been created, but recruiter tools stay locked until an admin verifies your company details.
        </p>
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
          You can still access your profile while the review is in progress.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            to="/profile"
            className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Go to profile
          </Link>
          <Link
            to="/login"
            className="rounded-lg border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900/40"
          >
            Re-check later
          </Link>
        </div>
      </div>
    </div>
  );
}
