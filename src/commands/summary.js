"use strict";

const { formatDuration } = require("../format");

/**
 * Print a high-level summary of the trace.
 * @param {{ metadata: object, actions: object[], network: object[], frames: object[] }} trace
 * @param {{ json?: boolean }} options
 */
function summary(trace, options) {
  const { metadata, actions, network } = trace;

  // Only top-level actions (no parentId)
  const topActions = actions.filter((a) => !a.parentId);

  const title = metadata.title || "unknown";
  const browser = metadata.browserName || "unknown";

  // Duration: from first to last action
  const startTimes = topActions.map((a) => a.wallTime || a.startTime).filter(Boolean);
  const endTimes = topActions.map((a) => a.endTime).filter(Boolean);
  const totalDuration =
    startTimes.length && endTimes.length
      ? Math.max(...endTimes) - Math.min(...topActions.map((a) => a.startTime).filter(Boolean))
      : null;

  const errorCount = topActions.filter((a) => a.error).length;
  const failedNetworkCount = network.filter((r) => r.status >= 400 || r.status === 0).length;
  const status = errorCount > 0 ? "FAILED" : "PASSED";

  if (options.json) {
    const data = {
      title,
      browser,
      durationMs: totalDuration,
      duration: formatDuration(totalDuration),
      actionCount: topActions.length,
      errorCount,
      networkCount: network.length,
      failedNetworkCount,
      status,
    };
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  console.log(`Trace: ${title}`);
  console.log(`Browser: ${browser}`);
  console.log(`Duration: ${formatDuration(totalDuration)}`);
  console.log(`Actions: ${topActions.length}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Network requests: ${network.length}${failedNetworkCount ? ` (${failedNetworkCount} failed)` : ""}`);
  console.log(`Status: ${status}`);
}

module.exports = summary;
