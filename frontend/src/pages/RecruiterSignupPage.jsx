import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordToggle from "../components/PasswordToggle";
import { useToast } from "../components/Toast";
import { recruiterSignup } from "../services/api";
import { setSelectedRole } from "../utils/auth";

export default function RecruiterSignupPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    company_name: "",
    company_email: "",
    verification_doc: "",
    linkedin_url: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    setSelectedRole("recruiter");
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.verification_doc.trim() && !form.linkedin_url.trim()) {
      setError("Provide either a verification document reference or a LinkedIn URL.");
      return;
    }

    setLoading(true);
    try {
      await recruiterSignup({
        name: form.name,
        email: form.email,
        password: form.password,
        company_name: form.company_name,
        company_email: form.company_email,
        verification_doc: form.verification_doc || null,
        linkedin_url: form.linkedin_url || null,
      });
      toast.success("Recruiter application submitted. You can sign in after approval.");
      navigate("/login?role=recruiter");
    } catch (err) {
      const message =
        err.response?.data?.detail || "Recruiter sign up failed. Please review your details.";
      setError(Array.isArray(message) ? message.map((item) => item.msg).join(" ") : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
            Recruiter verification signup
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Use your company email. Access stays locked until an admin approves your account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
          {error && (
            <div className="sm:col-span-2 rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Full name</span>
            <input
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Priya Sharma"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Login email</span>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="you@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Company name</span>
            <input
              required
              value={form.company_name}
              onChange={(e) => updateField("company_name", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Acme Talent"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Company email</span>
            <input
              required
              type="email"
              value={form.company_email}
              onChange={(e) => updateField("company_email", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="hiring@company.com"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Password</span>
            <PasswordToggle
              value={form.password}
              onChange={(value) => updateField("password", value)}
              autoComplete="new-password"
              placeholder="Password"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm password</span>
            <PasswordToggle
              value={form.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
              autoComplete="new-password"
              placeholder="Confirm password"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Verification document reference</span>
            <input
              value={form.verification_doc}
              onChange={(e) => updateField("verification_doc", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="Secure drive link, employee ID proof URL, or internal approval note"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">LinkedIn URL</span>
            <input
              value={form.linkedin_url}
              onChange={(e) => updateField("linkedin_url", e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              placeholder="https://www.linkedin.com/in/your-profile"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="sm:col-span-2 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Submitting application..." : "Submit recruiter application"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-300">
          Looking for a student account?{" "}
          <Link to="/signup" className="font-medium text-primary hover:text-indigo-600">
            Create one here
          </Link>
        </p>
      </div>
    </div>
  );
}
