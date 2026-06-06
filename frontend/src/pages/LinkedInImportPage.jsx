import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  linkedinUpload,
  getLinkedinHistory,
  getLinkedinAnalysis,
} from "../services/api";
import { useToast } from "../components/Toast";

const MAX_PDF_BYTES = 5 * 1024 * 1024; // 5 MB

export default function LinkedInImportPage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [lastResult, setLastResult] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    async function load() {
      setHistoryLoading(true);
      try {
        const res = await getLinkedinHistory();
        setHistory(res.data || []);
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
    load();
  }, []);

  const handleFileChange = (e) => {
    setError("");
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.name.toLowerCase().endsWith(".pdf") === false) {
      setError("Only PDF files are supported (e.g. LinkedIn profile export).");
      setFile(null);
      return;
    }
    if (selected.size > MAX_PDF_BYTES) {
      setError("File must be 5 MB or smaller.");
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleSubmitUpload = async (e) => {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please select a LinkedIn PDF file.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await linkedinUpload(formData);
      setLastResult(res.data);
      toast.success("LinkedIn profile analyzed!");
      navigate("/analysis", { state: res.data });
    } catch (err) {
      const msg = err.response?.data?.detail || "Upload failed.";
      setError(typeof msg === "string" ? msg : "Upload failed.");
      toast.error(typeof msg === "string" ? msg : "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (item) => {
    try {
      const res = await getLinkedinAnalysis(item.id);
      navigate("/analysis", { state: res.data });
    } catch {
      toast.error("Could not load analysis.");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          LinkedIn Import
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Upload a LinkedIn profile PDF. We&apos;ll extract skills and experience
          and run it through our ML pipeline.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm dark:border-amber-900/30 dark:bg-amber-900/10">
        <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">
          Export Your LinkedIn Profile as PDF
        </h2>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
          LinkedIn import works through PDF upload. Download the profile from
          LinkedIn first, then upload that file here.
        </p>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-amber-900 dark:text-amber-200">
          <li>Open the LinkedIn profile while signed in.</li>
          <li>Click `More` on the profile page.</li>
          <li>Choose `Save to PDF`.</li>
          <li>Come back here and upload that PDF.</li>
        </ol>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Upload LinkedIn PDF
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Export your LinkedIn profile as PDF (Profile -&gt; More -&gt; Save to
          PDF), then upload here. Max 5 MB.
        </p>
        <form onSubmit={handleSubmitUpload} className="mt-4 space-y-4">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-indigo-600"
          />
          {file && (
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Upload & Analyze"}
          </button>
        </form>
      </div>

      {lastResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/30 dark:bg-emerald-900/10">
          <h2 className="text-lg font-semibold text-emerald-900 dark:text-emerald-300">
            Latest LinkedIn Analysis
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Predicted role
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {lastResult.predicted_job_role}
              </p>
            </div>
            <div className="rounded-xl bg-white/80 p-4 dark:bg-slate-900/40">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Confidence
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                {Number(lastResult.confidence_score || 0).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm text-emerald-800 dark:text-emerald-300">
            Extracted text length: {(lastResult.extracted_text || "").length} characters
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h2 className="border-b border-gray-200 px-4 py-3 text-lg font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100">
          My LinkedIn Imports
        </h2>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent dark:border-indigo-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No LinkedIn imports yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Source</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Predicted role</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Confidence</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {item.source === "url" ? (item.original_url || "URL") : (item.file_name || "PDF")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {item.predicted_job_role}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {item.confidence_score != null ? `${Number(item.confidence_score).toFixed(1)}%` : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleView(item)}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-600"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        <Link to="/upload" className="font-medium text-primary hover:underline dark:text-indigo-400">
          Upload a regular resume
        </Link>{" "}
        instead (PDF/DOCX).
      </p>
    </div>
  );
}
