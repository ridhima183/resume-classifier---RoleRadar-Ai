import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { uploadResume } from "../services/api";
import { useToast } from "../components/Toast";

const ACCEPTED_TYPES = [".pdf", ".docx"];
const ACCEPTED_MIME = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function isValidFile(file) {
  const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
  return ACCEPTED_TYPES.includes(ext) || ACCEPTED_MIME.includes(file.type);
}

export default function UploadResumePage() {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError("");
      setSuccess("");
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      if (!isValidFile(dropped)) {
        setError("Please upload a PDF or DOCX file.");
        return;
      }
      setFile(dropped);
    },
    []
  );

  const handleFileChange = (e) => {
    setError("");
    setSuccess("");
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!isValidFile(selected)) {
      setError("Please upload a PDF or DOCX file.");
      return;
    }
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setError("");
    setSuccess("");
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please select or drop a PDF or DOCX resume.");
      return;
    }
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadResume(formData);
      setSuccess("Resume analyzed successfully!");
      toast.success("Resume analyzed successfully!");
      setTimeout(() => {
        navigate("/analysis", { state: res.data });
      }, 500);
    } catch (err) {
      const msg =
        err.response?.data?.detail ||
        "Upload failed. Please make sure you are logged in and try again.";
      setError(typeof msg === "string" ? msg : "Upload failed.");
      toast.error(typeof msg === "string" ? msg : "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          Upload Resume
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          Drag and drop or select a PDF/DOCX resume. Our AI will analyze it and
          suggest the most suitable job roles.
        </p>

        {/* Messages */}
        {error && (
          <div
            className="mt-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="mt-4 rounded-lg bg-green-50 dark:bg-green-900/20 p-4 text-sm text-green-700 dark:text-green-300"
            role="status"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* Drag-and-drop area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition sm:min-h-[200px] ${
              isDragging
                ? "border-primary bg-primary/5 dark:bg-primary/10"
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
          >
            <input
              type="file"
              accept=".pdf,.docx"
              className="absolute inset-0 cursor-pointer opacity-0"
              id="resume-input"
              onChange={handleFileChange}
              disabled={loading}
            />
            {loading ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Analyzing your resume...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This may take a few seconds
                </p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFile();
                  }}
                  className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-500">
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
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Drag and drop your resume here
                </p>
                <p className="text-xs text-gray-500">or click to browse</p>
                <p className="text-xs text-gray-400">PDF or DOCX only</p>
              </div>
            )}
          </div>

          {/* Upload button */}
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </span>
            ) : (
              "Upload & Analyze Resume"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
