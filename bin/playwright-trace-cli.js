#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { Command } = require("commander");
const { parseTrace } = require("../src/parse");
const summaryCommand = require("../src/commands/summary");
const actionsCommand = require("../src/commands/actions");
const errorsCommand = require("../src/commands/errors");
const networkCommand = require("../src/commands/network");
const screenshotCommand = require("../src/commands/screenshot");

const pkg = require("../package.json");

const program = new Command();

program
  .name("playwright-trace-cli")
  .description("Parse Playwright trace .zip files and output structured text summaries")
  .version(pkg.version);

/**
 * Helper: parse the trace ZIP and run a command function.
 */
function withTrace(traceZip, options, commandFn) {
  try {
    const trace = parseTrace(traceZip);
    commandFn(trace, options);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

program
  .command("summary")
  .description("Show a high-level overview of the trace")
  .argument("<trace.zip>", "Path to Playwright trace ZIP file")
  .option("--json", "Output as JSON")
  .action((traceZip, opts) => withTrace(traceZip, opts, summaryCommand));

program
  .command("actions")
  .description("List all top-level actions in the trace")
  .argument("<trace.zip>", "Path to Playwright trace ZIP file")
  .option("--json", "Output as JSON")
  .action((traceZip, opts) => withTrace(traceZip, opts, actionsCommand));

program
  .command("errors")
  .description("Show only errored actions with call logs")
  .argument("<trace.zip>", "Path to Playwright trace ZIP file")
  .option("--json", "Output as JSON")
  .action((traceZip, opts) => withTrace(traceZip, opts, errorsCommand));

program
  .command("network")
  .description("Show network requests from the trace (use --step N to filter by step)")
  .argument("<trace.zip>", "Path to Playwright trace ZIP file")
  .option("--json", "Output as JSON")
  .option("--step <n>", "Filter to requests during step N")
  .option("--failed", "Show only failed requests (status >= 400)")
  .action((traceZip, opts) => withTrace(traceZip, opts, networkCommand));

program
  .command("screenshot")
  .description("Extract a screenshot from the trace (use --step N to pick which step)")
  .argument("<trace.zip>", "Path to Playwright trace ZIP file")
  .option("--json", "Output as JSON")
  .option("--step <n>", "Action number to get screenshot for (required)")
  .option("--out <path>", "Output file path for the PNG (required)")
  .action((traceZip, opts) => withTrace(traceZip, opts, screenshotCommand));

program
  .command("install-claude")
  .description("Install the Claude Code skill for Playwright trace analysis")
  .action(() => {
    const skillSrc = path.join(__dirname, "..", "skills", "playwright-trace", "SKILL.md");
    const skillDest = path.join(os.homedir(), ".claude", "skills", "playwright-trace", "SKILL.md");

    if (!fs.existsSync(skillSrc)) {
      console.error("Error: Could not find skill file at " + skillSrc);
      process.exit(1);
    }

    const destDir = path.dirname(skillDest);
    fs.mkdirSync(destDir, { recursive: true });

    // Remove existing file/symlink if present
    try {
      fs.unlinkSync(skillDest);
    } catch {
      // Ignore if not present
    }

    fs.symlinkSync(skillSrc, skillDest);
    console.log(`Installed Claude Code skill (symlinked to ${skillDest})`);
  });

program.parse();
