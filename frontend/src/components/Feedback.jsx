import React, { useState } from "react";
import { submitFeedback } from "../services/api";
import { useToast } from "./Toast";

/**
 * Reusable feedback widget: star rating (1-5) + optional comments.
 * Use on Analysis page, after viewing results, or in a dedicated section.
 */
export default function Feedback({ title = "Rate your experience", onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comments, setComments] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating (1-5 stars).");
      return;
    }
    setLoading(true);
    try {
      await submitFeedback(rating, comments.trim() || null);
      setSubmitted(true);
      toast.success("Thank you for your feedback!");
      onSuccess?.();
    } catch (err) {
      const msg = err.response?.data?.detail || "Failed to submit feedback.";
      toast.error(typeof msg === "string" ? msg : "Failed to submit feedback.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center text-green-800">
        <p className="font-medium">Thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">
        Your feedback helps us improve.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-gray-700">Rating</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="focus:outline-none"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
              >
                <span
                  className={`text-2xl ${
                    star <= (hover || rating) ? "text-amber-400" : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="feedback-comments" className="mb-1.5 block text-sm font-medium text-gray-700">
            Comments (optional)
          </label>
          <textarea
            id="feedback-comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Anything you'd like to share?"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          disabled={loading || rating < 1}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Submitting..." : "Submit feedback"}
        </button>
      </form>
    </div>
  );
}
