import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setSelectedRole } from "../utils/auth";

export default function LandingPage() {
  const navigate = useNavigate();

  function chooseRole(role, action = "login") {
    setSelectedRole(role);
    if (role === "recruiter" && action === "signup") {
      navigate("/recruiter-signup");
      return;
    }
    const target = action === "signup" ? "/signup" : "/login";
    navigate(`${target}?role=${role}`);
  }

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        const element = document.getElementById(hash.substring(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <>
      {/* Hero section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-indigo-600 to-purple-700 px-4 py-20 text-white sm:px-6 sm:py-28 lg:px-8">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/logo.png"
              alt="RoleRadar AI"
              className="h-20 w-auto drop-shadow-md sm:h-24"
            />
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="text-white/95">RoleRadar </span>
              <span className="text-indigo-200">AI</span>
            </h1>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-indigo-100 sm:text-xl">
            Upload your resume and get the best job recommendation
          </p>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 text-left backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Student</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Resume analysis and growth insights</h3>
              <p className="mt-2 text-sm text-indigo-100">
                Track ATS score, skill gaps, and role predictions tailored for your profile.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => chooseRole("student", "login")}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-indigo-50"
                >
                  Student Login
                </button>
                <button
                  type="button"
                  onClick={() => chooseRole("student", "signup")}
                  className="rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Student Signup
                </button>
              </div>
            </div>
            <div className="rounded-2xl border border-white/25 bg-white/10 p-5 text-left backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Recruiter</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Screen and match candidates faster</h3>
              <p className="mt-2 text-sm text-indigo-100">
                Access recruiter dashboards after verification with quick candidate evaluation tools.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => chooseRole("recruiter", "login")}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-indigo-50"
                >
                  Recruiter Login
                </button>
                <button
                  type="button"
                  onClick={() => chooseRole("recruiter", "signup")}
                  className="rounded-lg border border-white/60 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Recruiter Signup
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white px-4 py-16 dark:bg-gray-900 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600 dark:text-gray-400">
            Three simple steps to find your ideal job role
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center transition hover:border-primary/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                <span className="text-xl font-bold">1</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Upload Resume
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Upload your resume in PDF or DOCX format. Our system accepts all
                standard resume formats.
              </p>
            </div>
            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center transition hover:border-primary/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                <span className="text-xl font-bold">2</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Analyzes Resume
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Our AI extracts skills, keywords, and experience to understand
                your profile.
              </p>
            </div>
            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center transition hover:border-primary/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white">
                <span className="text-xl font-bold">3</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Get Recommended Job Role
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Receive your top job role match with a confidence score and
                improvement suggestions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section
        id="features"
        className="scroll-mt-20 bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">
            Features
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-gray-600 dark:text-gray-400">
            Everything you need to land your dream role
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800 dark:ring-1 dark:ring-gray-700/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                Resume Classification
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                ML-powered classification matches your resume to the most
                suitable job categories.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800 dark:ring-1 dark:ring-gray-700/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                Skill Extraction
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Automatically identify and highlight your technical and soft
                skills from your resume.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800 dark:ring-1 dark:ring-gray-700/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">ATS Score</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Get an ATS compatibility score and keyword suggestions to improve
                recruiter visibility.
              </p>
            </div>
            <div className="rounded-xl bg-white p-6 shadow-sm transition hover:shadow-md dark:bg-gray-800 dark:ring-1 dark:ring-gray-700/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-gray-900 dark:text-gray-100">
                Job Role Recommendation
              </h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Receive personalized job role recommendations with confidence
                scores.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white px-4 py-16 dark:bg-gray-900 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary px-6 py-12 text-center text-white shadow-xl dark:shadow-primary/10 sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ready to find your ideal job?
          </h2>
          <p className="mt-4 text-indigo-100">
            Upload your resume now and get AI-powered recommendations in seconds.
          </p>
          <Link
            to="/upload"
            className="mt-6 inline-block rounded-xl bg-white px-8 py-3 font-semibold text-primary transition hover:bg-indigo-50"
          >
            Upload Resume
          </Link>
        </div>
      </section>

      {/* Contact section */}
      <section
        id="contact"
        className="scroll-mt-20 bg-gray-50 px-4 py-16 dark:bg-gray-950 sm:px-6 sm:py-20 lg:px-8"
      >
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 sm:text-4xl">Contact Us</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Get in touch with us for any questions or feedback</p>
          <div className="mt-8">
            <a
              href="mailto:contact@example.com"
              className="inline-block rounded-xl bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary/90"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-900 px-4 py-12 text-gray-300 dark:border-gray-800 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-center sm:text-left">
              <img
                src="/logo.png"
                alt="RoleRadar AI"
                className="h-10 w-auto"
              />
              <div>
                <Link to="/" className="text-xl font-bold text-white">
                  <span className="text-white">RoleRadar </span>
                  <span className="text-indigo-300">AI</span>
                </Link>
                <p className="mt-1 text-sm text-gray-400">
                  AI-powered resume analysis and job recommendations
                </p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <a
                href="/#features"
                className="transition hover:text-white"
              >
                About
              </a>
              <a
                href="mailto:contact@example.com"
                className="transition hover:text-white"
              >
                Contact
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 transition hover:text-white"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                GitHub
              </a>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
            © {new Date().getFullYear()} RoleRadar AI. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
