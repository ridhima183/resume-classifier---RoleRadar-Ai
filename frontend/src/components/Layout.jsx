import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";
import { readAuth } from "../utils/auth";
import { getProfile } from "../services/api";

function useAuth() {
  return readAuth();
}

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();
  const { token, role, isVerified } = useAuth();
  const isAuthenticated = Boolean(token);
  const showRecruiterLink = role === "recruiter" && isVerified;
  const isLanding = location.pathname === "/";
  const isDashboard =
    ["/dashboard", "/upload", "/history", "/profile", "/linkedin-import", "/recruiter", "/pending-approval"].includes(
      location.pathname
    );
  const isAdminRoute = location.pathname.startsWith("/admin");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setIsAdmin(false);
      return undefined;
    }

    async function loadAdminStatus() {
      try {
        const res = await getProfile();
        if (!cancelled) {
          setIsAdmin(res.data?.is_admin === true);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      }
    }

    loadAdminStatus();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const scrollToHash = (hash) => {
    // Ensure we're on the landing page first
    if (location.pathname !== "/") {
      navigate("/");
    }

    // Use requestAnimationFrame to allow navigation to settle
    requestAnimationFrame(() => {
      if (hash === "" || hash === "#" || hash === "#top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.replaceState(null, "", "/");
        return;
      }

      const element = document.getElementById(hash.replace("#", ""));
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
        window.history.replaceState(null, "", `/${hash}`);
      }
    });
  };

  const navLinks = [
    { to: "/", label: "Home", hash: "#top" },
    { to: "/", label: "Features", hash: "#features" },
    { to: "/", label: "Contact", hash: "#contact" },
    ...(role === "student" || !isAuthenticated ? [{ to: "/upload", label: "Upload Resume" }] : []),
    ...(role === "student" || !isAuthenticated ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(showRecruiterLink ? [{ to: "/recruiter", label: "Recruiter" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
    ...(role !== "recruiter" ? [{ to: "/recruiter-signup", label: "Recruiter Signup" }] : []),
    ...(isAuthenticated ? [] : [{ to: "/", label: "Choose Role" }]),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100 transition hover:opacity-90"
          >
            <img
              src="/logo.png"
              alt="RoleRadar AI"
              className="h-9 w-auto sm:h-10"
            />
            <span>
              <span className="text-gray-800 dark:text-gray-200">RoleRadar </span>
              <span className="text-primary">AI</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 text-sm font-medium sm:flex">
            {navLinks.map(({ to, label, hash }) => (
              <Link
                key={`${to}-${label}`}
                to={to}
                className="text-gray-600 dark:text-gray-300 transition hover:text-primary"
                onClick={(event) => {
                  setMobileMenuOpen(false);
                  if (hash) {
                    event.preventDefault();
                    scrollToHash(hash);
                  }
                }}
              >
                {label}
              </Link>
            ))}
            <ThemeToggle />
          </nav>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 sm:hidden">
            <ThemeToggle />
            <button
              type="button"
              className="rounded-lg p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 sm:hidden">
            <nav className="flex flex-col gap-2">
              {navLinks.map(({ to, label, hash }) => (
                <Link
                  key={`${to}-${label}`}
                  to={to}
                  className="rounded-lg px-3 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-primary"
                  onClick={(event) => {
                    setMobileMenuOpen(false);
                    if (hash) {
                      event.preventDefault();
                      scrollToHash(hash);
                    }
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
      <main
        className={
          isLanding
            ? ""
            : isDashboard || isAdminRoute
            ? "flex-1 min-h-0"
            : "mx-auto flex-1 max-w-6xl px-4 py-8 sm:px-6 lg:px-8"
        }
      >
        {children}
      </main>
    </div>
  );
}
