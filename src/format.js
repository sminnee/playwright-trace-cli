"use strict";

/**
 * Format a duration in milliseconds to a human-readable string.
 * @param {number|null|undefined} ms
 * @returns {string}
 */
function formatDuration(ms) {
  if (ms == null || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Pad a string to the right to a minimum width.
 * @param {string} str
 * @param {number} n
 * @returns {string}
 */
function padRight(str, n) {
  if (str.length >= n) return str;
  return str + " ".repeat(n - str.length);
}

/**
 * Return a status badge for an action.
 * @param {{ error?: any }} action
 * @returns {string}
 */
function statusBadge(action) {
  return action.error ? "ERROR" : "ok";
}

/**
 * Format action params into a compact one-line string for display.
 * Extracts the most useful parameter (url, selector, text, etc.).
 * @param {object} params
 * @returns {string}
 */
function formatParams(params) {
  if (!params || typeof params !== "object") return "";
  // Common param keys in order of display preference
  if (params.url) return params.url;
  if (params.selector) return params.selector;
  if (params.text) return params.text;
  if (params.name) return params.name;
  if (params.value) return String(params.value);
  // For goto-like actions, the first string value is usually the URL
  const vals = Object.values(params);
  for (const v of vals) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

/**
 * Truncate a string to maxLen characters, appending "..." if truncated.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str || str.length <= maxLen) return str || "";
  return str.slice(0, maxLen - 3) + "...";
}

module.exports = { formatDuration, padRight, statusBadge, formatParams, truncate };
