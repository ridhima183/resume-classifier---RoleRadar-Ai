import React, { useEffect, useState } from "react";
import { getAdminAnalytics } from "../services/api";
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
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

const LIGHT_CHART_COLORS = ["#4F46E5", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#14B8A6"];
const DARK_CHART_COLORS = ["#6366F1", "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#A855F7", "#14B8A6"];

export default function AdminAnalyticsPage() {
  const { isDarkMode } = useTheme();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const CHART_COLORS = isDarkMode ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;

  useEffect(() => {
    loadAnalytics();
  }, [days]);

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminAnalytics({ days });
      setAnalytics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !analytics) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-400">
        {error}
      </div>
    );
  }

  const resumesPerDay = analytics?.resumes_per_day || [];
  const topSkills = analytics?.top_skills || [];
  const topJobRoles = analytics?.top_job_roles || [];

  const pieData = topJobRoles.map((r) => ({ name: r.role, value: r.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            Analytics
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Resumes per day, top skills, and top job roles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="days" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Period:
          </label>
          <select
            id="days"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Resumes per day */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Resumes per day</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Number of resumes analyzed per day
        </p>
        {resumesPerDay.length > 0 ? (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumesPerDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e2e8f0"} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#64748B" }} />
                <YAxis tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#64748B" }} />
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
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-8 text-center text-slate-500 dark:text-slate-400">No data for this period.</div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top job roles */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top job roles</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Most predicted job roles
          </p>
          {pieData.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelStyle={{ fill: isDarkMode ? "#9CA3AF" : "#64748B", fontSize: "12px" }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#374151" : "#e2e8f0"}`,
                      borderRadius: "6px",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                  />
                  <Legend
                    wrapperStyle={{ color: isDarkMode ? "#9CA3AF" : "#64748B" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8 text-center text-slate-500 dark:text-slate-400">No data for this period.</div>
          )}
        </div>

        {/* Top skills */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Top skills</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Most frequently extracted skills
          </p>
          {topSkills.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSkills}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e2e8f0"} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: isDarkMode ? "#9CA3AF" : "#64748B" }} />
                  <YAxis dataKey="skill" type="category" width={75} tick={{ fontSize: 10, fill: isDarkMode ? "#9CA3AF" : "#64748B" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#374151" : "#e2e8f0"}`,
                      borderRadius: "6px",
                      color: isDarkMode ? "#f3f4f6" : "#1f2937",
                    }}
                  />
                  <Bar dataKey="count" fill={CHART_COLORS[1]} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8 text-center text-slate-500 dark:text-slate-400">No data for this period.</div>
          )}
        </div>
      </div>
    </div>
  );
}
