import React, { useEffect, useState } from "react";
import { getAdminLogs } from "../services/api";
import { useTheme } from "../context/ThemeContext";

export default function AdminLogsPage() {
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [levelFilter, setLevelFilter] = useState("");

  useEffect(() => {
    loadLogs();
  }, [levelFilter]);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const params = levelFilter ? { level: levelFilter } : {};
      const res = await getAdminLogs(params);
      setLogs(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load logs.");
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return "—";
    }
  };

  const levelColors = {
    ERROR: isDarkMode ? "bg-red-900/50 text-red-300" : "bg-red-100 text-red-800",
    WARNING: isDarkMode ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-800",
    INFO: isDarkMode ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-800",
  };

  if (loading && logs.length === 0) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            System logs
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            View application errors and events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="level-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Filter:
          </label>
          <select
            id="level-filter"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
          >
            <option value="">All</option>
            <option value="ERROR">ERROR</option>
            <option value="WARNING">WARNING</option>
            <option value="INFO">INFO</option>
          </select>
          <button
            type="button"
            onClick={loadLogs}
            className="rounded-lg bg-slate-200 dark:bg-gray-700 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-gray-600"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              No logs found. Errors and events will appear here when they occur.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-gray-700"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                        levelColors[log.level] || (isDarkMode ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-800")
                      }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{log.message}</p>
                  {log.context && (
                    <pre className="mt-2 max-h-40 overflow-auto rounded bg-slate-100 dark:bg-gray-700 p-2 text-xs text-slate-700 dark:text-slate-300">
                      {log.context}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
