---
name: playwright-trace
description: Analyze Playwright/E2E test trace files (.zip) to debug failures. INVOKE PROACTIVELY whenever an E2E or Playwright test run fails and a trace is available — locally at test-results/*/trace.zip or linked from CI output — before attempting any fix. Use to identify the exact failure point, inspect screenshots at each step, check network requests, and determine root cause.
---

# Playwright Trace Analysis

Analyze Playwright test trace files (.zip) to debug test failures and understand test behavior.

## When to Use

- A Playwright test has failed and you need to understand why
- You want to review what a test did step-by-step
- You need to inspect network requests made during a test
- You want to extract screenshots from a test run

## Commands

### Summary

Get a high-level overview of a trace:

```bash
playwright-trace-cli summary <trace.zip>
```

### Actions

List all test actions (clicks, navigations, assertions, etc.):

```bash
playwright-trace-cli actions <trace.zip>
```

### Errors

Show only failed actions with detailed error messages and call logs:

```bash
playwright-trace-cli errors <trace.zip>
```

### Network

Inspect network requests:

```bash
# All requests
playwright-trace-cli network <trace.zip>

# Only failed requests (status >= 400)
playwright-trace-cli network <trace.zip> --failed

# Requests during a specific step
playwright-trace-cli network <trace.zip> --step 3
```

### Screenshot

Extract a screenshot closest to a specific action:

```bash
playwright-trace-cli screenshot <trace.zip> --step 3 --out screenshot.png
```

## JSON Output

All commands support `--json` for structured output:

```bash
playwright-trace-cli summary <trace.zip> --json
playwright-trace-cli actions <trace.zip> --json
```

## Debugging Workflow

1. Start with `summary` to get an overview and see if the test passed or failed
2. If failed, use `errors` to see what went wrong — note the step number (#N) of the failure
3. Use `actions` to see the full sequence of test steps and understand context around the failure
4. **Check network activity**: use `network --step N` to see what API calls happened during the failing step, and `network --failed` to find any failed requests. This reveals server-side issues, missing data, or unexpected responses
5. **Inspect the page visually**: use `screenshot --step N --out debug.png` to see exactly what the page looked like at the failing step. This reveals missing elements, loading states, or unexpected UI

## Trace File Location

Playwright traces are typically found at:

- `test-results/<test-name>/trace.zip` (after running tests with `--trace on`)
- Custom paths configured in `playwright.config.ts` under `use.trace`
