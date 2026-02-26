"use strict";

const AdmZip = require("adm-zip");
const path = require("path");

/**
 * Parse an apiName from a trace event title or class/method.
 * e.g. "page.goto(https://example.com)" → "page.goto"
 * @param {object} event - a before event
 * @returns {string}
 */
function buildApiName(event) {
  if (event.title) {
    const parenIdx = event.title.indexOf("(");
    if (parenIdx > 0) return event.title.slice(0, parenIdx);
    return event.title;
  }
  if (event.class && event.method) {
    return `${event.class.toLowerCase()}.${event.method}`;
  }
  return event.method || "unknown";
}

/**
 * Extract a parameter string from a title.
 * e.g. "page.goto(https://example.com)" → "https://example.com"
 * @param {string} title
 * @returns {string}
 */
function extractParamFromTitle(title) {
  if (!title) return "";
  const parenIdx = title.indexOf("(");
  if (parenIdx < 0) return "";
  // Strip trailing )
  let param = title.slice(parenIdx + 1);
  if (param.endsWith(")")) param = param.slice(0, -1);
  return param;
}

/**
 * Parse NDJSON text into an array of objects, skipping malformed lines.
 * @param {string} text
 * @returns {object[]}
 */
function parseNDJSON(text) {
  const results = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      results.push(JSON.parse(trimmed));
    } catch {
      // skip malformed lines
    }
  }
  return results;
}

/**
 * Parse network data from trace.network content.
 * Tries HAR JSON format first, falls back to NDJSON.
 * @param {string} text
 * @returns {object[]}
 */
function parseNetworkData(text) {
  if (!text || !text.trim()) return [];

  // Try HAR format (full JSON with log.entries)
  try {
    const har = JSON.parse(text);
    if (har.log && Array.isArray(har.log.entries)) {
      return har.log.entries.map((entry) => ({
        method: entry.request?.method || "GET",
        url: entry.request?.url || "",
        status: entry.response?.status || 0,
        startTime: entry.startedDateTime ? new Date(entry.startedDateTime).getTime() : 0,
        duration: entry.time || 0,
        requestHeaders: entry.request?.headers || [],
        responseHeaders: entry.response?.headers || [],
      }));
    }
  } catch {
    // Not valid JSON — try NDJSON
  }

  // NDJSON format
  const events = parseNDJSON(text);
  const requests = new Map();

  for (const event of events) {
    if (event.type === "resource-snapshot") {
      const req = event.snapshot?.request || event.request || {};
      const res = event.snapshot?.response || event.response || {};
      requests.set(event.url || req.url || "", {
        method: req.method || "GET",
        url: event.url || req.url || "",
        status: res.status || 0,
        startTime: event.timestamp || event.startTime || 0,
        duration: event.duration || 0,
        requestHeaders: req.headers || [],
        responseHeaders: res.headers || [],
      });
    } else if (event.method || event.url) {
      // Generic network event
      const url = event.url || "";
      if (!requests.has(url)) {
        requests.set(url, {
          method: event.method || "GET",
          url,
          status: event.status || event.responseStatus || 0,
          startTime: event.timestamp || event.startTime || event.monotonicTime || 0,
          duration: event.duration || 0,
          requestHeaders: event.requestHeaders || event.headers || [],
          responseHeaders: event.responseHeaders || [],
        });
      }
    }
  }

  return Array.from(requests.values());
}

/**
 * Parse a Playwright trace ZIP file and return structured data.
 * @param {string} zipPath - path to the .zip file
 * @returns {{ metadata: object, actions: object[], network: object[], frames: object[], zip: AdmZip }}
 */
function parseTrace(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  // Find trace file(s) — could be trace.trace or multiple trace files
  let traceText = "";
  let networkText = "";

  for (const entry of entries) {
    const base = path.basename(entry.entryName);
    if (base.endsWith(".trace")) {
      traceText += entry.getData().toString("utf8") + "\n";
    } else if (base.endsWith(".network")) {
      networkText += entry.getData().toString("utf8") + "\n";
    }
  }

  if (!traceText.trim()) {
    throw new Error("No trace.trace found in ZIP file. Is this a valid Playwright trace?");
  }

  const events = parseNDJSON(traceText);

  // Bucket events by type
  let metadata = {};
  const beforeMap = new Map(); // callId → before event
  const afterMap = new Map(); // callId → after event
  const logMap = new Map(); // callId → log entries[]
  const frames = [];

  for (const event of events) {
    switch (event.type) {
      case "context-options":
        metadata = {
          browserName: event.browserName || event.options?.browserName || "unknown",
          platform: event.platform || "",
          wallTime: event.wallTime || 0,
          title: event.title || "",
          options: event.options || {},
        };
        break;

      case "before":
        beforeMap.set(event.callId, event);
        break;

      case "after":
        afterMap.set(event.callId, event);
        break;

      case "screencast-frame":
        frames.push({
          sha1: event.sha1,
          timestamp: event.timestamp || event.monotonicTime || 0,
          width: event.width,
          height: event.height,
          pageId: event.pageId,
        });
        break;

      case "log":
        if (event.callId) {
          if (!logMap.has(event.callId)) logMap.set(event.callId, []);
          logMap.get(event.callId).push(event.message || "");
        }
        break;

      default:
        // Other event types — skip
        break;
    }
  }

  // Correlate before/after pairs into unified action objects
  const actions = [];
  for (const [callId, before] of beforeMap) {
    const after = afterMap.get(callId);
    const logs = logMap.get(callId) || [];

    const startTime = before.startTime || before.monotonicTime || 0;
    const endTime = after ? after.endTime || after.monotonicTime || null : null;
    const duration = startTime && endTime ? endTime - startTime : null;

    const apiName = buildApiName(before);
    const paramStr = extractParamFromTitle(before.title) || "";

    actions.push({
      callId,
      apiName,
      title: before.title || "",
      params: before.params || {},
      paramStr,
      startTime,
      endTime,
      duration,
      error: after?.error || null,
      callLog: after?.log || logs,
      parentId: before.parentId || null,
      pageId: before.pageId || null,
      class: before.class || "",
      method: before.method || "",
      wallTime: before.wallTime || 0,
    });
  }

  // Sort by startTime
  actions.sort((a, b) => a.startTime - b.startTime);

  // Parse network data
  const network = parseNetworkData(networkText);

  return { metadata, actions, network, frames, zip };
}

module.exports = { parseTrace };
