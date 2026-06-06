/**
 * Custom hook for caching API responses with automatic invalidation
 * Helps reduce unnecessary API calls and improve performance
 *
 * @param {string} key - Unique cache key
 * @param {Function} fetchFunction - Async function that returns data
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, refetch }
 */
import { useState, useEffect, useRef, useCallback } from "react";

// Global cache store with TTL support
const cacheStore = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes default

export function useCache(key, fetchFunction, options = {}) {
  const {
    duration = CACHE_DURATION,
    skip = false,
    onSuccess = null,
    onError = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const cacheTimeoutRef = useRef(null);

  // Invalidate cache for a specific key
  const invalidateCache = useCallback(() => {
    if (cacheStore[key]) {
      clearTimeout(cacheStore[key].timeout);
      delete cacheStore[key];
    }
  }, [key]);

  // Fetch function with cache support
  const refetch = useCallback(async () => {
    if (skip) return;

    // Check if data is in cache and still valid
    if (cacheStore[key] && cacheStore[key].data) {
      setData(cacheStore[key].data);
      setLoading(false);
      onSuccess?.(cacheStore[key].data);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFunction();
      setData(result);

      // Store in cache with TTL
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }

      cacheTimeoutRef.current = setTimeout(() => {
        invalidateCache();
      }, duration);

      cacheStore[key] = {
        data: result,
        timestamp: Date.now(),
        timeout: cacheTimeoutRef.current,
      };

      onSuccess?.(result);
    } catch (err) {
      setError(err);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [key, fetchFunction, skip, duration, onSuccess, onError, invalidateCache]);

  useEffect(() => {
    refetch();

    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, [refetch]);

  return { data, loading, error, refetch, invalidateCache };
}

export default useCache;
