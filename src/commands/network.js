"use strict";

const { formatDuration, padRight, truncate } = require("../format");

/**
 * Print network request table.
 * @param {{ actions: object[], network: object[] }} trace
 * @param {{ json?: boolean, step?: string, failed?: boolean }} options
 */
function networkCommand(trace, options) {
  let requests = trace.network;

  if (!requests || requests.length === 0) {
    console.log("No network data in this trace.");
    return;
  }

  // Filter by step time window
  if (options.step != null) {
    const topActions = trace.actions.filter((a) => !a.parentId);
    const actionIndex = parseInt(options.step, 10) - 1;
    if (actionIndex < 0 || actionIndex >= topActions.length) {
      console.error(`Step #${options.step} not found. Trace has ${topActions.length} steps.`);
      process.exit(1);
    }
    const action = topActions[actionIndex];
    const start = action.startTime;
    const end = action.endTime;
    if (start && end) {
      requests = requests.filter((r) => {
        const rTime = r.startTime || 0;
        return rTime >= start && rTime <= end;
      });
    }
  }

  // Filter to failed requests
  if (options.failed) {
    requests = requests.filter((r) => r.status >= 400 || r.status === 0);
  }

  if (options.json) {
    const data = requests.map((r) => ({
      method: r.method,
      url: r.url,
      status: r.status,
      durationMs: r.duration,
    }));
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (requests.length === 0) {
    if (options.failed) {
      console.log("No failed network requests.");
    } else if (options.step) {
      console.log(`No network requests during step #${options.step}.`);
    }
    return;
  }

  // Table output
  const methodWidth = 7;
  const statusWidth = 6;
  const durationWidth = 10;

  console.log(
    `${padRight("Method", methodWidth)}  ${padRight("Status", statusWidth)}  ${padRight("Duration", durationWidth)}  URL`,
  );
  console.log("-".repeat(methodWidth + 2 + statusWidth + 2 + durationWidth + 2 + 40));

  for (const r of requests) {
    const status = r.status ? String(r.status) : "-";
    console.log(
      `${padRight(r.method, methodWidth)}  ${padRight(status, statusWidth)}  ${padRight(formatDuration(r.duration), durationWidth)}  ${truncate(r.url, 80)}`,
    );
  }

  console.log(`\n${requests.length} request${requests.length === 1 ? "" : "s"}`);
}

module.exports = networkCommand;
