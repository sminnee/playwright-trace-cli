"use strict";

const { formatDuration, padRight, statusBadge, truncate } = require("../format");

/**
 * Print a numbered table of all top-level actions.
 * @param {{ actions: object[] }} trace
 * @param {{ json?: boolean }} options
 */
function actionsCommand(trace, options) {
  // Only top-level actions (no parentId)
  const topActions = trace.actions.filter((a) => !a.parentId);

  if (options.json) {
    const data = topActions.map((action, i) => ({
      index: i + 1,
      api: action.apiName,
      params: action.paramStr,
      durationMs: action.duration,
      status: statusBadge(action),
      error: action.error ? action.error.message || String(action.error) : null,
    }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (topActions.length === 0) {
    console.log("No actions found in trace.");
    return;
  }

  // Calculate column widths
  const indexWidth = String(topActions.length).length + 1;
  const actionColWidth = Math.min(
    60,
    Math.max(
      20,
      ...topActions.map((a) => {
        const display = a.paramStr ? `${a.apiName} ${a.paramStr}` : a.apiName;
        return display.length;
      }),
    ),
  );

  // Header
  console.log(
    `${padRight("#", indexWidth)}  ${padRight("Action", actionColWidth)}  ${padRight("Duration", 10)}  Status`,
  );
  console.log("-".repeat(indexWidth + 2 + actionColWidth + 2 + 10 + 2 + 6));

  // Rows
  topActions.forEach((action, i) => {
    const num = String(i + 1);
    const display = action.paramStr
      ? `${action.apiName} ${truncate(action.paramStr, actionColWidth - action.apiName.length - 1)}`
      : action.apiName;

    console.log(
      `${padRight(num, indexWidth)}  ${padRight(truncate(display, actionColWidth), actionColWidth)}  ${padRight(formatDuration(action.duration), 10)}  ${statusBadge(action)}`,
    );

    // If error, print indented error message
    if (action.error) {
      const errMsg = action.error.message || String(action.error);
      console.log(`     ${errMsg}`);
    }
  });
}

module.exports = actionsCommand;
