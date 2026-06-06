import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getResumeHistory, getResumeAnalysis, deleteResume } from "../services/api";
import { useToast } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  async function loadHistory() {
    setLoading(true);
    setError("");
    try {
      const res = await getResumeHistory();
      setItems(res.data || []);
    } catch (err) {
      setError("Failed to load resume history.");
      toast.error("Failed to load resume history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  async function handleView(item) {
    try {
      const res = await getResumeAnalysis(item.resume_id);
      navigate("/analysis", { state: res.data });
    } catch {
      navigate("/analysis", {
        state: {
          predicted_job_role: item.predicted_job_role,
          confidence_score: item.confidence_score,
          extracted_skills: [],
        },
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeletingId(pendingDelete.resume_id);
    try {
      await deleteResume(pendingDelete.resume_id);
      setItems((prev) => prev.filter((i) => i.resume_id !== pendingDelete.resume_id));
      toast.success("Resume deleted.");
    } catch (err) {
      setError("Failed to delete resume.");
      toast.error("Failed to delete resume.");
    } finally {
      setPendingDelete(null);
      setDeletingId(null);
    }
  }

  function handleDelete(item) {
    setPendingDelete(item);
  }

  const displayName = (item) =>
    item.resume_name || item.resume_filename || `Resume ${item.resume_id}`;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          My Resume History
        </h1>
        <Link
          to="/upload"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
        >
          Upload New Resume
        </Link>
      </div>

      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  Resume name
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  Predicted job role
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  Confidence
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  Date analyzed
                </th>
                <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr key={item.resume_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    {displayName(item)}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {item.predicted_job_role}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {item.confidence_score != null
                      ? `${Number(item.confidence_score).toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {item.date_uploaded || item.upload_date
                      ? new Date(
                          item.date_uploaded || item.upload_date
                        ).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleView(item)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-600"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.resume_id}
                        className="rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                      >
                        {deletingId === item.resume_id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700 sm:hidden">
          {items.map((item) => (
            <div
              key={item.resume_id}
              className="flex flex-col gap-3 p-4"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{displayName(item)}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                <span>{item.predicted_job_role}</span>
                <span>
                  {item.confidence_score != null
                    ? `${Number(item.confidence_score).toFixed(1)}%`
                    : "—"}
                </span>
                <span>
                  {item.date_uploaded || item.upload_date
                    ? new Date(
                        item.date_uploaded || item.upload_date
                      ).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleView(item)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white"
                >
                  View analysis
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.resume_id}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            <p className="font-medium">No resumes analyzed yet.</p>
            <p className="mt-1 text-sm">
              Upload a resume to get started.
            </p>
            <Link
              to="/upload"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Upload Resume
            </Link>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete resume?"
        message={
          pendingDelete
            ? `This will permanently remove "${displayName(pendingDelete)}" and its analysis history.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        loading={Boolean(deletingId)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
