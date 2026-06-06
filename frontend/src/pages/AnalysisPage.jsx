import React, { useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useToast } from "../components/Toast";
import Feedback from "../components/Feedback";
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
import { jsPDF } from "jspdf";
import { useTheme } from "../context/ThemeContext";

const LIGHT_CHART_COLORS = ["#4F46E5", "#7C3AED", "#06B6D4", "#10B981", "#F59E0B", "#EF4444"];
const DARK_CHART_COLORS = ["#6366F1", "#8B5CF6", "#0891B2", "#059669", "#D97706", "#DC2626"];

export default function AnalysisPage() {
  const { isDarkMode } = useTheme();
  const CHART_COLORS = isDarkMode ? DARK_CHART_COLORS : LIGHT_CHART_COLORS;
  const { state } = useLocation();
  const reportRef = useRef(null);
  const toast = useToast();
  const data = state || {};

  const predictedRole = data.predicted_job_role || "—";
  const confidence = data.confidence_score ?? 0;
  const skills = data.extracted_skills || [];
  const missingSkills = data.missing_skills || [];
  const atsScore =
    data.ats_score ??
    (data.confidence_score
      ? Math.round(Math.min(data.confidence_score * 0.8, 100))
      : 0);
  const suggestions = data.improvement_suggestions || [];
  const roleProbs = data.role_probabilities || {};

  const chartData = Object.entries(roleProbs)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const skillGapData = [
    { name: "You have", value: skills.length, fill: "#4F46E5" },
    { name: "Missing for role", value: missingSkills.length, fill: "#EF4444" },
  ].filter((d) => d.value > 0);

  const skillCategoryData = [
    { name: "Technical", value: skills.filter((s) => !["leadership", "communication", "problem solving", "teamwork", "time management", "project management", "critical thinking", "adaptability", "creativity"].includes(s)).length },
    { name: "Soft", value: skills.filter((s) => ["leadership", "communication", "problem solving", "teamwork", "time management", "project management", "critical thinking", "adaptability", "creativity"].includes(s)).length },
  ].filter((d) => d.value > 0);

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(18);
    doc.text("Resume Analysis Report", pageWidth / 2, y, { align: "center" });
    y += 15;

    doc.setFontSize(12);
    doc.text(`Predicted Job Role: ${predictedRole}`, 20, y);
    y += 8;
    doc.text(`Confidence Score: ${Number(confidence).toFixed(1)}%`, 20, y);
    y += 8;
    doc.text(`ATS/Resume Score: ${atsScore}/100`, 20, y);
    y += 15;

    doc.setFontSize(14);
    doc.text("Extracted Skills", 20, y);
    y += 8;
    doc.setFontSize(10);
    const skillsText = skills.length > 0 ? skills.join(", ") : "None detected";
    const splitSkills = doc.splitTextToSize(skillsText, pageWidth - 40);
    doc.text(splitSkills, 20, y);
    y += splitSkills.length * 5 + 10;

    if (missingSkills.length > 0) {
      doc.setFontSize(14);
      doc.text("Missing Skills (for target role)", 20, y);
      y += 8;
      doc.setFontSize(10);
      const missingText = missingSkills.join(", ");
      const splitMissing = doc.splitTextToSize(missingText, pageWidth - 40);
      doc.text(splitMissing, 20, y);
      y += splitMissing.length * 5 + 10;
    }

    doc.setFontSize(14);
    doc.text("Improvement Suggestions", 20, y);
    y += 8;
    doc.setFontSize(10);
    (suggestions.length ? suggestions : ["Tailor your resume for your target role."]).forEach((s) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`• ${s}`, 20, y);
      y += 6;
    });

    doc.save("resume-analysis-report.pdf");
    toast.success("Report downloaded.");
  };

  if (!data.predicted_job_role && !data.confidence_score) {
    return (
      <div className="rounded-lg bg-amber-50 p-6 text-amber-800">
        <p className="font-medium">No analysis data found.</p>
        <p className="mt-2 text-sm">
          Please upload a resume first to see your analysis results.
        </p>
        <Link
          to="/upload"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Upload Resume
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header with download */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
          Resume Analysis Results
        </h1>
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-600"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Download Report (PDF)
        </button>
      </div>

      {/* Main results grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Predicted role & ATS score */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Predicted Job Role
          </h2>
          <p className="mt-2 text-2xl font-bold text-primary">{predictedRole}</p>
          <div className="mt-4 flex items-center gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Confidence</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{Number(confidence).toFixed(1)}%</p>
            </div>
            <div className="h-10 w-px bg-gray-200 dark:bg-gray-700" />
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">ATS Score</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">{atsScore}/100</p>
            </div>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(atsScore, 100)}%` }}
            />
          </div>
        </div>

        {/* Job role probability chart */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Job Role Probability
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Likelihood of each job role match
          </p>
          {chartData.length > 0 ? (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                  <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: isDarkMode ? "#d1d5db" : "#374151" }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 11, fill: isDarkMode ? "#d1d5db" : "#374151" }}
                  />
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    contentStyle={{
                      backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.95)" : "#ffffff",
                      border: `1px solid ${isDarkMode ? "#334155" : "#e5e7eb"}`,
                      borderRadius: "10px",
                      color: isDarkMode ? "#f8fafc" : "#111827",
                      boxShadow: isDarkMode ? "0 8px 20px rgba(0,0,0,0.4)" : "0 6px 18px rgba(0,0,0,0.12)",
                      padding: "10px 12px",
                    }}
                    labelStyle={{ color: isDarkMode ? "#94a3b8" : "#475569", fontSize: 12 }}
                    itemStyle={{ color: isDarkMode ? "#e2e8f0" : "#0f172a", fontSize: 12 }}
                    wrapperStyle={{ outline: "none" }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#4F46E5"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No probability data available.
            </div>
          )}
        </div>
      </div>

      {/* Skill analysis with charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Extracted skills */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Extracted Skills
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Skills identified from your resume
          </p>
          {skills.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {skills.map((skill, i) => (
                <span
                  key={i}
                  className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No skills detected.</p>
          )}
          {skillCategoryData.length > 0 && (
            <div className="mt-6 h-40">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Skill distribution</p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={skillCategoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    label
                  >
                    {skillCategoryData.map((_, i) => (
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
          )}
        </div>

        {/* Skill gaps */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Skill Gaps
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Skills to add for {predictedRole}
          </p>
          {missingSkills.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {missingSkills.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-red-50 dark:bg-red-900/20 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {skillGapData.length > 0 && (
                <div className="mt-6 h-40">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    You have vs missing for role
                  </p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={skillGapData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#374151" : "#e5e7eb"} />
                      <XAxis type="number" tick={{ fill: isDarkMode ? "#d1d5db" : "#374151" }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fill: isDarkMode ? "#d1d5db" : "#374151" }} />
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
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {skillGapData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="mt-4 text-sm text-green-600 dark:text-green-400">
              Great match! No major skill gaps for this role.
            </p>
          )}
        </div>
      </div>

      {/* Improvement suggestions */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Improvement Suggestions
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Tips to strengthen your resume
        </p>
        <ul className="mt-4 space-y-2">
          {(suggestions.length ? suggestions : ["Tailor your resume for your target role."]).map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          to="/upload"
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600"
        >
          Analyze Another Resume
        </Link>
        <Link
          to="/history"
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          View History
        </Link>
      </div>

      {/* Feedback */}
      <Feedback title="Rate your experience" />
    </div>
  );
}
