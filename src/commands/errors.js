"use strict";

const { formatDuration, truncate } = require("../format");

/**
 * Print only errored actions with their call logs.
 * @param {{ actions: object[] }} trace
 * @param {{ json?: boolean }} options
 */
function errorsCommand(trace, options) {
  // Only top-level actions that have errors
  const topActions = trace.actions.filter((a) => !a.parentId);
  const errored = topActions.filter((a) => a.error);

  if (options.json) {
    const data = errored.map((action) => {
      const originalIndex = topActions.indexOf(action) + 1;
      return {
        index: originalIndex,
        api: action.apiName,
        params: action.paramStr,
        durationMs: action.duration,
        error: action.error.message || String(action.error),
        callLog: action.callLog || [],
      };
    });
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (errored.length === 0) {
    console.log("No errors found.");
    return;
  }

  console.log(`Found ${errored.length} error${errored.length === 1 ? "" : "s"}:\n`);

  errored.forEach((action) => {
    const originalIndex = topActions.indexOf(action) + 1;
    const display = action.paramStr ? `${action.apiName} ${truncate(action.paramStr, 50)}` : action.apiName;

    console.log(`#${originalIndex}  ${display}  [${formatDuration(action.duration)}]`);
    console.log(`  Error: ${action.error.message || String(action.error)}`);

    // Print call log if present
    const logs = action.callLog || [];
    if (logs.length > 0) {
      console.log("  Call log:");
      for (const logLine of logs) {
        console.log(`  - ${logLine}`);
      }
    }
    console.log("");
  });
}

module.exports = errorsCommand;
