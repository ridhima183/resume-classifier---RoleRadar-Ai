import React, { useEffect, useState } from "react";
import { getAdminStats, retrainModel } from "../services/api";
import { useToast } from "../components/Toast";
import { useTheme } from "../context/ThemeContext";

export default function AdminDashboardPage() {
  const { isDarkMode } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retraining, setRetraining] = useState(false);
  const [retrainMessage, setRetrainMessage] = useState("");
  const toast = useToast();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminStats();
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load admin stats.");
      toast.error("Failed to load admin stats.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetrain() {
    setRetraining(true);
    setRetrainMessage("");
    try {
      await retrainModel();
      setRetrainMessage("Model retraining started. It may take several minutes. Refresh stats later to see updated metrics.");
      toast.success("Model retraining started.");
    } catch (err) {
      setRetrainMessage(err.response?.data?.detail || "Failed to trigger retraining.");
      toast.error("Failed to trigger retraining.");
    } finally {
      setRetraining(false);
    }
  }

  if (loading) {
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

  const perf = stats?.model_performance || {};
  const bestModel = perf.best_model || "—";
  const models = perf.models || {};
  const bestMetrics = bestModel !== "—" ? models[bestModel] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            System overview and model performance
          </p>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          Refresh stats
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total users</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats?.total_users ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total resumes analyzed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {stats?.total_resumes_analyzed ?? "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Best model</p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{bestModel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Last trained</p>
          <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
            {perf.last_trained_at
              ? new Date(perf.last_trained_at).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      {/* Model performance */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Model performance</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Metrics from the last training run
        </p>
        {bestMetrics ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 dark:bg-gray-700 p-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Accuracy</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {(bestMetrics.accuracy * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-gray-700 p-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Macro F1</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {(bestMetrics.macro_f1 * 100).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 dark:bg-gray-700 p-4">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">ROC-AUC</p>
              <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                {(bestMetrics.roc_auc * 100).toFixed(2)}%
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            {perf.message || "No metrics available. Run model retraining to populate."}
          </p>
        )}
      </div>

      {/* Retrain */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Model retraining</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Trigger a full retrain of the ML models. This runs in the background and may take several minutes.
        </p>
        {retrainMessage && (
          <div
            className={`mt-4 rounded-lg p-4 text-sm ${
              retrainMessage.includes("started")
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            }`}
          >
            {retrainMessage}
          </div>
        )}
        <button
          type="button"
          onClick={handleRetrain}
          disabled={retraining}
          className="mt-4 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {retraining ? "Starting..." : "Trigger retraining"}
        </button>
      </div>
    </div>
  );
}
