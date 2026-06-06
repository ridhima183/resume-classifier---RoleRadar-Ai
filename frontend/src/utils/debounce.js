/**
 * Debounce utility - delays function execution until after specified wait time
 * with no additional calls.
 *
 * Useful for:
 * - Search inputs (delay API calls until user stops typing)
 * - Window resize handlers
 * - Autocomplete suggestions
 *
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait before executing
 * @param {Object} options - Optional configuration
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, options = {}) {
  let timeout;
  let result;

  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      if (!options.leading) {
        result = func.apply(this, args);
      }
    };

    const callNow = options.leading && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) {
      result = func.apply(this, args);
    }

    return result;
  };
}

/**
 * Debounce for async functions (returns a promise)
 * Useful for async API calls that should be debounced
 *
 * @param {Function} asyncFunc - Async function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced async function
 */
export function debounceAsync(asyncFunc, wait) {
  let timeout;
  let lastPromise;

  return function debouncedAsync(...args) {
    return new Promise((resolve, reject) => {
      clearTimeout(timeout);

      timeout = setTimeout(async () => {
        try {
          const result = await asyncFunc.apply(this, args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
}

export default debounce;
