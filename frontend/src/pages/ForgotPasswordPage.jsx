import React, { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../services/api";
import { useToast } from "../components/Toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const res = await forgotPassword(email);
      setResetUrl(res.data?.reset_url || "");
      setSent(true);
      toast.success(
        res.data?.reset_url
          ? "SMTP is not configured. Use the reset link shown on screen."
          : "Check your email for password reset instructions!"
      );
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        "Failed to process request. Please try again.";
      setError(typeof message === "string" ? message : "An error occurred");
      toast.error("Password reset request failed");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-indigo-900/50 text-primary dark:text-indigo-400">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Check your email</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              If an account exists for {email}, we&apos;ve sent password reset instructions.
            </p>
            {resetUrl && (
              <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4 text-left text-sm text-amber-800 dark:text-amber-300">
                <p className="font-medium">Local development reset link:</p>
                <a
                  href={resetUrl}
                  className="mt-2 block break-all text-primary dark:text-indigo-400 hover:underline"
                >
                  {resetUrl}
                </a>
              </div>
            )}
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-primary dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-sm sm:p-10">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2">
              <img src="/logo.png" alt="RoleRadar AI" className="h-12 w-auto" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                <span>RoleRadar </span>
                <span className="text-primary dark:text-indigo-400">AI</span>
              </span>
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              Forgot password?
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Enter your email and we&apos;ll send you reset instructions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400" role="alert">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-primary dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-indigo-400 sm:text-sm"
                placeholder="you@example.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            <Link to="/login" className="font-medium text-primary dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
