"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Sanitize an action name for use in a filename (e.g. "page.goto" -> "page-goto").
 */
function sanitizeForFilename(name) {
  return name.replace(/[^a-zA-Z0-9-]/g, "-");
}

/**
 * Extract a screenshot PNG from the trace.
 * @param {{ actions: object[], frames: object[], zip: import('adm-zip'), zipPath: string }} trace
 * @param {{ step?: string, out?: string, json?: boolean }} options
 */
function screenshotCommand(trace, options) {
  if (!options.step) {
    console.error("Error: --step <n> is required (action number to get screenshot for).");
    process.exit(1);
  }

  const { frames, zip, actions } = trace;

  if (!frames || frames.length === 0) {
    console.error("No screencast frames found in this trace.");
    process.exit(1);
  }

  const topActions = actions.filter((a) => !a.parentId);
  const stepIndex = parseInt(options.step, 10) - 1;

  if (stepIndex < 0 || stepIndex >= topActions.length) {
    console.error(`Step #${options.step} not found. Trace has ${topActions.length} steps.`);
    process.exit(1);
  }

  const action = topActions[stepIndex];
  const targetTime = action.startTime;

  // Find the frame closest to the action's startTime
  let closest = frames[0];
  let closestDiff = Math.abs(closest.timestamp - targetTime);

  for (const frame of frames) {
    const diff = Math.abs(frame.timestamp - targetTime);
    if (diff < closestDiff) {
      closest = frame;
      closestDiff = diff;
    }
  }

  // Look up the resource in the ZIP
  const sha1 = closest.sha1;
  const entry = zip.getEntries().find((e) => e.entryName.includes(sha1));

  if (!entry) {
    console.error(`Could not find screenshot resource (${sha1}) in trace ZIP.`);
    process.exit(1);
  }

  const buffer = entry.getData();

  let outPath;
  if (options.out) {
    outPath = path.resolve(options.out);
  } else {
    const traceBasename = path.basename(trace.zipPath, path.extname(trace.zipPath));
    const actionName = sanitizeForFilename(action.apiName);
    const filename = `${traceBasename}-step${stepIndex + 1}-${actionName}.png`;
    outPath = path.join(path.dirname(path.resolve(trace.zipPath)), filename);
  }
  fs.writeFileSync(outPath, buffer);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          step: stepIndex + 1,
          action: action.apiName,
          frame: { sha1: closest.sha1, timestamp: closest.timestamp },
          output: outPath,
        },
        null,
        2,
      ),
    );
  } else {
    console.log(`Saved screenshot to ${outPath}`);
  }
}

module.exports = screenshotCommand;
