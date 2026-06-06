/**
 * Custom hook for debounced search with loading and error states
 * Automatically debounces search input and prevents excessive API calls
 *
 * Usage:
 *   const { results, loading, error, searchQuery, setSearchQuery } = useDebouncedSearch(
 *     async (query) => api.searchResumes(query),
 *     300  // debounce delay in ms
 *   );
 *
 * @param {Function} searchFunction - Async function that performs the search
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {Object} { results, loading, error, searchQuery, setSearchQuery, clearResults }
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { debounce } from "../utils/debounce";

export function useDebouncedSearch(searchFunction, delay = 300) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debouncedSearchRef = useRef(null);

  // Create debounced search function
  useEffect(() => {
    debouncedSearchRef.current = debounce(async (query) => {
      if (!query.trim()) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await searchFunction(query);
        setResults(data);
      } catch (err) {
        setError(err.message || "Search failed");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      if (debouncedSearchRef.current) {
        debouncedSearchRef.current.cancel?.();
      }
    };
  }, [searchFunction, delay]);

  // Handle search query change
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);
    setLoading(true);
    debouncedSearchRef.current(query);
  }, []);

  // Clear search results
  const clearResults = useCallback(() => {
    setSearchQuery("");
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    searchQuery,
    setSearchQuery: handleSearchChange,
    clearResults,
  };
}

export default useDebouncedSearch;
