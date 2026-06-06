import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getProfile, getResumeHistory } from "../services/api";
import { useTheme } from "../context/ThemeContext";

const LIGHT_CHART_COLORS = ["#4F46E5", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B"];
const DARK_CHART_COLORS = ["#6366F1", "#8B5CF6", "#0891B2", "#059669", "#D97706"];

function aggregateByRole(items) {
  const counts = {};
  items.forEach((item) => {
    const role = item.predicted_job_role || "Other";
    counts[role] = (counts[role] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

export default function DashboardPage() {
  const { isDarkMode } = useTheme();
  const CHART_COLORS = isDarkMode ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;
  const [user, setUser] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [userRes, historyRes] = await Promise.all([
          getProfile(),
          getResumeHistory(),
        ]);
        setUser(userRes.data);
        setHistory(historyRes.data || []);
      } catch (err) {
        if (err.response?.status === 401) {
          setError("Please log in to view your dashboard.");
        } else {
          setError("Failed to load dashboard data.");
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-700">
        {error}{" "}
        <Link to="/login" className="font-medium underline">
          Log in
        </Link>
      </div>
    );
  }

  const totalResumes = history.length;
  const topRole =
    history.length > 0
      ? aggregateByRole(history).sort((a, b) => b.count - a.count)[0]
      : null;
  const latestResult = history[0] || null;
  const avgConfidence =
    history.length > 0
      ? (
          history.reduce((s, i) => s + (i.confidence_score || 0), 0) /
          history.length
        ).toFixed(1)
      : null;
  const chartData = aggregateByRole(history);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          Welcome back, {user?.name || "User"}!
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Here&apos;s an overview of your resume analysis activity.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total resumes analyzed</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">{totalResumes}</p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Top predicted role</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {topRole ? topRole.name : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Average confidence</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {avgConfidence ? `${avgConfidence}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Latest result</p>
          <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            {latestResult
              ? `${latestResult.predicted_job_role} (${latestResult.confidence_score?.toFixed(0) || "—"}%)`
              : "—"}
          </p>
          {latestResult && (
            <Link
              to="/history"
              className="mt-2 inline-block text-sm text-primary hover:underline"
            >
              View details
            </Link>
          )}
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Predictions by job role
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Distribution of your predicted job roles
          </p>
          {chartData.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: isDarkMode ? "#d1d5db" : "#374151" }} />
                  <YAxis tick={{ fontSize: 12, fill: isDarkMode ? "#d1d5db" : "#374151" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#334155" : "#e2e7eb"}`,
                      borderRadius: "10px",
                      color: isDarkMode ? "#f8fafc" : "#111827",
                      boxShadow: isDarkMode ? "0 8px 20px rgba(0,0,0,0.4)" : "0 6px 18px rgba(0,0,0,0.12)",
                      padding: "10px 12px",
                    }}
                    labelStyle={{ color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 12 }}
                    itemStyle={{ color: isDarkMode ? "#e2e8f0" : "#0f172a", fontSize: 12 }}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8 text-center text-gray-500 dark:text-gray-400">
              Upload a resume to see prediction statistics.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Job role distribution
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pie chart of your analyzed resumes by role
          </p>
          {chartData.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, count }) => `${name}: ${count}`}
                  >
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#334155" : "#e2e7eb"}`,
                      borderRadius: "10px",
                      color: isDarkMode ? "#f8fafc" : "#111827",
                      boxShadow: isDarkMode ? "0 8px 20px rgba(0,0,0,0.4)" : "0 6px 18px rgba(0,0,0,0.12)",
                      padding: "10px 12px",
                    }}
                    labelStyle={{ color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 12 }}
                    itemStyle={{ color: isDarkMode ? "#e2e8f0" : "#0f172a", fontSize: 12 }}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Legend wrapperStyle={{ color: isDarkMode ? "#d1d5db" : "#374151" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8 text-center text-gray-500">
              No data yet. Upload a resume to get started.
            </div>
          )}
        </div>
      </div>

      {/* Quick action */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Ready to analyze another resume?
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Upload a PDF or DOCX resume to get a new job role prediction.
            </p>
          </div>
          <Link
            to="/upload"
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
          >
            Upload Resume
          </Link>
        </div>
      </div>
    </div>
  );
}
