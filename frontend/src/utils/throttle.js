/**
 * Throttle utility - ensures function is called at most once per specified interval
 *
 * Useful for:
 * - Scroll event handlers
 * - Mouse movement tracking
 * - Repeated button clicks
 *
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds between function calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;

  return function throttledFunc(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Throttle for async functions
 * Ensures async function is called at most once per specified interval
 *
 * @param {Function} asyncFunc - Async function to throttle
 * @param {number} limit - Milliseconds between function calls
 * @returns {Function} Throttled async function
 */
export function throttleAsync(asyncFunc, limit) {
  let inThrottle;
  let lastPromise;

  return async function throttledAsync(...args) {
    if (!inThrottle) {
      inThrottle = true;
      try {
        lastPromise = asyncFunc.apply(this, args);
        return await lastPromise;
      } finally {
        setTimeout(() => (inThrottle = false), limit);
      }
    }
    return lastPromise;
  };
}

export default throttle;
