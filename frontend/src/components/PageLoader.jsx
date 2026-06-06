/**
 * Loading fallback component for React Suspense boundaries
 * Displayed while lazy-loaded components are loading
 */

import React from "react";
import { useTheme } from "../context/ThemeContext";

export default function PageLoader({ message = "Loading..." }) {
  const { isDarkMode } = useTheme();

  return (
    <div className={`flex min-h-screen items-center justify-center ${
      isDarkMode ? "bg-gray-900" : "bg-white"
    }`}>
      <div className="text-center">
        {/* Spinner */}
        <div className="mb-6 flex justify-center">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary dark:border-t-indigo-400 animate-spin" />
          </div>
        </div>

        {/* Text */}
        <p className={`text-lg font-medium ${
          isDarkMode ? "text-gray-300" : "text-gray-700"
        }`}>
          {message}
        </p>

        {/* Subtext */}
        <p className={`mt-2 text-sm ${
          isDarkMode ? "text-gray-500" : "text-gray-500"
        }`}>
          Please wait while we load the page...
        </p>
      </div>
    </div>
  );
}

/**
 * Lightweight loading indicator component
 * Used within pages for partial loading states
 */
export function LoadingSpinner({ size = "md", text = "" }) {
  const sizeMap = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-full border-2 border-transparent border-t-primary dark:border-t-indigo-400 animate-spin ${sizeMap[size]}`} />
      {text && <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{text}</span>}
    </div>
  );
}

/**
 * Skeleton loader component for content
 * Provides a placeholder while content is loading
 */
export function SkeletonLoader({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-300 dark:bg-gray-700" />
          <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-650" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-650" />
        </div>
      ))}
    </div>
  );
}
