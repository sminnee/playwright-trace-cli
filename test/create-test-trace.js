#!/usr/bin/env node
"use strict";

/**
 * Generate a synthetic Playwright trace ZIP for testing.
 * Produces test/fixtures/sample-trace.zip
 */

const AdmZip = require("adm-zip");
const path = require("path");
const fs = require("fs");

const zip = new AdmZip();

// Context options event
const contextOptions = {
  type: "context-options",
  browserName: "chromium",
  platform: "darwin",
  wallTime: 1700000000000,
  title: "Example Test",
  options: { browserName: "chromium", viewport: { width: 1280, height: 720 } },
};

// Action 1: page.goto (success)
const before1 = {
  type: "before",
  callId: "call-1",
  title: "page.goto(https://example.com)",
  class: "Page",
  method: "goto",
  params: { url: "https://example.com" },
  startTime: 1000,
  monotonicTime: 1000,
  wallTime: 1700000001000,
  pageId: "page-1",
};
const after1 = {
  type: "after",
  callId: "call-1",
  endTime: 2240,
  monotonicTime: 2240,
};

// Action 2: locator.click (success)
const before2 = {
  type: "before",
  callId: "call-2",
  title: "locator.click(Submit)",
  class: "Locator",
  method: "click",
  params: { selector: "text=Submit" },
  startTime: 2300,
  monotonicTime: 2300,
  wallTime: 1700000002300,
  pageId: "page-1",
};
const after2 = {
  type: "after",
  callId: "call-2",
  endTime: 2345,
  monotonicTime: 2345,
};

// Action 3: expect.toBeVisible (fails)
const before3 = {
  type: "before",
  callId: "call-3",
  title: "expect.toBeVisible",
  class: "Expect",
  method: "toBeVisible",
  params: {},
  startTime: 2400,
  monotonicTime: 2400,
  wallTime: 1700000002400,
  pageId: "page-1",
};
const after3 = {
  type: "after",
  callId: "call-3",
  endTime: 4410,
  monotonicTime: 4410,
  error: { message: "Timeout 2000ms exceeded waiting for element to be visible" },
  log: [
    'waiting for locator("#result")',
    "locator resolved to 0 elements",
    "retrying...",
    "locator resolved to 0 elements",
    "timeout exceeded",
  ],
};

// Sub-action (should be filtered out of top-level display)
const before4 = {
  type: "before",
  callId: "call-4",
  title: "page.evaluate",
  class: "Page",
  method: "evaluate",
  params: {},
  startTime: 1100,
  monotonicTime: 1100,
  parentId: "call-1",
  pageId: "page-1",
};
const after4 = {
  type: "after",
  callId: "call-4",
  endTime: 1150,
  monotonicTime: 1150,
};

// Screencast frames
const frame1 = {
  type: "screencast-frame",
  sha1: "abc123frame1",
  timestamp: 1500,
  monotonicTime: 1500,
  width: 1280,
  height: 720,
  pageId: "page-1",
};
const frame2 = {
  type: "screencast-frame",
  sha1: "def456frame2",
  timestamp: 2350,
  monotonicTime: 2350,
  width: 1280,
  height: 720,
  pageId: "page-1",
};

// Log entries
const log1 = {
  type: "log",
  callId: "call-3",
  message: 'waiting for locator("#result")',
};

// Build trace.trace NDJSON
const traceLines = [
  contextOptions,
  before1,
  after1,
  before2,
  after2,
  before3,
  after3,
  before4,
  after4,
  frame1,
  frame2,
  log1,
]
  .map((e) => JSON.stringify(e))
  .join("\n");

zip.addFile("trace.trace", Buffer.from(traceLines, "utf8"));

// Build trace.network (HAR format)
const har = {
  log: {
    entries: [
      {
        startedDateTime: "2023-11-14T22:13:21.000Z",
        time: 150,
        request: { method: "GET", url: "https://example.com/", headers: [] },
        response: { status: 200, headers: [] },
      },
      {
        startedDateTime: "2023-11-14T22:13:21.200Z",
        time: 80,
        request: { method: "GET", url: "https://example.com/api/data", headers: [] },
        response: { status: 200, headers: [] },
      },
      {
        startedDateTime: "2023-11-14T22:13:21.400Z",
        time: 200,
        request: { method: "POST", url: "https://example.com/api/submit", headers: [] },
        response: { status: 500, headers: [] },
      },
      {
        startedDateTime: "2023-11-14T22:13:21.700Z",
        time: 50,
        request: { method: "GET", url: "https://example.com/static/app.js", headers: [] },
        response: { status: 200, headers: [] },
      },
    ],
  },
};
zip.addFile("trace.network", Buffer.from(JSON.stringify(har), "utf8"));

// Add fake screenshot resources
// Create a minimal 1x1 red PNG
const pngHeader = Buffer.from([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // PNG signature
  0x00,
  0x00,
  0x00,
  0x0d,
  0x49,
  0x48,
  0x44,
  0x52, // IHDR chunk
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01, // 1x1
  0x08,
  0x02,
  0x00,
  0x00,
  0x00,
  0x90,
  0x77,
  0x53, // 8-bit RGB
  0xde,
  0x00,
  0x00,
  0x00,
  0x0c,
  0x49,
  0x44,
  0x41, // IDAT
  0x54,
  0x08,
  0xd7,
  0x63,
  0xf8,
  0xcf,
  0xc0,
  0x00,
  0x00,
  0x00,
  0x02,
  0x00,
  0x01,
  0xe2,
  0x21,
  0xbc,
  0x33,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4e, // IEND
  0x44,
  0xae,
  0x42,
  0x60,
  0x82,
]);

zip.addFile("resources/abc123frame1", pngHeader);
zip.addFile("resources/def456frame2", pngHeader);

// Write the ZIP
const outDir = path.join(__dirname, "fixtures");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "sample-trace.zip");
zip.writeZip(outPath);
console.log(`Created test trace at ${outPath}`);
